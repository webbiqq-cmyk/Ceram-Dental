// Shared client state — the server data cache (DATA) and UI-only state
// (current tab, cart, open wizard/drawer). Everything else imports this
// module and reads/mutates these same objects directly.

export async function api(path, opts) {
  const res = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || 'Something went wrong.');
  return json;
}

export const DATA = { cases: [], invoices: [], expenses: [], products: [], jobs: [], applications: [], messages: [], orders: [], team: [], appointments: [], enquiries: [], settings: {}, summary: {}, auth: { admin: false, dentist: false, lab: false } };

export const UI = {
  cart: JSON.parse(localStorage.getItem('ceram_cart') || '[]'),
  wizard: null,
  drawer: null,
  adminTab: 'overview',
  shopTab: 'patients',
  labStage: 'all',
  portalTab: 'cases',
  cartOpen: false
};

export function saveCart() {
  localStorage.setItem('ceram_cart', JSON.stringify(UI.cart));
  updateCartBadge();
}

export function updateCartBadge() {
  const n = UI.cart.reduce((s, i) => s + i.qty, 0);
  const el = document.getElementById('cartCount');
  el.textContent = n; el.hidden = n === 0;
}

export async function loadState() {
  const s = await api('/api/state');
  delete s.ok;
  Object.assign(DATA, s);
}
