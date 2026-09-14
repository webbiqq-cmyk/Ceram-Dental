import { DATA, api, loadState } from '../../state.js';
import { esc, money, val, fval, specsToText, specsFromText } from '../../utils/format.js';
import { productMediaHtml } from '../../utils/productMedia.js';
import { PRODUCT_CATEGORIES } from '../../constants.js';
import { toast } from '../../toast.js';
import { renderCurrent } from '../../router.js';
import { uploadWidgetHtml, attachUploadHandlers } from '../../components/cloudinaryUpload.js';

function catOptions(selected) {
  return PRODUCT_CATEGORIES.map(c => '<option' + (c === selected ? ' selected' : '') + '>' + c + '</option>').join('');
}

export function adminProducts() {
  const listed = DATA.products.filter(p => p.active !== false).length;
  const stats = '<div class="stat-strip reveal" style="margin:0 0 22px;">' +
    '<div class="chipstat"><b>' + DATA.products.length + '</b><span>Products</span></div>' +
    '<div class="chipstat"><b>' + listed + '</b><span>Listed in shop</span></div>' +
    '<div class="chipstat"><b>' + (DATA.products.length - listed) + '</b><span>Hidden</span></div>' +
  '</div>';

  const addForm = '<div class="card reveal" style="margin-bottom:20px;"><span class="eyebrow" style="margin-bottom:14px;">Add a product</span>' +
    '<form id="productAddForm" class="form-grid">' +
      '<div class="field"><label>Name</label><input id="np-name" required></div>' +
      '<div class="field"><label>Category</label><select id="np-category">' + catOptions('Chairside kit') + '</select></div>' +
      '<div class="field"><label>Price (BD)</label><input id="np-price" type="number" min="0" step="0.001" required></div>' +
      '<div class="field"><label>SKU</label><input id="np-sku" placeholder="Optional"></div>' +
      '<div class="field"><label>Stock on hand</label><input id="np-stock" type="number" min="0" step="1" placeholder="Optional"></div>' +
      '<div class="field full"><label>Image URL</label><input id="np-image" placeholder="https://… (leave blank for a placeholder tile)"></div>' +
      (DATA.cloudinaryConfigured ? uploadWidgetHtml('np-image') : '') +
      '<div class="field full"><label>Description</label><textarea id="np-desc" placeholder="Shown on the shop card"></textarea></div>' +
      '<div class="field full"><label>Specifications — one per line, as <span class="mono">Label: value</span></label>' +
        '<textarea id="np-specs" placeholder="Material: A-silicone&#10;Set time: 45 s&#10;Shelf life: 24 months"></textarea></div>' +
      '<div class="field full"><button class="btn btn-primary" type="submit">Add product</button></div>' +
    '</form></div>';

  if (!DATA.products.length) return stats + addForm + '<div class="empty-note">No products yet — add your first one above.</div>';

  const toolbar = '<div class="workspace-toolbar reveal"><input type="search" id="productSearch" placeholder="Search products by name, category or SKU…" autocomplete="off"></div>';

  const cards = DATA.products.map(p => {
    const lowStock = p.stock != null && p.stock <= 3;
    const hidden = p.active === false;
    const hay = (p.name + ' ' + p.category + ' ' + (p.sku || '')).toLowerCase();
    return '<div class="card reveal prod-card' + (hidden ? ' is-hidden' : '') + '" data-prod-search="' + esc(hay) + '">' +
      '<div class="prod-summary-row">' +
        '<button type="button" class="prod-summary-toggle" data-toggle-product="' + esc(p.id) + '" aria-expanded="false" aria-controls="prod-form-' + esc(p.id) + '">' +
          productMediaHtml(p, 'prod-thumb') +
          '<span class="prod-summary-main">' +
            '<b>' + esc(p.name) + '</b>' +
            '<span class="prod-summary-badges"><span class="pill pill-neutral">' + esc(p.category) + '</span>' +
              (hidden ? '<span class="pill pill-neutral">Hidden</span>' : '') +
              (lowStock ? '<span class="pill pill-danger">Low stock</span>' : '') + '</span>' +
            '<span class="prod-summary-meta">' + money(p.price) + ' · SKU ' + esc(p.sku || '—') + ' · ' + (p.stock == null ? 'Stock not tracked' : p.stock + ' in stock') + '</span>' +
          '</span>' +
          '<span class="prod-summary-chevron" aria-hidden="true">⌄</span>' +
        '</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-quick-product-visibility="' + esc(p.id) + '" data-make-active="' + hidden + '">' + (hidden ? 'Show in shop' : 'Hide from shop') + '</button>' +
      '</div>' +
      '<div class="prod-details" id="prod-form-' + esc(p.id) + '" hidden>' +
        '<form class="form-grid product-edit-form" data-product-id="' + esc(p.id) + '">' +
          '<div class="field"><label>Name</label><input name="name" value="' + esc(p.name) + '" required></div>' +
          '<div class="field"><label>Category</label><select name="category">' + catOptions(p.category) + '</select></div>' +
          '<div class="field"><label>Price (BD)</label><input name="price" type="number" min="0" step="0.001" value="' + esc(p.price) + '" required></div>' +
          '<div class="field"><label>SKU</label><input name="sku" value="' + esc(p.sku || '') + '"></div>' +
          '<div class="field"><label>Stock on hand</label><input name="stock" type="number" min="0" step="1" value="' + esc(p.stock == null ? '' : p.stock) + '"></div>' +
          '<div class="field"><label>Shop visibility</label><select name="active">' +
            '<option value="true"' + (hidden ? '' : ' selected') + '>Listed in shop</option>' +
            '<option value="false"' + (hidden ? ' selected' : '') + '>Hidden</option></select></div>' +
          '<div class="field full"><label>Image URL</label><input id="pe-image-' + esc(p.id) + '" name="image" value="' + esc(p.image || '') + '" placeholder="https://… (blank = placeholder tile)"></div>' +
          (DATA.cloudinaryConfigured ? uploadWidgetHtml('pe-image-' + p.id) : '') +
          '<div class="field full"><label>Description</label><textarea name="desc">' + esc(p.desc || '') + '</textarea></div>' +
          '<div class="field full"><label>Specifications — one per line, as <span class="mono">Label: value</span></label>' +
            '<textarea name="specs" rows="4">' + esc(specsToText(p.specs)) + '</textarea></div>' +
          '<div class="field full prod-card-actions">' +
            '<button class="btn btn-primary btn-sm" type="submit">Save changes</button>' +
            '<button class="btn btn-danger-ghost btn-sm" type="button" data-del-product="' + esc(p.id) + '">Delete</button></div>' +
        '</form>' +
      '</div>' +
    '</div>';
  }).join('');

  return stats + addForm + toolbar + '<div class="prod-admin-list">' + cards + '</div><p class="empty-note" id="productNoMatch" hidden>No products match that search.</p>';
}

export function attachProductsHandlers() {
  if (DATA.cloudinaryConfigured) attachUploadHandlers(document, 'products');
  const paf = document.getElementById('productAddForm');
  if (paf) paf.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api('/api/products', { method: 'POST', body: JSON.stringify({
        name: val('np-name'), category: val('np-category'), price: val('np-price'),
        sku: val('np-sku'), stock: val('np-stock'), image: val('np-image'), desc: val('np-desc'),
        specs: specsFromText(val('np-specs'))
      }) });
      await loadState(); renderCurrent(); toast('Product added');
    } catch (err) { toast(err.message); }
  });
  document.querySelectorAll('.product-edit-form').forEach(f => {
    f.addEventListener('submit', async e => {
      e.preventDefault();
      try {
        await api('/api/products/' + encodeURIComponent(f.dataset.productId), { method: 'POST', body: JSON.stringify({
          name: fval(f, 'name'), category: fval(f, 'category'), price: fval(f, 'price'),
          sku: fval(f, 'sku'), stock: fval(f, 'stock'), active: fval(f, 'active') === 'true',
          image: fval(f, 'image'), desc: fval(f, 'desc'), specs: specsFromText(fval(f, 'specs'))
        }) });
        await loadState(); renderCurrent(); toast('Product updated');
      } catch (err) { toast(err.message); }
    });
  });
  document.querySelectorAll('[data-del-product]').forEach(b => {
    b.addEventListener('click', async () => {
      if (!window.confirm('Delete this product? This can\'t be undone.')) return;
      try {
        await api('/api/products/' + encodeURIComponent(b.dataset.delProduct) + '/delete', { method: 'POST' });
        await loadState(); renderCurrent(); toast('Product deleted');
      } catch (err) { toast(err.message); }
    });
  });
  // Compact-by-default list: each row expands to its full edit form only
  // when opened, instead of every product's form rendering at once.
  document.querySelectorAll('[data-toggle-product]').forEach(b => {
    b.addEventListener('click', () => {
      const panel = document.getElementById('prod-form-' + b.dataset.toggleProduct);
      if (!panel) return;
      panel.hidden = !panel.hidden;
      b.setAttribute('aria-expanded', String(!panel.hidden));
    });
  });
  // One-click shop visibility toggle, without opening the full form.
  document.querySelectorAll('[data-quick-product-visibility]').forEach(b => {
    b.addEventListener('click', async () => {
      const makeActive = b.dataset.makeActive === 'true';
      b.disabled = true;
      try {
        await api('/api/products/' + encodeURIComponent(b.dataset.quickProductVisibility), { method: 'POST', body: JSON.stringify({ active: makeActive }) });
        await loadState(); renderCurrent(); toast(makeActive ? 'Product shown in the shop' : 'Product hidden from the shop');
      } catch (err) { toast(err.message); b.disabled = false; }
    });
  });
  document.getElementById('productSearch')?.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase(); let shown = 0;
    document.querySelectorAll('[data-prod-search]').forEach(card => { card.hidden = !card.dataset.prodSearch.includes(q); if (!card.hidden) shown++; });
    document.getElementById('productNoMatch').hidden = shown > 0;
  });
}
