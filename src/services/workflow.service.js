// The lab workflow's state machine — every status transition in the
// system lives here, in one place, rather than scattered across
// controllers (the mistake the older src/models/case.model.js's
// actOnCase() made, worth not repeating at 5x the number of states).
// Controllers only translate an HTTP request into a call here and the
// result back into JSON; every rule about what's allowed to happen next
// is decided in this file.
const repo = require('../db/jobOrders.store');
const { WorkflowError } = require('../utils/errors');
const { LOGIN_REQUIRED } = require('../config/env');

const IMPLANT_TYPES = ['implant_crown', 'implant_bridge'];
function requiresImplantFields(jobType) { return IMPLANT_TYPES.includes(jobType); }

const { AsyncLocalStorage } = require('node:async_hooks');
const actors = new AsyncLocalStorage();
async function resolveActorId() {
  const actor = actors.getStore();
  if (!actor) throw new WorkflowError('Authenticated actor is required.');
  return actor.sub;
}
function canAccess(order, actor) {
  // Login disabled (demo / open auth): every workflow role resolves to a
  // shared placeholder identity, so per-assignee ownership can't be
  // enforced — any workflow role may open any order, matching what the
  // dashboards already list.
  if (!LOGIN_REQUIRED) return true;
  if (['admin','lab','receptionist'].includes(actor.role)) return true;
  const key = {dentist:'dentist_user_id',designer:'assigned_designer_id',technician:'assigned_technician_id',qc:'assigned_qc_id'}[actor.role];
  return !!key && order[key] === actor.sub;
}
async function runAs(actor, id, mutation, fn) {
  if (!actor) throw new WorkflowError('Sign in required.');
  return repo.transaction(async () => {
    if (id) {
      const order = await repo.getOrder(id, mutation);
      if (!order || !canAccess(order, actor)) throw Object.assign(new Error('Order not found.'),{status:404,expose:true});
      id = order.id;
    }
    return actors.run(actor, () => fn(id));
  });
}
async function checkAssignee(id, role) {
  const user = await require('../models/user.model').findById(id);
  if (!user || !user.active || user.role !== role) throw new WorkflowError('Choose an active '+role+' account.');
}

async function getOrderDetail(orderId) {
  const order = await repo.getOrder(orderId);
  if (!order) return null;
  const [history, files, messages] = await Promise.all([
    repo.listStageHistory(order.id), repo.listFiles(order.id), repo.listMessages(order.id)
  ]);
  return { order, history, files:files.map(require('../utils/filePolicy').downloadLink), messages };
}

async function listOrders(role, userId, options) { return repo.listOrders(role, userId, options); }

async function createOrder(input) {
  if (!input.patientRef || !String(input.patientRef).trim()) throw new WorkflowError('Patient reference is required.');
  if (!['veneers','crowns','bridges','implant_crown','implant_bridge','ortho_work','trays','night_guard','bleaching_tray','essix_retainer','surgical_guide','functional_mockup','other'].includes(input.jobType)) throw new WorkflowError('Unknown job type.');
  if (input.deliveryMethod && !['pickup','delivery'].includes(input.deliveryMethod)) throw new WorkflowError('Unknown delivery method.');
  if (requiresImplantFields(input.jobType) && (!input.scanBody || !input.implantSystem || !input.abutmentSize)) {
    throw new WorkflowError('Scan body, implant system and abutment size are required for implant cases.');
  }
  const dentistUserId = await resolveActorId();
  const dentist = await require('../models/user.model').findById(dentistUserId);
  input.clinicId = dentist?.clinic_id || null;
  // Veneers are the one job that starts life in the demo/mockup stage;
  // everything else only ever has a "final" stage_type (see doctorDecision
  // below for the one place a veneer flips from demo to final).
  const stageType = input.jobType === 'veneers' ? 'demo' : 'final';
  const order = await repo.createOrder(Object.assign({}, input, { dentistUserId, stageType }));
  await repo.addStageHistory(order.id, { stageType: order.stage_type, status: 'submitted', actorId: dentistUserId, note: 'Order submitted' });
  await repo.updateOrder(order.id, { status: 'pending_reception_review' });
  await repo.addStageHistory(order.id, { stageType: order.stage_type, status: 'pending_reception_review', actorId: dentistUserId });
  return repo.getOrder(order.id);
}

// Reception's accept/reject. Accepting requires a designer to hand the
// order to in the same call — leaving an order "accepted but assigned to
// no one" is a state nobody's dashboard would ever surface again.
async function receptionReview(orderId, { decision, note, designerId, technicianId, paymentChecked, detailsChecked }) {
  const order = await repo.getOrder(orderId);
  if (!order) throw new WorkflowError('Order not found.');
  if (order.status !== 'pending_reception_review') throw new WorkflowError('This order is not awaiting reception review.');
  const actorId = await resolveActorId('receptionist');

  if (decision === 'reject') {
    if (!note || !note.trim()) throw new WorkflowError('A rejection note is required.');
    await repo.updateOrder(orderId, { status: 'rejected_by_reception', rejection_note: note });
    await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'rejected_by_reception', actorId, note });
    await repo.addApproval(orderId, { stageType: order.stage_type, decisionType: 'reception_review', outcome: 'rejected', decidedBy: actorId, note });
    return getOrderDetail(orderId);
  }
  if (decision === 'accept') {
    if (paymentChecked !== true || detailsChecked !== true) throw new WorkflowError('Confirm payment status and required details before accepting.');
    note = ['Payment status checked; required details complete.', note].filter(Boolean).join(' ');
    if (technicianId && order.job_type === 'veneers') throw new WorkflowError('Veneers require demo/design review.');
    if (technicianId) await checkAssignee(technicianId, 'technician');
    else await checkAssignee(designerId, 'designer');
    await repo.updateOrder(orderId, { status: 'accepted_by_reception' });
    await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'accepted_by_reception', actorId, note });
    await repo.addApproval(orderId, { stageType: order.stage_type, decisionType: 'reception_review', outcome: 'accepted', decidedBy: actorId, note });
    if (technicianId) {
      await repo.addAssignment(orderId, 'technician', technicianId, actorId);
      await repo.updateOrder(orderId, { assigned_technician_id: technicianId, status: 'in_production' });
      await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'in_production', actorId, note: 'No design required; sent directly to production' });
    } else await assignDesigner(orderId, designerId, actorId);
    return getOrderDetail(orderId);
  }
  throw new WorkflowError('Unknown decision — expected "accept" or "reject".');
}

async function assignDesigner(orderId, designerId, actorId) {
  const order = await repo.getOrder(orderId);
  await repo.addAssignment(orderId, 'designer', designerId, actorId || null);
  await repo.updateOrder(orderId, { assigned_designer_id: designerId, status: 'in_design' });
  await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'assigned_to_designer', actorId });
  await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'in_design', actorId });
  return getOrderDetail(orderId);
}

// The designer's "mark done" hands straight to a chosen technician, same
// reasoning as receptionReview's combined accept+assign.
async function designDone(orderId, technicianId) {
  const order = await repo.getOrder(orderId);
  if (!order) throw new WorkflowError('Order not found.');
  if (!(order.status === 'in_design' || (order.status === 'doctor_approved' && order.job_type === 'veneers' && order.stage_type === 'final'))) throw new WorkflowError('This order is not currently in design.');
  if (order.job_type === 'veneers' && order.stage_type === 'demo') {
    const actorId = await resolveActorId();
    await repo.updateOrder(orderId, { status: 'waiting_doctor_approval' });
    await repo.addStageHistory(orderId, { stageType: 'demo', status: 'waiting_doctor_approval', actorId, note: 'Demo/design ready for doctor review' });
    return getOrderDetail(orderId);
  }
  await checkAssignee(technicianId, 'technician');
  const actorId = await resolveActorId();
  await repo.updateOrder(orderId, { status: 'design_done' });
  await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'design_done', actorId });
  await repo.addAssignment(orderId, 'technician', technicianId, actorId);
  await repo.updateOrder(orderId, { assigned_technician_id: technicianId, status: 'in_production' });
  await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'assigned_to_technician', actorId });
  await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'in_production', actorId });
  return getOrderDetail(orderId);
}

async function productionDone(orderId, qcId) {
  const order = await repo.getOrder(orderId);
  if (!order) throw new WorkflowError('Order not found.');
  if (order.stage_type !== 'final' || order.status !== 'in_production') throw new WorkflowError('This order is not currently in production.');
  await checkAssignee(qcId, 'qc');
  const actorId = await resolveActorId();
  await repo.updateOrder(orderId, { status: 'production_done' });
  await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'production_done', actorId });
  await repo.addAssignment(orderId, 'qc', qcId, actorId);
  await repo.updateOrder(orderId, { assigned_qc_id: qcId, status: 'qc_pending' });
  await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'qc_pending', actorId });
  return getOrderDetail(orderId);
}

async function qcDecision(orderId, { decision, note, packed }) {
  const order = await repo.getOrder(orderId);
  if (!order) throw new WorkflowError('Order not found.');
  if (order.stage_type !== 'final' || order.status !== 'qc_pending') throw new WorkflowError('This order is not awaiting QC.');
  const actorId = await resolveActorId();

  if (decision === 'reject') {
    if (!note || !note.trim()) throw new WorkflowError('A note is required to send this back.');
    await repo.addApproval(orderId, { stageType: order.stage_type, decisionType: 'qc_review', outcome: 'rejected', decidedBy: actorId, note });
    await repo.updateOrder(orderId, { status: 'qc_rejected', rejection_note: note });
    await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'qc_rejected', actorId, note });
    // Back to the same technician's queue — status returns to
    // in_production so it reappears there, assignment untouched.
    await repo.updateOrder(orderId, { status: 'in_production' });
    await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'in_production', actorId, note: 'Returned by QC' });
    return getOrderDetail(orderId);
  }
  if (decision === 'approve') {
    if (packed !== true || typeof note !== 'string' || !note.trim()) throw new WorkflowError('Record QC findings and confirm packing before approval.');
    note = note.trim() + '\nPacking confirmed.';
    await repo.addApproval(orderId, { stageType: order.stage_type, decisionType: 'qc_review', outcome: 'approved', decidedBy: actorId, note });
    await repo.updateOrder(orderId, { status: 'qc_approved' });
    await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'qc_approved', actorId, note });
    return getOrderDetail(orderId);
  }
  throw new WorkflowError('Unknown decision — expected "approve" or "reject".');
}

// Only veneer demo/design requires doctor approval.
async function doctorDecision(orderId, { decision, note }) {
  const order = await repo.getOrder(orderId);
  if (!order) throw new WorkflowError('Order not found.');
  if (order.job_type !== 'veneers' || order.stage_type !== 'demo' || order.status !== 'waiting_doctor_approval') throw new WorkflowError('This order is not awaiting doctor approval.');
  const actorId = await resolveActorId();

  if (decision === 'reject') {
    if (!note || !note.trim()) throw new WorkflowError('A note is required to request changes.');
    await repo.addApproval(orderId, { stageType: order.stage_type, decisionType: 'doctor_approval', outcome: 'rejected', decidedBy: actorId, note });
    await repo.updateOrder(orderId, { status: 'doctor_rejected', rejection_note: note });
    await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'doctor_rejected', actorId, note });
    // Back to design, same convention the older case pipeline already
    // uses for a doctor-requested change (case.model.js's 'reject'
    // action) — whoever's already assigned just picks it back up.
    await repo.updateOrder(orderId, { status: 'in_design' });
    await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'in_design', actorId, note: 'Returned by doctor for changes' });
    return getOrderDetail(orderId);
  }

  if (decision !== 'approve') throw new WorkflowError('Unknown decision — expected "approve" or "reject".');
  await repo.addApproval(orderId, { stageType: order.stage_type, decisionType: 'doctor_approval', outcome: 'approved', decidedBy: actorId, note });

  await repo.addStageHistory(orderId, { stageType: 'demo', status: 'doctor_approved', actorId, note: 'Demo approved. Requirements and design locked; changes require a new job order.' });
  await repo.updateOrder(orderId, { stage_type: 'final', status: 'doctor_approved', rejection_note: null });
  return getOrderDetail(orderId);
}

// Reception coordinates pickup or delivery after QC confirms packing.
async function confirmCompletion(orderId) {
  const order = await repo.getOrder(orderId);
  if (!order) throw new WorkflowError('Order not found.');
  if (order.stage_type !== 'final' || order.status !== 'qc_approved') throw new WorkflowError('QC must approve and confirm packing first.');
  const actorId = await resolveActorId('receptionist');
  const nextStatus = order.delivery_method === 'pickup' ? 'ready_for_pickup' : 'ready_for_delivery';
  await repo.updateOrder(orderId, { status: nextStatus });
  await repo.addStageHistory(orderId, { stageType: order.stage_type, status: nextStatus, actorId });
  return getOrderDetail(orderId);
}

async function markDelivered(orderId) {
  const order = await repo.getOrder(orderId);
  if (!order) throw new WorkflowError('Order not found.');
  if (!['ready_for_pickup', 'ready_for_delivery'].includes(order.status)) throw new WorkflowError('This order is not ready for delivery/pickup yet.');
  const actorId = await resolveActorId('receptionist');
  await repo.updateOrder(orderId, { status: 'delivered', delivered_at: new Date() });
  await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'delivered', actorId });
  return getOrderDetail(orderId);
}

async function markCompleted(orderId) {
  const order = await repo.getOrder(orderId);
  if (!order) throw new WorkflowError('Order not found.');
  if (!['ready_for_pickup', 'ready_for_delivery', 'delivered'].includes(order.status)) throw new WorkflowError('This order is not ready to be closed out yet.');
  const actorId = await resolveActorId('receptionist');
  await repo.updateOrder(orderId, { status: 'completed' });
  await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'completed', actorId });
  return getOrderDetail(orderId);
}

async function postMessage(orderId, senderRole, body) {
  if (!body || !body.trim()) throw new WorkflowError('Message cannot be empty.');
  const senderId = await resolveActorId(senderRole);
  return repo.addMessage(orderId, senderId, body.trim());
}

function assertFileAllowed(order, role, stageType, category) {
  if (order.job_type === 'veneers' && order.stage_type === 'final' && !(role === 'qc' && order.status === 'qc_pending' && stageType === 'final' && category === 'qc_photo')) {
    throw new WorkflowError('The approved veneer design is locked. Changes require a new job order. Only QC evidence may be added during inspection.');
  }
}

async function recordFile(orderId, { stageType, category, url, publicId, version, signature, uploaderRole }) {
  const order = await repo.getOrder(orderId);
  assertFileAllowed(order, actors.getStore()?.role, stageType, category);
  const {validateFile} = require('../utils/filePolicy');
  validateFile(orderId, {url, publicId, version, signature, stageType, category});
  const uploadedBy = uploaderRole ? await resolveActorId(uploaderRole) : null;
  return repo.addFile(orderId, { stageType: stageType || 'final', category: category || 'other', url, publicId, uploadedBy });
}

module.exports = {
  assertFileAllowed, runAs, canAccess, requiresImplantFields, resolveActorId, getOrderDetail, listOrders, createOrder,
  receptionReview, assignDesigner, designDone, productionDone, qcDecision, doctorDecision,
  confirmCompletion, markDelivered, markCompleted, postMessage, recordFile
};
