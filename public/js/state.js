// Shared client state — the server data cache (DATA) and UI-only state
// (current tab, cart, open wizard/drawer). Everything else imports this
// module and reads/mutates these same objects directly.

let stateRequest=null, stateLoadedAt=0, loadedPage=0;
export async function api(path, opts={}) {
  const method=(opts.method || 'GET').toUpperCase();
  const mutation=!['GET','HEAD'].includes(method);
  const headers={...(opts.body ? {'Content-Type':'application/json'} : {}),...(mutation?{'Idempotency-Key':crypto.randomUUID()}:{}),...opts.headers};
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  try {
    const res=await fetch(path,{...opts,headers,signal:opts.signal || controller.signal});
    const json=await res.json().catch(()=>({}));
    if(!res.ok || json.ok===false)throw new Error(json.error || 'Request failed. Please try again.');
    if(mutation)stateLoadedAt=0;
    return json;
  } finally {clearTimeout(timer);}
}
function readCart(){try{const rows=JSON.parse(localStorage.getItem('ceram_cart') || '[]');return Array.isArray(rows)?rows.filter(r=>r && typeof r.id==='string' && Number.isInteger(r.qty) && r.qty>0 && r.qty<=100).slice(0,50):[];}catch{return [];}}

export const DATA = {
  cases: [], invoices: [], expenses: [], products: [], jobs: [], applications: [], messages: [],
  orders: [], team: [], appointments: [], enquiries: [], settings: {}, summary: {},
  auth: { admin: false, dentist: false, lab: false },
  users: [], activeSessions: [], activity: [], cloudinaryConfigured: false,
  notifications: [], unreadNotifications: 0
};

export const UI = {
  cart: readCart(),
  dataPage:1,workflowHasMore:false,
  wizard: null,
  drawer: null,
  adminTab: 'overview',
  shopTab: 'patients',
  labStage: 'all',
  portalTab: 'cases',
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
  if (!el) return;
  el.textContent = n; el.hidden = n === 0;
}

export async function loadState() {
  const page=UI.dataPage || 1;
  if(loadedPage===page && Date.now()-stateLoadedAt<30000)return;
  if(stateRequest && loadedPage===page)return stateRequest;
  loadedPage=page;
  stateRequest=api('/api/state?page='+page).then(s=>{delete s.ok;Object.assign(DATA,s);stateLoadedAt=Date.now();}).finally(()=>{stateRequest=null;});
  return stateRequest;
}

// Notifications are fetched on their own, lighter cycle (see app.js's
// polling interval) rather than only on navigation — someone sitting on
// one page for a while should still see the badge update.
export async function loadNotifications() {
  const signedIntoAny = DATA.auth.admin || DATA.auth.dentist || DATA.auth.lab;
  if (!signedIntoAny) { DATA.notifications = []; DATA.unreadNotifications = 0; return; }
  try {
    const res = await api('/api/notifications');
    DATA.notifications = res.notifications;
    DATA.unreadNotifications = res.unread;
  } catch (e) { /* not signed in / transient error — keep last known state */ }
}
