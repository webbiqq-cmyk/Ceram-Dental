import { DATA, UI } from '../state.js';
import { esc, money } from '../utils/format.js';
import { productMediaHtml } from '../utils/productMedia.js';
import { footer } from '../components/footer.js';
import { addToCart } from '../components/cart.js';
import { renderCurrent } from '../router.js';
import { editorialImage } from '../components/editorialImage.js';
import { effectiveLang, trCategory } from '../i18n.js';

const S = {
  en: {
    eyebrow: 'Shop', title: 'Care that continues at home.',
    lede: 'Patient retail for after your visit, and chairside essentials for the practices we work with.',
    patients: 'For Patients', practices: 'For Practices', addToCart: 'Add to cart'
  },
  ar: {
    eyebrow: 'المتجر', title: 'عناية تستمر في منزلك.',
    lede: 'منتجات للمرضى بعد زيارتهم، ومستلزمات كرسي العلاج للعيادات التي نتعامل معها.',
    patients: 'للمرضى', practices: 'للعيادات', addToCart: 'أضف إلى السلة'
  }
};

export function renderShop() {
  const t = S[effectiveLang()];
  return (
    '<div class="page"><div class="u">' +
    '<div class="page-head reveal"><span class="eyebrow-accent">' + t.eyebrow + '</span>' +
      '<h1 class="serif">' + t.title + '</h1>' +
      '<p class="lede">' + t.lede + '</p></div>' +
    editorialImage('shop-care', { wide: true, cls: 'collection-banner' }) +
    '<div class="dash-tabs">' +
      '<button class="dash-tab' + (UI.shopTab === 'patients' ? ' active' : '') + '" data-shop-tab="patients">' + t.patients + '</button>' +
      '<button class="dash-tab' + (UI.shopTab === 'practices' ? ' active' : '') + '" data-shop-tab="practices">' + t.practices + '</button>' +
    '</div>' +
    '<div class="product-grid">' + DATA.products.filter(p => {
      if (p.active === false) return false;
      return UI.shopTab === 'patients' ? p.category === 'Patient retail' : p.category === 'Chairside kit';
    }).map((p, i) => {
      const specs = (p.specs && p.specs.length)
        ? '<ul class="spec-list">' + p.specs.slice(0, 4).map(sp => '<li><b>' + esc(sp.label) + '</b>' + (sp.value ? ' · ' + esc(sp.value) : '') + '</li>').join('') + '</ul>'
        : '';
      return '<div class="product-card reveal" style="--i:' + i + '">' + productMediaHtml(p) +
        '<span class="cat">' + esc(trCategory(p.category)) + '</span><h3>' + esc(p.name) + '</h3><p>' + esc(p.desc) + '</p>' + specs +
        '<div class="row"><span class="price">' + money(p.price) + '</span><button class="btn btn-primary btn-sm" data-add-product="' + esc(p.id) + '">' + t.addToCart + '</button></div></div>';
    }).join('') + '</div>' +
    '</div></div>' + footer()
  );
}

export function attachShopHandlers() {
  document.querySelectorAll('[data-add-product]').forEach(b => b.addEventListener('click', () => addToCart(b.dataset.addProduct)));
  document.querySelectorAll('[data-shop-tab]').forEach(b => b.addEventListener('click', () => { UI.shopTab = b.dataset.shopTab; renderCurrent(); }));
}
