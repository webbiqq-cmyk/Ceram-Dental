// Hash-based router — maps '#/route' to a render function, re-fetches
// server state on every navigation, then wires up that page's interactions.
import { loadState } from './state.js';
import { initReveal } from './reveal.js';
import { closeDrawer } from './components/drawer.js';
import { closeCart } from './components/cart.js';
import { closeApplyModal } from './components/applyModal.js';
import { closeDoctorModal } from './components/doctor.js';
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

export async function router() {
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
  app.innerHTML = html;
  window.scrollTo(0, 0);
  attachPageHandlers(route);
  initReveal();
  requestAnimationFrame(() => { app.style.transition = 'opacity .2s ease'; app.style.opacity = 1; });
}

export function renderCurrent() { router(); }
