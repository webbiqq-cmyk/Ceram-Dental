const { ok, bad } = require('../utils/respond');
const caseModel = require('../models/case.model');

function create(req, res) {
  const { clinic, patient, service, shade, instructions, protocol, design } = req.body || {};
  if (!service) return bad(res, 'Service is required.');
  const created = caseModel.createCase({ clinic, patient, service, shade, instructions, protocol, design });
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

function act(req, res) {
  const { act } = req.body || {};
  const allowed = ACTIONS_BY_ROLE[req.user.role];
  if (!allowed || !allowed.has(act)) return res.status(403).json({ ok: false, error: 'Not permitted for this account.' });
  const result = caseModel.actOnCase(req.params.id, act);
  if (!result) return bad(res, 'Unknown case or action.');
  ok(res, { case: result });
}

module.exports = { create, act };
