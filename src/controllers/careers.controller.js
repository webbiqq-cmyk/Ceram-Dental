const { ok, bad } = require('../utils/respond');
const applicationModel = require('../models/application.model');
const notificationModel = require('../models/notification.model');

function apply(req, res) {
  const { jobId, name, email, phone, note } = req.body || {};
  if (!jobId || !name || !email) return bad(res, 'Name, email and role are required.');
  const application = applicationModel.addApplication({ jobId, name, email, phone, note });
  notificationModel.notify('admin', { type: 'application-new', title: 'New job application', body: application.name + ' — ' + application.jobTitle, relatedId: application.id });
  ok(res, { application });
}

module.exports = { apply };
