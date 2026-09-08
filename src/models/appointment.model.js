const records = require('../db/records');
const { nextId } = require('../utils/ids');
const { daysAgo } = require('../utils/dates');

// Starts empty — appointments arrive through the public booking form.
const appointments = [];

async function addAppointment({ name, phone, service, preferredDate, note }) {
  const apt = {
    id: nextId('appointment', 'APT-'), name, phone: phone || '', service: service || '',
    preferredDate: preferredDate ? new Date(preferredDate) : null, note: note || '',
    status: 'new', createdAt: new Date()
  };
  await records.insert('appointments', apt);
  return apt;
}

async function setAppointmentStatus(id, status) {
  if (!['new','confirmed','completed','cancelled'].includes(status)) return null;
  return records.update('appointments', id, row => { row.status = status; });
}

records.register('appointments', appointments);
async function list(options) { return records.list('appointments', options); }
module.exports = { list, appointments, addAppointment, setAppointmentStatus };
