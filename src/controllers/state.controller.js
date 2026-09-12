const records = require('../db/records');
const userModel = require('../models/user.model');
const sessionModel = require('../models/session.model');
const settingsModel = require('../models/settings.model');
const activity = require('../models/activityLog.model');
const {readSession,requiresRealSession} = require('../middleware/auth');
const {isConfigured:cloudinaryConfigured} = require('../config/cloudinary');
const {LOGIN_REQUIRED} = require('../config/env');
// Load catalog fixtures for development only; production is initialized explicitly.
for(const model of ['case','invoice','expense','product','application','message','order','team','appointment','enquiry'])require('../models/'+model+'.model');
const jobs = require('../models/job.model').jobs;
async function getState(req,res) {
  const roles = userModel.ROLES;
  const sessions = await Promise.all(roles.map(r=>readSession(req,r)));
  // In the deliberate local demo mode there is no login cookie, but the
  // public-facing demo portals still need their seeded workflow data. Keep
  // production, protected previews, and dentist (self-service accounts —
  // see middleware/auth.js) session-backed; everything else open as before.
  const auth = Object.fromEntries(roles.map((r,i)=>[r, requiresRealSession(r) ? !!sessions[i] : true]));
  const dentist=sessions[roles.indexOf('dentist')];
  // Real identity per role (name/username), only when a genuine account
  // session backs it — never the shared open-demo placeholder — so a
  // welcome message and "Sign out" can appear wherever they're actually
  // meaningful, from data already fetched on every navigation.
  const me = {};
  roles.forEach((r,i)=>{ if(sessions[i] && !sessions[i].synthetic) me[r]={username:sessions[i].username,name:sessions[i].name}; });
  const page=Math.max(1,Math.min(100000,Math.floor(Number(req.query.page)||1)));
  const limit=200, offset=(page-1)*limit;
  const payload={jobs,auth,me,loginRequired:LOGIN_REQUIRED,cloudinaryConfigured,settings:await settingsModel.get(),summary:{},users:[],activeSessions:[],activity:[],page,hasMore:false};
  await Promise.all(['team','products','cases','invoices','expenses','applications','messages','orders','appointments','enquiries'].map(async name=>{
    const isPublic=['team','products'].includes(name);
    const canRead=isPublic || auth.admin || (name==='cases' && (auth.dentist || auth.lab)) || (name==='invoices' && auth.dentist);
    if(!canRead){payload[name]=[];return;}
    const onlyOwner=!auth.admin && !(name==='cases' && auth.lab) && ['cases','invoices'].includes(name);
    let rows=await records.list(name,{limit:isPublic?1000:limit+1,offset:isPublic?0:offset,...(onlyOwner?{ownerId:dentist.sub}:{})});
    if(!isPublic && rows.length>limit){payload.hasMore=true;rows=rows.slice(0,limit);}
    payload[name]=name==='products' && !auth.admin ? rows.filter(p=>p.active!==false) : rows;
  }));
  if(auth.admin){
    [payload.users,payload.activeSessions,payload.activity,payload.summary]=await Promise.all([userModel.list(),sessionModel.listAll(),activity.list({limit:100}),require('../services/summary.service').summary()]);
  }
  res.json(payload);
}
module.exports={getState:require('../utils/asyncHandler').asyncHandler(getState)};
