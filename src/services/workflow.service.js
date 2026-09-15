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
const caseView = require('./caseView');

// Workflow events fan out to notifications from here — the one place that
// already knows a transition actually succeeded. Doing it in controllers
// instead would mean every future caller of a transition has to remember
// to notify, which is how a lab ends up with a case nobody was told about.
//
// A failed notification must never roll back the transition it describes:
// the case really did move, and losing that to a notification-store hiccup
// would be strictly worse than a missing bell badge. Hence the catch.
async function notifyRoles(roles, payload) {
  const model = require('../models/notification.model');
  for (const role of [].concat(roles)) {
    try { await model.notify(role, payload); } catch { /* the transition stands regardless */ }
  }
}
// Dentist notifications are per-account (notification.model scopes the
// dentist role by ownerId), so they carry the order's own dentist id.
async function notifyDentist(order, payload) {
  return notifyRoles('dentist', Object.assign({ ownerId: order.dentist_user_id, relatedId: order.id }, payload));
}
async function notifyStation(roles, order, payload) {
  return notifyRoles(roles, Object.assign({ relatedId: order.id }, payload));
}
const ref = order => order.order_number + ' · ' + String(order.job_type || '').replace(/_/g, ' ');

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

// Statuses whose free-text note is written by lab staff for lab staff —
// "contact too tight", "supplier says Thursday", "payment not cleared".
// The dentist still sees that each of these happened (the timeline is the
// point), just not the internal wording.
const LAB_ONLY_NOTES = new Set([
  'accepted_by_reception', 'assigned_to_designer', 'design_done', 'assigned_to_technician',
  'in_production', 'production_done', 'qc_pending', 'qc_approved', 'qc_rejected', 'blocked'
]);

function redactHistory(history, isDentist) {
  if (!isDentist) return history;
  return history.map(h => LAB_ONLY_NOTES.has(h.status) ? Object.assign({}, h, { note: null }) : h);
}

// The audience for a read is the actor performing it, not a parameter a
// caller can get wrong. `runAs` has already put the authenticated actor in
// the async store by the time anything calls this, and an absent actor
// resolves to the most restrictive reading rather than the most permissive.
function audienceRole() {
  const role = actors.getStore()?.role;
  return role === 'dentist' || !role ? 'dentist' : 'lab';
}

// `rejection_note` is a single column carrying notes written by three
// different people to two different audiences: reception's message to the
// clinic, the doctor's own change request, and QC's internal finding
// ("contact too tight", "porosity on the buccal"). The first two are the
// clinic's to read; the third is not, and shipping it to a dentist
// because it happens to share a column is exactly the kind of leak a UI
// filter would never catch.
//
// Which it is, is decided by the status the note landed on: reception's
// return parks the case at rejected_by_reception, the doctor's own note
// at in_design, and QC's at in_production. Blocker text is always
// internal — the clinic is told the case is on hold, not which supplier
// let the lab down.
const DENTIST_VISIBLE_NOTE = new Set(['rejected_by_reception', 'in_design', 'doctor_rejected', 'waiting_doctor_approval']);

function redactOrder(order, isDentist) {
  if (!order || !isDentist) return order;
  const safe = Object.assign({}, order);
  if (!DENTIST_VISIBLE_NOTE.has(order.status)) safe.rejection_note = null;
  safe.blocked_reason = null;
  safe.blocked_by = null;
  safe.blocked_from = null;
  return safe;
}

async function getOrderDetail(orderId) {
  const order = await repo.getOrder(orderId);
  if (!order) return null;
  const audience = audienceRole();
  const isDentist = audience === 'dentist';
  const [history, files, messages, approvals] = await Promise.all([
    repo.listStageHistory(order.id),
    repo.listFiles(order.id),
    // Internal notes are excluded in the query, not filtered out of the
    // response — an internal note must not reach a dentist's browser even
    // inside a payload the UI intends not to render.
    repo.listMessages(order.id, !isDentist),
    repo.listApprovals(order.id)
  ]);
  return {
    // Redaction happens before derivation so the view is computed from
    // exactly the row the reader is allowed to see.
    order: caseView.withView(redactOrder(order, isDentist), { audience }),
    history: redactHistory(history, isDentist),
    files: files.map(require('../utils/filePolicy').downloadLink),
    messages,
    // A dentist sees the decisions they were party to; QC's internal
    // findings and reception's payment notes stay inside the lab.
    approvals: isDentist ? approvals.filter(a => a.decision_type === 'doctor_approval') : approvals
  };
}

async function listOrders(role, userId, options) {
  const orders = await repo.listOrders(role, userId, options);
  const isDentist = role === 'dentist';
  return caseView.withViews(orders.map(o => redactOrder(o, isDentist)), { audience: isDentist ? 'dentist' : 'lab' });
}

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
  const order = await repo.createOrder(Object.assign({}, input, { dentistUserId, stageType, targetDate: parseTargetDate(input.targetDate) }));
  await repo.addStageHistory(order.id, { stageType: order.stage_type, status: 'submitted', actorId: dentistUserId, note: 'Order submitted' });
  await repo.updateOrder(order.id, { status: 'pending_reception_review' });
  await repo.addStageHistory(order.id, { stageType: order.stage_type, status: 'pending_reception_review', actorId: dentistUserId });
  await notifyStation('receptionist', order, { type: 'order-new', title: 'New order received', body: ref(order) + ' — ' + (dentist?.name || 'a clinic') });
  return repo.getOrder(order.id);
}

// A clinic asks for a date; it isn't a promise the lab has made, and the
// column is a DATE, so this only accepts a plain calendar day and refuses
// anything in the past or implausibly far out rather than silently
// storing a typo as the year 20255.
function parseTargetDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new WorkflowError('Use a date in YYYY-MM-DD form.');
  const date = new Date(text + 'T00:00:00Z');
  if (Number.isNaN(date.getTime())) throw new WorkflowError('That date is not valid.');
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  if (date.getTime() < today.getTime()) throw new WorkflowError('A target date cannot be in the past.');
  if (date.getTime() > today.getTime() + 400 * 86400000) throw new WorkflowError('That target date is too far ahead.');
  return text;
}

const PRIORITIES = ['normal', 'priority', 'urgent'];

// Priority and target date are operational settings, not workflow
// transitions — they can be changed at any point in a case's life, but
// only by the roles that coordinate the floor. A designer or technician
// re-prioritising their own queue would make the ordering meaningless.
const SCHEDULING_ROLES = ['receptionist', 'lab', 'admin'];

async function setScheduling(orderId, { priority, targetDate }) {
  const order = await repo.getOrder(orderId);
  if (!order) throw new WorkflowError('Order not found.');
  const actor = actors.getStore();
  if (!SCHEDULING_ROLES.includes(actor?.role)) throw new WorkflowError('Only reception, the lab manager or an administrator can change priority and target dates.');
  if (order.status === 'completed') throw new WorkflowError('This case is closed.');
  const fields = {};
  if (priority !== undefined) {
    if (!PRIORITIES.includes(priority)) throw new WorkflowError('Unknown priority.');
    fields.priority = priority;
  }
  if (targetDate !== undefined) fields.target_date = parseTargetDate(targetDate);
  if (!Object.keys(fields).length) throw new WorkflowError('Nothing to change.');
  await repo.updateOrder(orderId, fields);
  const parts = [];
  if (fields.priority) parts.push('Priority set to ' + fields.priority);
  if (fields.target_date !== undefined) parts.push(fields.target_date ? 'Target date set to ' + fields.target_date : 'Target date cleared');
  // Recorded against the status the case is already in: this is a change
  // to the case, not a move through the pipeline, and inventing a status
  // for it would corrupt every stage-duration figure.
  await repo.addStageHistory(orderId, { stageType: order.stage_type, status: order.status, actorId: actor.sub, note: parts.join('. ') + '.' });
  return getOrderDetail(orderId);
}

// Reception's accept/reject. Accepting requires a designer to hand the
// order to in the same call — leaving an order "accepted but assigned to
// no one" is a state nobody's dashboard would ever surface again.
// Reception's "reject" is, in practice, almost never a rejection — it is
// a request for something missing. The underlying status stays
// `rejected_by_reception` (the state machine and every existing row
// depend on it) but the reason is captured as structure instead of being
// buried in prose, so "what do clinics get sent back for?" is answerable.
const RETURN_REASONS = {
  missing_information: 'Missing information',
  payment_issue: 'Payment issue',
  file_issue: 'Incorrect or unusable scan/file',
  clarification: 'Treatment clarification needed',
  other: 'Other'
};

async function receptionReview(orderId, { decision, note, reason, designerId, technicianId, paymentChecked, detailsChecked }) {
  const order = await repo.getOrder(orderId);
  if (!order) throw new WorkflowError('Order not found.');
  if (order.status !== 'pending_reception_review') throw new WorkflowError('This order is not awaiting reception review.');
  const actorId = await resolveActorId('receptionist');

  if (decision === 'reject') {
    if (!note || !note.trim()) throw new WorkflowError('A note explaining what the clinic needs to do is required.');
    if (reason && !RETURN_REASONS[reason]) throw new WorkflowError('Unknown return reason.');
    note = (reason ? RETURN_REASONS[reason] + ': ' : '') + note.trim();
    await repo.updateOrder(orderId, { status: 'rejected_by_reception', rejection_note: note });
    await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'rejected_by_reception', actorId, note });
    await repo.addApproval(orderId, { stageType: order.stage_type, decisionType: 'reception_review', outcome: 'rejected', decidedBy: actorId, note });
    await notifyDentist(order, { type: 'case-returned', title: 'Case returned — action needed', body: ref(order) + ' — ' + note });
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
      await notifyStation('technician', order, { type: 'production-assigned', title: 'New case to manufacture', body: ref(order) + ' — no design step' });
    } else await assignDesigner(orderId, designerId, actorId);
    await notifyDentist(order, { type: 'case-accepted', title: 'Case accepted by the lab', body: ref(order) + ' is now with the lab team.' });
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
  await notifyStation('designer', order, { type: 'design-assigned', title: 'New case assigned to design', body: ref(order) + (order.patient_ref ? ' — ' + order.patient_ref : '') });
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
    await notifyDentist(order, { type: 'design-ready', title: 'Design ready for your approval', body: ref(order) + ' — review the demo and approve or request changes.' });
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
  await notifyStation('technician', order, { type: 'production-assigned', title: 'New case to manufacture', body: ref(order) + (order.shade ? ' — shade ' + order.shade : '') });
  return getOrderDetail(orderId);
}

// A genuine stoppage — a material that hasn't arrived, an unusable scan, a
// mill that's down. Without this the case stays 'in_production' and looks
// like work in progress to every other screen, so nobody chases it. Only
// reachable from production, and resuming returns the case to exactly the
// status it left rather than assuming 'in_production'.
const BLOCK_REASONS = {
  design_issue: 'Design issue', scan_issue: 'Scan issue', material: 'Material unavailable',
  equipment: 'Equipment issue', clarification: 'Dentist clarification needed', other: 'Other'
};

async function blockCase(orderId, { reason, note }) {
  const order = await repo.getOrder(orderId);
  if (!order) throw new WorkflowError('Order not found.');
  if (order.status !== 'in_production') throw new WorkflowError('Only a case currently in production can be blocked.');
  if (!BLOCK_REASONS[reason]) throw new WorkflowError('Choose a reason for the blocker.');
  if (!note || !note.trim()) throw new WorkflowError('Describe the blocker so it can be resolved.');
  const actorId = await resolveActorId();
  const detail = BLOCK_REASONS[reason] + ': ' + note.trim();
  await repo.updateOrder(orderId, { status: 'blocked', blocked_reason: detail, blocked_at: new Date(), blocked_by: actorId, blocked_from: order.status });
  await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'blocked', actorId, note: detail });
  await notifyStation(['lab', 'receptionist', 'admin'], order, { type: 'production-blocked', title: 'Case blocked in production', body: ref(order) + ' — ' + detail });
  return getOrderDetail(orderId);
}

async function resumeCase(orderId, { note }) {
  const order = await repo.getOrder(orderId);
  if (!order) throw new WorkflowError('Order not found.');
  if (order.status !== 'blocked') throw new WorkflowError('This case is not blocked.');
  const actorId = await resolveActorId();
  const back = order.blocked_from || 'in_production';
  await repo.updateOrder(orderId, { status: back, blocked_reason: null, blocked_at: null, blocked_by: null, blocked_from: null });
  await repo.addStageHistory(orderId, { stageType: order.stage_type, status: back, actorId, note: ['Blocker resolved', note && note.trim()].filter(Boolean).join(' — ') });
  await notifyStation(['lab', 'receptionist'], order, { type: 'production-resumed', title: 'Blocked case resumed', body: ref(order) + ' is moving again.' });
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
  await notifyStation('qc', order, { type: 'qc-pending', title: 'Case ready for inspection', body: ref(order) });
  return getOrderDetail(orderId);
}

// How many times QC has already looked at this case. Two failures on one
// case is the signal a lab manager actually needs — it means the rework
// loop isn't converging and somebody should look at why, not just send it
// round again.
async function qcAttempts(orderId) {
  const approvals = await repo.listApprovals(orderId);
  return approvals.filter(a => a.decision_type === 'qc_review');
}

async function qcDecision(orderId, { decision, note, packed }) {
  const order = await repo.getOrder(orderId);
  if (!order) throw new WorkflowError('Order not found.');
  if (order.stage_type !== 'final' || order.status !== 'qc_pending') throw new WorkflowError('This order is not awaiting QC.');
  const actorId = await resolveActorId();

  if (decision === 'reject') {
    if (!note || !note.trim()) throw new WorkflowError('A note is required to send this back.');
    const attempts = (await qcAttempts(orderId)).length + 1;
    await repo.addApproval(orderId, { stageType: order.stage_type, decisionType: 'qc_review', outcome: 'rejected', decidedBy: actorId, note });
    await repo.updateOrder(orderId, { status: 'qc_rejected', rejection_note: note });
    await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'qc_rejected', actorId, note: 'QC #' + attempts + ' failed — ' + note });
    // Back to the same technician's queue — status returns to
    // in_production so it reappears there, assignment untouched.
    await repo.updateOrder(orderId, { status: 'in_production' });
    await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'in_production', actorId, note: 'Returned by QC' });
    await notifyStation('technician', order, { type: 'qc-rework', title: 'Case returned for rework', body: ref(order) + ' — ' + note });
    // A second failure stops being one technician's problem.
    if (attempts >= 2) await notifyStation(['lab', 'admin'], order, { type: 'qc-repeat-failure', title: 'Case has failed QC ' + attempts + ' times', body: ref(order) + ' — ' + note });
    return getOrderDetail(orderId);
  }
  if (decision === 'approve') {
    if (packed !== true || typeof note !== 'string' || !note.trim()) throw new WorkflowError('Record QC findings and confirm packing before approval.');
    note = note.trim() + '\nPacking confirmed.';
    await repo.addApproval(orderId, { stageType: order.stage_type, decisionType: 'qc_review', outcome: 'approved', decidedBy: actorId, note });
    await repo.updateOrder(orderId, { status: 'qc_approved' });
    await repo.addStageHistory(orderId, { stageType: order.stage_type, status: 'qc_approved', actorId, note });
    await notifyStation('receptionist', order, { type: 'qc-passed', title: 'Case passed QC', body: ref(order) + ' is packed and ready to release.' });
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
    await notifyStation('designer', order, { type: 'design-changes', title: 'Changes requested by the dentist', body: ref(order) + ' — ' + note });
    return getOrderDetail(orderId);
  }

  if (decision !== 'approve') throw new WorkflowError('Unknown decision — expected "approve" or "reject".');
  await repo.addApproval(orderId, { stageType: order.stage_type, decisionType: 'doctor_approval', outcome: 'approved', decidedBy: actorId, note });

  await repo.addStageHistory(orderId, { stageType: 'demo', status: 'doctor_approved', actorId, note: 'Demo approved. Requirements and design locked; changes require a new job order.' });
  await repo.updateOrder(orderId, { stage_type: 'final', status: 'doctor_approved', rejection_note: null });
  await notifyStation('designer', order, { type: 'design-approved', title: 'Demo approved', body: ref(order) + ' — hand the approved case to a technician.' });
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
  await notifyDentist(order, { type: 'case-ready', title: nextStatus === 'ready_for_pickup' ? 'Case ready for collection' : 'Case ready for delivery', body: ref(order) + ' is finished and ready.' });
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
  await notifyDentist(order, { type: 'case-completed', title: 'Case completed', body: ref(order) + ' is closed.' });
  return getOrderDetail(orderId);
}

// One thread, two audiences. An internal note and a message to the clinic
// are the same row with one flag, so the distinction has to be enforced
// where it can't be got wrong: a dentist can neither write one nor read
// one, and the read side is a WHERE clause (see repo.listMessages), not a
// filter applied to a payload that already left the database.
// @mentions, in internal notes only.
//
// The whole feature is one thing: a note that names a colleague should
// reach that colleague. It is not a social system — there is no mention
// index, no following, no cross-case feed. A name is resolved against the
// active lab roster and turned into one notification scoped to that
// person, and nothing else changes.
//
// Two rules keep it safe. Mentions work only on internal notes, so a
// mention can never be a route to messaging a clinic. And a mention
// creates a notification, never access: the person still has to be
// allowed to open the case, which the existing checks decide.
const LAB_STATION_ROLES = ['receptionist', 'designer', 'technician', 'qc', 'lab', 'admin'];

async function resolveMentions(body) {
  const WORD = "[\\p{L}][\\p{L}\\p{M}'.-]*";
  // Capture up to two words after the @, but treat the second as
  // provisional. "@Sarah Ahmed, check the margin" and "@Rana please check"
  // look identical to a regex; only the roster can say which one the
  // second word belongs to, so both readings are offered below and the
  // two-word form is tried first.
  const matches = [...String(body).matchAll(new RegExp('@(' + WORD + ')(?:[ \\t]+(' + WORD + '))?', 'gu'))];
  if (!matches.length) return [];
  const staff = (await require('../models/user.model').list())
    .filter(u => u.active && LAB_STATION_ROLES.includes(u.role) && u.name);

  const matched = new Map();
  for (const [, first, second] of matches) {
    const candidates = second ? [(first + ' ' + second).toLowerCase(), first.toLowerCase()] : [first.toLowerCase()];
    for (const candidate of candidates) {
      // Every person the name could mean, not the first one found. Two
      // Sarahs on a lab floor is ordinary, and silently picking one would
      // send "check the margin on #11" to the wrong colleague while the
      // right one is never told. Ambiguity reaches both; the author can
      // be more specific next time.
      const people = staff.filter(u => {
        const full = u.name.toLowerCase();
        return candidate === full || candidate === full.split(/\s+/)[0];
      });
      // First reading that resolves wins, so "@Sarah Ahmed" never also
      // fires a second, looser match on "Sarah".
      if (people.length) { people.forEach(person => matched.set(person.id, person)); break; }
    }
  }
  return [...matched.values()];
}

async function postMessage(orderId, senderRole, body, internal = false) {
  if (!body || !body.trim()) throw new WorkflowError('Message cannot be empty.');
  if (internal && senderRole === 'dentist') throw new WorkflowError('Internal notes are for lab staff only.');
  const senderId = await resolveActorId(senderRole);
  const message = await repo.addMessage(orderId, senderId, body.trim(), internal);
  if (internal) {
    const mentioned = await resolveMentions(body);
    if (mentioned.length) {
      const order = await repo.getOrder(orderId);
      const preview = body.trim().slice(0, 140);
      for (const person of mentioned) {
        // Skip self-mentions: nobody needs a bell for a note they just
        // wrote. ownerId scopes the notification to this one person
        // within their role (see notification.model.listFor).
        if (person.id === senderId) continue;
        await notifyRoles(person.role, {
          type: 'note-mention', title: 'You were mentioned in a case note',
          body: ref(order) + ' — ' + preview, relatedId: order.id, ownerId: person.id
        });
      }
    }
  }
  if (!internal) {
    const order = await repo.getOrder(orderId);
    if (order) {
      const preview = body.trim().slice(0, 140);
      if (senderRole === 'dentist') {
        // Straight to whoever is holding the case, so a clinic's question
        // lands with the person who can actually answer it.
        const owner = caseView.describe(order).owner_role;
        await notifyStation([owner && owner !== 'dentist' ? owner : 'receptionist'], order, { type: 'case-message', title: 'Message from the clinic', body: ref(order) + ' — ' + preview });
      } else {
        await notifyDentist(order, { type: 'case-message', title: 'Message from the lab', body: ref(order) + ' — ' + preview });
      }
    }
  }
  return message;
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
  confirmCompletion, markDelivered, markCompleted, postMessage, recordFile,
  setScheduling, blockCase, resumeCase, qcAttempts, resolveMentions,
  RETURN_REASONS, BLOCK_REASONS, PRIORITIES
};
