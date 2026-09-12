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
// Every staff-facing role now requires a real session, not the shared
// "no-auth" placeholder — dentist because self-registration means an
// account always exists (dentistSignup.js -> registerDentist); admin and
// every lab role because Accounts & Access is now the one place those
// logins get created (admin bootstraps its own first account on first
// sign-in — see auth.controller.js — everything else is admin-assigned).
// 'dispatch' isn't reachable from any page yet, so it stays out of this
// until it is — no point gating a role nothing can sign into.
const ALWAYS_AUTHENTICATE = new Set(['dentist','in_house_dentist','admin','lab','lab_manager','receptionist','designer','technician','qc']);
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
