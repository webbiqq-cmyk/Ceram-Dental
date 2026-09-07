// In-memory fallback for the exact same interface as jobOrders.repo.js —
// used automatically whenever DATABASE_URL isn't set (see
// jobOrders.store.js), so the lab workflow system works on a fresh
// deployment with zero setup, exactly like every other model in this
// codebase (src/models/*.js) already does for the rest of the site. The
// entire state machine (src/services/workflow.service.js) is written
// against this interface, not against SQL directly, so it runs
// identically on either backend — nothing here is a simplified version
// of the rules, only of the storage.
//
// Same trade-off as every other in-memory model: resets on restart /
// cold start, and isn't shared across concurrent serverless instances.
// Setting DATABASE_URL switches to the real, persistent Postgres-backed
// jobOrders.repo.js with no code change anywhere else — see README's
// "Lab workflow system" section.
const crypto = require('crypto');

function uuid() { return crypto.randomUUID(); }
function now() { return new Date(); }

// ---- seed data, mirroring src/db/migrations/005_seed_workflow_users.sql ----
const CLINIC_ID = '00000000-0000-0000-0000-000000000001';
const clinics = [{ id: CLINIC_ID, name: 'Bright Smile Clinic', phone: '+973 3900 1122', email: 'hello@brightsmile.example', address: 'Manama, Bahrain' }];

const users = [
  { id: '00000000-0000-0000-0000-000000000010', username: 'dentist', role: 'dentist', name: 'Dr. R. Haddad', clinic_id: CLINIC_ID, active: true, created_at: now() },
  { id: '00000000-0000-0000-0000-000000000011', username: 'receptionist', role: 'receptionist', name: 'Reception Desk', active: true, created_at: now() },
  { id: '00000000-0000-0000-0000-000000000012', username: 'qc', role: 'qc', name: 'Quality Desk', active: true, created_at: now() },
  { id: '00000000-0000-0000-0000-000000000020', username: 'rana', role: 'designer', name: 'Rana', active: true, created_at: now() },
  { id: '00000000-0000-0000-0000-000000000021', username: 'omar', role: 'designer', name: 'Omar', active: true, created_at: now() },
  { id: '00000000-0000-0000-0000-000000000030', username: 'malvin', role: 'technician', name: 'Malvin', active: true, created_at: now() },
  { id: '00000000-0000-0000-0000-000000000031', username: 'layla', role: 'technician', name: 'Layla', active: true, created_at: now() }
];

const jobOrders = [];
const jobStageHistory = [];
const assignments = [];
const caseFiles = [];
const caseMessages = [];
const approvals = [];
let orderSeq = 1000;

function userById(id) { return users.find(u => u.id === id) || null; }

async function createOrder(fields) {
  orderSeq += 1;
  const row = {
    id: uuid(), order_number: 'JO-' + orderSeq,
    clinic_id: null, dentist_user_id: fields.dentistUserId, patient_ref: fields.patientRef, job_type: fields.jobType,
    stage_type: fields.stageType || 'final', status: 'submitted',
    shade: fields.shade || null, instructions: fields.instructions || null,
    scan_body: fields.scanBody || null, implant_system: fields.implantSystem || null,
    abutment_size: fields.abutmentSize || null, abutment_availability: fields.abutmentAvailability || null,
    assigned_designer_id: null, assigned_technician_id: null, assigned_qc_id: null,
    rejection_note: null, delivery_method: fields.deliveryMethod || null, delivered_at: null,
    created_at: now(), updated_at: now()
  };
  if (fields.clinicId) row.clinic_id = fields.clinicId;
  jobOrders.unshift(row);
  return row;
}

async function getOrder(id) {
  return jobOrders.find(o => o.id === id || o.order_number === id) || null;
}

async function listOrders(role, userId) {
  if (role === 'dentist') return jobOrders.filter(o => o.dentist_user_id === userId);
  if (role === 'designer') return jobOrders.filter(o => ['assigned_to_designer', 'in_design', 'design_done'].includes(o.status));
  if (role === 'technician') return jobOrders.filter(o => ['assigned_to_technician', 'in_production', 'production_done'].includes(o.status));
  if (role === 'qc') return jobOrders.filter(o => ['qc_pending', 'qc_rejected', 'qc_approved'].includes(o.status));
  if (role === 'doctor_approval') return jobOrders.filter(o => o.status === 'waiting_doctor_approval');
  return jobOrders.slice(); // receptionist / admin / lab: unfiltered, same as the SQL version
}

async function updateOrder(id, fields) {
  const row = await getOrder(id);
  if (!row) return null;
  Object.assign(row, fields, { updated_at: now() });
  return row;
}

async function addStageHistory(orderId, { stageType, status, actorId, note }) {
  jobStageHistory.push({ id: uuid(), job_order_id: orderId, stage_type: stageType, status, actor_id: actorId || null, note: note || null, created_at: now() });
}

async function listStageHistory(orderId) {
  return jobStageHistory
    .filter(h => h.job_order_id === orderId)
    .sort((a, b) => a.created_at - b.created_at)
    .map(h => Object.assign({}, h, { actor_name: h.actor_id ? (userById(h.actor_id) || {}).name || null : null }));
}

async function addAssignment(orderId, role, assignedTo, assignedBy) {
  assignments.filter(a => a.job_order_id === orderId && a.role === role && !a.unassigned_at).forEach(a => { a.unassigned_at = now(); });
  assignments.push({ id: uuid(), job_order_id: orderId, role, assigned_to: assignedTo, assigned_by: assignedBy || null, assigned_at: now(), unassigned_at: null });
}

async function addApproval(orderId, { stageType, decisionType, outcome, decidedBy, note }) {
  approvals.push({ id: uuid(), job_order_id: orderId, stage_type: stageType, decision_type: decisionType, outcome, decided_by: decidedBy, note: note || null, created_at: now() });
}

async function addFile(orderId, { stageType, category, url, publicId, uploadedBy }) {
  const row = { id: uuid(), job_order_id: orderId, stage_type: stageType, category, url, public_id: publicId, uploaded_by: uploadedBy || null, created_at: now() };
  caseFiles.unshift(row);
  return row;
}

async function listFiles(orderId) { return caseFiles.filter(f => f.job_order_id === orderId); }

async function addMessage(orderId, senderId, body) {
  const row = { id: uuid(), job_order_id: orderId, sender_id: senderId, body, created_at: now(), read_at: null };
  caseMessages.push(row);
  return row;
}

async function listMessages(orderId) {
  return caseMessages
    .filter(m => m.job_order_id === orderId)
    .sort((a, b) => a.created_at - b.created_at)
    .map(m => { const u = userById(m.sender_id) || {}; return Object.assign({}, m, { sender_name: u.name || null, sender_role: u.role || null }); });
}

async function listStaff(role) {
  return users.filter(u => u.role === role && u.active).map(u => ({ id: u.id, username: u.username, name: u.name })).sort((a, b) => a.name.localeCompare(b.name));
}

async function getUserByRole(role) {
  const u = users.filter(x => x.role === role && x.active).sort((a, b) => a.created_at - b.created_at)[0];
  return u ? { id: u.id, username: u.username, name: u.name } : null;
}

module.exports = {
  createOrder, getOrder, listOrders, updateOrder,
  addStageHistory, listStageHistory, addAssignment, addApproval,
  addFile, listFiles, addMessage, listMessages, listStaff, getUserByRole
};
