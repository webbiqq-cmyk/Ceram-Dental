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
function nameOf(id) { return id ? (userById(id) || {}).name || null : null; }

// The Postgres side resolves assignee names with a join (see
// jobOrders.repo.js ORDER_SELECT); here it's a lookup, applied on the way
// out so the stored row stays a faithful copy of the table's own columns
// and nothing writes a derived name back into it.
function decorate(row) {
  if (!row) return row;
  return Object.assign({}, row, {
    dentist_name: nameOf(row.dentist_user_id),
    designer_name: nameOf(row.assigned_designer_id),
    technician_name: nameOf(row.assigned_technician_id),
    qc_name: nameOf(row.assigned_qc_id)
  });
}

const PRIORITY_RANK = { urgent: 3, priority: 2, normal: 1 };

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
    created_at: now(), updated_at: now(),
    priority: fields.priority || 'normal', target_date: fields.targetDate || null,
    blocked_reason: null, blocked_at: null, blocked_by: null, blocked_from: null,
    stage_entered_at: now()
  };
  if (fields.clinicId) row.clinic_id = fields.clinicId;
  jobOrders.unshift(row);
  return decorate(row);
}

// Internal: the raw stored row, which updateOrder has to mutate in place.
function findRow(id) { return jobOrders.find(o => o.id === id || o.order_number === id) || null; }

async function getOrder(id) {
  return decorate(findRow(id));
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
    technician: ['assigned_to_technician', 'in_production', 'production_done', 'blocked'],
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
  // Same ordering rule as the SQL backend: urgent first, soonest target
  // next, newest last — so a queue reads identically on either store.
  rows = rows.slice().sort((a, b) =>
    (PRIORITY_RANK[b.priority] || 1) - (PRIORITY_RANK[a.priority] || 1) ||
    (a.target_date ? new Date(a.target_date) : Infinity) - (b.target_date ? new Date(b.target_date) : Infinity) ||
    new Date(b.created_at) - new Date(a.created_at));
  return rows.slice(offset, offset + limit).map(decorate);
}

async function updateOrder(id, fields) {
  const row = findRow(id);
  if (!row) return null;
  // Mirrors the repo's stage_entered_at rule — only a genuine status
  // change restarts the time-in-stage clock.
  const stageMoved = Object.prototype.hasOwnProperty.call(fields, 'status') && fields.status !== row.status;
  Object.assign(row, fields, { updated_at: now() }, stageMoved ? { stage_entered_at: now() } : {});
  return decorate(row);
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

async function addMessage(orderId, senderId, body, internal = false) {
  const row = { id: uuid(), job_order_id: orderId, sender_id: senderId, body, internal: !!internal, created_at: now(), read_at: null };
  caseMessages.push(row);
  return row;
}

async function listMessages(orderId, includeInternal = true) {
  return caseMessages
    .filter(m => m.job_order_id === orderId && (includeInternal || !m.internal))
    .sort((a, b) => a.created_at - b.created_at)
    .map(m => { const u = userById(m.sender_id) || {}; return Object.assign({}, m, { sender_name: u.name || null, sender_role: u.role || null }); });
}

async function listApprovals(orderId) {
  return approvals
    .filter(a => a.job_order_id === orderId)
    .sort((a, b) => a.created_at - b.created_at)
    .map(a => Object.assign({}, a, { decided_by_name: nameOf(a.decided_by) }));
}

// Same contract and the same scoping rule as the SQL backend, so a search
// behaves identically whichever store is behind it.
async function searchOrders(role, userId, term, limit = 8) {
  const q = String(term || '').trim().toLowerCase();
  if (q.length < 2) return [];
  const scoped = role === 'dentist' ? jobOrders.filter(o => o.dentist_user_id === userId) : jobOrders;
  return scoped
    .map(decorate)
    .filter(o =>
      String(o.order_number || '').toLowerCase().startsWith(q) ||
      String(o.patient_ref || '').toLowerCase().includes(q) ||
      (role !== 'dentist' && String(o.dentist_name || '').toLowerCase().includes(q)))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, Math.min(20, Math.max(1, limit)));
}

async function searchDentists(term, limit = 5) {
  const q = String(term || '').trim().toLowerCase();
  if (q.length < 2) return [];
  const users = await require('../models/user.model').list();
  return users
    .filter(u => u.active && u.role === 'dentist' && String(u.name || '').toLowerCase().includes(q))
    .slice(0, Math.min(10, limit))
    .map(u => ({
      id: u.id, name: u.name, username: u.username,
      active_cases: jobOrders.filter(o => o.dentist_user_id === u.id && o.status !== 'completed').length
    }));
}

async function completionSamples(limit = 500) {
  return jobStageHistory
    .filter(h => h.status === 'completed')
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, limit)
    .map(h => { const o = findRow(h.job_order_id) || {}; return { job_order_id: h.job_order_id, job_type: o.job_type, created_at: o.created_at, completed_at: h.created_at }; });
}

async function qcSamples(limit = 1000) {
  return approvals
    .filter(a => a.decision_type === 'qc_review')
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, limit)
    .map(a => ({ job_order_id: a.job_order_id, outcome: a.outcome, note: a.note, created_at: a.created_at }));
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
  addFile, listFiles, addMessage, listMessages, listApprovals, listStaff, getUserByRole,
  completionSamples, qcSamples, searchOrders, searchDentists
};
