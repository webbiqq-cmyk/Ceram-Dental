// The lab workflow's state machine — every status transition in the
// system lives here, in one place, rather than scattered across
// controllers (the mistake the older src/models/case.model.js's
// actOnCase() made, worth not repeating at 5x the number of states).
// Controllers only translate an HTTP request into a call here and the
// result back into JSON; every rule about what's allowed to happen next
// is decided in this file.
const repo = require('../db/jobOrders.repo');
const { WorkflowError } = require('../utils/errors');

const IMPLANT_TYPES = ['implant_crown', 'implant_bridge'];
function requiresImplantFields(jobType) { return IMPLANT_TYPES.includes(jobType); }

// Under the current shared/open-auth model (see src/middleware/auth.js —
// login is disabled site-wide right now) there is one seeded identity per
// single-person role backing every action against these tables; see
// migration 005. Once real per-account login is wired to this schema,
// this is the one function that changes — everywhere else already just
// takes an actorId/role and doesn't care where it came from.
async function resolveActorId(role) {
  const u = await repo.getUserByRole(role);
  if (!u) throw new WorkflowError('No seeded "' + role + '" account found — see src/db/migrations/005_seed_workflow_users.sql.');
  return u.id;
}

async function getOrderDetail(orderId) {
  const order = await repo.getOrder(orderId);
  if (!order) return null;
  const [history, files, messages] = await Promise.all([
    repo.listStageHistory(order.id), repo.listFiles(order.id), repo.listMessages(order.id)
  ]);
  return { order, history, files, messages };
}

async function listOrders(role, userId) {
  // A dentist request's userId is req.user.sub — under the current open-
  // auth bypass that's a synthetic placeholder ("no-auth-dentist"), not a
  // real row id, so it's never trusted here; it always resolves to the
  // one seeded dentist identity every order was actually created under
  // (see createOrder above). This is the same simplification throughout
  // this file: real per-doctor filtering needs real per-doctor login,
  // which doesn't exist yet.
  const effectiveUserId = role === 'dentist' ? await resolveActorId('dentist') : userId;
  return repo.listOrders(role, effectiveUserId);
}

async function createOrder(input) {
  if (!input.patientRef || !String(input.patientRef).trim()) throw new WorkflowError('Patient reference is required.');
  if (!input.jobType) throw new WorkflowError('Job type is required.');
  if (requiresImplantFields(input.jobType) && (!input.scanBody || !input.implantSystem || !input.abutmentSize)) {
    throw new WorkflowError('Scan body, implant system and abutment size are required for implant cases.');
  }
  const dentistUserId = input.dentistUserId || await resolveActorId('dentist');
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
async function receptionReview(orderId, { decision, note, designerId }) {
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
    if (!designerId) throw new WorkflowError('Choose a designer to assign this order to.');
    await repo.updateOrder(orderId, { status: 'accepted_by_reception' });
    await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'accepted_by_reception', actorId });
    await repo.addApproval(orderId, { stageType: order.stage_type, decisionType: 'reception_review', outcome: 'accepted', decidedBy: actorId, note });
    await assignDesigner(orderId, designerId, actorId);
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
  if (order.status !== 'in_design') throw new WorkflowError('This order is not currently in design.');
  if (!technicianId) throw new WorkflowError('Choose a technician to send this to.');
  const actorId = order.assigned_designer_id;
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
  if (order.status !== 'in_production') throw new WorkflowError('This order is not currently in production.');
  if (!qcId) throw new WorkflowError('Choose a QC reviewer.');
  const actorId = order.assigned_technician_id;
  await repo.updateOrder(orderId, { status: 'production_done' });
  await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'production_done', actorId });
  await repo.addAssignment(orderId, 'qc', qcId, actorId);
  await repo.updateOrder(orderId, { assigned_qc_id: qcId, status: 'qc_pending' });
  await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'qc_pending', actorId });
  return getOrderDetail(orderId);
}

async function qcDecision(orderId, { decision, note }) {
  const order = await repo.getOrder(orderId);
  if (!order) throw new WorkflowError('Order not found.');
  if (order.status !== 'qc_pending') throw new WorkflowError('This order is not awaiting QC.');
  const actorId = order.assigned_qc_id || await resolveActorId('qc');

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
    await repo.addApproval(orderId, { stageType: order.stage_type, decisionType: 'qc_review', outcome: 'approved', decidedBy: actorId, note });
    await repo.updateOrder(orderId, { status: 'qc_approved' });
    await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'qc_approved', actorId });
    await repo.updateOrder(orderId, { status: 'waiting_doctor_approval' });
    await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'waiting_doctor_approval', actorId });
    return getOrderDetail(orderId);
  }
  throw new WorkflowError('Unknown decision — expected "approve" or "reject".');
}

// The doctor's approve/reject — and the one place the veneer demo->final
// restart happens. Everything else in this file treats a veneer exactly
// like any other job; this function is where the two-step rule actually
// lives, deliberately isolated so it can't leak into the other transitions.
async function doctorDecision(orderId, { decision, note }) {
  const order = await repo.getOrder(orderId);
  if (!order) throw new WorkflowError('Order not found.');
  if (order.status !== 'waiting_doctor_approval') throw new WorkflowError('This order is not awaiting doctor approval.');
  const actorId = order.dentist_user_id;

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

  if (order.job_type === 'veneers' && order.stage_type === 'demo') {
    // The restart: same order row, same order number, same file/message
    // thread — flip to the final stage and re-enter the pipeline at
    // design instead of opening a second, disconnected order.
    await repo.updateOrder(orderId, { status: 'doctor_approved' });
    await repo.addStageHistory(orderId, { stageType: 'demo', status: 'doctor_approved', actorId, note: 'Demo approved — starting the final restoration' });
    await repo.updateOrder(orderId, { stage_type: 'final' });
    if (order.assigned_designer_id) {
      await assignDesigner(orderId, order.assigned_designer_id, actorId);
    } else {
      await repo.updateOrder(orderId, { status: 'accepted_by_reception' });
      await repo.addStageHistory(orderId, { stageType: 'final', status: 'accepted_by_reception', actorId });
    }
    return getOrderDetail(orderId);
  }

  await repo.updateOrder(orderId, { status: 'doctor_approved' });
  await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'doctor_approved', actorId });
  return getOrderDetail(orderId);
}

// Reception's final step — only reachable once the doctor has approved
// (and, for a veneer, only its *final* stage; a demo approval never
// reaches 'doctor_approved' — see doctorDecision above).
async function confirmCompletion(orderId) {
  const order = await repo.getOrder(orderId);
  if (!order) throw new WorkflowError('Order not found.');
  if (order.status !== 'doctor_approved') throw new WorkflowError('This order has not been approved by the doctor yet.');
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

async function recordFile(orderId, { stageType, category, url, publicId, uploaderRole }) {
  if (!url || !publicId) throw new WorkflowError('Missing upload result.');
  const uploadedBy = uploaderRole ? await resolveActorId(uploaderRole) : null;
  return repo.addFile(orderId, { stageType: stageType || 'final', category: category || 'other', url, publicId, uploadedBy });
}

module.exports = {
  requiresImplantFields, resolveActorId, getOrderDetail, listOrders, createOrder,
  receptionReview, assignDesigner, designDone, productionDone, qcDecision, doctorDecision,
  confirmCompletion, markDelivered, markCompleted, postMessage, recordFile
};
