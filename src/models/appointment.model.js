const { nextId } = require('../utils/ids');
const { daysAgo } = require('../utils/dates');

const appointments = [
  { id: nextId('appointment', 'APT-'), name: 'Fatima Al-Sayed', phone: '+973 3900 1122', service: 'veneers', preferredDate: daysAgo(-3), status: 'new', note: 'Interested in a full smile makeover.', createdAt: daysAgo(1) },
  { id: nextId('appointment', 'APT-'), name: 'Yousif Marzooq', phone: '+973 3611 4477', service: 'implants', preferredDate: daysAgo(-5), status: 'confirmed', note: '', createdAt: daysAgo(2) },
  { id: nextId('appointment', 'APT-'), name: 'Noor Abdulla', phone: '+973 3344 9021', service: 'dsd', preferredDate: daysAgo(-1), status: 'new', note: 'Saw the Instagram page, wants a preview first.', createdAt: daysAgo(0.4) }
];

function addAppointment({ name, phone, service, preferredDate, note }) {
  const apt = {
    id: nextId('appointment', 'APT-'), name, phone: phone || '', service: service || '',
    preferredDate: preferredDate ? new Date(preferredDate) : null, note: note || '',
    status: 'new', createdAt: new Date()
  };
  appointments.unshift(apt);
  return apt;
}

function setAppointmentStatus(id, status) {
  const apt = appointments.find(a => a.id === id);
  if (!apt) return null;
  apt.status = status;
  return apt;
}

module.exports = { appointments, addAppointment, setAppointmentStatus };
