const { ok, bad } = require('../utils/respond');
const appointmentModel = require('../models/appointment.model');

function create(req, res) {
  const { name, phone, service, preferredDate, note } = req.body || {};
  if (!name || !phone) return bad(res, 'Name and phone are required.');
  const apt = appointmentModel.addAppointment({ name, phone, service, preferredDate, note });
  ok(res, { appointment: apt });
}

function setStatus(req, res) {
  const { status } = req.body || {};
  const apt = appointmentModel.setAppointmentStatus(req.params.id, status);
  if (!apt) return bad(res, 'Unknown appointment.');
  ok(res, { appointment: apt });
}

module.exports = { create, setStatus };
