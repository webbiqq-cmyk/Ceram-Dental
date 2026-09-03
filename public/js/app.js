// Entry point (loaded as a module by index.html). Wires up the topbar/cart
// chrome that exists outside any single page, then hands off to the router.
import { updateCartBadge, loadNotifications } from './state.js';
import { router } from './router.js';
import { injectDrawerShell, closeDrawer, handleCaseAction } from './components/drawer.js';
import { openCart, closeCart, changeQty, checkout } from './components/cart.js';
import { closeApplyModal } from './components/applyModal.js';
import { closeDoctorModal } from './components/doctor.js';
import { initNotifBell, updateNotifUI } from './components/notifications.js';

// How often to check for new notifications without the user navigating —
// this is the in-app substitute for OS push (see README for why, and what
// real push would need). 25s keeps a phone/tablet/desktop screen feeling
// current without hammering the server.
const NOTIFICATION_POLL_MS = 25000;

document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  injectDrawerShell();

  document.getElementById('dashBtn').addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('dashMenu').classList.toggle('open');
  });
  document.addEventListener('click', () => document.getElementById('dashMenu').classList.remove('open'));

  document.getElementById('navToggle').addEventListener('click', () => {
    const nav = document.getElementById('mainNav');
    const open = nav.style.display === 'flex';
    nav.style.display = open ? 'none' : 'flex';
    nav.style.cssText += 'position:absolute; top:64px; left:0; right:0; background:var(--surface); flex-direction:column; padding:14px 24px; border-bottom:1px solid var(--line); gap:16px;';
    nav.style.display = open ? 'none' : 'flex';
  });

  document.getElementById('cartBtn').addEventListener('click', openCart);
  document.getElementById('cartBackdrop').addEventListener('click', closeCart);

  document.body.addEventListener('click', e => {
    if (e.target.id === 'cartClose') closeCart();
    if (e.target.id === 'checkoutBtn') checkout();
    const inc = e.target.closest('[data-cart-inc]'); if (inc) changeQty(inc.dataset.cartInc, 1);
    const dec = e.target.closest('[data-cart-dec]'); if (dec) changeQty(dec.dataset.cartDec, -1);
    const act = e.target.closest('[data-act]'); if (act) handleCaseAction(act.dataset.act, act.dataset.id);
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); closeCart(); closeApplyModal(); closeDoctorModal(); } });

  initNotifBell();
  // Stop polling when the tab isn't visible — no point waking up a
  // backgrounded phone tab every 25s just to ask the server for nothing.
  let pollTimer = null;
  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(() => loadNotifications().then(updateNotifUI), NOTIFICATION_POLL_MS);
  }
  function stopPolling() {
    if (!pollTimer) return;
    clearInterval(pollTimer); pollTimer = null;
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopPolling(); else startPolling(); });
  startPolling();

  window.addEventListener('hashchange', router);
  if (!location.hash) location.hash = '#/';
  router();
});
