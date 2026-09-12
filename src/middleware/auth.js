const { verifyToken } = require('../services/auth.service');
const { LOGIN_REQUIRED, IS_PRODUCTION } = require('../config/env');
const { asyncHandler } = require('../utils/asyncHandler');
const ROLES = require('../models/user.model').ROLES;
const { COOKIE_DOMAIN } = require('../config/production');
const COOKIE_NAMES = Object.fromEntries(ROLES.map(role=>[role,role+'_session']));
// sameSite:'strict' + Secure + httpOnly. COOKIE_DOMAIN (".domain.com") lets
// the session cookie work across portal./admin./lab. subdomains; unset =
// host-only, which is correct for single-domain / local.
const COOKIE_OPTIONS = {httpOnly:true,secure:IS_PRODUCTION,sameSite:'strict',path:'/', ...(COOKIE_DOMAIN ? {domain:COOKIE_DOMAIN} : {})};
function cookieNameFor(role) { return COOKIE_NAMES[role]; }
// Dentist accounts are self-service — anyone can create one right from the
// public site (dentistSignup.js -> registerDentist). That's a different
// deal from the seeded admin/lab logins nobody outside the team can create,
// so unlike the rest of the open demo, dentist never falls back to the
// shared "no-auth" placeholder: a made-up identity there would just mask
// the very feature (a real account, real profile data, a real sign-out)
// self-registration exists for. Admin/lab keep the original LOGIN_REQUIRED
// switch, untouched.
const ALWAYS_AUTHENTICATE = new Set(['dentist','in_house_dentist']);
function requiresRealSession(role) { return LOGIN_REQUIRED || ALWAYS_AUTHENTICATE.has(role); }
async function readSession(req,role) {
  if(!COOKIE_NAMES[role])return null;
  // A real, valid cookie always wins over the open-demo placeholder.
  const token=req.cookies?.[COOKIE_NAMES[role]];
  if(token){
    req.sessionChecks ||= new Map();
    if(!req.sessionChecks.has(role))req.sessionChecks.set(role,verifyToken(token));
    const decoded=await req.sessionChecks.get(role);
    if(decoded?.role===role)return decoded;
  }
  // `synthetic: true` marks this as the placeholder, not a real account —
  // callers that want to show a real name/username (or a working "Sign
  // out") check this instead of guessing from sub/username conventions.
  if(!requiresRealSession(role))return {sub:'no-auth-'+role,role,username:'no-auth-'+role,name:role,synthetic:true};
  return null;
}
function requireAnyRole(roles) { return asyncHandler(async(req,res,next)=>{
  for(const role of roles){ const session=await readSession(req,role); if(session){req.user=session;return next();} }
  res.status(401).json({ok:false,error:'Sign in required.'});
}); }
function requireRole(role) { return requireAnyRole([role]); }
const requireRoleParam=asyncHandler(async(req,res,next)=>{
  if(!COOKIE_NAMES[req.params.role])return res.status(400).json({ok:false,error:'Unknown login.'});
  return requireRole(req.params.role)(req,res,next);
});
module.exports={COOKIE_NAMES,COOKIE_OPTIONS,cookieNameFor,readSession,requiresRealSession,requireRole,requireAnyRole,requireRoleParam,verifyRawToken:verifyToken};
