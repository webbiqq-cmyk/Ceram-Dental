const { ok, bad } = require('../utils/respond');
const enquiryModel = require('../models/enquiry.model');
const { logAction } = require('../utils/audit');

function setStage(req, res) {
  const { stage } = req.body || {};
  const enquiry = enquiryModel.setEnquiryStage(req.params.id, stage);
  if (!enquiry) return bad(res, 'Unknown enquiry or stage.');
  logAction(req, 'enquiry:stage', enquiry.name + ' → ' + stage);
  ok(res, { enquiry });
}

module.exports = { setStage };
