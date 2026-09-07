const { ok, bad } = require('../utils/respond');
const caseModel = require('../models/case.model');
const notificationModel = require('../models/notification.model');
const { readSession } = require('../middleware/auth');
const records = require('../db/records');
const { logAction } = require('../utils/audit');

async function create(req, res) {
  const { clinic, patient, service, shade, instructions, protocol, design } = req.body || {};
  if (!service) return bad(res, 'Service is required.');
  const session = await readSession(req, 'dentist');
  const created = await caseModel.createCase({ clinic, patient, service, shade, instructions, protocol, design, ownerId: session?.sub });
  await notificationModel.notify('lab', { type: 'case-new', title: 'New case received', body: created.id + ' — ' + (clinic || 'Walk-in submission'), relatedId: created.id });
  ok(res, { case: created });
}

// Which case actions each portal is allowed to take — mirrors what the
// Dentist Portal and Lab Studio UIs actually show as buttons (see
// components/drawer.js's actionsFor()). 'pickup' is shared: either the
// clinic picking up their own case, or lab staff marking it collected.
const ACTIONS_BY_ROLE = {
  dentist: new Set(['approve', 'reject', 'pickup']),
  lab: new Set(['advance', 'qc-accept', 'qc-reject', 'pickup'])
};

async function notifyForAction(act, result) {
  if (act === 'approve') await notificationModel.notify('lab', { type: 'case-approved', title: 'Mockup approved', body: result.id + ' approved by the dentist — proceed to CAD-CAM', ownerId: result.ownerId, relatedId: result.id });
  else if (act === 'reject') await notificationModel.notify('lab', { type: 'case-revision', title: 'Revision requested', body: result.id + ' sent back for changes', ownerId: result.ownerId, relatedId: result.id });
  else if (result.stage === 'doctor_approval') await notificationModel.notify('dentist', { type: 'case-review', title: 'Mockup ready for your review', body: result.id + ' is waiting on your approval', ownerId: result.ownerId, relatedId: result.id });
  else if (result.stage === 'ready') await notificationModel.notify('dentist', { type: 'case-ready', title: 'Case ready for pickup', body: result.id + ' is ready', ownerId: result.ownerId, relatedId: result.id });
}

async function act(req, res) {
  const { act } = req.body || {};
  const allowed = ACTIONS_BY_ROLE[req.user.role];
  if (!allowed || !allowed.has(act)) return res.status(403).json({ ok: false, error: 'Not permitted for this account.' });
  const found = await records.get('cases', req.params.id);
  if (!found || (req.user.role === 'dentist' && found.ownerId !== req.user.sub)) return res.status(404).json({ok:false,error:'Case not found.'});
  const result = await caseModel.actOnCase(req.params.id, act);
  if (!result) return bad(res, 'Unknown case or action.');
  await logAction(req, 'case:' + act, result.id);
  await notifyForAction(act, result);
  ok(res, { case: result });
}

module.exports = { create, act };

for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = require('../utils/asyncHandler').asyncHandler(handler);
