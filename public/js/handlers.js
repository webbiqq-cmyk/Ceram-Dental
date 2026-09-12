// Per-route event wiring, dispatched by router.js right after a page
// renders. Each route's own interaction logic lives with its render
// function (pages/*.js) — router.js's lazy import() already resolved that
// page's attach function alongside its render function (same file, one
// fetch) and hands it straight in here, so this file doesn't need its own
// static import of every page just to dispatch to it. What's left is the
// handful of bindings that apply on every route (opening the case drawer /
// doctor modal from a data-open / data-doctor element).
import { openDrawer } from './components/drawer.js';
import { openDoctorModal } from './components/doctor.js';
import { addToCart } from './components/cart.js';

export function attachPageHandlers(route, attach) {
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
