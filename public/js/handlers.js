// Per-route event wiring, dispatched by router.js right after a page
// renders. Each route's own interaction logic lives with its render
// function (pages/*.js) — this file just calls the right one, plus the
// handful of bindings that apply on every route (opening the case drawer /
// doctor modal from a data-open / data-doctor element).
import { attachNewCaseHandlers } from './pages/newCase.js';
import { attachAboutHandlers } from './pages/about.js';
import { attachShopHandlers } from './pages/shop.js';
import { attachServicesHandlers } from './pages/services.js';
import { attachContactHandlers } from './pages/contact.js';
import { attachCareersHandlers } from './pages/careers.js';
import { attachPortalHandlers } from './pages/portal.js';
import { attachStudioHandlers } from './pages/studio.js';
import { attachAdminHandlers } from './pages/admin.js';
import { attachReceptionHandlers } from './pages/reception.js';
import { attachDesignerHandlers } from './pages/designer.js';
import { attachTechnicianHandlers } from './pages/technician.js';
import { attachQCHandlers } from './pages/qc.js';
import { attachNewOrderHandlers } from './pages/newOrder.js';
import { openDrawer } from './components/drawer.js';
import { openDoctorModal } from './components/doctor.js';
import { addToCart } from './components/cart.js';

const ROUTE_HANDLERS = {
  about: attachAboutHandlers,
  'new-case': attachNewCaseHandlers,
  shop: attachShopHandlers,
  services: attachServicesHandlers,
  contact: attachContactHandlers,
  careers: attachCareersHandlers,
  portal: attachPortalHandlers,
  studio: attachStudioHandlers,
  admin: attachAdminHandlers,
  reception: attachReceptionHandlers,
  designer: attachDesignerHandlers,
  technician: attachTechnicianHandlers,
  qc: attachQCHandlers,
  'new-order': attachNewOrderHandlers
};

export function attachPageHandlers(route) {
  const attach = ROUTE_HANDLERS[route];
  if (attach) attach();
  if (route !== 'shop') document.querySelectorAll('[data-add-product]').forEach(button => button.addEventListener('click', () => addToCart(button.dataset.addProduct)));
  document.querySelectorAll('[data-review-step]').forEach(button => button.addEventListener('click', () => {
    const track = document.getElementById('storiesTrack');
    if (!track) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    const next = (index + Number(button.dataset.reviewStep) + track.children.length) % track.children.length;
    track.scrollTo({ left: next * track.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }));

  // case cards / rows (portal + studio) and doctor tiles/cards (home + about)
  document.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => openDrawer(el.dataset.open, el.dataset.from)));
  document.querySelectorAll('[data-doctor]').forEach(el => el.addEventListener('click', () => openDoctorModal(el.dataset.doctor)));
}
