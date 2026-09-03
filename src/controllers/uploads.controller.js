const { ok, bad } = require('../utils/respond');
const { cloudinary, isConfigured, CLOUD_NAME } = require('../config/cloudinary');

// Signed direct-to-Cloudinary upload: the browser uploads the file straight
// to Cloudinary (never through our small server), we only hand out a
// short-lived signature so Cloudinary trusts the request. Keeps large
// binaries off our 100kb JSON body limit and off the serverless function
// entirely.
function sign(req, res) {
  if (!isConfigured) return res.status(503).json({ ok: false, error: 'Image uploads are not configured yet — add CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET to enable this.' });
  const folder = 'ceram-dental/' + (req.body && req.body.folder === 'team' ? 'team' : 'products');
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, process.env.CLOUDINARY_API_SECRET);
  ok(res, { signature, timestamp, folder, apiKey: process.env.CLOUDINARY_API_KEY, cloudName: CLOUD_NAME });
}

function status(req, res) {
  ok(res, { configured: isConfigured });
}

module.exports = { sign, status };
