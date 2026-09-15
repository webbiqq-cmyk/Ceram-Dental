const { ok, bad } = require('../utils/respond');
const wf = require('../services/workflow.service');
const repo = require('../db/jobOrders.store');
const { asyncHandler } = require('../utils/asyncHandler');
const { WorkflowError } = require('../utils/errors');

// A WorkflowError is a deliberate, plain-English validation/business-rule
// message ("Choose a designer...", "This order is not awaiting QC...") —
// safe and correct to show the client as a 400. Anything else (a DB
// outage, a real bug) is re-thrown to asyncHandler's catch(next), same as
// every other controller in this app, so it reaches src/app.js's generic
// error handler as a 500 instead of leaking an internal error message
// dressed up as a client mistake.
function guarded(fn) {
  return asyncHandler(async (req, res) => {
    try {
      await wf.runAs(req.user, req.params.id, req.method !== 'GET', async id => {
        if (id) req.params.id = id;
        await fn(req, res);
      });
    } catch (err) {
      if (err instanceof WorkflowError) return bad(res, err.message);
      throw err;
    }
  });
}

async function create(req, res) {
  const b = req.body || {};
  const order = await wf.createOrder({
    clinicId: b.clinicId, patientRef: b.patientRef, jobType: b.jobType, shade: b.shade,
    instructions: b.instructions, scanBody: b.scanBody, implantSystem: b.implantSystem,
    abutmentSize: b.abutmentSize, abutmentAvailability: b.abutmentAvailability, deliveryMethod: b.deliveryMethod,
    targetDate: b.targetDate
  });
  ok(res, { order });
}

async function list(req, res) {
  const orders = await wf.listOrders(req.user.role, req.user.sub, {limit:201, offset:Math.max(0,(Math.floor(Number(req.query.page)||1)-1)*200)});
  ok(res, { orders:orders.slice(0,200), hasMore:orders.length>200 });
}

async function detail(req, res) {
  const found = await wf.getOrderDetail(req.params.id);
  if (!found) return bad(res, 'Order not found.');
  ok(res, found);
}

async function receptionReview(req, res) {
  const b = req.body || {};
  const result = await wf.receptionReview(req.params.id, { decision: b.decision, note: b.note, reason: b.reason, designerId: b.designerId, technicianId: b.technicianId, paymentChecked: b.paymentChecked, detailsChecked: b.detailsChecked });
  ok(res, result);
}

async function setScheduling(req, res) {
  const b = req.body || {};
  ok(res, await wf.setScheduling(req.params.id, { priority: b.priority, targetDate: b.targetDate }));
}

async function blockCase(req, res) {
  const b = req.body || {};
  ok(res, await wf.blockCase(req.params.id, { reason: b.reason, note: b.note }));
}

async function resumeCase(req, res) {
  ok(res, await wf.resumeCase(req.params.id, { note: (req.body || {}).note }));
}

async function designDone(req, res) {
  const result = await wf.designDone(req.params.id, (req.body || {}).technicianId);
  ok(res, result);
}

async function productionDone(req, res) {
  const result = await wf.productionDone(req.params.id, (req.body || {}).qcId);
  ok(res, result);
}

async function qcDecision(req, res) {
  const b = req.body || {};
  const result = await wf.qcDecision(req.params.id, { decision: b.decision, note: b.note, packed: b.packed });
  ok(res, result);
}

async function doctorDecision(req, res) {
  const b = req.body || {};
  const result = await wf.doctorDecision(req.params.id, { decision: b.decision, note: b.note });
  ok(res, result);
}

async function confirmCompletion(req, res) {
  const result = await wf.confirmCompletion(req.params.id);
  ok(res, result);
}

async function markDelivered(req, res) {
  const result = await wf.markDelivered(req.params.id);
  ok(res, result);
}

async function markCompleted(req, res) {
  const result = await wf.markCompleted(req.params.id);
  ok(res, result);
}

async function postMessage(req, res) {
  const b = req.body || {};
  const message = await wf.postMessage(req.params.id, req.user.role, b.body, b.internal === true);
  ok(res, { message });
}

// The audience is the signed-in role, never a request parameter: a dentist
// asking for this order's messages gets the dentist-visible thread from
// the query itself, so no internal note is ever serialised to a clinic.
async function listMessages(req, res) {
  const messages = await repo.listMessages(req.params.id, req.user.role !== 'dentist');
  ok(res, { messages });
}

async function listApprovals(req, res) {
  const approvals = await repo.listApprovals(req.params.id);
  ok(res, { approvals: req.user.role === 'dentist' ? approvals.filter(a => a.decision_type === 'doctor_approval') : approvals });
}

async function recordFile(req, res) {
  const b = req.body || {};
  const file = await wf.recordFile(req.params.id, {
    stageType: b.stageType, category: b.category, url: b.url, publicId: b.publicId, version:b.version, signature:b.signature, uploaderRole: req.user.role
  });
  await require('../models/fileReference.model').record({
    resourceType: 'job_order', resourceId: req.params.id, cloudinaryPublicId: b.publicId,
    category: b.category, stageType: b.stageType, uploadedBy: req.user.sub
  });
  await require('../utils/audit').logAction(req, 'file:upload', { detail: b.category || 'file', resourceType: 'job_order', resourceId: req.params.id });
  ok(res, { file });
}

async function listFiles(req, res) {
  const files = await repo.listFiles(req.params.id);
  ok(res, { files: files.map(require('../utils/filePolicy').downloadLink) });
}

async function listStaff(req, res) {
  const role = req.query.role;
  if (!['designer', 'technician', 'qc'].includes(role)) return bad(res, 'Unknown staff role.');
  const staff = await repo.listStaff(role);
  ok(res, { staff });
}

module.exports = {
  create: guarded(create), list: guarded(list), detail: guarded(detail),
  receptionReview: guarded(receptionReview), designDone: guarded(designDone),
  productionDone: guarded(productionDone), qcDecision: guarded(qcDecision),
  doctorDecision: guarded(doctorDecision), confirmCompletion: guarded(confirmCompletion),
  markDelivered: guarded(markDelivered), markCompleted: guarded(markCompleted),
  postMessage: guarded(postMessage), listMessages: guarded(listMessages), listApprovals: guarded(listApprovals),
  setScheduling: guarded(setScheduling), blockCase: guarded(blockCase), resumeCase: guarded(resumeCase),
  recordFile: guarded(recordFile), listFiles: guarded(listFiles), listStaff: guarded(listStaff)
};

for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = require('../utils/asyncHandler').asyncHandler(handler);
