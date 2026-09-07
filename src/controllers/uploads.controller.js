const { ok, bad } = require('../utils/respond');
const { cloudinary, isConfigured, CLOUD_NAME } = require('../config/cloudinary');

// Signed direct-to-Cloudinary upload: the browser uploads the file straight
// to Cloudinary (never through our small server), we only hand out a
// short-lived signature so Cloudinary trusts the request. Keeps large
// binaries off our 100kb JSON body limit and off the serverless function
// entirely.
function casesSubfolder(req) {
  // Scans/photos/design files/QC photos for a specific job order, each
  // case in its own subfolder for the same reason product/team images
  // already get their own top-level ones — easy to browse, easy to purge
  // if a case is ever deleted. orderId is attacker-controlled input
  // reaching a cloud storage path, so it's constrained to the exact shape
  // a real order id/number takes (a UUID, or "JO-<digits>") rather than
  // trusted as free text.
  const orderId = req.body && req.body.orderId;
  const safe = /^[A-Za-z0-9-]{1,64}$/.test(orderId || '') ? orderId : 'unfiled';
  return 'cases/' + safe;
}

function sign(req, res) {
  if (!isConfigured) return res.status(503).json({ ok: false, error: 'Image uploads are not configured yet — add CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET to enable this.' });
  const requested = req.body && req.body.folder;
  const sub = requested === 'team' ? 'team' : requested === 'products' ? 'products' : requested === 'cases' ? casesSubfolder(req) : 'products';
  const folder = 'ceram-dental/' + sub;
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, process.env.CLOUDINARY_API_SECRET);
  ok(res, { signature, timestamp, folder, apiKey: process.env.CLOUDINARY_API_KEY, cloudName: CLOUD_NAME });
}

function status(req, res) {
  ok(res, { configured: isConfigured });
}

module.exports = { sign, status };
