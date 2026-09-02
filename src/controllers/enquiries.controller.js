const { ok, bad } = require('../utils/respond');
const enquiryModel = require('../models/enquiry.model');

function setStage(req, res) {
  const { stage } = req.body || {};
  const enquiry = enquiryModel.setEnquiryStage(req.params.id, stage);
  if (!enquiry) return bad(res, 'Unknown enquiry or stage.');
  ok(res, { enquiry });
}

module.exports = { setStage };
