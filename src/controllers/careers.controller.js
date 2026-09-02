const { ok, bad } = require('../utils/respond');
const applicationModel = require('../models/application.model');

function apply(req, res) {
  const { jobId, name, email, phone, note } = req.body || {};
  if (!jobId || !name || !email) return bad(res, 'Name, email and role are required.');
  const application = applicationModel.addApplication({ jobId, name, email, phone, note });
  ok(res, { application });
}

module.exports = { apply };
