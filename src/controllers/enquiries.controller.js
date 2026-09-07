const { ok, bad } = require('../utils/respond');
const enquiryModel = require('../models/enquiry.model');
const { logAction } = require('../utils/audit');

// Staff logging a lead that arrived somewhere this app has no visibility
// into (an Instagram DM, a WhatsApp message, a walk-in phone call) —
// admin-only, since it's a manual entry, not a public-facing form.
async function create(req, res) {
  const { name, handle, channel, service, message } = req.body || {};
  if (!name || !String(name).trim()) return bad(res, 'A name is required.');
  const enquiry = await enquiryModel.addEnquiry({ name, handle, channel, service, message });
  if (!enquiry) return bad(res, 'Could not log that enquiry.');
  await logAction(req, 'enquiry:create', enquiry.name + (enquiry.channel ? ' (' + enquiry.channel + ')' : ''));
  ok(res, { enquiry });
}

async function setStage(req, res) {
  const { stage } = req.body || {};
  const enquiry = await enquiryModel.setEnquiryStage(req.params.id, stage);
  if (!enquiry) return bad(res, 'Unknown enquiry or stage.');
  await logAction(req, 'enquiry:stage', enquiry.name + ' → ' + stage);
  ok(res, { enquiry });
}

module.exports = { create, setStage };

for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = require('../utils/asyncHandler').asyncHandler(handler);
