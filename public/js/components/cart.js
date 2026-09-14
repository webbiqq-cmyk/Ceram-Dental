import { DATA, UI, api, loadState, saveCart } from '../state.js';
import { money, field } from '../utils/format.js';
import { toast } from '../toast.js';
import { newIdempotencyKey } from '../utils/idempotency.js';
import { effectiveLang } from '../i18n.js';

// One key per checkout attempt, reused across a retry of the same click
// (a dropped connection right at checkout shouldn't be able to place the
// order twice) but reset the moment the cart itself changes — otherwise a
// genuinely different order could get silently deduped against a stale
// key and replay the previous order's response instead of placing itself.
let checkoutKey = null;

const S = {
  en: {
    title: 'Your cart', empty: 'Your cart is empty.', total: 'Total', checkout: 'Checkout',
    clinicName: 'Clinic / your name', deliveryAddress: 'Delivery address',
    signInNote: 'Orders are placed on account — sign in or create a clinic account to check out.',
    signIn: 'Sign in to place your order', added: 'Added to cart',
    addName: 'Add your clinic or name first.', orderPlaced: 'Order placed',
    included: total => money(total) + ' · we’ll include it with your next pickup.', orderNum: id => 'Order ' + id + ' placed'
  },
  ar: {
    title: 'سلتك', empty: 'سلتك فارغة.', total: 'الإجمالي', checkout: 'إتمام الشراء',
    clinicName: 'العيادة / اسمك', deliveryAddress: 'عنوان التوصيل',
    signInNote: 'تُقدَّم الطلبات عبر الحساب — سجّل الدخول أو أنشئ حساب عيادة لإتمام الشراء.',
    signIn: 'سجّل الدخول لتقديم طلبك', added: 'أُضيف إلى السلة',
    addName: 'أضف اسم عيادتك أو اسمك أولًا.', orderPlaced: 'تم تقديم الطلب',
    included: total => money(total) + ' · سنضيفه إلى استلامك القادم.', orderNum: id => 'تم تقديم الطلب ' + id
  }
};

function cartHead() { const t = S[effectiveLang()]; return '<div class="cart-head"><h3 style="font-size:17px;">' + t.title + '</h3><button class="drawer-close" id="cartClose">✕</button></div>'; }

export function renderCartDrawer() {
  const t = S[effectiveLang()];
  const host = document.getElementById('cartDrawer');
  if (!UI.cart.length) {
    host.innerHTML = cartHead() + '<div class="empty-note">' + t.empty + '</div>';
    return;
  }
  let total = 0;
  const lines = UI.cart.map(item => {
    const p = DATA.products.find(x => x.id === item.id);
    if (!p) return '';
    total += p.price * item.qty;
    return '<div class="cart-line"><div><div>' + p.name + '</div><div class="qty"><button data-cart-dec="' + p.id + '">−</button><span class="mono">' + item.qty + '</span><button data-cart-inc="' + p.id + '">+</button></div></div><div>' + money(p.price * item.qty) + '</div></div>';
  }).join('');
  const canOrder = DATA.auth && (DATA.auth.dentist || DATA.auth.admin);
  const foot = canOrder
    ? '<div class="checkout-form">' +
        field('full', 'text', 'co-name', t.clinicName, true) +
        field('full', 'text', 'co-address', t.deliveryAddress, false) +
      '</div>' +
      '<div class="cart-foot"><div class="total"><span>' + t.total + '</span><span>' + money(total) + '</span></div><button class="btn btn-primary btn-block" id="checkoutBtn">' + t.checkout + '</button></div>'
    : '<div class="cart-foot"><div class="total"><span>' + t.total + '</span><span>' + money(total) + '</span></div>' +
      '<p class="empty-note" style="margin:0 0 12px;">' + t.signInNote + '</p>' +
      '<a class="btn btn-primary btn-block" href="#/portal" id="cartSignInBtn">' + t.signIn + '</a></div>';
  host.innerHTML = cartHead() + '<div class="cart-body">' + lines + '</div>' + foot;
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
  toast(S[effectiveLang()].added);
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
  const t = S[effectiveLang()];
  const name = document.getElementById('co-name').value.trim();
  if (!name) { toast(t.addName); return; }
  const address = document.getElementById('co-address').value.trim();
  if (!checkoutKey) checkoutKey = newIdempotencyKey();
  try {
    const res = await api('/api/checkout', { method: 'POST', headers: { 'Idempotency-Key': checkoutKey }, body: JSON.stringify({ items: UI.cart, customer: { name, address } }) });
    checkoutKey = null;
    UI.cart = []; saveCart();
    await loadState();
    document.getElementById('cartDrawer').innerHTML = cartHead() + '<div class="confirm"><div class="check-mark">✓</div><h3>' + t.orderPlaced + '</h3><div class="cid">' + res.order.id + '</div><p style="color:var(--ink-soft);">' + t.included(res.order.total) + '</p></div>';
    toast(t.orderNum(res.order.id));
  } catch (e) { toast(e.message); }
}
