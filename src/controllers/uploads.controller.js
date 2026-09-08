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

async function sign(req, res) {
  if (!isConfigured) return res.status(503).json({ ok: false, error: 'Image uploads are not configured yet — add CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET to enable this.' });
  if(req.path.startsWith('/orders/')) {
    const order=await require('../db/jobOrders.store').getOrder(req.body?.orderId);
    if(!order || !require('../services/workflow.service').canAccess(order,req.user))return res.status(404).json({ok:false,error:'Order not found.'});
    if(req.body.folder!=='cases')return res.status(403).json({ok:false,error:'Use case uploads for this account.'});
    try { require('../services/workflow.service').assertFileAllowed(order, req.user.role, req.body.stageType, req.body.category); }
    catch (error) { return bad(res, error.message); }
    req.body.orderId=order.id;
  }
  const requested = req.body && req.body.folder;
  const sub = requested === 'team' ? 'team' : requested === 'products' ? 'products' : requested === 'cases' ? casesSubfolder(req) : 'products';
  const folder = 'ceram-dental/' + sub;
  const timestamp = Math.round(Date.now() / 1000);
  const params = {timestamp, folder};
  if(requested==='cases'){
    if(!process.env.CLOUDINARY_CASE_UPLOAD_PRESET)return res.status(503).json({ok:false,error:'Configure a size-limited case upload preset first.'});
    Object.assign(params,{type:'authenticated',overwrite:false,public_id:require('node:crypto').randomUUID(),upload_preset:process.env.CLOUDINARY_CASE_UPLOAD_PRESET});
  }
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
  ok(res, { signature, params, timestamp, folder, apiKey: process.env.CLOUDINARY_API_KEY, cloudName: CLOUD_NAME });
}

async function status(req, res) {
  ok(res, { configured: isConfigured });
}

module.exports = { sign, status };

for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = require('../utils/asyncHandler').asyncHandler(handler);
