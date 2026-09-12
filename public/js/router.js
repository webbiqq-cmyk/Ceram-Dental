import { workspaceShell, attachWorkspaceHandlers } from './components/workspace.js';
import { showWorkflowHint, removeWorkflowHint } from './components/workflowHint.js';
import { renderLoginGate, attachAuthGateHandlers } from './components/authGate.js';
import { esc } from './utils/format.js';
// Hash-based router — maps '#/route' to a render function, re-fetches
// server state on every navigation, then wires up that page's interactions.
import { DATA, UI, loadState, loadNotifications, updateCartBadge } from './state.js';
import { initReveal } from './reveal.js';
import { closeDrawer } from './components/drawer.js';
import { closeCart } from './components/cart.js';
import { closeApplyModal } from './components/applyModal.js';
import { closeDoctorModal } from './components/doctor.js';
import { updateNotifUI } from './components/notifications.js';
import { attachPageHandlers } from './handlers.js';

export const PUBLIC_ROUTES = { '': 1, 'about': 1, 'services': 1, 'shop': 1, 'contact': 1, 'careers': 1, 'new-case': 1 };

// Each route's module loads only when actually visited, instead of every
// page in the app (all 11 Admin tabs, every lab role, Portal, Studio...)
// being pulled in up front just because router.js statically imported all
// of them — a plain visit to the homepage was fetching ~60 JS files for
// pages nobody had asked for yet. Dynamic import() fetches a route's file
// the first time it's needed; the browser caches it by URL after that, so
// revisiting the same route is free. render/attach live in the same file
// for every page, so one import resolves both at once.
const ROUTE_MODULES = {
  '': () => import('./pages/home.js').then(m => ({ render: m.renderHome })),
  about: () => import('./pages/about.js').then(m => ({ render: m.renderAbout, attach: m.attachAboutHandlers })),
  services: () => import('./pages/services.js').then(m => ({ render: m.renderServices, attach: m.attachServicesHandlers })),
  shop: () => import('./pages/shop.js').then(m => ({ render: m.renderShop, attach: m.attachShopHandlers })),
  contact: () => import('./pages/contact.js').then(m => ({ render: m.renderContact, attach: m.attachContactHandlers })),
  careers: () => import('./pages/careers.js').then(m => ({ render: m.renderCareers, attach: m.attachCareersHandlers })),
  'new-case': () => import('./pages/newCase.js').then(m => ({ render: m.renderNewCase, attach: m.attachNewCaseHandlers })),
  portal: () => import('./pages/portal.js').then(m => ({ render: m.renderPortal, attach: m.attachPortalHandlers })),
  studio: () => import('./pages/studio.js').then(m => ({ render: m.renderStudio, attach: m.attachStudioHandlers })),
  admin: () => import('./pages/admin.js').then(m => ({ render: m.renderAdmin, attach: m.attachAdminHandlers })),
  reception: () => import('./pages/reception.js').then(m => ({ render: m.renderReception, attach: m.attachReceptionHandlers })),
  designer: () => import('./pages/designer.js').then(m => ({ render: m.renderDesigner, attach: m.attachDesignerHandlers })),
  technician: () => import('./pages/technician.js').then(m => ({ render: m.renderTechnician, attach: m.attachTechnicianHandlers })),
  qc: () => import('./pages/qc.js').then(m => ({ render: m.renderQC, attach: m.attachQCHandlers })),
  'new-order': () => import('./pages/newOrder.js').then(m => ({ render: m.renderNewOrder, attach: m.attachNewOrderHandlers }))
};
async function loadRoute(route) { return (ROUTE_MODULES[route] || ROUTE_MODULES[''])(); }

export function currentRoute() { return (location.hash || '#/').slice(2); }

// Two router() calls can overlap — a hashchange firing while the previous
// navigation's loadState()/render is still in flight (fast clicking, or a
// login submit re-rendering right as the user navigates away). Without a
// guard, whichever async chain finishes last wins and can paint a stale
// page over a newer one. This token makes every call check, right before
// it touches the DOM, that it's still the most recent navigation —
// otherwise it quietly discards its own (now-stale) result.
let navToken = 0;
let previousRoute;
const workflowRoles={reception:'receptionist',designer:'designer',technician:'technician',qc:'qc','new-order':'dentist'};
// Lab stations are reachable only after picking a role and signing in on
// #/studio. A station role sees only its own station; the manager sees all.
const LAB_STATIONS={reception:1,designer:1,technician:1,qc:1};

export async function router() {
  const myToken = ++navToken;
  UI.workflowHasMore=false;
  closeDrawer(); closeCart(); closeApplyModal(); closeDoctorModal();
  const route = currentRoute();
  if(LAB_STATIONS[route] && UI.labRole!=='manager' && UI.labRole!==route){ location.hash = UI.labRole ? '#/'+UI.labRole : '#/studio'; return; }
  if(route==='studio' && UI.labRole && UI.labRole!=='manager'){ location.hash = '#/'+UI.labRole; return; }
  if(previousRoute!==route){UI.dataPage=1;previousRoute=route;}
  const role=workflowRoles[route];
  document.querySelectorAll('.main-nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#/' + route);
  });
  document.getElementById('waFab').style.display = PUBLIC_ROUTES.hasOwnProperty(route) ? 'flex' : 'none';
  const app = document.getElementById('app');
  app.style.opacity = 0;
  try { await loadState(); } catch (e) { /* server briefly unavailable — keep last known state */ }
  // The lab manager doesn't need separate credentials per station — signed
  // in as 'lab' is already enough to open reception/design/production/QC
  // (the backend's requireAnyRole for every station action already allows
  // 'lab' too — see orders.routes.js), matching what LAB_STATIONS's own
  // redirect above already assumed ("the manager sees all").
  const roleSatisfied = !role || DATA.auth[role] || (LAB_STATIONS[route] && DATA.auth.lab);
  let html, attach;
  try {
    if (role && !roleSatisfied) { html = renderLoginGate({role,title:'Staff sign in',subtitle:'Sign in with your assigned account to continue.'}); }
    else { const mod = await loadRoute(route); html = await mod.render(); attach = mod.attach; }
  }
  catch(e){html='<div class="page"><p>'+esc(e.message || 'Unable to load this page.')+'</p><button class="btn" id="retryPage">Retry</button></div>';}
  if (myToken !== navToken) return; // a newer navigation has started since — don't paint over it
  document.getElementById('orderDetail')?.close();
  document.getElementById('orderDetail')?.remove();
  app.innerHTML = PUBLIC_ROUTES[route] ? html : workspaceShell(route, html);
  attachWorkspaceHandlers();
  document.body.classList.toggle('public-site', !!PUBLIC_ROUTES[route]);
  document.body.classList.toggle('workplace', !PUBLIC_ROUTES[route]);
  document.body.dataset.page = route || 'home';
  updateCartBadge(); // show/hide the cart button for this route
  window.scrollTo(0, 0);
  if(role && !roleSatisfied) attachAuthGateHandlers();
  else attachPageHandlers(route, attach);
  document.getElementById('retryPage')?.addEventListener('click',()=>router());
  if(!PUBLIC_ROUTES[route] && (DATA.hasMore || UI.workflowHasMore || UI.dataPage>1)){
    const nav=document.createElement('nav');nav.className='u';nav.setAttribute('aria-label','Record pages');
    nav.innerHTML='<button class="btn btn-ghost" data-page-step="-1" '+(UI.dataPage<=1?'disabled':'')+'>Previous</button> <span>Page '+UI.dataPage+'</span> <button class="btn btn-ghost" data-page-step="1" '+(!(DATA.hasMore || UI.workflowHasMore)?'disabled':'')+'>Next</button>';
    nav.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{UI.dataPage+=Number(b.dataset.pageStep);router();}));(app.querySelector('.workspace-content') || app).append(nav);
  }
  initReveal();
  const hintOk = !PUBLIC_ROUTES[route] && !(role && !roleSatisfied) && !(route === 'studio' && UI.labRole !== 'manager');
  if (hintOk) showWorkflowHint(route); else removeWorkflowHint();
  loadNotifications().then(updateNotifUI);
  requestAnimationFrame(() => { app.style.transition = 'opacity .2s ease'; app.style.opacity = 1; });
}

export function renderCurrent() { router(); }

// Re-paints the current route from whatever's already in DATA — no server
// round trip. router()/renderCurrent() always calls loadState() first, so
// it can't be used for an optimistic update: the fetch it kicks off would
// just overwrite a local optimistic change with server data that hasn't
// caught up yet. This is the same navToken-guarded paint step, minus the
// fetch — used by drawer.js's handleCaseAction() to show a case move
// immediately, and to roll it back cleanly if the request then fails.
export async function repaintCurrent() {
  const myToken = ++navToken;
  const route = currentRoute();
  const mod = await loadRoute(route); // already cached by the browser after the initial visit that got us here
  const html = await mod.render();
  if (myToken !== navToken) return;
  const app = document.getElementById('app');
  document.getElementById('orderDetail')?.close();
  document.getElementById('orderDetail')?.remove();
  app.innerHTML = PUBLIC_ROUTES[route] ? html : workspaceShell(route, html);
  attachWorkspaceHandlers();
  attachPageHandlers(route, mod.attach);
  // No reveal-on-scroll choreography here — this is a repaint of content
  // that's already on screen (an optimistic update or its rollback), not
  // a fresh page landing, so nothing should fade or blink back in.
  app.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
}
