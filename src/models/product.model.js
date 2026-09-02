const products = [
  { id: 'shade-guide', name: 'VITA Classical Shade Guide', category: 'Chairside kit', price: 28, sku: 'CK-SHADE-01', stock: 14, active: true,
    desc: 'A1–D4 reference tabs for accurate shade calls before you scan.',
    specs: [{ label: 'Tabs', value: '16 shades, A1–D4' }, { label: 'Standard', value: 'VITA Classical' }, { label: 'Sterilisation', value: 'Autoclavable to 134°C' }] },
  { id: 'retraction-kit', name: 'Retraction Cord Kit', category: 'Chairside kit', price: 19, sku: 'CK-CORD-02', stock: 22, active: true,
    desc: 'Assorted-gauge cord for the margin photos our protocol asks for.',
    specs: [{ label: 'Gauges', value: '#000, #00, #0, #1' }, { label: 'Material', value: 'Knitted, non-impregnated' }, { label: 'Length', value: '4 × 244 cm' }] },
  { id: 'impression-trays', name: 'Digital Impression Tray Set', category: 'Chairside kit', price: 34, sku: 'CK-TRAY-03', stock: 9, active: true,
    desc: 'Sized trays to steady a scan on difficult arches.',
    specs: [{ label: 'Sizes', value: 'S / M / L, upper & lower' }, { label: 'Reusable', value: 'Yes — autoclavable' }] },
  { id: 'temp-kit', name: 'Temporary Crown & Bridge Kit', category: 'Chairside kit', price: 42, sku: 'CK-TEMP-04', stock: 6, active: true,
    desc: 'Interim coverage while a case is in production.',
    specs: [{ label: 'Shade', value: 'A2 bis-acryl' }, { label: 'Yield', value: '~40 units per cartridge' }, { label: 'Set time', value: '2:30 min' }] },
  { id: 'whitening-kit', name: 'Take-Home Whitening Kit', category: 'Patient retail', price: 25, sku: 'PR-WHT-01', stock: 30, active: true,
    desc: 'Dentist-recommended kit to finish whitening comfortably at home.',
    specs: [{ label: 'Gel', value: '16% carbamide peroxide' }, { label: 'Syringes', value: '4 × 3 ml' }, { label: 'Trays', value: 'Thermoform, upper & lower' }] },
  { id: 'retainer-case', name: 'Ceram Care Retainer Case', category: 'Patient retail', price: 6, sku: 'PR-CASE-02', stock: 48, active: true,
    desc: 'A proper home for retainers and night guards between visits.',
    specs: [{ label: 'Material', value: 'Vented ABS shell' }, { label: 'Colours', value: 'Plum, bone, charcoal' }] },
  { id: 'sonic-toothbrush', name: 'Ceram Care Sonic Toothbrush', category: 'Patient retail', price: 32, sku: 'PR-BRSH-03', stock: 17, active: true,
    desc: 'Gentle on veneers and crowns — the brush we recommend after treatment.',
    specs: [{ label: 'Speed', value: '31,000 strokes/min' }, { label: 'Battery', value: '30 days per charge' }, { label: 'Modes', value: 'Clean, Sensitive, Polish' }] },
  { id: 'bite-paste', name: 'Bite Registration Paste', category: 'Chairside kit', price: 22, sku: 'CK-BITE-05', stock: 11, active: true,
    desc: 'Fast-set paste for an accurate bite record with every impression.',
    specs: [{ label: 'Base', value: 'A-silicone' }, { label: 'Set time', value: '45 s intra-oral' }, { label: 'Shore hardness', value: 'D 32' }] }
];

function slugify(s) {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}
function normCategory(c) {
  return c === 'Patient retail' ? 'Patient retail' : 'Chairside kit';
}
function cleanSpecs(specs) {
  if (!Array.isArray(specs)) return [];
  return specs
    .map(s => ({ label: String((s && s.label) || '').trim(), value: String((s && s.value) || '').trim() }))
    .filter(s => s.label)
    .slice(0, 40);
}
function normStock(v) {
  if (v === '' || v == null) return null;
  const n = Math.floor(Number(v));
  return isFinite(n) && n >= 0 ? n : null;
}
function normPrice(v) {
  const n = Number(v);
  return isFinite(n) && n >= 0 ? Math.round(n * 1000) / 1000 : null;
}
function normImage(v) {
  const s = String(v || '').trim();
  return /^(https?:\/\/|\/|data:image\/)/.test(s) ? s.slice(0, 600) : '';
}

function addProduct({ name, category, price, desc, sku, stock, specs, active, image }) {
  name = String(name || '').trim();
  const priceNum = normPrice(price);
  if (!name || priceNum == null) return null;
  let base = slugify(name) || 'product';
  let id = base, n = 2;
  while (products.some(p => p.id === id)) id = base + '-' + (n++);
  const p = {
    id, name, category: normCategory(category), price: priceNum,
    desc: String(desc || '').trim(), sku: String(sku || '').trim(),
    stock: normStock(stock), active: active === false ? false : true,
    image: normImage(image), specs: cleanSpecs(specs)
  };
  products.unshift(p);
  return p;
}

function updateProduct(id, patch) {
  const p = products.find(x => x.id === id);
  if (!p) return null;
  if (patch.name != null && String(patch.name).trim()) p.name = String(patch.name).trim();
  if (patch.category != null) p.category = normCategory(patch.category);
  if (patch.price != null) { const pr = normPrice(patch.price); if (pr != null) p.price = pr; }
  if (patch.desc != null) p.desc = String(patch.desc).trim();
  if (patch.sku != null) p.sku = String(patch.sku).trim();
  if (patch.stock !== undefined) p.stock = normStock(patch.stock);
  if (patch.active !== undefined) p.active = !!patch.active;
  if (patch.image !== undefined) p.image = normImage(patch.image);
  if (patch.specs !== undefined) p.specs = cleanSpecs(patch.specs);
  return p;
}

function deleteProduct(id) {
  const i = products.findIndex(x => x.id === id);
  if (i === -1) return null;
  products.splice(i, 1);
  return true;
}

module.exports = { products, addProduct, updateProduct, deleteProduct };
