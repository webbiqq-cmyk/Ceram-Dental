// Shared client state — the server data cache (DATA) and UI-only state
// (current tab, cart, open wizard/drawer). Everything else imports this
// module and reads/mutates these same objects directly.

let stateRequest=null, stateLoadedAt=0, loadedPage=0, stateGeneration=0, stateRequestToken=0;
// API base. Empty = same origin (current single-domain setup). When the API
// moves to its own host (api.domain.com on Render), set it once via
// <meta name="ceram-api" content="https://api.domain.com"> in index.html —
// no other change needed. Cross-origin requests send credentials so the
// session cookie (shared via COOKIE_DOMAIN=.domain.com) still travels.
export const API_BASE=(document.querySelector('meta[name="ceram-api"]')?.content || '').replace(/\/$/,'');
const LOCAL_AUTH_BYPASS=['localhost','127.0.0.1'].includes(location.hostname);
export async function api(path, opts={}) {
  const method=(opts.method || 'GET').toUpperCase();
  const mutation=!['GET','HEAD'].includes(method);
  const headers={...(opts.body ? {'Content-Type':'application/json'} : {}),...(mutation?{'Idempotency-Key':crypto.randomUUID()}:{}),...opts.headers};
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  try {
    const url=API_BASE && path.startsWith('/') ? API_BASE+path : path;
    const res=await fetch(url,{credentials:'include',...opts,headers,signal:opts.signal || controller.signal});
    const json=await res.json().catch(()=>({}));
    if(!res.ok || json.ok===false){ const err=new Error(json.error || 'Request failed. Please try again.'); err.status=res.status; throw err; }
    if(mutation){stateLoadedAt=0; stateGeneration++;}
    return json;
  } finally {clearTimeout(timer);}
}
function readCart(){try{const rows=JSON.parse(localStorage.getItem('ceram_cart') || '[]');return Array.isArray(rows)?rows.filter(r=>r && typeof r.id==='string' && Number.isInteger(r.qty) && r.qty>0 && r.qty<=100).slice(0,50):[];}catch{return [];}}

export const DATA = {
  cases: [], invoices: [], expenses: [], products: [], jobs: [], applications: [], messages: [],
  orders: [], team: [], appointments: [], enquiries: [], settings: {}, summary: {},
  auth: { admin: false, dentist: false, lab: false }, me: {},
  users: [], activeSessions: [], activity: [], cloudinaryConfigured: false,
  notifications: [], unreadNotifications: 0
};

function applyLocalAuthBypass() {
  if(!LOCAL_AUTH_BYPASS) return;
  DATA.auth={...DATA.auth,admin:true,dentist:true,lab:true};
  DATA.me={...DATA.me,admin:{id:'local-admin',username:'local-admin',name:'Local Admin'},dentist:{id:'local-dentist',username:'local-dentist',name:'Local Dentist'},lab:{id:'local-lab',username:'local-lab',name:'Local Lab'}};
  for(const key of ['cases','invoices','expenses','products','jobs','applications','messages','orders','team','appointments','enquiries','users','activeSessions','activity','notifications']) {
    if(!Array.isArray(DATA[key])) DATA[key]=[];
  }
  DATA.summary={revenue:0,outstanding:0,overdue:0,totalExpenses:0,net:0,activeCases:0,readyCases:0,newAppointments:0,totalAppointments:0,shopRevenue:0,openApplications:0,newMessages:0,trend:[],...(DATA.summary||{})};
  if(!Array.isArray(DATA.summary.trend)) DATA.summary.trend=[];
}
applyLocalAuthBypass();

export const UI = {
  cart: readCart(),
  dataPage:1,workflowHasMore:false,
  wizard: null,
  drawer: null,
  adminTab: 'overview',
  shopTab: 'patients',
  labStage: 'all',
  // Lab Studio access: pick a role, then "sign in" (visual only for now).
  // '' = not signed in, 'manager' = lab overview, or a station route name.
  labRole: '',
  labRolePick: '',
  portalTab: 'overview',
  cartOpen: false,
  notifOpen: false,
  // Which case is expanded on each of the (preview) lab-role dashboards —
  // see public/js/pages/designer.js / technician.js / qc.js.
  designerOpenId: null,
  technicianOpenId: null,
  qcOpenId: null,
  newOrderForm: null
};

export function saveCart() {
  try { localStorage.setItem('ceram_cart', JSON.stringify(UI.cart)); } catch {}
  updateCartBadge();
}

export function updateCartBadge() {
  const n = UI.cart.reduce((s, i) => s + i.qty, 0);
  const el = document.getElementById('cartCount');
  if (el) { el.textContent = n; el.hidden = n === 0; }
  // The cart button is not part of the default nav — the site reads as a
  // clinic first. It appears only on the shop page (so the cart is
  // discoverable there) or once something's actually in the cart (so it
  // follows the shopper to other pages until they check out or empty it).
  const btn = document.getElementById('cartBtn');
  if (btn) {
    const onShop = (location.hash || '').replace(/^#\//, '').split(/[/?]/)[0] === 'shop';
    btn.hidden = !(onShop || n > 0);
  }
}

export async function loadState() {
  const page=UI.dataPage || 1;
  if(loadedPage===page && Date.now()-stateLoadedAt<30000)return;
  if(stateRequest && loadedPage===page)return stateRequest;
  loadedPage=page;
  const generation=stateGeneration;
  const requestToken=++stateRequestToken;
  stateRequest=api('/api/state?page='+page).then(s=>{
    // A mutation or newer request may have completed while this response was in flight.
    // Never let an older snapshot overwrite freshly changed client state.
    if(generation!==stateGeneration || requestToken!==stateRequestToken)return;
    delete s.ok; Object.assign(DATA,s); applyLocalAuthBypass(); stateLoadedAt=Date.now();
  }).catch(err=>{
    if(err.status===401){
      DATA.auth={admin:false,dentist:false,lab:false}; DATA.users=[]; DATA.activeSessions=[];
      DATA.cases=[]; DATA.invoices=[]; DATA.expenses=[]; DATA.orders=[]; DATA.applications=[]; DATA.messages=[]; DATA.appointments=[]; DATA.enquiries=[];
      applyLocalAuthBypass();
    }
    throw err;
  }).finally(()=>{if(requestToken===stateRequestToken)stateRequest=null;});
  return stateRequest;
}

// Notifications are fetched on their own, lighter cycle (see app.js's
// polling interval) rather than only on navigation — someone sitting on
// one page for a while should still see the badge update.
// Which workflow role the open workspace is acting as. The bell, like
// every other case-aware call, has to say so: a lab manager who is also
// signed into the dentist portal holds two valid sessions, and "whichever
// cookie matched first" is not an answer to "whose notifications are
// these?".
const LAB_ROLE_OF = { manager: 'lab', reception: 'receptionist', designer: 'designer', technician: 'technician', qc: 'qc' };
const ROLE_OF_ROUTE = { reception: 'receptionist', designer: 'designer', technician: 'technician', qc: 'qc', admin: 'admin', portal: 'dentist', 'new-order': 'dentist' };

export function currentPortalRole() {
  const route = (location.hash || '#/').slice(2).split(/[/?]/)[0];
  if (ROLE_OF_ROUTE[route]) return ROLE_OF_ROUTE[route];
  // On #/studio the route alone can't say which station this is: the
  // manager and every station sign in through the same screen, and the
  // station is only known from the pick. Reading UI.labRole first stops
  // a receptionist's bell asking for the lab manager's notifications in
  // the moment between signing in and the station redirect.
  // Lab Studio's role picker is not yet any station — nothing has been
  // chosen, so there is no queue whose notifications would be the right
  // ones to show. An empty role means "don't ask", which is the honest
  // answer rather than guessing the manager.
  if (route === 'studio') return UI.labRole ? (LAB_ROLE_OF[UI.labRole] || 'lab') : '';
  if (UI.labRole) return LAB_ROLE_OF[UI.labRole] || 'lab';
  return DATA.auth.admin ? 'admin' : DATA.auth.dentist ? 'dentist' : DATA.auth.lab ? 'lab' : '';
}

export async function loadNotifications() {
  const role = currentPortalRole();
  // Only ask for the notifications of the role the server says we actually
  // are. A broader "signed into anything" test looks equivalent and isn't:
  // it lets a receptionist's bell request the lab manager's queue and take
  // a 401 for it on every poll.
  if (!role || !DATA.auth[role]) { DATA.notifications = []; DATA.unreadNotifications = 0; return; }
  try {
    const res = await api('/api/notifications?asRole=' + encodeURIComponent(role));
    DATA.notifications = res.notifications;
    DATA.unreadNotifications = res.unread;
  } catch (e) { /* not signed in / transient error — keep last known state */ }
}
