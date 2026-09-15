const records = require('../db/records');
const { nextId } = require('../utils/ids');
const { daysAgo } = require('../utils/dates');

// New-patient enquiries — most arrive as Instagram DMs. Simple acceptance
// pipeline: new → contacted → booked → closed.
const ENQUIRY_STAGES = ['new', 'contacted', 'booked', 'closed'];

// Starts empty — staff log leads here as they come in (DMs, WhatsApp, calls).
const enquiries = [];

async function setEnquiryStage(id, stage) {
  if (!ENQUIRY_STAGES.includes(stage)) return null;
  return records.update('enquiries', id, row => {
    row.stage = stage;
    row.updatedAt = new Date();
    row.history = Array.isArray(row.history) ? row.history : [];
    row.history.push({ stage, at: new Date() });
  });
}

// Logs a lead staff received somewhere this app can't see directly — an
// Instagram DM, a WhatsApp message, a phone call — so it enters the same
// acceptance pipeline as everything else instead of living only in
// someone's head or a separate notebook.
async function addEnquiry({ name, handle, channel, service, message, source, sourceId }) {
  const now = new Date();
  const e = {
    id: nextId('enquiry', 'ENQ-'),
    name: String(name || '').trim(), handle: String(handle || '').trim(),
    channel: String(channel || '').trim(), service: String(service || '').trim(),
    source: String(source || channel || 'Manual').trim(), sourceId: String(sourceId || '').trim(),
    stage: 'new', message: String(message || '').trim(), createdAt: now, updatedAt: now,
    history: [{ stage: 'new', at: now }]
  };
  if (!e.name) return null;
  await records.insert('enquiries', e);
  return e;
}

records.register('enquiries', enquiries);
async function list(options) { return records.list('enquiries', options); }
module.exports = { list, ENQUIRY_STAGES, enquiries, setEnquiryStage, addEnquiry };
