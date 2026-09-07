const { verifyToken } = require('../services/auth.service');
const { LOGIN_REQUIRED, IS_PRODUCTION } = require('../config/env');
const { asyncHandler } = require('../utils/asyncHandler');
const ROLES = require('../models/user.model').ROLES;
const COOKIE_NAMES = Object.fromEntries(ROLES.map(role=>[role,role+'_session']));
const COOKIE_OPTIONS = {httpOnly:true,secure:IS_PRODUCTION,sameSite:'strict',path:'/'};
function cookieNameFor(role) { return COOKIE_NAMES[role]; }
async function readSession(req,role) {
  if(!COOKIE_NAMES[role])return null;
  if(!LOGIN_REQUIRED)return {sub:'no-auth-'+role,role,username:'no-auth-'+role,name:role};
  const token=req.cookies?.[COOKIE_NAMES[role]];
  if(!token)return null;
  req.sessionChecks ||= new Map();
  if(!req.sessionChecks.has(role))req.sessionChecks.set(role,verifyToken(token));
  const decoded=await req.sessionChecks.get(role);
  return decoded?.role===role ? decoded : null;
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
module.exports={COOKIE_NAMES,COOKIE_OPTIONS,cookieNameFor,readSession,requireRole,requireAnyRole,requireRoleParam,verifyRawToken:verifyToken};
