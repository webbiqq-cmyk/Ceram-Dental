const { ok, bad } = require('../utils/respond');
const appointmentModel = require('../models/appointment.model');
const notificationModel = require('../models/notification.model');
const { logAction } = require('../utils/audit');

async function create(req, res) {
  const { name, phone, service, preferredDate, note } = req.body || {};
  if (!name || !phone) return bad(res, 'Name and phone are required.');
  const apt = await appointmentModel.addAppointment({ name, phone, service, preferredDate, note });
  await notificationModel.notify('admin', { type: 'appointment-new', title: 'New appointment request', body: apt.name + (apt.service ? ' — ' + apt.service : ''), relatedId: apt.id });
  ok(res, { appointment: apt });
}

async function setStatus(req, res) {
  const { status } = req.body || {};
  const apt = await appointmentModel.setAppointmentStatus(req.params.id, status);
  if (!apt) return bad(res, 'Unknown appointment.');
  await logAction(req, 'appointment:status', apt.id + ' → ' + status);
  ok(res, { appointment: apt });
}

module.exports = { create, setStatus };

for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = require('../utils/asyncHandler').asyncHandler(handler);
