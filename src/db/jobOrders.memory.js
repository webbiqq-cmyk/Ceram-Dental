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

const jobOrders = [];
const jobStageHistory = [];
const assignments = [];
const caseFiles = [];
const caseMessages = [];
const approvals = [];
let orderSeq = 1000;

function userById(id) { return require('../models/user.model').users.find(u => u.id === id) || null; }

async function createOrder(fields) {
  if(jobOrders.length>=10000)throw Object.assign(new Error('Development storage is full.'),{status:503});
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

async function listOrders(role,userId,{limit=200,offset=0}={}) {
  // Demo/in-memory semantics: each lab-role dashboard shows every order at
  // its stage, not only ones assigned to the caller. Login is disabled
  // here (src/middleware/auth.js), so the caller is a shared placeholder
  // identity — filtering by assigned_*_id would hide everything. The
  // Postgres-backed repo keeps the stricter per-assignee filter for real
  // logins; this mirrors the pre-hardening behaviour for the offline demo.
  const byStatus = {
    designer: ['assigned_to_designer', 'in_design', 'design_done', 'doctor_approved', 'waiting_doctor_approval'],
    technician: ['assigned_to_technician', 'in_production', 'production_done'],
    qc: ['qc_pending', 'qc_rejected', 'qc_approved'],
    doctor_approval: ['waiting_doctor_approval']
  }[role];
  let rows;
  if (byStatus) rows = jobOrders.filter(o => byStatus.includes(o.status));
  else if (role === 'dentist') rows = jobOrders.filter(o => o.dentist_user_id === userId);
  else rows = jobOrders.slice(); // receptionist / admin / lab — unfiltered
  if (require('../config/env').LOGIN_REQUIRED) {
    const key = { dentist: 'dentist_user_id', designer: 'assigned_designer_id', technician: 'assigned_technician_id', qc: 'assigned_qc_id' }[role];
    if (key) rows = rows.filter(o => o[key] === userId);
  }
  return rows.slice(offset, offset + limit);
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

async function listStaff(role) { return (await require('../models/user.model').list()).filter(u=>u.active && u.role===role); }
async function getUserByRole(role) { return (await listStaff(role))[0] || null; }
async function transaction(fn) {
  return require('./records').transaction(async()=>{
    const arrays=[jobOrders,jobStageHistory,assignments,caseFiles,caseMessages,approvals];
    const snapshots=arrays.map(a=>structuredClone(a));
    try { return await fn(); } catch(e) { arrays.forEach((a,i)=>a.splice(0,a.length,...snapshots[i])); throw e; }
  });
}

module.exports = {
  transaction, createOrder, getOrder, listOrders, updateOrder,
  addStageHistory, listStageHistory, addAssignment, addApproval,
  addFile, listFiles, addMessage, listMessages, listStaff, getUserByRole
};
