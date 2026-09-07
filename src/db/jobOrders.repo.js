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
  delivery_method, delivered_at, created_at, updated_at
`;

async function createOrder(fields) {
  const {
    clinicId, dentistUserId, patientRef, jobType, stageType, shade, instructions,
    scanBody, implantSystem, abutmentSize, abutmentAvailability, deliveryMethod
  } = fields;
  const { rows } = await query(
    `INSERT INTO job_orders
      (clinic_id, dentist_user_id, patient_ref, job_type, stage_type, shade, instructions,
       scan_body, implant_system, abutment_size, abutment_availability, delivery_method)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING ${ORDER_COLUMNS}`,
    [clinicId || null, dentistUserId, patientRef, jobType, stageType || 'final', shade || null, instructions || null,
     scanBody || null, implantSystem || null, abutmentSize || null, abutmentAvailability || null, deliveryMethod || null]
  );
  return rows[0];
}

async function getOrder(id, lock = false) {
  // Accepts either the UUID primary key or the human order_number (e.g.
  // "JO-1001") — cast id to text so both sides of the OR compare as the
  // same type; without it Postgres can't infer $1's type unambiguously
  // against a uuid column and a text column in the same query.
  const column = /^[0-9a-f-]{36}$/i.test(String(id)) ? 'id' : 'order_number';
  const { rows } = await query(`SELECT ${ORDER_COLUMNS} FROM job_orders WHERE ${column} = $1${lock ? ' FOR UPDATE' : ''}`, [String(id)]);
  return rows[0] || null;
}

// One filter per lab role's own queue, plus 'all' for admin/lab-manager
// oversight and 'dentist' for a doctor's own submissions. Kept as a single
// function with a switch (rather than one query fn per role) since every
// case is "job_orders where <role-specific column/status match>" — a
// shared shape, not five unrelated queries.
async function listOrders(role, userId, {limit=200,offset=0}={}) {
  const column={dentist:'dentist_user_id',designer:'assigned_designer_id',technician:'assigned_technician_id',qc:'assigned_qc_id'}[role];
  const params=[Math.min(201,Math.max(1,Number(limit)||200)),Math.max(0,Math.floor(Number(offset)||0))];
  if(column)params.push(userId);
  const {rows}=await query(`SELECT ${ORDER_COLUMNS} FROM job_orders ${column ? 'WHERE '+column+'=$3' : ''} ORDER BY created_at DESC,id LIMIT $1 OFFSET $2`,params);
  return rows;
}

async function updateOrder(id, fields) {
  const allowed=new Set(['status','stage_type','assigned_designer_id','assigned_technician_id','assigned_qc_id','rejection_note','delivered_at']);
  const keys = Object.keys(fields);
  if(keys.some(k=>!allowed.has(k)))throw new Error('Unsupported order update.');
  if (!keys.length) return getOrder(id);
  const set = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rows } = await query(
    `UPDATE job_orders SET ${set}, updated_at = now() WHERE id = $1 RETURNING ${ORDER_COLUMNS}`,
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

async function addMessage(orderId, senderId, body) {
  const { rows } = await query(
    `INSERT INTO case_messages (job_order_id, sender_id, body) VALUES ($1,$2,$3) RETURNING *`,
    [orderId, senderId, body]
  );
  return rows[0];
}

async function listMessages(orderId) {
  const { rows } = await query(
    `SELECT m.*, u.name AS sender_name, u.role AS sender_role FROM case_messages m
     JOIN users u ON u.id = m.sender_id WHERE job_order_id = $1 ORDER BY created_at ASC LIMIT 1000`,
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

module.exports = {
  createOrder, getOrder, listOrders, updateOrder,
  addStageHistory, listStageHistory, addAssignment, addApproval,
  addFile, listFiles, addMessage, listMessages, listStaff, getUserByRole,
  getClient, transaction
};
