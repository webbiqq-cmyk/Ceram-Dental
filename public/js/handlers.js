// Per-route event wiring, dispatched by router.js right after a page
// renders. Each route's own interaction logic lives with its render
// function (pages/*.js) — this file just calls the right one, plus the
// handful of bindings that apply on every route (opening the case drawer /
// doctor modal from a data-open / data-doctor element).
import { attachNewCaseHandlers } from './pages/newCase.js';
import { attachShopHandlers } from './pages/shop.js';
import { attachServicesHandlers } from './pages/services.js';
import { attachContactHandlers } from './pages/contact.js';
import { attachCareersHandlers } from './pages/careers.js';
import { attachPortalHandlers } from './pages/portal.js';
import { attachStudioHandlers } from './pages/studio.js';
import { attachAdminHandlers } from './pages/admin.js';
import { openDrawer } from './components/drawer.js';
import { openDoctorModal } from './components/doctor.js';

const ROUTE_HANDLERS = {
  'new-case': attachNewCaseHandlers,
  shop: attachShopHandlers,
  services: attachServicesHandlers,
  contact: attachContactHandlers,
  careers: attachCareersHandlers,
  portal: attachPortalHandlers,
  studio: attachStudioHandlers,
  admin: attachAdminHandlers
};

export function attachPageHandlers(route) {
  const attach = ROUTE_HANDLERS[route];
  if (attach) attach();

  // case cards / rows (portal + studio) and doctor tiles/cards (home + about)
  document.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => openDrawer(el.dataset.open, el.dataset.from)));
  document.querySelectorAll('[data-doctor]').forEach(el => el.addEventListener('click', () => openDoctorModal(el.dataset.doctor)));
}
