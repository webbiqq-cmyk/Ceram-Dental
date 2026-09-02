const { ok, bad } = require('../utils/respond');
const caseModel = require('../models/case.model');

function create(req, res) {
  const { clinic, patient, service, shade, instructions, protocol, design } = req.body || {};
  if (!service) return bad(res, 'Service is required.');
  const created = caseModel.createCase({ clinic, patient, service, shade, instructions, protocol, design });
  ok(res, { case: created });
}

function act(req, res) {
  const { act } = req.body || {};
  const result = caseModel.actOnCase(req.params.id, act);
  if (!result) return bad(res, 'Unknown case or action.');
  ok(res, { case: result });
}

module.exports = { create, act };
