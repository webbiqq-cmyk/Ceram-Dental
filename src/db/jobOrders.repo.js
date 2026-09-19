// Raw-SQL data access for the lab workflow tables (job_orders and
// everything in migrations 003-005) — no ORM, matching the rest of this
// codebase. src/services/workflow.service.js is where the actual
// business rules (state transitions, veneer demo/final logic) live; this
// file is deliberately dumb — reads and writes, nothing that decides
// what's allowed to happen next.
const { query, getClient, transaction } = require('./pool');

const ORDER_COLUMNS = `
  id, order_number, clinic_id, dentist_user_id, patient_ref, job_type, stage_type, status,
  shade, instructions, scan_body, implant_system, abutment_size, abutment_availability,
  assigned_designer_id, assigned_technician_id, assigned_qc_id, rejection_note,
  delivery_method, delivered_at, created_at, updated_at,
  priority, target_date, blocked_reason, blocked_at, blocked_by, blocked_from, stage_entered_at,
  prescription
`;

// Same columns qualified to the `o` alias, plus the names behind the four
// assigned_*_id columns. Every queue in the product answers "who has this
// right now?" — resolving that in the UI meant either shipping the whole
// staff roster to the browser or an N+1 fetch per row, so the join happens
// here once. Kept as a separate constant from ORDER_COLUMNS because
// createOrder/updateOrder's RETURNING clause has no joins to name.
const ORDER_SELECT = `
  ${ORDER_COLUMNS.trim().split(/\s*,\s*/).map(c => 'o.' + c).join(', ')},
  d.name AS dentist_name, des.name AS designer_name,
  tech.name AS technician_name, q.name AS qc_name
`;
const ORDER_JOINS = `
  FROM job_orders o
  LEFT JOIN users d ON d.id = o.dentist_user_id
  LEFT JOIN users des ON des.id = o.assigned_designer_id
  LEFT JOIN users tech ON tech.id = o.assigned_technician_id
  LEFT JOIN users q ON q.id = o.assigned_qc_id
`;

async function createOrder(fields) {
  const {
    clinicId, dentistUserId, patientRef, jobType, stageType, shade, instructions,
    scanBody, implantSystem, abutmentSize, abutmentAvailability, deliveryMethod,
    targetDate, priority, prescription
  } = fields;
  const { rows } = await query(
    `INSERT INTO job_orders
      (clinic_id, dentist_user_id, patient_ref, job_type, stage_type, shade, instructions,
       scan_body, implant_system, abutment_size, abutment_availability, delivery_method,
       target_date, priority, prescription)
     -- Both cast explicitly: Postgres cannot infer a bare parameter's type
     -- against an enum column or a DATE, and an untyped one fails at
     -- execution with a datatype mismatch rather than at parse time.
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::date,$14::job_priority,$15::jsonb)
     RETURNING ${ORDER_COLUMNS}`,
    [clinicId || null, dentistUserId, patientRef, jobType, stageType || 'final', shade || null, instructions || null,
     scanBody || null, implantSystem || null, abutmentSize || null, abutmentAvailability || null, deliveryMethod || null,
     targetDate || null, priority || 'normal', prescription ? JSON.stringify(prescription) : null]
  );
  return rows[0];
}

async function getOrder(id, lock = false) {
  // Accepts either the UUID primary key or the human order_number (e.g.
  // "JO-1001") — cast id to text so both sides of the OR compare as the
  // same type; without it Postgres can't infer $1's type unambiguously
  // against a uuid column and a text column in the same query.
  const column = /^[0-9a-f-]{36}$/i.test(String(id)) ? 'id' : 'order_number';
  // FOR UPDATE OF o, not a bare FOR UPDATE: the joins above are only there
  // to read assignee names, and locking those users rows too would let two
  // unrelated orders that share a designer serialise against each other.
  const { rows } = await query(`SELECT ${ORDER_SELECT} ${ORDER_JOINS} WHERE o.${column} = $1${lock ? ' FOR UPDATE OF o' : ''}`, [String(id)]);
  return rows[0] || null;
}

// One filter per lab role's own queue, plus 'all' for admin/lab-manager
// oversight and 'dentist' for a doctor's own submissions. Kept as a single
// function with a switch (rather than one query fn per role) since every
// case is "job_orders where <role-specific column/status match>" — a
// shared shape, not five unrelated queries.
async function listOrders(role, userId, {limit=200,offset=0}={}) {
  const column={dentist:'dentist_user_id',designer:'assigned_designer_id',technician:'assigned_technician_id',qc:'assigned_qc_id'}[role];
  const params=[Math.min(1000,Math.max(1,Number(limit)||200)),Math.max(0,Math.floor(Number(offset)||0))];
  if(column)params.push(userId);
  // Urgent first, then whatever is due soonest, then newest — the order a
  // person working a queue top-to-bottom would pick things up in anyway.
  // Undated cases sort after dated ones rather than ahead of them, so
  // adding a target date moves work up the list, never down.
  const {rows}=await query(
    `SELECT ${ORDER_SELECT} ${ORDER_JOINS} ${column ? 'WHERE o.'+column+'=$3' : ''}
     ORDER BY o.priority DESC, o.target_date ASC NULLS LAST, o.created_at DESC, o.id LIMIT $1 OFFSET $2`, params);
  return rows;
}

const UPDATABLE = new Set([
  'status','stage_type','assigned_designer_id','assigned_technician_id','assigned_qc_id','rejection_note','delivered_at',
  'priority','target_date','blocked_reason','blocked_at','blocked_by','blocked_from'
]);

async function updateOrder(id, fields) {
  const keys = Object.keys(fields);
  if(keys.some(k=>!UPDATABLE.has(k)))throw new Error('Unsupported order update.');
  if (!keys.length) return getOrder(id);
  const set = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  // stage_entered_at is maintained here rather than at every call site:
  // the workflow service writes a status a couple of dozen times across
  // its transitions and any one of them forgetting would quietly corrupt
  // every time-in-stage figure in the product. `IS DISTINCT FROM` so it
  // only moves on a genuine change — a no-op re-write of the same status
  // must not reset the clock.
  const touchStage = keys.includes('status') ? ', stage_entered_at = CASE WHEN status IS DISTINCT FROM $' + (keys.indexOf('status') + 2) + ' THEN now() ELSE stage_entered_at END' : '';
  const { rows } = await query(
    `UPDATE job_orders SET ${set}${touchStage}, updated_at = now() WHERE id = $1 RETURNING ${ORDER_COLUMNS}`,
    [id, ...keys.map(k => fields[k])]
  );
  return rows[0] || null;
}

async function addStageHistory(orderId, { stageType, status, actorId, note }) {
  await query(
    `INSERT INTO job_stage_history (job_order_id, stage_type, status, actor_id, note) VALUES ($1,$2,$3,$4,$5)`,
    [orderId, stageType, status, actorId || null, note || null]
  );
}

async function listStageHistory(orderId) {
  const { rows } = await query(
    `SELECT h.*, u.name AS actor_name FROM job_stage_history h LEFT JOIN users u ON u.id = h.actor_id
     WHERE job_order_id = $1 ORDER BY created_at ASC LIMIT 1000`,
    [orderId]
  );
  return rows;
}

async function addAssignment(orderId, role, assignedTo, assignedBy) {
  // Close out any current holder of this role on this order before
  // opening a new one, so idx_assignments_current (unassigned_at IS NULL)
  // only ever matches the one live assignment per (order, role).
  await query(`UPDATE assignments SET unassigned_at = now() WHERE job_order_id = $1 AND role = $2 AND unassigned_at IS NULL`, [orderId, role]);
  await query(`INSERT INTO assignments (job_order_id, role, assigned_to, assigned_by) VALUES ($1,$2,$3,$4)`, [orderId, role, assignedTo, assignedBy || null]);
}

async function addApproval(orderId, { stageType, decisionType, outcome, decidedBy, note }) {
  await query(
    `INSERT INTO approvals (job_order_id, stage_type, decision_type, outcome, decided_by, note) VALUES ($1,$2,$3,$4,$5,$6)`,
    [orderId, stageType, decisionType, outcome, decidedBy, note || null]
  );
}

async function addFile(orderId, { stageType, category, url, publicId, uploadedBy }) {
  const { rows } = await query(
    `INSERT INTO case_files (job_order_id, stage_type, category, url, public_id, uploaded_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [orderId, stageType, category, url, publicId, uploadedBy || null]
  );
  return rows[0];
}

async function listFiles(orderId) {
  const { rows } = await query(`SELECT * FROM case_files WHERE job_order_id = $1 ORDER BY created_at DESC LIMIT 1000`, [orderId]);
  return rows;
}

async function addMessage(orderId, senderId, body, internal = false) {
  const { rows } = await query(
    `INSERT INTO case_messages (job_order_id, sender_id, body, internal) VALUES ($1,$2,$3,$4) RETURNING *`,
    [orderId, senderId, body, !!internal]
  );
  return rows[0];
}

// includeInternal is a caller decision, but a false value is enforced in
// SQL rather than by filtering the result afterwards — an internal note
// must never travel to a dentist's browser even inside a payload the UI
// intends to hide.
async function listMessages(orderId, includeInternal = true) {
  const { rows } = await query(
    `SELECT m.*, u.name AS sender_name, u.role AS sender_role FROM case_messages m
     JOIN users u ON u.id = m.sender_id
     WHERE job_order_id = $1${includeInternal ? '' : ' AND m.internal = false'}
     ORDER BY created_at ASC LIMIT 1000`,
    [orderId]
  );
  return rows;
}

// Every gated decision taken on a case: reception's accept/reject, the
// doctor's demo verdict, and each QC pass/fail. The QC rows are what make
// "failed twice, here's why" answerable without re-reading free text out
// of the timeline.
async function listApprovals(orderId) {
  const { rows } = await query(
    `SELECT a.*, u.name AS decided_by_name FROM approvals a
     LEFT JOIN users u ON u.id = a.decided_by
     WHERE job_order_id = $1 ORDER BY created_at ASC LIMIT 500`,
    [orderId]
  );
  return rows;
}

async function listStaff(role) {
  const { rows } = await query(`SELECT id, username, name FROM users WHERE role = $1 AND active ORDER BY name`, [role]);
  return rows;
}

async function getUserByRole(role) {
  const { rows } = await query(`SELECT id, username, name FROM users WHERE role = $1 AND active ORDER BY created_at LIMIT 1`, [role]);
  return rows[0] || null;
}

// Search, scoped by the same rule that scopes a role's queue: a dentist
// can only ever match their own cases, and no caller can widen that from
// the request. Matching is on the two things people actually search by —
// the case number and the patient reference — plus the clinic's name for
// lab-side roles, who think in doctors rather than references.
//
// The result count is capped low on purpose. This is a "find the case I
// am thinking of" box, not a reporting tool, and an unbounded LIKE over a
// growing table is how a search box becomes the slowest page in an app.
async function searchOrders(role, userId, term, limit = 8) {
  const q = String(term || '').trim();
  if (q.length < 2) return [];
  const like = '%' + q.replace(/[%_\\]/g, ch => '\\' + ch) + '%';
  const prefix = q.replace(/[%_\\]/g, ch => '\\' + ch) + '%';
  const scope = role === 'dentist' ? 'AND o.dentist_user_id = $4' : '';
  const params = [like, prefix, Math.min(20, Math.max(1, limit))];
  if (role === 'dentist') params.push(userId);
  const { rows } = await query(
    `SELECT ${ORDER_SELECT} ${ORDER_JOINS}
     WHERE (o.order_number ILIKE $2 OR o.patient_ref ILIKE $1
            ${role === 'dentist' ? '' : "OR d.name ILIKE $1"})
       ${scope}
     ORDER BY o.updated_at DESC LIMIT $3`, params);
  return rows;
}

// People, for the roles allowed to look them up. Admin searches clinics;
// nobody else gets a directory.
async function searchDentists(term, limit = 5) {
  const q = String(term || '').trim();
  if (q.length < 2) return [];
  const like = '%' + q.replace(/[%_\\]/g, ch => '\\' + ch) + '%';
  const { rows } = await query(
    `SELECT u.id, u.name, u.username,
            count(o.id) FILTER (WHERE o.status NOT IN ('completed')) AS active_cases
     FROM users u LEFT JOIN job_orders o ON o.dentist_user_id = u.id
     WHERE u.role = 'dentist' AND u.active AND u.name ILIKE $1
     GROUP BY u.id, u.name, u.username ORDER BY u.name LIMIT $2`, [like, Math.min(10, limit)]);
  return rows.map(r => ({ ...r, active_cases: Number(r.active_cases) }));
}

// Two aggregates for the admin/lab analytics panels. Both are deliberately
// single queries over indexed columns rather than "fetch every case and
// its history, then reduce in Node" — the second shape is what turns an
// analytics tab into the slowest page in an application.
async function completionSamples(limit = 500) {
  const { rows } = await query(
    `SELECT h.job_order_id, o.job_type, o.created_at, h.created_at AS completed_at
     FROM job_stage_history h JOIN job_orders o ON o.id = h.job_order_id
     WHERE h.status = 'completed' ORDER BY h.created_at DESC LIMIT $1`, [Math.min(2000, limit)]);
  return rows;
}

async function qcSamples(limit = 1000) {
  const { rows } = await query(
    `SELECT job_order_id, outcome, note, created_at FROM approvals
     WHERE decision_type = 'qc_review' ORDER BY created_at DESC LIMIT $1`, [Math.min(5000, limit)]);
  return rows;
}

module.exports = {
  createOrder, getOrder, listOrders, updateOrder,
  addStageHistory, listStageHistory, addAssignment, addApproval,
  addFile, listFiles, addMessage, listMessages, listApprovals, listStaff, getUserByRole,
  completionSamples, qcSamples, searchOrders, searchDentists,
  getClient, transaction
};
