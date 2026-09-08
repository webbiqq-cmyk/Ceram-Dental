const { ok, bad } = require('../utils/respond');
const applicationModel = require('../models/application.model');
const notificationModel = require('../models/notification.model');

async function apply(req, res) {
  const { jobId, name, nationality, email, phone, note } = req.body || {};
  if (!jobId || !name || !email || !phone || !nationality) return bad(res, 'Role, name, nationality, phone and email are required.');
  const application = await applicationModel.addApplication({ jobId, name, nationality, email, phone, note });
  await notificationModel.notify('admin', { type: 'application-new', title: 'New job application', body: application.name + ' — ' + application.jobTitle, relatedId: application.id });
  ok(res, { application });
}

module.exports = { apply };

for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = require('../utils/asyncHandler').asyncHandler(handler);
