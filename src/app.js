// Express app wiring — no listen() here (see ../server.js), so this file can
// be required both by the real server and by tests/serverless entry points.
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { helmetMiddleware, apiLimiter } = require('./middleware/security');
const { requestLog } = require('./middleware/requestLog');
const apiRoutes = require('./routes');
const {validateBody} = require('./utils/validation');
const { TRUST_PROXY, CORS_ORIGINS } = require('./config/production');
const { clientIpMiddleware } = require('./utils/clientIp');
const { corsMiddleware } = require('./middleware/cors');
const { resolveSection } = require('./middleware/section');

const app = express();

// Real client IP behind a proxy / Cloudflare. Never blindly trusts a raw
// X-Forwarded-For — see src/utils/clientIp.js.
//   TRUST_PROXY = 'cloudflare'  -> trust only verified Cloudflare edge IPs
//   TRUST_PROXY = <number>      -> that many proxy hops (Render, Vercel)
//   TRUST_PROXY = 'false'       -> direct connections only
if (TRUST_PROXY === 'cloudflare') app.set('trust proxy', require('./config/cloudflareIps'));
else if (/^\d+$/.test(TRUST_PROXY)) app.set('trust proxy', Number(TRUST_PROXY));
else if (process.env.TRUST_PROXY_HOPS) app.set('trust proxy', require('./config/env').integer('TRUST_PROXY_HOPS', 0, 0, 5));
else app.set('trust proxy', process.env.VERCEL ? 1 : false);
// Express's default query parser (qs) has a known, currently-unpatched-
// in-our-range prototype-pollution/DoS advisory for deeply nested
// bracket syntax. Nothing here needs that — every query param we read
// (date-range filters, etc.) is a flat string — so switch to Node's
// built-in simple parser and sidestep the vulnerable code path entirely
// rather than just judging it low-risk and moving on.
app.set('query parser', 'simple');

app.use(clientIpMiddleware);   // req.clientIp — safe real IP, before anything logs or rate-limits
app.use(resolveSection);       // req.section from hostname (null until subdomains configured)
app.use(requestLog);
app.use(helmetMiddleware);
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '100kb' })); // small, deliberate ceiling — nothing here legitimately sends more

// Registered before the rate limiter and ahead of static/API routing so an
// uptime monitor's ping is never itself throttled or queued behind other
// traffic — exactly the moment it needs to be reliable is when everything
// else might be under load. Under /api (not /health) purely so Vercel's
// routing (vercel.json) sends it to this function rather than looking for
// a static file — see README/build manual §11.
app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Static assets: index.html always revalidated so app/route changes land
// immediately; JS/CSS get an hour (ETag still catches edits sooner);
// images a week. Cuts repeat-visit and under-load traffic to near zero.
// Only in production, though — a local `npm start` has no CDN/repeat-visitor
// traffic to protect, and a 1h cache just makes every edit look like it did
// nothing until a hard refresh, which is confusing for local dev.
const isProd = process.env.NODE_ENV === 'production';
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: isProd ? '1h' : 0,
  setHeaders(res, filePath) {
    if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
    else if (isProd && /[\\/]images[\\/]/.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=604800');
  }
}));
app.get('/api/ready', (req,res) => require('./db/readiness').ready().then(()=>res.json({ok:true})).catch(()=>res.status(503).json({ok:false,error:'Storage is not ready.'})));
app.use('/api', corsMiddleware, apiLimiter, (req,res,next) => require('./db/readiness').ready().then(()=>next()).catch(()=>res.status(503).json({ok:false,error:'Storage is not ready.'})), (req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  next();
}, (req,res,next) => {
  if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
    const origin=req.get('Origin');
    const expected=process.env.APP_ORIGIN || req.protocol+'://'+req.get('host');
    // Same-origin, or an explicitly allowlisted portal/admin/lab origin (CORS_ORIGINS).
    const allowed = !origin || origin === expected || CORS_ORIGINS.includes(origin.replace(/\/$/, ''));
    if (req.get('Sec-Fetch-Site') === 'cross-site' && !allowed) return res.status(403).json({ok:false,error:'Cross-site request denied.'});
    if (origin && !allowed) return res.status(403).json({ok:false,error:'Cross-site request denied.'});
  }
  next();
}, (req,res,next) => {
  if(req.method==='POST' && ['/contact','/careers/apply','/appointments','/cases','/checkout'].includes(req.path)) return require('./middleware/security').submissionLimiter(req,res,next);
  if(req.path.startsWith('/admin/export/')) return require('./middleware/security').exportLimiter(req,res,next);
  if(req.path.endsWith('/uploads/sign')) return require('./middleware/security').uploadLimiter(req,res,next);
  next();
}, validateBody, require('./middleware/transaction').transactional, apiRoutes, (req,res)=>res.status(404).json({ok:false,error:'API route not found.'}));

// Final error handler — anything that throws past this point (a bad JSON
// body, an unexpected exception in a controller) gets a generic message,
// never a stack trace or internal detail back to the client.
app.use((err, req, res, next) => {
  if (req.rejectTransaction) return req.rejectTransaction(err);
  if (!err.status || err.status >= 500) console.error('[request-error]', err.code || err.name);
  if (res.headersSent) return next(err);
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  res.status(status).json({ ok: false, error: err.expose ? err.message : status === 413 ? 'Request is too large.' : status === 400 ? 'Invalid request.' : 'Something went wrong.' });
});

module.exports = app;
