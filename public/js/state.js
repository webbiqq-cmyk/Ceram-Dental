// Shared client state — the server data cache (DATA) and UI-only state
// (current tab, cart, open wizard/drawer). Everything else imports this
// module and reads/mutates these same objects directly.

let stateRequest=null, stateLoadedAt=0, loadedPage=0, stateGeneration=0, stateRequestToken=0;
export async function api(path, opts={}) {
  const method=(opts.method || 'GET').toUpperCase();
  const mutation=!['GET','HEAD'].includes(method);
  const headers={...(opts.body ? {'Content-Type':'application/json'} : {}),...(mutation?{'Idempotency-Key':crypto.randomUUID()}:{}),...opts.headers};
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  try {
    const res=await fetch(path,{...opts,headers,signal:opts.signal || controller.signal});
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
    delete s.ok; Object.assign(DATA,s); stateLoadedAt=Date.now();
  }).catch(err=>{
    if(err.status===401){
      DATA.auth={admin:false,dentist:false,lab:false}; DATA.users=[]; DATA.activeSessions=[];
      DATA.cases=[]; DATA.invoices=[]; DATA.expenses=[]; DATA.orders=[]; DATA.applications=[]; DATA.messages=[]; DATA.appointments=[]; DATA.enquiries=[];
    }
    throw err;
  }).finally(()=>{if(requestToken===stateRequestToken)stateRequest=null;});
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
