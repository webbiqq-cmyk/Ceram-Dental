import { DATA, UI, api, loadState, saveCart } from '../state.js';
import { money, field } from '../utils/format.js';
import { toast } from '../toast.js';
import { newIdempotencyKey } from '../utils/idempotency.js';

// One key per checkout attempt, reused across a retry of the same click
// (a dropped connection right at checkout shouldn't be able to place the
// order twice) but reset the moment the cart itself changes — otherwise a
// genuinely different order could get silently deduped against a stale
// key and replay the previous order's response instead of placing itself.
let checkoutKey = null;

function cartHead() { return '<div class="cart-head"><h3 style="font-size:17px;">Your cart</h3><button class="drawer-close" id="cartClose">✕</button></div>'; }

export function renderCartDrawer() {
  const host = document.getElementById('cartDrawer');
  if (!UI.cart.length) {
    host.innerHTML = cartHead() + '<div class="empty-note">Your cart is empty.</div>';
    return;
  }
  let total = 0;
  const lines = UI.cart.map(item => {
    const p = DATA.products.find(x => x.id === item.id);
    if (!p) return '';
    total += p.price * item.qty;
    return '<div class="cart-line"><div><div>' + p.name + '</div><div class="qty"><button data-cart-dec="' + p.id + '">−</button><span class="mono">' + item.qty + '</span><button data-cart-inc="' + p.id + '">+</button></div></div><div>' + money(p.price * item.qty) + '</div></div>';
  }).join('');
  host.innerHTML = cartHead() +
    '<div class="cart-body">' + lines + '</div>' +
    '<div class="checkout-form">' +
      field('full', 'text', 'co-name', 'Clinic / your name', true) +
      field('full', 'text', 'co-address', 'Delivery address', false) +
    '</div>' +
    '<div class="cart-foot"><div class="total"><span>Total</span><span>' + money(total) + '</span></div><button class="btn btn-primary btn-block" id="checkoutBtn">Checkout</button></div>';
}

export function openCart() {
  UI.cartOpen = true; renderCartDrawer();
  document.getElementById('cartBackdrop').classList.add('open');
  const drawer = document.getElementById('cartDrawer');
  drawer.classList.add('open');
  drawer.focus();
}
export function closeCart() { UI.cartOpen = false; document.getElementById('cartBackdrop').classList.remove('open'); document.getElementById('cartDrawer').classList.remove('open'); }

export function addToCart(id) {
  const line = UI.cart.find(i => i.id === id);
  if (line) line.qty++; else UI.cart.push({ id, qty: 1 });
  saveCart();
  toast('Added to cart');
}

export function changeQty(id, delta) {
  const line = UI.cart.find(i => i.id === id);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) UI.cart = UI.cart.filter(i => i.id !== id);
  checkoutKey = null; // cart changed — any in-progress checkout attempt is now stale
  saveCart(); renderCartDrawer();
}

export async function checkout() {
  const name = document.getElementById('co-name').value.trim();
  if (!name) { toast('Add your clinic or name first.'); return; }
  const address = document.getElementById('co-address').value.trim();
  if (!checkoutKey) checkoutKey = newIdempotencyKey();
  try {
    const res = await api('/api/checkout', { method: 'POST', headers: { 'Idempotency-Key': checkoutKey }, body: JSON.stringify({ items: UI.cart, customer: { name, address } }) });
    checkoutKey = null;
    UI.cart = []; saveCart();
    await loadState();
    document.getElementById('cartDrawer').innerHTML = cartHead() + '<div class="confirm"><div class="check-mark">✓</div><h3>Order placed</h3><div class="cid">' + res.order.id + '</div><p style="color:var(--ink-soft);">' + money(res.order.total) + ' · we\'ll include it with your next pickup.</p></div>';
    toast('Order ' + res.order.id + ' placed');
  } catch (e) { toast(e.message); }
}
