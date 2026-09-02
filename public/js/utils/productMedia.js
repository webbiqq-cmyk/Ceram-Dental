// Product imagery — a real photo when a product has one, otherwise a tidy
// category-tinted glyph tile picked by matching the product name.
import { esc } from './format.js';

const PRODUCT_GLYPHS = [
  [/whiten|bleach/, 'M9 3h6l-1 4h-4L9 3Zm0 5h6l-.7 12a1.3 1.3 0 0 1-1.3 1.2h-1a1.3 1.3 0 0 1-1.3-1.2L9 8Zm1.5 3.5h3'],
  [/retainer|case|guard/, 'M4 9h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Zm2-4h12l2 4H4l2-4ZM9 13h6'],
  [/brush/, 'M3 16l8-8 3 3-8 8-3 1v-4Zm9-9 3-3a2 2 0 0 1 3 3l-3 3M5.5 13.5l5 5'],
  [/shade/, 'M4 20 12 4l8 16M7.5 14h9M10 20l2-4 2 4'],
  [/cord|retraction/, 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z'],
  [/tray|impression/, 'M4 10a8 6 0 0 1 16 0v5a3 3 0 0 1-3 3h-2v-6h-6v6H7a3 3 0 0 1-3-3v-5Z'],
  [/temp|crown|bridge/, 'M4 11a8 7 0 0 1 16 0v3a8 6 0 0 1-16 0v-3ZM8 9v8M12 8v9M16 9v8'],
  [/bite|paste|registration|silicone/, 'M8 4h8v3l-1 12a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1L8 7V4Zm0 4h8M11 2h2']
];
const TOOTH_GLYPH = 'M12 20c-1.4-2.7-1.8-5.8-1.8-8.4C10.2 8.7 9 6.4 7 6.4c-2.2 0-3.2 2-3.2 4 0 4.5 2.4 8.1 4.2 9.3.6.4 1.4-.1 1.6-.9l.5-2.7c.2-.9 1.6-.9 1.8 0l.5 2.7c.2.8 1 1.3 1.6.9 1.8-1.2 4.2-4.8 4.2-9.3 0-2-1-4-3.2-4-2 0-3.2 2.3-3.2 5.2 0 2.6-.4 5.7-1.8 8.4Z';

export function productGlyph(p) {
  const n = (p.name || '').toLowerCase();
  for (let i = 0; i < PRODUCT_GLYPHS.length; i++) if (PRODUCT_GLYPHS[i][0].test(n)) return PRODUCT_GLYPHS[i][1];
  return TOOTH_GLYPH;
}

export function productMediaHtml(p, cls) {
  cls = cls || 'product-media';
  if (p.image) return '<div class="' + cls + '"><img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy"></div>';
  const retail = p.category === 'Patient retail';
  return '<div class="' + cls + ' is-placeholder' + (retail ? ' ph-retail' : '') + '">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="' + productGlyph(p) + '"/></svg></div>';
}
