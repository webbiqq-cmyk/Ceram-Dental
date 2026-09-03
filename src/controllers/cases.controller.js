const { ok, bad } = require('../utils/respond');
const caseModel = require('../models/case.model');
const notificationModel = require('../models/notification.model');
const { logAction } = require('../utils/audit');

function create(req, res) {
  const { clinic, patient, service, shade, instructions, protocol, design } = req.body || {};
  if (!service) return bad(res, 'Service is required.');
  const created = caseModel.createCase({ clinic, patient, service, shade, instructions, protocol, design });
  notificationModel.notify('lab', { type: 'case-new', title: 'New case received', body: created.id + ' — ' + (clinic || 'Walk-in submission'), relatedId: created.id });
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

function notifyForAction(act, result) {
  if (act === 'approve') notificationModel.notify('lab', { type: 'case-approved', title: 'Mockup approved', body: result.id + ' approved by the dentist — proceed to CAD-CAM', relatedId: result.id });
  else if (act === 'reject') notificationModel.notify('lab', { type: 'case-revision', title: 'Revision requested', body: result.id + ' sent back for changes', relatedId: result.id });
  else if (result.stage === 'doctor_approval') notificationModel.notify('dentist', { type: 'case-review', title: 'Mockup ready for your review', body: result.id + ' is waiting on your approval', relatedId: result.id });
  else if (result.stage === 'ready') notificationModel.notify('dentist', { type: 'case-ready', title: 'Case ready for pickup', body: result.id + ' is ready', relatedId: result.id });
}

function act(req, res) {
  const { act } = req.body || {};
  const allowed = ACTIONS_BY_ROLE[req.user.role];
  if (!allowed || !allowed.has(act)) return res.status(403).json({ ok: false, error: 'Not permitted for this account.' });
  const result = caseModel.actOnCase(req.params.id, act);
  if (!result) return bad(res, 'Unknown case or action.');
  logAction(req, 'case:' + act, result.id);
  notifyForAction(act, result);
  ok(res, { case: result });
}

module.exports = { create, act };
