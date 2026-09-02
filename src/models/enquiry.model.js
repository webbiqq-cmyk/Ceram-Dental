const { nextId } = require('../utils/ids');
const { daysAgo } = require('../utils/dates');

// New-patient enquiries — most arrive as Instagram DMs. Simple acceptance
// pipeline: new → contacted → booked → closed.
const ENQUIRY_STAGES = ['new', 'contacted', 'booked', 'closed'];

const enquiries = [
  { id: nextId('enquiry', 'ENQ-'), name: 'Layla Hasan', handle: '@layla.hsn', channel: 'Instagram DM', service: 'veneers', stage: 'new', message: 'Saw your veneer before/after reel — how much for 8 uppers and how long does it take?', createdAt: daysAgo(0.2) },
  { id: nextId('enquiry', 'ENQ-'), name: 'Mohammed Ali', handle: '+973 3820 5567', channel: 'WhatsApp', service: 'implants', stage: 'new', message: 'Lost a molar, want to ask about an implant. Do you take BUPA?', createdAt: daysAgo(0.6) },
  { id: nextId('enquiry', 'ENQ-'), name: 'Sara Kamal', handle: '@sara_k', channel: 'Instagram DM', service: 'dsd', stage: 'contacted', message: 'Interested in a smile design preview before deciding.', createdAt: daysAgo(1.4) },
  { id: nextId('enquiry', 'ENQ-'), name: 'Fahad Noor', handle: '@fahad.noor', channel: 'Instagram DM', service: 'aligners', stage: 'contacted', message: 'Clear aligners — crowded lower teeth. Free consultation?', createdAt: daysAgo(2.1) },
  { id: nextId('enquiry', 'ENQ-'), name: 'Huda Salman', handle: 'huda.salman@gmail.com', channel: 'Website form', service: 'crowns', stage: 'booked', message: 'Need two crowns replaced, booked for Sunday 5pm.', createdAt: daysAgo(3) },
  { id: nextId('enquiry', 'ENQ-'), name: 'Ali Mansoor', handle: '@ali.mnsr', channel: 'Instagram DM', service: '', stage: 'closed', message: 'Just asking about whitening prices.', createdAt: daysAgo(5) }
];

function setEnquiryStage(id, stage) {
  const e = enquiries.find(x => x.id === id);
  if (!e || !ENQUIRY_STAGES.includes(stage)) return null;
  e.stage = stage;
  return e;
}

module.exports = { ENQUIRY_STAGES, enquiries, setEnquiryStage };
