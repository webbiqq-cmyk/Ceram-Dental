// Hash-based router — maps '#/route' to a render function, re-fetches
// server state on every navigation, then wires up that page's interactions.
import { loadState, loadNotifications } from './state.js';
import { initReveal } from './reveal.js';
import { closeDrawer } from './components/drawer.js';
import { closeCart } from './components/cart.js';
import { closeApplyModal } from './components/applyModal.js';
import { closeDoctorModal } from './components/doctor.js';
import { updateNotifUI } from './components/notifications.js';
import { attachPageHandlers } from './handlers.js';

import { renderHome } from './pages/home.js';
import { renderAbout } from './pages/about.js';
import { renderServices } from './pages/services.js';
import { renderShop } from './pages/shop.js';
import { renderContact } from './pages/contact.js';
import { renderCareers } from './pages/careers.js';
import { renderNewCase } from './pages/newCase.js';
import { renderPortal } from './pages/portal.js';
import { renderStudio } from './pages/studio.js';
import { renderAdmin } from './pages/admin.js';

export const PUBLIC_ROUTES = { '': 1, 'about': 1, 'services': 1, 'shop': 1, 'contact': 1, 'careers': 1, 'new-case': 1 };

const routes = {
  '': renderHome, 'about': renderAbout, 'services': renderServices, 'shop': renderShop,
  'contact': renderContact, 'careers': renderCareers, 'new-case': renderNewCase,
  'portal': renderPortal, 'studio': renderStudio, 'admin': renderAdmin
};

export function currentRoute() { return (location.hash || '#/').slice(2); }

// Two router() calls can overlap — a hashchange firing while the previous
// navigation's loadState()/render is still in flight (fast clicking, or a
// login submit re-rendering right as the user navigates away). Without a
// guard, whichever async chain finishes last wins and can paint a stale
// page over a newer one. This token makes every call check, right before
// it touches the DOM, that it's still the most recent navigation —
// otherwise it quietly discards its own (now-stale) result.
let navToken = 0;

export async function router() {
  const myToken = ++navToken;
  closeDrawer(); closeCart(); closeApplyModal(); closeDoctorModal();
  const route = currentRoute();
  const fn = routes[route] || renderHome;
  document.querySelectorAll('.main-nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#/' + route);
  });
  document.getElementById('waFab').style.display = PUBLIC_ROUTES.hasOwnProperty(route) ? 'flex' : 'none';
  const app = document.getElementById('app');
  app.style.opacity = 0;
  try { await loadState(); } catch (e) { /* server briefly unavailable — keep last known state */ }
  const html = await fn();
  if (myToken !== navToken) return; // a newer navigation has started since — don't paint over it
  app.innerHTML = html;
  window.scrollTo(0, 0);
  attachPageHandlers(route);
  initReveal();
  loadNotifications().then(updateNotifUI);
  requestAnimationFrame(() => { app.style.transition = 'opacity .2s ease'; app.style.opacity = 1; });
}

export function renderCurrent() { router(); }
