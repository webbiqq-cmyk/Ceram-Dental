(function () {
  "use strict";

  /* ======================= constants / metadata ======================= */
  var STAGES = [
    { key: 'reception', label: 'Reception' },
    { key: 'qc', label: 'Quality Control' },
    { key: 'designer', label: 'Design' },
    { key: 'doctor_approval', label: 'Doctor Approval' },
    { key: 'cadcam', label: 'CAD-CAM / Milling' },
    { key: 'layering', label: 'Layering & Finishing' },
    { key: 'qc_photo', label: 'QC & Photography' },
    { key: 'ready', label: 'Ready for Pickup' }
  ];
  var STAGE_INDEX = {}; STAGES.forEach(function (s, i) { STAGE_INDEX[s.key] = i; });

  var SERVICES = [
    { key: 'veneers', label: 'Veneers', fee: 480, desc: 'Layered ceramic veneers, custom shade and surface texture.', icon: 'M4 21 12 3l8 18Z' },
    { key: 'crowns', label: 'Crowns', fee: 90, desc: 'Zirconia or E-max crowns milled to precise margins.', icon: 'M4 10a8 8 0 0 1 16 0v4a8 8 0 0 1-16 0Z' },
    { key: 'bridges', label: 'Bridges', fee: 320, desc: 'Multi-unit fixed bridges with matched shade and contacts.', icon: 'M3 17h18M6 17V9l3-3h6l3 3v8' },
    { key: 'implants', label: 'Implants', fee: 200, desc: 'Implant-supported restorations, your system and abutment.', icon: 'M12 3v10m0 0-3 8h6l-3-8Z' },
    { key: 'surgical_guide', label: 'Surgical Guide', fee: 150, desc: 'Pilot or fully-guided surgical guides from your scan.', icon: 'M4 4h16v16H4Zm4 4h8v8H8Z' },
    { key: 'dsd', label: 'Digital Smile Design', fee: 60, desc: 'Full smile mockups and design previews before any prep.', icon: 'M4 13c2-5 14-5 16 0M9 17h6' }
  ];
  var SVC = {}; SERVICES.forEach(function (s) { SVC[s.key] = s; });

  var PROTOCOL = [
    { key: 'photos', label: 'Clinical Photos' },
    { key: 'scan', label: 'Digital Scan / Impression' },
    { key: 'retraction', label: 'Retraction Cord Photo' },
    { key: 'margins', label: 'Clear Margins (near gums)' },
    { key: 'contacts', label: 'Clear Contacts' }
  ];

  var GUIDES = [
    { t: 'Veneer Guide', d: 'Prep depth, shade capture and photo angles for veneer cases.' },
    { t: 'Implant Guide', d: 'Component checklist and scan-body handling for implant cases.' },
    { t: 'Scan Guide', d: 'Getting a clean digital impression on the first try.' },
    { t: 'Photo Guide', d: 'The five reference shots our QC desk checks on arrival.' }
  ];

  var LAYERING_STYLES = ['Natural cutback', 'Full contour', 'Micro-layered incisal'];
  var GLAZE_TYPES = ['High glaze', 'Matte glaze', 'Characterized/stained'];
  var SURFACE_TEXTURES = ['Natural texture', 'Smooth polish', 'Youthful (high texture)'];
  var SHADES = ['A1', 'A2', 'A3', 'A3.5', 'B1', 'B2', 'C2', 'D3'];
  var RESTORATION_TYPES = ['Layered E.max', 'Monolithic E.max', 'Pressed E.max', 'Layered zirconia', 'Monolithic zirconia', 'PFM', 'Full-cast gold'];
  var FABRICATION = ['Milled', 'Pressed'];
  var INCISAL_DESIGNS = ['Natural cutback', 'Full contour', 'Micro-layered incisal', 'Mamelon detail', 'Incisal halo'];
  var RESTORATION_SERVICES = { veneers: 1, crowns: 1, bridges: 1, implants: 1 };
  function isRestoration(key) { return !!RESTORATION_SERVICES[key]; }
  function shadeCombo(sh) {
    if (!sh) return '—';
    var parts = [sh.cervical, sh.body, sh.incisal].filter(function (x) { return x && x !== '—'; });
    return parts.length ? parts.join(' / ') : (sh.body || '—');
  }

  /* Approximate facial enamel tones for each VITA shade — used by the tooth diagram. */
  var SHADE_HEX = {
    'A1': '#EEE4CF', 'A2': '#E8D9BC', 'A3': '#E0CBA4', 'A3.5': '#D7BE8E',
    'B1': '#F0E7D2', 'B2': '#E6D7B5', 'C2': '#D3C7AD', 'D3': '#D1C4AE'
  };
  function shadeHex(s, fallback) { return SHADE_HEX[s] || fallback || '#E8D9BC'; }

  var COVERAGE_TEXT = {
    veneers: 'Facial veneer — covers only the visible front surface; the back of the tooth stays natural.',
    crowns: 'Full crown — caps the whole tooth, 360°, down to the prepared margin.',
    bridges: 'Fixed bridge — crowns cap the two anchor teeth and a joined pontic fills the gap.',
    implants: 'Implant crown — full coverage seated on the implant abutment.'
  };

  // Live diagram: a facial-view tooth split into cervical / body / incisal thirds,
  // each tinted with its chosen shade, with an overlay showing what the restoration covers.
  function toothVizHtml(w) {
    var body = shadeHex(w.shadeBody, '#E8D9BC');
    var cerv = (!w.shadeCervical || w.shadeCervical === '—') ? body : shadeHex(w.shadeCervical, body);
    var inci = (!w.shadeIncisal || w.shadeIncisal === '—') ? body : shadeHex(w.shadeIncisal, body);
    var isVeneer = w.service === 'veneers';
    var toothPath = 'M22 30 C22 15 40 9 60 9 C80 9 98 15 98 30 L94 106 C92 130 78 143 60 143 C42 143 28 130 26 106 Z';
    var incMark = '';
    if (/halo/i.test(w.incisal || '')) incMark = '<rect x="0" y="126" width="120" height="17" fill="rgba(255,255,255,.5)"/>';
    else if (/cutback|mamelon/i.test(w.incisal || '')) incMark = '<path d="M40 116 v22 M60 114 v24 M80 116 v22" stroke="rgba(120,86,104,.32)" stroke-width="4" stroke-linecap="round"/>';
    var svg = '<svg viewBox="0 0 120 152" width="118" height="150" role="img" aria-label="Tooth shade and coverage diagram">' +
      '<defs><clipPath id="tvClip"><path d="' + toothPath + '"/></clipPath></defs>' +
      '<path d="M6 22 C30 8 90 8 114 22 L114 33 C90 19 30 19 6 33 Z" fill="var(--violet-soft)"/>' +
      '<g clip-path="url(#tvClip)">' +
        '<rect x="0" y="0" width="120" height="53" fill="' + cerv + '"/>' +
        '<rect x="0" y="53" width="120" height="45" fill="' + body + '"/>' +
        '<rect x="0" y="98" width="120" height="54" fill="' + inci + '"/>' +
        incMark +
      '</g>' +
      '<path d="' + toothPath + '" fill="none" stroke="' + (isVeneer ? 'var(--line)' : 'var(--violet)') + '" stroke-width="' + (isVeneer ? 2 : 3.5) + '"/>' +
      (isVeneer ? '<path d="M27 33 C27 20 42 15 60 15 C78 15 93 20 93 33 L90 101" fill="none" stroke="var(--violet)" stroke-width="3.5" stroke-dasharray="5 4" stroke-linecap="round"/>' : '') +
      '<line x1="102" y1="30" x2="118" y2="30" stroke="var(--ink-soft)" stroke-width="1"/><text x="100" y="27" text-anchor="end" font-size="8" fill="var(--ink-soft)">cervical</text>' +
      '<line x1="102" y1="76" x2="118" y2="76" stroke="var(--ink-soft)" stroke-width="1"/><text x="100" y="73" text-anchor="end" font-size="8" fill="var(--ink-soft)">body</text>' +
      '<line x1="102" y1="120" x2="118" y2="120" stroke="var(--ink-soft)" stroke-width="1"/><text x="100" y="117" text-anchor="end" font-size="8" fill="var(--ink-soft)">incisal</text>' +
      '</svg>';
    function sw(hex, label, shade) { return '<div><span class="sw" style="background:' + hex + '"></span>' + label + ' <b>' + esc(shade) + '</b></div>'; }
    var legend = '<div class="tooth-legend">' +
      sw(cerv, 'Cervical ⅓', (w.shadeCervical && w.shadeCervical !== '—') ? w.shadeCervical : w.shadeBody + ' (blend)') +
      sw(body, 'Body ⅓', w.shadeBody) +
      sw(inci, 'Incisal ⅓', ((w.shadeIncisal && w.shadeIncisal !== '—') ? w.shadeIncisal : w.shadeBody + ' (blend)') + ' · ' + (w.incisal || '')) +
      '<div class="tooth-cover">' + esc(COVERAGE_TEXT[w.service] || '') + '</div>' +
    '</div>';
    return '<div class="tooth-viz">' + svg + legend + '</div>';
  }

  function syncWizardDesign() {
    var w = UI.wizard;
    if (!w || !isRestoration(w.service) || !document.getElementById('w-material')) return;
    w.material = val('w-material'); w.fabrication = val('w-fabrication'); w.incisal = val('w-incisal');
    w.layering = val('w-layering'); w.glaze = val('w-glaze'); w.surface = val('w-surface');
    w.shadeCervical = val('w-shade-cervical'); w.shadeBody = val('w-shade-body'); w.shadeIncisal = val('w-shade-incisal');
  }
  var TOOTH_PATH = 'M12 21c-1.6-3-2-6.4-2-9.2C10 8.5 8.7 6 6.5 6 4 6 3 8.3 3 10.5c0 5 2.6 9 4.6 10.3.7.5 1.6-.1 1.8-1l.6-3c.2-1 1.8-1 2 0l.6 3c.2.9 1.1 1.5 1.8 1 2-1.3 4.6-5.3 4.6-10.3C21 8.3 20 6 17.5 6 15.3 6 14 8.5 14 11.8c0 2.8-.4 6.2-2 9.2Z';
  var ADMIN_TABS = [
    ['overview', 'Overview'], ['appointments', 'Appointments'], ['invoices', 'Invoices'], ['expenses', 'Expenses'],
    ['products', 'Products'], ['orders', 'Shop Orders'], ['team', 'Team'], ['applications', 'Careers'], ['messages', 'Messages'], ['settings', 'Settings']
  ];
  var PRODUCT_CATEGORIES = ['Chairside kit', 'Patient retail'];

  /* ============================== helpers =============================== */
  function money(n) { return 'BD ' + Number(n || 0).toFixed(3); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function fmtDate(d) { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  function fmtDateTime(d) { return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  function fval(form, name) { var el = form.querySelector('[name="' + name + '"]'); return el ? el.value : ''; }
  function specsToText(specs) { return (specs || []).map(function (s) { return s.value ? s.label + ': ' + s.value : s.label; }).join('\n'); }
  function specsFromText(text) {
    return String(text || '').split('\n').map(function (line) {
      var i = line.indexOf(':');
      if (i === -1) { var only = line.trim(); return only ? { label: only, value: '' } : null; }
      var label = line.slice(0, i).trim();
      return label ? { label: label, value: line.slice(i + 1).trim() } : null;
    }).filter(Boolean);
  }

  /* Product imagery — a real photo when set, otherwise a tidy category-tinted glyph tile. */
  var PRODUCT_GLYPHS = [
    [/whiten|bleach/, 'M9 3h6l-1 4h-4L9 3Zm0 5h6l-.7 12a1.3 1.3 0 0 1-1.3 1.2h-1a1.3 1.3 0 0 1-1.3-1.2L9 8Zm1.5 3.5h3'],
    [/retainer|case|guard/, 'M4 9h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Zm2-4h12l2 4H4l2-4ZM9 13h6'],
    [/brush/, 'M3 16l8-8 3 3-8 8-3 1v-4Zm9-9 3-3a2 2 0 0 1 3 3l-3 3M5.5 13.5l5 5'],
    [/shade/, 'M4 20 12 4l8 16M7.5 14h9M10 20l2-4 2 4'],
    [/cord|retraction/, 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z'],
    [/tray|impression/, 'M4 10a8 6 0 0 1 16 0v5a3 3 0 0 1-3 3h-2v-6h-6v6H7a3 3 0 0 1-3-3v-5Z'],
    [/temp|crown|bridge/, 'M4 11a8 7 0 0 1 16 0v3a8 6 0 0 1-16 0v-3ZM8 9v8M12 8v9M16 9v8'],
    [/bite|paste|registration|silicone/, 'M8 4h8v3l-1 12a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1L8 7V4Zm0 4h8M11 2h2']
  ];
  var TOOTH_GLYPH = 'M12 20c-1.4-2.7-1.8-5.8-1.8-8.4C10.2 8.7 9 6.4 7 6.4c-2.2 0-3.2 2-3.2 4 0 4.5 2.4 8.1 4.2 9.3.6.4 1.4-.1 1.6-.9l.5-2.7c.2-.9 1.6-.9 1.8 0l.5 2.7c.2.8 1 1.3 1.6.9 1.8-1.2 4.2-4.8 4.2-9.3 0-2-1-4-3.2-4-2 0-3.2 2.3-3.2 5.2 0 2.6-.4 5.7-1.8 8.4Z';
  function productGlyph(p) {
    var n = (p.name || '').toLowerCase();
    for (var i = 0; i < PRODUCT_GLYPHS.length; i++) if (PRODUCT_GLYPHS[i][0].test(n)) return PRODUCT_GLYPHS[i][1];
    return TOOTH_GLYPH;
  }
  function productMediaHtml(p, cls) {
    cls = cls || 'product-media';
    if (p.image) return '<div class="' + cls + '"><img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy"></div>';
    var retail = p.category === 'Patient retail';
    return '<div class="' + cls + ' is-placeholder' + (retail ? ' ph-retail' : '') + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="' + productGlyph(p) + '"/></svg></div>';
  }
  function labelFor(stageKey) { return STAGES[STAGE_INDEX[stageKey]].label; }
  function svcLabel(key) { return SVC[key] ? SVC[key].label : key; }

  async function api(path, opts) {
    var res = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
    var json = await res.json().catch(function () { return {}; });
    if (!res.ok || json.ok === false) throw new Error(json.error || 'Something went wrong.');
    return json;
  }

  /* ================================ state ================================ */
  var DATA = { cases: [], invoices: [], expenses: [], products: [], jobs: [], applications: [], messages: [], orders: [], team: [], appointments: [], settings: {}, summary: {} };
  var UI = {
    cart: JSON.parse(localStorage.getItem('ceram_cart') || '[]'),
    wizard: null,
    drawer: null,
    adminTab: 'overview',
    shopTab: 'patients',
    labStage: 'all',
    cartOpen: false
  };
  function saveCart() { localStorage.setItem('ceram_cart', JSON.stringify(UI.cart)); updateCartBadge(); }
  function updateCartBadge() {
    var n = UI.cart.reduce(function (s, i) { return s + i.qty; }, 0);
    var el = document.getElementById('cartCount');
    el.textContent = n; el.hidden = n === 0;
  }

  async function loadState() {
    var s = await api('/api/state');
    delete s.ok;
    Object.assign(DATA, s);
  }

  function toast(msg) {
    var host = document.getElementById('toastHost');
    var t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    host.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  /* =============================== reveal-on-scroll ======================= */
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealObserver = (!prefersReduced && 'IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      revealObserver.unobserve(el);
      // paint the hidden state, then flip on the next frame so the transition always runs
      requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('visible'); }); });
    });
  }, { threshold: 0, rootMargin: '0px 0px 10% 0px' }) : null;
  function initReveal() {
    var els = document.querySelectorAll('#app .reveal');
    els.forEach(function (el, i) {
      if (!el.style.getPropertyValue('--i')) el.style.setProperty('--i', i % 6);
      if (revealObserver) revealObserver.observe(el); else el.classList.add('visible');
    });
  }

  /* ================================ router ================================ */
  var PUBLIC_ROUTES = { '': 1, 'about': 1, 'services': 1, 'shop': 1, 'contact': 1, 'careers': 1, 'new-case': 1 };
  var routes = {
    '': renderHome, 'about': renderAbout, 'services': renderServices, 'shop': renderShop,
    'contact': renderContact, 'careers': renderCareers, 'new-case': renderNewCase,
    'portal': renderPortal, 'studio': renderStudio, 'admin': renderAdmin
  };

  function currentRoute() { return (location.hash || '#/').slice(2); }

  async function router() {
    closeDrawer(); closeCart(); closeApplyModal();
    var route = currentRoute();
    var fn = routes[route] || renderHome;
    document.querySelectorAll('.main-nav a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#/' + route);
    });
    document.getElementById('waFab').style.display = PUBLIC_ROUTES.hasOwnProperty(route) ? 'flex' : 'none';
    var app = document.getElementById('app');
    app.style.opacity = 0;
    try { await loadState(); } catch (e) { /* server briefly unavailable — keep last known state */ }
    var html = await fn();
    requestAnimationFrame(function () {
      app.innerHTML = html;
      attachPageHandlers(route);
      initReveal();
      requestAnimationFrame(function () { app.style.transition = 'opacity .2s ease'; app.style.opacity = 1; });
    });
  }

  /* =============================== shared chrome =========================== */
  function footer() {
    var s = DATA.settings || {};
    return (
      '<footer class="site-footer"><div class="u"><div class="footer-grid">' +
        '<div><div class="footer-brand"><span class="brand-mark"><img src="/images/icon.png" alt=""></span>' + esc(s.clinicName || 'Ceram Dental') + '</div>' +
          '<p class="about-copy">A dental clinic with its own in-house ceramics lab — from your consultation to a restoration made and checked under one roof.</p>' +
          '<div class="social-row" style="margin-top:16px;">' + socialIcons() + '</div></div>' +
        '<div><h4>Explore</h4><a href="#/about">About</a><a href="#/services">Services</a><a href="#/shop">Shop</a><a href="#/careers">Careers</a></div>' +
        '<div><h4>For Dentists</h4><a href="#/new-case">Refer a Case</a><a href="#/portal">Dentist Portal</a><a href="#/studio">Lab Studio</a><a href="#/admin">Accounts &amp; Admin</a></div>' +
        '<div><h4>Visit</h4><a href="tel:' + esc(s.phone) + '">' + esc(s.phone) + '</a><a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a><a href="#/contact">' + esc(s.address) + '</a></div>' +
      '</div><div class="footer-bottom"><span>© ' + new Date().getFullYear() + ' ' + esc(s.clinicName || 'Ceram Dental') + '. Click-through demo.</span><span>Imagery generated for this demo.</span></div></div></footer>'
    );
  }

  function socialIcons() {
    var NETWORKS = [
      { label: 'Instagram', url: 'https://instagram.com/ceramdental',
        path: 'M12 2.2c2.7 0 3 0 4.1.06 1.1.05 1.8.22 2.4.46.65.25 1.2.6 1.75 1.15.55.55.9 1.1 1.15 1.75.24.6.41 1.3.46 2.4.06 1.1.06 1.4.06 4.1s0 3-.06 4.1c-.05 1.1-.22 1.8-.46 2.4-.25.65-.6 1.2-1.15 1.75-.55.55-1.1.9-1.75 1.15-.6.24-1.3.41-2.4.46-1.1.06-1.4.06-4.1.06s-3 0-4.1-.06c-1.1-.05-1.8-.22-2.4-.46a4.9 4.9 0 0 1-1.75-1.15 4.9 4.9 0 0 1-1.15-1.75c-.24-.6-.41-1.3-.46-2.4C2.2 15 2.2 14.7 2.2 12s0-3 .06-4.1c.05-1.1.22-1.8.46-2.4.25-.65.6-1.2 1.15-1.75A4.9 4.9 0 0 1 5.62 2.6c.6-.24 1.3-.41 2.4-.46C9.12 2.2 9.4 2.2 12 2.2Zm0 1.8c-2.66 0-2.97 0-4.02.06-.9.04-1.38.18-1.7.31-.43.16-.73.36-1.05.68-.32.32-.52.62-.68 1.05-.13.32-.27.8-.31 1.7C4.2 8.85 4.2 9.16 4.2 12s0 3.15.06 4.2c.04.9.18 1.38.31 1.7.16.43.36.73.68 1.05.32.32.62.52 1.05.68.32.13.8.27 1.7.31 1.05.06 1.36.06 4.02.06s2.97 0 4.02-.06c.9-.04 1.38-.18 1.7-.31.43-.16.73-.36 1.05-.68.32-.32.52-.62.68-1.05.13-.32.27-.8.31-1.7.06-1.05.06-1.36.06-4.2s0-3.15-.06-4.2c-.04-.9-.18-1.38-.31-1.7a2.8 2.8 0 0 0-.68-1.05 2.8 2.8 0 0 0-1.05-.68c-.32-.13-.8-.27-1.7-.31C14.97 4 14.66 4 12 4Zm0 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Zm5.2-1.98a1.17 1.17 0 1 1-2.34 0 1.17 1.17 0 0 1 2.34 0Z' },
      { label: 'Facebook', url: 'https://facebook.com/ceramdental',
        path: 'M13.5 21v-7.6h2.55l.38-2.96h-2.93V8.55c0-.86.24-1.44 1.47-1.44h1.57V4.46c-.27-.04-1.2-.12-2.28-.12-2.26 0-3.8 1.38-3.8 3.9v2.18H7.99v2.96h2.47V21h3.04Z' },
      { label: 'TikTok', url: 'https://tiktok.com/@ceramdental',
        path: 'M16.5 3c.3 2.02 1.43 3.23 3.39 3.36v2.27c-1.14.11-2.13-.26-3.29-.96v5.94c0 3.02-1.65 5.19-4.36 5.6-3.19.48-5.99-1.66-6.19-4.58-.2-2.98 2.09-5.28 4.94-5.28.32 0 .63.03 1.01.1v2.44c-.34-.11-.65-.16-.94-.15-1.38.05-2.42 1.05-2.4 2.44.02 1.4 1.13 2.43 2.53 2.4 1.35-.03 2.32-1.03 2.32-2.6V3h2.99Z' },
      { label: 'Snapchat', url: 'https://snapchat.com/add/ceramdental',
        path: 'M12 3c-2.55 0-4.45 1.95-4.53 4.63-.02.52 0 1.03.02 1.42-.22.12-.53.16-.85.05-.3-.1-.58-.3-.9-.3-.6 0-1.12.4-1.12.94 0 .4.3.72.9.97.42.17.92.3 1.03.72.05.2.01.46-.2.82-.03.03-1.2 2.72-3.9 3.16-.3.05-.5.3-.44.6.14.62 1.36 1.05 3 1.28.1.15.19.55.28.9.06.22.22.36.5.36.4 0 .9-.28 1.74-.28.5 0 1 .08 1.45.4.85.6 1.55 1.06 2.72 1.06h.03c1.17 0 1.87-.46 2.72-1.06.45-.32.95-.4 1.45-.4.84 0 1.34.28 1.74.28.28 0 .44-.14.5-.36.09-.35.18-.75.28-.9 1.64-.23 2.86-.66 3-1.28.06-.3-.14-.55-.44-.6-2.7-.44-3.87-3.13-3.9-3.16-.21-.36-.25-.62-.2-.82.11-.42.61-.55 1.03-.72.6-.25.9-.57.9-.97 0-.54-.52-.94-1.12-.94-.32 0-.6.2-.9.3-.32.11-.63.07-.85-.05.02-.39.04-.9.02-1.42C16.45 4.95 14.55 3 12 3Z' },
      { label: 'YouTube', url: 'https://youtube.com/@ceramdental',
        path: 'M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z' },
      { label: 'WhatsApp', url: 'https://wa.me/97317131123',
        path: 'M19.05 4.94A9.82 9.82 0 0 0 12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38a9.86 9.86 0 0 0 4.73 1.2h.01c5.46 0 9.9-4.44 9.9-9.9a9.82 9.82 0 0 0-2.9-6.98ZM12.04 20.1a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.15.82.84-3.07-.2-.32a8.16 8.16 0 0 1-1.25-4.35 8.2 8.2 0 0 1 14.01-5.8 8.14 8.14 0 0 1 2.4 5.8c0 4.53-3.68 8.21-8.22 8.21Zm4.5-6.15c-.25-.12-1.46-.72-1.69-.8-.22-.09-.39-.13-.55.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.55-1.34-.76-1.83-.2-.48-.4-.42-.55-.42l-.47-.01c-.16 0-.43.06-.65.31-.22.25-.86.84-.86 2.05 0 1.2.88 2.37 1 2.53.12.16 1.73 2.64 4.2 3.7.58.26 1.04.4 1.4.52.59.19 1.12.16 1.55.1.47-.07 1.46-.6 1.66-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z' }
    ];
    return NETWORKS.map(function (n) {
      return '<a href="' + n.url + '" target="_blank" rel="noopener" aria-label="' + n.label + '" title="' + n.label + '">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="' + n.path + '"/></svg></a>';
    }).join('');
  }

  /* ================================== HOME ================================ */
  function renderHome() {
    var doctors = DATA.team.slice(0, 3);
    var st = DATA.settings || {};
    var phone = st.phone || '+973 1713 1123';
    function step(n, t, d) {
      return '<div class="step reveal"><span class="num">' + n + '</span><h3>' + t + '</h3><p>' + d + '</p></div>';
    }
    return (
      '<div class="page page-flush">' +
      '<section class="home-hero">' +
        '<div class="hero-copy reveal">' +
          '<span class="kicker">Welcome to Ceram Dental · New Zinj, Manama</span>' +
          '<h1>Your smile, in careful hands.</h1>' +
          '<p class="welcome">Come in for a routine check-up or a full smile makeover — either way you&rsquo;re looked after by doctors who take the time to explain, and a ceramics lab one floor up that shapes your crowns and veneers by hand. No rush, no pressure. Just a clear plan, a comfortable visit, and a result that looks like it was always yours.</p>' +
          '<div class="cta-row">' +
            '<a class="btn btn-primary btn-lg" href="#/contact">Book a consultation</a>' +
            '<a class="btn btn-ghost btn-lg" href="#/about">Learn more about us</a>' +
          '</div>' +
          '<div class="hero-trust"><span>In-house ceramics lab</span><span>' + SERVICES.length + ' dental specialties</span><span>Open Sat–Thu</span></div>' +
        '</div>' +
        '<div class="hero-photo reveal">' +
          '<img src="/images/reception.jpg" alt="Inside the Ceram Dental clinic, New Zinj" fetchpriority="high" decoding="async">' +
          '<span class="hero-photo-cap">Our clinic, New Zinj</span>' +
        '</div>' +
      '</section>' +

      '<div class="u">' +

      '<div class="stat-strip reveal">' +
        '<div class="chipstat"><b>In-house</b><span>CAD-CAM ceramics lab</span></div>' +
        '<div class="chipstat"><b>' + SERVICES.length + '</b><span>Dental specialties</span></div>' +
        '<div class="chipstat"><b>5-point</b><span>Quality check per case</span></div>' +
        '<div class="chipstat"><b>' + DATA.team.length + '</b><span>Doctors on our team</span></div>' +
      '</div>' +

      '<div class="section home-split reveal">' +
        '<div class="split-text">' +
          '<span class="eyebrow">Why Ceram Dental</span>' +
          '<h2>A clinic and a ceramics lab, under one roof.</h2>' +
          '<p>Most practices send your case to an outside lab you never see. Ours is upstairs. Your dentist and the technician shaping your crown work from the same plan, the same scan and the same shade — so what reaches your mouth is what was designed for it.</p>' +
          '<ul class="lead-bullets">' +
            '<li>Treatment planned digitally before any work begins</li>' +
            '<li>Crowns, veneers and guides milled and finished on site</li>' +
            '<li>Every restoration checked twice against a five-point protocol</li>' +
          '</ul>' +
          '<a class="btn btn-primary" href="#/about">Learn more about us →</a>' +
        '</div>' +
        '<div class="split-media">' +
          '<img src="/images/lab.jpg" alt="A ceramist layering a crown in the Ceram Dental lab" loading="lazy" decoding="async">' +
          '<div class="split-badge"><b>5-point QC</b><span>on every case, before pickup</span></div>' +
        '</div>' +
      '</div>' +

      '<div class="section">' +
        '<div class="section-head"><div><span class="eyebrow">Treatments</span><h2>Services we\'re known for</h2></div>' +
          '<a class="btn btn-ghost btn-sm" href="#/services">All services →</a></div>' +
        '<div class="services-grid">' + SERVICES.map(function (s, i) {
          return '<a href="#/services" class="svc-card reveal" style="--i:' + i + '">' +
            '<div class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="' + s.icon + '"/></svg></div>' +
            '<h3>' + s.label + '</h3><p>' + s.desc + '</p>' +
            '<span class="svc-more">Learn more →</span></a>';
        }).join('') + '</div>' +
      '</div>' +

      '<div class="section">' +
        '<div class="section-head"><div><span class="eyebrow">How it works</span><h2>From first visit to final fit</h2></div></div>' +
        '<div class="steps-grid">' +
          step('01', 'Consultation & plan', 'We listen, examine and photograph, then map out the treatment and the cost with you before anything starts.') +
          step('02', 'Digital scan', 'A quick intraoral scan replaces the putty tray and gives the lab an exact model to work from.') +
          step('03', 'Made in our lab', 'Your restoration is designed, milled and layered upstairs — not shipped to a lab you never meet.') +
          step('04', 'Fitted & checked', 'We seat it, check the bite and the margins, and only finish once it looks and feels right.') +
        '</div>' +
      '</div>' +

      '<div class="section">' +
        '<div class="section-head"><div><span class="eyebrow">Our doctors</span><h2>Meet the clinicians</h2></div>' +
          '<a class="btn btn-ghost btn-sm" href="#/about">Meet the team →</a></div>' +
        '<div class="dept-grid">' + doctors.map(function (d, i) {
          return '<div class="dept-card reveal" style="--i:' + i + '"><div class="dept-avatar">' + d.initials + '</div><h3>' + d.name + '</h3><p>' + d.role + '</p></div>';
        }).join('') + '</div>' +
      '</div>' +

      '<div class="section">' +
        '<div class="section-head"><div><span class="eyebrow">Step inside</span><h2>Visit the clinic</h2></div></div>' +
        '<div class="visit-grid">' +
          '<div class="space-card reveal" style="background-image:url(/images/hero-night.jpg)"><span class="tag">Ceram Dental, New Zinj</span></div>' +
          '<div class="space-card reveal" style="background-image:url(/images/reception.jpg)"><span class="tag">Reception</span></div>' +
          '<div class="space-card reveal" style="background-image:url(/images/lounge.jpg)"><span class="tag">Patient lounge</span></div>' +
        '</div>' +
      '</div>' +

      '<div class="section shop-strip reveal">' +
        '<div><span class="eyebrow">Ceram Dental Shop</span><h3>Take-home care &amp; chairside essentials</h3>' +
          '<p>Whitening kits, retainer cases and the products your dentist recommends — ready to collect at your next visit.</p></div>' +
        '<a class="btn btn-ghost" href="#/shop">Visit the shop →</a>' +
      '</div>' +

      '<div class="section cta-banner reveal">' +
        '<h2>Ready for your best smile?</h2>' +
        '<p>Book a consultation and our team will help you find the right treatment — no pressure, just a plan.</p>' +
        '<div class="cta-row"><a class="btn btn-white" href="#/contact">Book a consultation</a><a class="btn btn-onphoto" href="tel:+97317131123">Call ' + esc(phone) + '</a></div>' +
      '</div>' +

      '</div></div>' + footer()
    );
  }

  /* =================================== ABOUT =============================== */
  function renderAbout() {
    var depts = [
      { n: 'RC', t: 'Reception', d: 'The first friendly face when you arrive' },
      { n: 'QC', t: 'Quality Control', d: 'Checks every restoration before it reaches you' },
      { n: 'DS', t: 'Design Studio', d: 'Plans your smile digitally before any work begins' },
      { n: 'CC', t: 'CAD-CAM & Milling', d: 'Mills and finishes your ceramics on site' }
    ];
    return (
      '<div class="page"><div class="u">' +
      '<div class="page-head reveal"><span class="eyebrow-accent">About Ceram Dental</span>' +
        '<h1>Your dental clinic, with its own ceramics lab.</h1>' +
        '<p class="lede">We started as a chairside ceramics studio and grew into a full dental clinic — our own doctors, an in-house CAD-CAM lab, and a QC desk that checks every restoration the same way, twice, before it reaches you.</p></div>' +

      '<div class="section">' +
        '<div class="section-head"><div><span class="eyebrow">Our doctors</span><h2 style="font-size:21px; margin-top:4px;">Meet the team</h2></div></div>' +
        '<div class="dept-grid">' + DATA.team.map(function (d, i) {
          return '<div class="dept-card reveal" style="--i:' + i + '"><div class="dept-avatar">' + d.initials + '</div><h3>' + d.name + '</h3><p>' + d.role + '</p></div>';
        }).join('') + '</div>' +
      '</div>' +

      '<div class="section vm-grid">' +
        '<div class="vm-card vision reveal"><span class="eyebrow">Vision</span>' +
          '<p style="font-size:16px; line-height:1.6; margin-top:14px;">To be the clinic patients trust with their most demanding smile cases — where precision is checked, not assumed.</p></div>' +
        '<div class="vm-card mission reveal"><span class="eyebrow">Mission</span>' +
          '<p style="font-size:16px; line-height:1.6; margin-top:14px; color:var(--ink);">Give every patient a clear treatment plan, a comfortable visit, and ceramics made in-house by a team that treats a revision as a fix — not a fight.</p></div>' +
      '</div>' +

      '<div class="section">' +
        '<span class="eyebrow">By the numbers</span>' +
        '<div class="value-row" style="margin-top:14px;">' +
          statTile(String(SERVICES.length), 'Treatments offered') + statTile(String(DATA.team.length), 'Doctors on our team') +
          statTile('5', 'Quality checks per case') + statTile('1', 'In-house ceramics lab') +
        '</div>' +
      '</div>' +

      '<div class="section">' +
        '<span class="eyebrow">Behind the scenes</span><h2 style="font-size:21px; margin-top:4px;">Where your restoration is made</h2>' +
        '<div class="dept-grid" style="margin-top:18px;">' + depts.map(function (d, i) {
          return '<div class="dept-card reveal" style="--i:' + i + '"><div class="dept-avatar">' + d.n + '</div><h3>' + d.t + '</h3><p>' + d.d + '</p></div>';
        }).join('') + '</div>' +
      '</div>' +

      '<div class="section space-grid">' +
        '<div class="space-card reveal" style="background-image:url(/images/lounge.jpg); min-height:300px;"><span class="tag">Patient lounge</span></div>' +
        '<div class="space-card reveal" style="background-image:url(/images/reception.jpg); min-height:300px;"><span class="tag">Reception, New Zinj</span></div>' +
      '</div>' +
      '</div></div>' + footer()
    );
  }
  function statTile(n, label) { return '<div class="value-tile reveal"><div class="n">' + n + '</div><span>' + label + '</span></div>'; }

  /* ================================= SERVICES ============================== */
  function renderServices() {
    return (
      '<div class="page"><div class="u">' +
      '<div class="page-head reveal"><span class="eyebrow-accent">Services</span>' +
        '<h1>Six treatments, one careful process.</h1>' +
        '<p class="lede">Whatever brings you in, your doctor follows the same thorough process — a clear plan, an accurate scan, and a restoration checked before it ever reaches your mouth.</p></div>' +

      '<div class="section">' + SERVICES.map(function (s, i) {
        var extra = s.key === 'veneers'
          ? '<div class="tag-row">' + LAYERING_STYLES.concat(GLAZE_TYPES, SURFACE_TEXTURES).map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>'
          : '';
        return '<div class="svc-detail reveal" style="--i:' + i + '">' +
          '<div class="svc-detail-head"><div><h3>' + s.label + '</h3><p style="color:var(--ink-soft); font-size:13.5px; margin-top:6px; max-width:60ch;">' + s.desc + '</p></div>' +
          '<div class="fee">from ' + money(s.fee) + '</div></div>' + extra +
          '<div class="protocol-strip">' + PROTOCOL.map(function (p) { return '<span>' + p.label + '</span>'; }).join('') + '</div>' +
        '</div>';
      }).join('') + '</div>' +

      '<div class="section" style="text-align:center;"><a class="btn btn-primary" href="#/contact">Book a consultation →</a></div>' +

      '<div class="section" style="border-top:1px solid var(--line); padding-top:44px;">' +
        '<span class="eyebrow">For dentists &amp; referring clinics</span><h2 style="font-size:21px; margin-top:4px;">Sending us a case?</h2>' +
        '<p class="lede" style="margin-top:8px; margin-bottom:20px;">These guides cover exactly what our lab needs to accept a case on the first pass.</p>' +
        '<div class="grid-3">' + GUIDES.map(function (g, i) {
          return '<div class="card reveal" style="--i:' + i + '"><h3>' + g.t + '</h3><p>' + g.d + '</p>' +
            '<button class="btn btn-ghost btn-sm" data-guide="' + esc(g.t) + '" style="margin-top:12px;">View guide</button></div>';
        }).join('') + '</div>' +
        '<div style="margin-top:24px;"><a class="btn btn-ghost" href="#/new-case">Refer a case →</a></div>' +
      '</div>' +
      '</div></div>' + footer()
    );
  }

  /* ================================== SHOP =================================== */
  function renderShop() {
    return (
      '<div class="page"><div class="u">' +
      '<div class="page-head reveal"><span class="eyebrow-accent">Shop</span>' +
        '<h1>Care that continues at home.</h1>' +
        '<p class="lede">Patient retail for after your visit, and chairside essentials for the practices we work with.</p></div>' +
      '<div class="dash-tabs">' +
        '<button class="dash-tab' + (UI.shopTab === 'patients' ? ' active' : '') + '" data-shop-tab="patients">For Patients</button>' +
        '<button class="dash-tab' + (UI.shopTab === 'practices' ? ' active' : '') + '" data-shop-tab="practices">For Practices</button>' +
      '</div>' +
      '<div class="product-grid">' + DATA.products.filter(function (p) {
        if (p.active === false) return false;
        return UI.shopTab === 'patients' ? p.category === 'Patient retail' : p.category === 'Chairside kit';
      }).map(function (p, i) {
        var specs = (p.specs && p.specs.length)
          ? '<ul class="spec-list">' + p.specs.slice(0, 4).map(function (sp) { return '<li><b>' + esc(sp.label) + '</b>' + (sp.value ? ' · ' + esc(sp.value) : '') + '</li>'; }).join('') + '</ul>'
          : '';
        return '<div class="product-card reveal" style="--i:' + i + '">' + productMediaHtml(p) +
          '<span class="cat">' + esc(p.category) + '</span><h3>' + esc(p.name) + '</h3><p>' + esc(p.desc) + '</p>' + specs +
          '<div class="row"><span class="price">' + money(p.price) + '</span><button class="btn btn-primary btn-sm" data-add-product="' + esc(p.id) + '">Add to cart</button></div></div>';
      }).join('') + '</div>' +
      '</div></div>' + footer()
    );
  }

  /* ================================= CONTACT ================================= */
  function renderContact() {
    var s = DATA.settings || {};
    return (
      '<div class="page"><div class="u">' +
      '<div class="page-head reveal"><span class="eyebrow-accent">Contact</span><h1>Book a consultation.</h1>' +
        '<p class="lede">Tell us what you need and a preferred day — we\'ll call to confirm a time. For anything urgent, phone or WhatsApp us directly.</p></div>' +
      '<div class="section grid-2">' +
        '<div class="card reveal info-card">' +
          infoRow('M2.5 6.5A2 2 0 0 1 4.5 4.5h1.7a1 1 0 0 1 .95.69l1 3a1 1 0 0 1-.27 1.04L6.6 10.5a11 11 0 0 0 5 5l1.27-1.28a1 1 0 0 1 1.04-.27l3 1a1 1 0 0 1 .69.95v1.7a2 2 0 0 1-2 2A15.5 15.5 0 0 1 2.5 6.5Z', 'Phone &amp; WhatsApp', '<a href="tel:' + esc(s.phone) + '">' + esc(s.phone) + '</a>') +
          infoRow('M3 6h18v12H3Zm0 0 9 7 9-7', 'Email', '<a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a>') +
          infoRow('M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'Address', esc(s.address)) +
          infoRow('M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'Hours', esc(s.hours)) +
          '<div><span class="eyebrow" style="margin-bottom:10px;">Follow along</span><div class="social-row">' + socialIcons() + '</div></div>' +
        '</div>' +
        '<div class="card reveal">' +
          '<span class="eyebrow" style="margin-bottom:14px;">Book a consultation</span>' +
          '<form id="bookingForm" class="form-grid">' +
            field('full', 'text', 'bk-name', 'Name', true) +
            field('', 'tel', 'bk-phone', 'Phone', true) +
            '<div class="field"><label>Email (optional)</label><input type="email" id="bk-email"></div>' +
            '<div class="field"><label>Interested in</label><select id="bk-service">' + SERVICES.map(function (sv) { return '<option value="' + sv.key + '">' + sv.label + '</option>'; }).join('') + '<option value="">Not sure yet</option></select></div>' +
            '<div class="field"><label>Preferred date</label><input type="date" id="bk-date"></div>' +
            '<div class="field full"><label>Anything we should know?</label><textarea id="bk-note" placeholder="Optional"></textarea></div>' +
            '<div class="field full"><button class="btn btn-primary btn-block" type="submit">Request appointment</button></div>' +
          '</form>' +
        '</div>' +
      '</div>' +
      '</div></div>' + footer()
    );
  }
  function infoRow(path, label, valueHtml) {
    return '<div class="info-row"><span class="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="' + path + '"/></svg></span><div><span class="eyebrow" style="margin-bottom:2px;">' + label + '</span>' + valueHtml + '</div></div>';
  }
  function field(cls, type, id, label, required) {
    return '<div class="field ' + cls + '"><label>' + label + '</label><input type="' + type + '" id="' + id + '" ' + (required ? 'required' : '') + '></div>';
  }

  /* ================================= CAREERS ================================= */
  function renderCareers() {
    return (
      '<div class="page"><div class="u">' +
      '<div class="page-head reveal"><span class="eyebrow-accent">Careers</span><h1>Build the lab with us.</h1>' +
        '<p class="lede">We\'re hiring across reception, quality control, design and CAD-CAM.</p></div>' +
      '<div class="section">' + DATA.jobs.map(function (j, i) {
        return '<div class="job-card reveal" style="--i:' + i + '"><div><span class="type">' + j.type + '</span><h3>' + j.title + '</h3><p>' + j.desc + '</p></div>' +
          '<button class="btn btn-primary btn-sm" data-apply="' + j.id + '">Apply</button></div>';
      }).join('') + '</div>' +
      '</div></div>' + footer()
    );
  }

  function applyModalHtml(jobId) {
    var job = DATA.jobs.find(function (j) { return j.id === jobId; });
    return (
      '<div class="modal-backdrop" id="applyModal"><div class="modal">' +
        '<div class="modal-head"><h3>Apply — ' + esc(job ? job.title : '') + '</h3><button class="drawer-close" data-close-modal>✕</button></div>' +
        '<form id="applyForm" class="form-grid">' +
          '<input type="hidden" id="ap-job" value="' + jobId + '">' +
          field('full', 'text', 'ap-name', 'Full name', true) +
          field('full', 'email', 'ap-email', 'Email', true) +
          field('full', 'text', 'ap-phone', 'Phone', false) +
          '<div class="field full"><label>Portfolio / note</label><textarea id="ap-note" placeholder="Link to portfolio, or anything you\'d like us to know"></textarea></div>' +
          '<div class="field full"><button class="btn btn-primary btn-block" type="submit">Submit application</button></div>' +
        '</form>' +
      '</div></div>'
    );
  }

  /* ================================ NEW CASE (wizard) ========================= */
  function freshWizard(preService) {
    return {
      step: 0, service: preService || null,
      clinic: 'Dr. R. Haddad — Bright Smile Clinic', patient: '',
      material: RESTORATION_TYPES[0], fabrication: FABRICATION[0], incisal: INCISAL_DESIGNS[0],
      layering: LAYERING_STYLES[0], glaze: GLAZE_TYPES[0], surface: SURFACE_TEXTURES[0],
      shadeCervical: '—', shadeBody: 'A2', shadeIncisal: '—',
      instructions: '', protocol: { photos: false, scan: false, retraction: false, margins: false, contacts: false }
    };
  }

  function renderNewCase() {
    if (!UI.wizard) UI.wizard = freshWizard();
    var w = UI.wizard;
    var stepsLabels = ['Service', 'Case Details', 'Protocol', 'Review'];
    var stepsHtml = stepsLabels.map(function (s, i) {
      var cls = i === w.step ? 'active' : (i < w.step ? 'done' : '');
      return '<div class="wiz-step ' + cls + '">' + (i + 1) + ' · ' + s + '</div>';
    }).join('');

    var body = '', foot = '';
    if (w.step === 0) {
      body = '<div class="svc-pick-grid">' + SERVICES.map(function (s) {
        return '<button class="svc-pick' + (w.service === s.key ? ' selected' : '') + '" data-pick-service="' + s.key + '"><div class="t">' + s.label + '</div><div class="d">' + s.desc + ' · from ' + money(s.fee) + '</div></button>';
      }).join('') + '</div>';
      foot = '<span></span><button class="btn btn-primary" id="wiz-next" ' + (w.service ? '' : 'disabled') + '>Continue →</button>';
    } else if (w.step === 1) {
      var shadeOpt = ['—'].concat(SHADES);
      var designFields = isRestoration(w.service) ? (
        '<div class="wiz-group-label">Restoration design</div>' +
        '<div class="field full" id="toothVizWrap">' + toothVizHtml(w) + '</div>' +
        selectField('w-material', 'Restoration type', RESTORATION_TYPES, w.material) +
        selectField('w-fabrication', 'Fabrication', FABRICATION, w.fabrication) +
        selectField('w-incisal', 'Incisal design', INCISAL_DESIGNS, w.incisal) +
        selectField('w-layering', 'Layering style', LAYERING_STYLES, w.layering) +
        selectField('w-glaze', 'Glaze type', GLAZE_TYPES, w.glaze) +
        selectField('w-surface', 'Surface structure', SURFACE_TEXTURES, w.surface) +
        '<div class="wiz-group-label">Shade combination</div>' +
        selectField('w-shade-cervical', 'Cervical ⅓', shadeOpt, w.shadeCervical) +
        selectField('w-shade-body', 'Body ⅓', SHADES, w.shadeBody) +
        selectField('w-shade-incisal', 'Incisal ⅓', shadeOpt, w.shadeIncisal)
      ) : '';
      body = '<div class="field-grid">' +
        '<div class="field full"><label>Clinic / Doctor</label><input id="f-clinic" value="' + esc(w.clinic) + '"></div>' +
        '<div class="field full"><label>Patient reference</label><input id="f-patient" placeholder="e.g. Patient #4521" value="' + esc(w.patient) + '"></div>' +
        designFields +
        '<div class="field full"><label>Design notes / special instructions</label><textarea id="f-instr" placeholder="Anything else the design team should know…">' + esc(w.instructions) + '</textarea></div>' +
      '</div>';
      foot = '<button class="btn btn-ghost" id="wiz-back">← Back</button><button class="btn btn-primary" id="wiz-next">Continue →</button>';
    } else if (w.step === 2) {
      body = '<p style="color:var(--ink-soft); font-size:13.5px; margin-bottom:16px;">Same checklist our QC desk verifies on arrival — confirm what\'s included with this case.</p>' +
        '<div class="protocol-list">' + PROTOCOL.map(function (p) {
          var checked = w.protocol[p.key];
          return '<div class="protocol-item' + (checked ? ' checked' : '') + '" data-proto="' + p.key + '"><div class="chk">' + (checked ? '✓' : '') + '</div><div class="lbl">' + p.label + '</div><div class="up">' + (checked ? 'Attached (demo)' : 'Tap to attach') + '</div></div>';
        }).join('') + '</div>';
      foot = '<button class="btn btn-ghost" id="wiz-back">← Back</button><button class="btn btn-primary" id="wiz-next">Review →</button>';
    } else if (w.step === 3) {
      var protoDone = PROTOCOL.filter(function (p) { return w.protocol[p.key]; }).length;
      var designRows = isRestoration(w.service) ? (
        row('Restoration type', w.material + ' · ' + w.fabrication) +
        row('Incisal design', w.incisal) +
        row('Layering / Glaze / Surface', w.layering + ' · ' + w.glaze + ' · ' + w.surface) +
        row('Shade combination', shadeCombo({ cervical: w.shadeCervical, body: w.shadeBody, incisal: w.shadeIncisal }))
      ) : '';
      body = '<div class="review-block">' +
        row('Service', svcLabel(w.service)) + row('Clinic', w.clinic) + row('Patient', w.patient || '—') +
        designRows +
        row('Protocol items', protoDone + ' of ' + PROTOCOL.length + ' attached') +
        row('Estimated case fee', money(SVC[w.service] ? SVC[w.service].fee : 0)) +
        row('Notes', w.instructions || '—') +
      '</div>';
      foot = '<button class="btn btn-ghost" id="wiz-back">← Back</button><button class="btn btn-primary" id="wiz-submit">Submit case</button>';
    } else if (w.step === 4) {
      body = '<div class="confirm"><div class="check-mark">✓</div><h3>Case sent to Reception</h3><div class="cid">' + esc(w.newId || '') + '</div>' +
        '<p style="color:var(--ink-soft); max-width:40ch; margin:0 auto;">It\'ll appear in Lab Studio immediately, and you can follow it — plus its invoice — from the Dentist Portal.</p></div>';
      foot = '<button class="btn btn-ghost" id="wiz-again">Submit another</button><a class="btn btn-primary" href="#/portal">Track this case →</a>';
    }

    function row(k, v) { return '<div class="review-row"><div class="k">' + k + '</div><div class="v">' + esc(v) + '</div></div>'; }
    function selectField(id, label, options, val) {
      return '<div class="field"><label>' + label + '</label><select id="' + id + '">' + options.map(function (o) { return '<option ' + (o === val ? 'selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>';
    }

    return '<div class="page"><div class="u">' +
      '<div class="page-head reveal" style="margin-bottom:26px;"><span class="eyebrow-accent">New case</span><h1 style="font-size:1.9rem;">Start a new case</h1></div>' +
      '<div class="wizard reveal"><div class="wiz-steps">' + stepsHtml + '</div><div class="wiz-body">' + body + '</div><div class="wiz-foot">' + foot + '</div></div>' +
    '</div></div>' + footer();
  }

  async function submitWizard() {
    var w = UI.wizard;
    var design = isRestoration(w.service) ? {
      material: w.material, fabrication: w.fabrication, incisal: w.incisal,
      layering: w.layering, glaze: w.glaze, surface: w.surface,
      shade: { cervical: w.shadeCervical, body: w.shadeBody, incisal: w.shadeIncisal }
    } : null;
    try {
      var res = await api('/api/cases', { method: 'POST', body: JSON.stringify({ clinic: w.clinic, patient: w.patient, service: w.service, shade: shadeCombo(design && design.shade) || w.shadeBody, instructions: w.instructions, protocol: w.protocol, design: design }) });
      w.newId = res.case.id;
      w.step = 4;
      await loadState();
      renderCurrent();
      toast('Case ' + res.case.id + ' sent to Reception');
    } catch (e) { toast(e.message); }
  }

  /* ================================ PORTAL (dentist) =========================== */
  function renderPortal() {
    var tab = UI.portalTab || 'cases';
    var body = tab === 'billing' ? portalBilling() : portalCases();
    return '<div class="page"><div class="u">' +
      '<div class="page-head reveal"><span class="eyebrow-accent">Dentist portal</span><h1 style="font-size:1.9rem;">My cases</h1>' +
        '<p class="lede">Track every case you\'ve sent us, and approve mockups the moment they\'re ready.</p></div>' +
      '<div class="dash-tabs">' +
        '<button class="dash-tab' + (tab === 'cases' ? ' active' : '') + '" data-portal-tab="cases">Cases</button>' +
        '<button class="dash-tab' + (tab === 'billing' ? ' active' : '') + '" data-portal-tab="billing">Billing</button>' +
      '</div>' + body +
    '</div></div>' + footer();
  }

  function portalCases() {
    if (!DATA.cases.length) return '<div class="empty-note">No cases yet — start one from the website.</div>';

    var active = DATA.cases.filter(function (c) { return c.stage !== 'ready'; }).length;
    var review = DATA.cases.filter(function (c) { return c.stage === 'doctor_approval'; });
    var ready = DATA.cases.filter(function (c) { return c.stage === 'ready' && !c.pickedUp; });
    var outstanding = DATA.invoices.filter(function (i) { return i.status !== 'paid'; }).reduce(function (s, i) { return s + i.amount; }, 0);

    var strip = '<div class="stat-strip reveal" style="margin:0 0 22px;">' +
      '<div class="chipstat"><b>' + active + '</b><span>Active cases</span></div>' +
      '<div class="chipstat"><b>' + review.length + '</b><span>Awaiting your review</span></div>' +
      '<div class="chipstat"><b>' + ready.length + '</b><span>Ready for pickup</span></div>' +
      '<div class="chipstat"><b>' + money(outstanding) + '</b><span>Outstanding balance</span></div>' +
    '</div>';

    var reviewBlock = review.length ? (
      '<div class="review-panel reveal"><div class="review-panel-head"><span class="eyebrow" style="color:var(--amber);">Action needed</span>' +
        '<h3 style="font-size:16px; margin-top:4px;">' + review.length + ' mockup' + (review.length === 1 ? '' : 's') + ' waiting on your approval</h3></div>' +
      review.map(function (c) {
        return '<div class="review-item"><div><div class="cid-cell" style="font-size:13px;">' + c.id + ' · ' + esc(svcLabel(c.service)) + '</div>' +
          '<div style="font-size:12.5px; color:var(--ink-soft);">' + esc(c.patient) + ' · shade ' + esc(c.shade) + (c.design ? ' · ' + esc(c.design.material) : '') + '</div></div>' +
          '<div class="review-item-actions"><button class="btn btn-primary btn-sm" data-act="approve" data-id="' + c.id + '">Approve</button>' +
          '<button class="btn btn-danger-ghost btn-sm" data-act="reject" data-id="' + c.id + '">Request change</button>' +
          '<button class="btn btn-ghost btn-sm" data-open="' + c.id + '" data-from="mycases">Open</button></div></div>';
      }).join('') + '</div>'
    ) : '';

    var rows = DATA.cases.map(function (c) {
      var idx = STAGE_INDEX[c.stage];
      var dots = STAGES.map(function (s, i) { return '<i class="' + (i < idx ? 'done' : (i === idx ? 'now' : '')) + '"></i>'; }).join('');
      var last = c.history[c.history.length - 1];
      var hay = (c.id + ' ' + svcLabel(c.service) + ' ' + c.patient + ' ' + labelFor(c.stage) + ' ' + (c.design ? c.design.material : '')).toLowerCase();
      return '<tr class="clickable" data-open="' + c.id + '" data-from="mycases" data-hay="' + esc(hay) + '">' +
        '<td class="cid-cell">' + c.id + '</td><td>' + svcLabel(c.service) + '</td><td>' + esc(c.patient) + '</td>' +
        '<td>' + (c.design ? esc(c.design.material) + '<br><span style="color:var(--ink-soft); font-size:11.5px;">' + esc(shadeCombo(c.design.shade)) + '</span>' : '<span style="color:var(--ink-soft);">—</span>') + '</td>' +
        '<td>' + pillHtml(c) + (c.stage === 'doctor_approval' ? '<span class="action-flag">Review</span>' : '') + '<div class="progress-mini">' + dots + '</div></td>' +
        '<td>' + fmtDate(last ? last.at : c.createdAt) + '</td>' +
        '<td><button class="btn btn-ghost btn-sm" data-open="' + c.id + '" data-from="mycases">Open</button></td></tr>';
    }).join('');

    return strip + reviewBlock +
      '<div class="dash-toolbar reveal"><input type="search" id="portalSearch" placeholder="Search case, patient, shade…" autocomplete="off"></div>' +
      '<div class="table-wrap reveal"><table class="cases-table" id="portalTable"><thead><tr><th>Case</th><th>Service</th><th>Patient</th><th>Restoration</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="empty-note" id="portalNoMatch" hidden>No cases match that search.</div></div>';
  }

  function portalBilling() {
    if (!DATA.invoices.length) return '<div class="empty-note">No invoices yet.</div>';
    var rows = DATA.invoices.map(function (inv) {
      return '<tr><td class="cid-cell">' + inv.id + '</td><td>' + inv.caseId + '</td><td>' + svcLabel(inv.service) + '</td><td>' + money(inv.amount) + '</td>' +
        '<td><span class="pill st-' + inv.status + '"><span class="dot"></span>' + inv.status + '</span></td>' +
        '<td>' + fmtDate(inv.issuedAt) + '</td></tr>';
    }).join('');
    var outstanding = DATA.invoices.filter(function (i) { return i.status !== 'paid'; }).reduce(function (s, i) { return s + i.amount; }, 0);
    return '<div class="stat-strip reveal" style="margin:0 0 22px;"><div class="chipstat"><b>' + money(outstanding) + '</b><span>Outstanding balance</span></div>' +
      '<div class="chipstat"><b>' + DATA.invoices.length + '</b><span>Total invoices</span></div></div>' +
      '<div class="table-wrap reveal"><table class="cases-table"><thead><tr><th>Invoice</th><th>Case</th><th>Service</th><th>Amount</th><th>Status</th><th>Issued</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function pillHtml(c) { return '<span class="pill st-' + c.stage + '"><span class="dot"></span>' + labelFor(c.stage) + '</span>'; }

  /* ================================= STUDIO (lab) =============================== */
  function stageTone(key) {
    if (key === 'ready') return 'var(--ready)';
    if (key === 'reception' || key === 'qc') return 'var(--violet)';
    return 'var(--amber)';
  }
  function renderStudio() {
    var stageFilter = UI.labStage || 'all';
    var lanes = STAGES.filter(function (s) { return stageFilter === 'all' || stageFilter === s.key; }).map(function (s) {
      var cards = DATA.cases.filter(function (c) { return c.stage === s.key; });
      var inner = cards.length
        ? '<div class="lane-cards">' + cards.map(kcardHtml).join('') + '</div>'
        : '<div class="lane-cards lane-empty">No cases at this stage.</div>';
      return '<section class="lane' + (cards.length ? '' : ' is-empty') + '">' +
        '<div class="lane-head"><span class="dot" style="background:' + stageTone(s.key) + '"></span><h3>' + s.label + '</h3>' +
        '<span class="cnt">' + cards.length + '</span></div>' + inner + '</section>';
    }).join('');

    var awaitingDoc = DATA.cases.filter(function (c) { return c.stage === 'doctor_approval'; }).length;
    var inLab = DATA.cases.filter(function (c) { return c.stage !== 'ready' && c.stage !== 'doctor_approval'; }).length;
    var readyN = DATA.cases.filter(function (c) { return c.stage === 'ready'; }).length;
    var revs = DATA.cases.filter(function (c) { return c.revisions > 0 && c.stage !== 'ready'; }).length;

    var chips = '<button class="lab-chip' + (stageFilter === 'all' ? ' active' : '') + '" data-lab-stage="all">All stages</button>' +
      STAGES.map(function (s) {
        var n = DATA.cases.filter(function (c) { return c.stage === s.key; }).length;
        return '<button class="lab-chip' + (stageFilter === s.key ? ' active' : '') + '" data-lab-stage="' + s.key + '">' + s.label + ' ' + n + '</button>';
      }).join('');

    return '<div class="page"><div class="u">' +
      '<div class="page-head reveal" style="margin-bottom:16px;"><span class="eyebrow-accent">Internal · Lab Studio</span><h1 style="font-size:1.9rem;">Case pipeline</h1></div>' +
      '<div class="stat-strip reveal" style="margin:0 0 20px;">' +
        '<div class="chipstat"><b>' + inLab + '</b><span>In lab hands</span></div>' +
        '<div class="chipstat"><b>' + awaitingDoc + '</b><span>Awaiting doctor</span></div>' +
        '<div class="chipstat"><b>' + readyN + '</b><span>Ready for pickup</span></div>' +
        '<div class="chipstat"><b>' + revs + '</b><span>In revision</span></div>' +
      '</div>' +
      '<div class="lab-toolbar reveal"><input type="search" id="labSearch" placeholder="Search case, clinic, patient…" autocomplete="off">' +
        '<div class="lab-chips">' + chips + '</div></div>' +
      '<div class="lab-pipeline reveal" id="labPipeline">' + lanes + '</div>' +
      '<div class="empty-note" id="labNoMatch" hidden>No cases match that search.</div>' +
    '</div></div>';
  }
  function kcardHtml(c) {
    var waiting = c.stage === 'doctor_approval';
    var hay = (c.id + ' ' + svcLabel(c.service) + ' ' + c.clinic + ' ' + c.patient + ' ' + c.tech + ' ' + (c.design ? c.design.material : '')).toLowerCase();
    return '<button class="kcard" data-open="' + c.id + '" data-from="lab" data-hay="' + esc(hay) + '"><div class="top"><span class="cid">' + c.id + '</span><span class="svc">' + svcLabel(c.service) + '</span></div>' +
      '<div class="clinic">' + esc(c.clinic) + '</div><div class="patient">' + esc(c.patient) + '</div>' +
      (c.design ? '<div class="kdesign">' + esc(c.design.material) + (c.design.fabrication ? ' · ' + esc(c.design.fabrication) : '') + '</div>' : '') +
      (waiting ? '<div class="waiting">Awaiting doctor</div>' : '') + (c.revisions > 0 ? '<div class="rev">Rev ' + (c.revisions + 1) + '</div>' : '') +
      '<div class="meta"><span class="tech">● ' + esc(c.tech) + '</span><span class="shade">' + esc(c.shade) + '</span></div></button>';
  }

  /* ================================== ADMIN ===================================== */
  function renderAdmin() {
    var tab = UI.adminTab;
    var badges = { appointments: DATA.summary.newAppointments, applications: DATA.applications.length, messages: DATA.messages.length };
    var body =
      tab === 'appointments' ? adminAppointments() :
      tab === 'invoices' ? adminInvoices() :
      tab === 'expenses' ? adminExpenses() :
      tab === 'products' ? adminProducts() :
      tab === 'orders' ? adminOrders() :
      tab === 'team' ? adminTeam() :
      tab === 'applications' ? adminApplications() :
      tab === 'messages' ? adminMessages() :
      tab === 'settings' ? adminSettings() : adminOverview();
    return '<div class="page"><div class="u">' +
      '<div class="page-head reveal"><span class="eyebrow-accent">Accounts &amp; Admin</span><h1 style="font-size:1.9rem;">Run the business, not just the pipeline.</h1></div>' +
      '<div class="admin-shell">' +
        '<nav class="admin-sidebar">' + ADMIN_TABS.map(function (t) {
          var count = badges[t[0]];
          return '<button class="admin-nav-item' + (tab === t[0] ? ' active' : '') + '" data-admin-tab="' + t[0] + '">' + t[1] +
            (count ? '<span class="badge">' + count + '</span>' : '') + '</button>';
        }).join('') + '</nav>' +
        '<div class="admin-main">' + body + '</div>' +
      '</div>' +
    '</div></div>';
  }

  function sparkline(trend) {
    var w = 280, h = 64, pad = 6;
    var max = Math.max.apply(null, trend.map(function (t) { return t.total; }).concat([1]));
    var stepX = trend.length > 1 ? (w - pad * 2) / (trend.length - 1) : 0;
    var pts = trend.map(function (t, i) { return [pad + i * stepX, h - pad - (t.total / max) * (h - pad * 2)]; });
    var lineD = pts.map(function (p, i) { return (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var areaD = lineD + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (h - pad) + ' L' + pts[0][0].toFixed(1) + ' ' + (h - pad) + ' Z';
    var last = pts[pts.length - 1];
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" style="width:100%; height:64px; display:block;">' +
        '<path d="' + areaD + '" fill="var(--violet-soft)" stroke="none"></path>' +
        '<path d="' + lineD + '" fill="none" stroke="var(--violet)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>' +
        '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="3.5" fill="var(--violet)"></circle>' +
      '</svg>' +
      '<div style="display:flex; justify-content:space-between; margin-top:6px;">' + trend.map(function (t) { return '<span class="mono" style="font-size:10px; color:var(--ink-soft);">' + t.label + '</span>'; }).join('') + '</div>';
  }

  function adminOverview() {
    var s = DATA.summary;
    var tiles = [
      ['Revenue collected', money(s.revenue), 'pos'], ['Outstanding', money(s.outstanding), s.overdue ? 'neg' : ''],
      ['Expenses (this week)', money(s.totalExpenses), ''], ['Net', money(s.net), s.net >= 0 ? 'pos' : 'neg'],
      ['Active cases', s.activeCases, '']
    ];
    return '<div class="stat-grid reveal">' + tiles.map(function (t) { return '<div class="stat-tile ' + t[2] + '"><div class="lbl">' + t[0] + '</div><div class="val">' + t[1] + '</div></div>'; }).join('') + '</div>' +
      '<div class="card reveal trend-card" style="margin-bottom:24px;">' +
        '<div class="trend-chart"><span class="eyebrow">Revenue, last 7 days</span><div style="margin-top:10px;">' + sparkline(s.trend) + '</div></div>' +
      '</div>' +
      '<div class="grid-2">' +
        '<div class="card reveal"><span class="eyebrow">Appointments</span><div class="val" style="font-family:var(--font-display); font-size:22px; margin-top:8px;">' + s.newAppointments + ' new request' + (s.newAppointments === 1 ? '' : 's') + '</div><p style="margin-top:6px;">' + s.totalAppointments + ' total booking requests on file.</p></div>' +
        '<div class="card reveal"><span class="eyebrow">Shop</span><div class="val" style="font-family:var(--font-display); font-size:22px; margin-top:8px;">' + money(s.shopRevenue) + ' in orders</div><p style="margin-top:6px;">' + DATA.orders.length + ' orders placed via the shop.</p></div>' +
        '<div class="card reveal"><span class="eyebrow">Pipeline</span><div class="val" style="font-family:var(--font-display); font-size:22px; margin-top:8px;">' + s.readyCases + ' ready for pickup</div><p style="margin-top:6px;">' + s.activeCases + ' cases still in production.</p></div>' +
        '<div class="card reveal"><span class="eyebrow">Inbox</span><div class="val" style="font-family:var(--font-display); font-size:22px; margin-top:8px;">' + s.openApplications + ' applications</div><p style="margin-top:6px;">' + s.newMessages + ' contact messages waiting.</p></div>' +
      '</div>';
  }

  function adminAppointments() {
    if (!DATA.appointments.length) return '<div class="empty-note">No appointment requests yet.</div>';
    var rows = DATA.appointments.map(function (a) {
      var actions = a.status === 'new'
        ? '<button class="btn btn-primary btn-sm" data-appt-status="confirmed" data-appt-id="' + a.id + '">Confirm</button> <button class="btn btn-ghost btn-sm" data-appt-status="contacted" data-appt-id="' + a.id + '">Mark contacted</button>'
        : '<span style="color:var(--ink-soft); font-size:12.5px;">Updated</span>';
      return '<tr><td class="cid-cell">' + a.id + '</td><td>' + esc(a.name) + '<br><span style="color:var(--ink-soft); font-size:12px;">' + esc(a.phone) + '</span></td>' +
        '<td>' + (a.service ? svcLabel(a.service) : '—') + '</td>' +
        '<td>' + (a.preferredDate ? fmtDate(a.preferredDate) : '—') + '</td>' +
        '<td><span class="pill st-' + a.status + '"><span class="dot"></span>' + a.status + '</span></td>' +
        '<td>' + actions + '</td></tr>';
    }).join('');
    return '<div class="table-wrap reveal"><table class="cases-table"><thead><tr><th>Request</th><th>Contact</th><th>Interested in</th><th>Preferred date</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function adminInvoices() {
    var rows = DATA.invoices.map(function (inv) {
      return '<tr><td class="cid-cell">' + inv.id + '</td><td>' + inv.caseId + '</td><td>' + esc(inv.clinic) + '</td><td>' + money(inv.amount) + '</td>' +
        '<td><span class="pill st-' + inv.status + '"><span class="dot"></span>' + inv.status + '</span></td>' +
        '<td>' + (inv.status !== 'paid' ? '<button class="btn btn-primary btn-sm" data-pay-invoice="' + inv.id + '">Mark paid</button>' : '<span style="color:var(--ink-soft); font-size:12.5px;">Paid ' + fmtDate(inv.paidAt) + '</span>') + '</td></tr>';
    }).join('');
    return '<div class="table-wrap reveal"><table class="cases-table"><thead><tr><th>Invoice</th><th>Case</th><th>Clinic</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function adminExpenses() {
    var rows = DATA.expenses.map(function (e) {
      return '<div class="list-row"><div><div class="t">' + esc(e.description) + '</div><div class="s">' + e.category + ' · ' + fmtDate(e.date) + '</div></div><div class="t">' + money(e.amount) + '</div></div>';
    }).join('');
    return '<div class="card reveal" style="margin-bottom:20px;"><span class="eyebrow" style="margin-bottom:12px;">Log an expense</span>' +
      '<form id="expenseForm" class="expense-form">' +
        '<select id="ex-category"><option>Materials</option><option>Equipment</option><option>Payroll</option><option>Facilities</option><option>Marketing</option><option>Other</option></select>' +
        '<input id="ex-desc" placeholder="Description" required>' +
        '<input id="ex-amount" type="number" min="0" step="0.001" placeholder="BD amount" required>' +
        '<button class="btn btn-primary" type="submit">Add</button>' +
      '</form></div>' +
      '<div class="card reveal"><span class="eyebrow" style="margin-bottom:6px;">Recent expenses</span><div class="list-plain">' + rows + '</div></div>';
  }

  function adminOrders() {
    if (!DATA.orders.length) return '<div class="empty-note">No shop orders yet — place one from the Shop page.</div>';
    var rows = DATA.orders.map(function (o) {
      var items = o.items.map(function (i) { return i.qty + '× ' + i.name; }).join(', ');
      return '<div class="list-row"><div><div class="t">' + o.id + ' — ' + esc((o.customer && o.customer.name) || 'Guest') + '</div><div class="s">' + items + '</div></div><div class="t">' + money(o.total) + '</div></div>';
    }).join('');
    return '<div class="card reveal"><div class="list-plain">' + rows + '</div></div>';
  }

  function adminTeam() {
    var rows = DATA.team.map(function (m) {
      return '<div class="team-mini"><div class="av">' + m.initials + '</div><div><div class="t" style="font-weight:600;">' + esc(m.name) + '</div><div class="s" style="color:var(--ink-soft); font-size:12.5px;">' + esc(m.role) + '</div></div></div>';
    }).join('');
    return '<div class="card reveal" style="margin-bottom:20px;"><span class="eyebrow" style="margin-bottom:12px;">Add a team member</span>' +
      '<form id="teamForm" class="team-form">' +
        '<input id="tm-name" placeholder="Full name" required>' +
        '<input id="tm-role" placeholder="Role / specialty" required>' +
        '<button class="btn btn-primary" type="submit">Add</button>' +
      '</form></div>' +
      '<div class="card reveal"><span class="eyebrow" style="margin-bottom:6px;">Doctors &amp; staff</span>' + rows + '</div>';
  }

  function adminApplications() {
    if (!DATA.applications.length) return '<div class="empty-note">No applications yet.</div>';
    var rows = DATA.applications.map(function (a) {
      return '<div class="list-row"><div><div class="t">' + esc(a.name) + ' — ' + esc(a.jobTitle) + '</div><div class="s">' + esc(a.email) + (a.note ? ' · ' + esc(a.note) : '') + '</div></div><div class="s">' + fmtDate(a.createdAt) + '</div></div>';
    }).join('');
    return '<div class="card reveal"><div class="list-plain">' + rows + '</div></div>';
  }

  function adminMessages() {
    if (!DATA.messages.length) return '<div class="empty-note">No messages yet.</div>';
    var rows = DATA.messages.map(function (m) {
      return '<div class="list-row"><div><div class="t">' + esc(m.name) + '</div><div class="s">' + esc(m.email) + ' — ' + esc(m.message) + '</div></div><div class="s">' + fmtDate(m.createdAt) + '</div></div>';
    }).join('');
    return '<div class="card reveal"><div class="list-plain">' + rows + '</div></div>';
  }

  function adminProducts() {
    var catOptions = function (selected) {
      return PRODUCT_CATEGORIES.map(function (c) { return '<option' + (c === selected ? ' selected' : '') + '>' + c + '</option>'; }).join('');
    };

    var listed = DATA.products.filter(function (p) { return p.active !== false; }).length;
    var stats = '<div class="stat-strip reveal" style="margin:0 0 22px;">' +
      '<div class="chipstat"><b>' + DATA.products.length + '</b><span>Products</span></div>' +
      '<div class="chipstat"><b>' + listed + '</b><span>Listed in shop</span></div>' +
      '<div class="chipstat"><b>' + (DATA.products.length - listed) + '</b><span>Hidden</span></div>' +
    '</div>';

    var addForm = '<div class="card reveal" style="margin-bottom:20px;"><span class="eyebrow" style="margin-bottom:14px;">Add a product</span>' +
      '<form id="productAddForm" class="form-grid">' +
        '<div class="field"><label>Name</label><input id="np-name" required></div>' +
        '<div class="field"><label>Category</label><select id="np-category">' + catOptions('Chairside kit') + '</select></div>' +
        '<div class="field"><label>Price (BD)</label><input id="np-price" type="number" min="0" step="0.001" required></div>' +
        '<div class="field"><label>SKU</label><input id="np-sku" placeholder="Optional"></div>' +
        '<div class="field"><label>Stock on hand</label><input id="np-stock" type="number" min="0" step="1" placeholder="Optional"></div>' +
        '<div class="field full"><label>Image URL</label><input id="np-image" placeholder="https://… (leave blank for a placeholder tile)"></div>' +
        '<div class="field full"><label>Description</label><textarea id="np-desc" placeholder="Shown on the shop card"></textarea></div>' +
        '<div class="field full"><label>Specifications — one per line, as <span class="mono">Label: value</span></label>' +
          '<textarea id="np-specs" placeholder="Material: A-silicone&#10;Set time: 45 s&#10;Shelf life: 24 months"></textarea></div>' +
        '<div class="field full"><button class="btn btn-primary" type="submit">Add product</button></div>' +
      '</form></div>';

    if (!DATA.products.length) return stats + addForm + '<div class="empty-note">No products yet — add your first one above.</div>';

    var cards = DATA.products.map(function (p) {
      return '<div class="card reveal prod-card">' +
        '<form class="form-grid product-edit-form" data-product-id="' + esc(p.id) + '">' +
          '<div class="field full prod-card-head">' +
            productMediaHtml(p, 'prod-thumb') +
            '<div style="flex:1; min-width:0;"><span class="eyebrow">' + esc(p.category) + (p.active === false ? ' · hidden' : '') + '</span>' +
              '<h3 style="font-size:16px; margin-top:4px;">' + esc(p.name) + '</h3></div>' +
            '<span class="mono" style="font-size:11px; color:var(--ink-soft);">' + esc(p.id) + '</span>' +
          '</div>' +
          '<div class="field"><label>Name</label><input name="name" value="' + esc(p.name) + '" required></div>' +
          '<div class="field"><label>Category</label><select name="category">' + catOptions(p.category) + '</select></div>' +
          '<div class="field"><label>Price (BD)</label><input name="price" type="number" min="0" step="0.001" value="' + esc(p.price) + '" required></div>' +
          '<div class="field"><label>SKU</label><input name="sku" value="' + esc(p.sku || '') + '"></div>' +
          '<div class="field"><label>Stock on hand</label><input name="stock" type="number" min="0" step="1" value="' + esc(p.stock == null ? '' : p.stock) + '"></div>' +
          '<div class="field"><label>Shop visibility</label><select name="active">' +
            '<option value="true"' + (p.active === false ? '' : ' selected') + '>Listed in shop</option>' +
            '<option value="false"' + (p.active === false ? ' selected' : '') + '>Hidden</option></select></div>' +
          '<div class="field full"><label>Image URL</label><input name="image" value="' + esc(p.image || '') + '" placeholder="https://… (blank = placeholder tile)"></div>' +
          '<div class="field full"><label>Description</label><textarea name="desc">' + esc(p.desc || '') + '</textarea></div>' +
          '<div class="field full"><label>Specifications — one per line, as <span class="mono">Label: value</span></label>' +
            '<textarea name="specs" rows="4">' + esc(specsToText(p.specs)) + '</textarea></div>' +
          '<div class="field full prod-card-actions">' +
            '<button class="btn btn-primary btn-sm" type="submit">Save changes</button>' +
            '<button class="btn btn-danger-ghost btn-sm" type="button" data-del-product="' + esc(p.id) + '">Delete</button></div>' +
        '</form>' +
      '</div>';
    }).join('');

    return stats + addForm + '<div class="prod-admin-list">' + cards + '</div>';
  }

  function adminSettings() {
    var s = DATA.settings || {};
    return '<div class="card reveal"><span class="eyebrow" style="margin-bottom:16px;">Business information</span>' +
      '<form id="settingsForm" class="form-grid">' +
        '<div class="field full"><label>Clinic name</label><input id="st-name" value="' + esc(s.clinicName) + '"></div>' +
        '<div class="field"><label>Phone &amp; WhatsApp</label><input id="st-phone" value="' + esc(s.phone) + '"></div>' +
        '<div class="field"><label>Email</label><input id="st-email" value="' + esc(s.email) + '"></div>' +
        '<div class="field full"><label>Address</label><input id="st-address" value="' + esc(s.address) + '"></div>' +
        '<div class="field full"><label>Hours</label><input id="st-hours" value="' + esc(s.hours) + '"></div>' +
        '<div class="field full"><button class="btn btn-primary" type="submit">Save changes</button></div>' +
      '</form></div>';
  }

  /* =============================== case detail drawer =========================== */
  function openDrawer(id, from) {
    var c = DATA.cases.find(function (x) { return x.id === id; });
    if (!c) return;
    UI.drawer = { id: id, from: from };
    var back = document.getElementById('backdrop'), dr = document.getElementById('drawer');
    if (!back) { injectDrawerShell(); back = document.getElementById('backdrop'); dr = document.getElementById('drawer'); }

    document.getElementById('dw-cid').textContent = c.id;
    document.getElementById('dw-title').textContent = c.clinic;
    var protoHtml = PROTOCOL.map(function (p) { return '<span class="' + (c.protocol[p.key] ? 'yes' : '') + '">' + (c.protocol[p.key] ? '✓ ' : '') + p.label + '</span>'; }).join('');
    var histHtml = c.history.slice().reverse().map(function (h) {
      return '<div class="tl-item"><div class="dot"></div><div><div class="tt">' + labelFor(h.stage) + '</div><div class="ts">' + fmtDateTime(h.at) + '</div>' + (h.note ? '<div class="note">' + esc(h.note) + '</div>' : '') + '</div></div>';
    }).join('');
    var inv = DATA.invoices.find(function (i) { return i.caseId === c.id; });

    var d = c.design;
    var designHtml = d ? (
      '<div class="drawer-sec"><h4>Restoration design</h4>' +
        kv('Restoration type', d.material + (d.fabrication ? ' · ' + d.fabrication : '')) +
        kv('Incisal design', d.incisal || '—') +
        kv('Layering style', d.layering || '—') +
        kv('Glaze', d.glaze || '—') +
        kv('Surface structure', d.surface || '—') +
        kv('Shade combination', shadeCombo(d.shade)) +
      '</div>'
    ) : '';

    document.getElementById('dw-body').innerHTML =
      '<div class="drawer-sec"><h4>Case</h4>' +
        kv('Service', svcLabel(c.service)) + kv('Patient', c.patient) + kv('Shade', c.shade) + kv('Assigned tech', c.tech) + kv('Current stage', labelFor(c.stage)) +
        (inv ? kv('Invoice', inv.id + ' · ' + money(inv.amount) + ' · ' + inv.status) : '') +
      '</div>' +
      designHtml +
      '<div class="drawer-sec"><h4>Protocol of acceptance</h4><div class="proto-mini">' + protoHtml + '</div></div>' +
      '<div class="drawer-sec"><h4>Timeline</h4><div class="timeline">' + histHtml + '</div></div>';
    document.getElementById('dw-actions').innerHTML = actionsFor(c, from);
    back.classList.add('open'); dr.classList.add('open');
  }
  function kv(k, v) { return '<div class="kv"><span class="k">' + k + '</span><span class="v">' + esc(v) + '</span></div>'; }
  function closeDrawer() {
    var back = document.getElementById('backdrop'), dr = document.getElementById('drawer');
    if (back) back.classList.remove('open');
    if (dr) dr.classList.remove('open');
    UI.drawer = null;
  }
  function actionsFor(c, from) {
    if (c.stage === 'ready') {
      if (c.pickedUp) return '<span class="pill st-ready"><span class="dot"></span>Picked up</span>';
      return '<button class="btn btn-primary btn-sm" data-act="pickup" data-id="' + c.id + '">Mark picked up</button>';
    }
    if (c.stage === 'doctor_approval') {
      if (from === 'mycases') return '<button class="btn btn-primary btn-sm" data-act="approve" data-id="' + c.id + '">Approve mockup</button><button class="btn btn-danger-ghost btn-sm" data-act="reject" data-id="' + c.id + '">Request modification</button>';
      return '<span class="pill st-doctor_approval"><span class="dot"></span>Waiting on doctor — no lab action</span>';
    }
    if (from === 'mycases') return '<span style="font-size:12.5px; color:var(--ink-soft);">In progress at the lab — no action needed from you right now.</span>';
    if (c.stage === 'qc') return '<button class="btn btn-primary btn-sm" data-act="qc-accept" data-id="' + c.id + '">Accept → Design</button><button class="btn btn-danger-ghost btn-sm" data-act="qc-reject" data-id="' + c.id + '">Reject → Reception</button>';
    var map = { reception: 'Send to QC', designer: 'Send mockup to doctor', cadcam: 'Complete milling → Layering', layering: 'Send to QC & Photography', qc_photo: 'Approve → Ready for pickup' };
    if (!map[c.stage]) return '';
    return '<button class="btn btn-primary btn-sm" data-act="advance" data-id="' + c.id + '">' + map[c.stage] + '</button>';
  }
  function injectDrawerShell() {
    var div = document.createElement('div');
    div.innerHTML = '<div class="backdrop" id="backdrop"></div><div class="drawer" id="drawer"><div class="drawer-head"><div><div class="cid" id="dw-cid"></div><h3 id="dw-title"></h3></div><button class="drawer-close" id="dw-close">✕</button></div><div class="drawer-body" id="dw-body"></div><div class="drawer-actions" id="dw-actions"></div></div>';
    document.body.appendChild(div);
    document.getElementById('backdrop').addEventListener('click', closeDrawer);
    document.getElementById('dw-close').addEventListener('click', closeDrawer);
  }

  async function handleCaseAction(act, id) {
    try {
      await api('/api/cases/' + id + '/action', { method: 'POST', body: JSON.stringify({ act: act }) });
      await loadState();
      renderCurrent();
      if (UI.drawer && UI.drawer.id === id) openDrawer(id, UI.drawer.from); else closeDrawer();
    } catch (e) { toast(e.message); }
  }

  /* =================================== CART =================================== */
  function renderCartDrawer() {
    var host = document.getElementById('cartDrawer');
    if (!UI.cart.length) {
      host.innerHTML = cartHead() + '<div class="empty-note">Your cart is empty.</div>';
      return;
    }
    var total = 0;
    var lines = UI.cart.map(function (item) {
      var p = DATA.products.find(function (x) { return x.id === item.id; });
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
  function cartHead() { return '<div class="cart-head"><h3 style="font-size:17px;">Your cart</h3><button class="drawer-close" id="cartClose">✕</button></div>'; }

  function openCart() { UI.cartOpen = true; renderCartDrawer(); document.getElementById('cartBackdrop').classList.add('open'); document.getElementById('cartDrawer').classList.add('open'); }
  function closeCart() { UI.cartOpen = false; document.getElementById('cartBackdrop').classList.remove('open'); document.getElementById('cartDrawer').classList.remove('open'); }

  function addToCart(id) {
    var line = UI.cart.find(function (i) { return i.id === id; });
    if (line) line.qty++; else UI.cart.push({ id: id, qty: 1 });
    saveCart();
    toast('Added to cart');
  }
  function changeQty(id, delta) {
    var line = UI.cart.find(function (i) { return i.id === id; });
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) UI.cart = UI.cart.filter(function (i) { return i.id !== id; });
    saveCart(); renderCartDrawer();
  }

  async function checkout() {
    var name = document.getElementById('co-name').value.trim();
    if (!name) { toast('Add your clinic or name first.'); return; }
    var address = document.getElementById('co-address').value.trim();
    try {
      var res = await api('/api/checkout', { method: 'POST', body: JSON.stringify({ items: UI.cart, customer: { name: name, address: address } }) });
      UI.cart = []; saveCart();
      await loadState();
      document.getElementById('cartDrawer').innerHTML = cartHead() + '<div class="confirm"><div class="check-mark">✓</div><h3>Order placed</h3><div class="cid">' + res.order.id + '</div><p style="color:var(--ink-soft);">' + money(res.order.total) + ' · we\'ll include it with your next pickup.</p></div>';
      toast('Order ' + res.order.id + ' placed');
    } catch (e) { toast(e.message); }
  }

  /* ================================ event wiring ================================ */
  function renderCurrent() { router(); }

  function attachPageHandlers(route) {
    // wizard
    if (route === 'new-case') {
      document.querySelectorAll('[data-pick-service]').forEach(function (b) { b.addEventListener('click', function () { UI.wizard.service = b.dataset.pickService; renderCurrent(); }); });
      document.querySelectorAll('[data-proto]').forEach(function (b) { b.addEventListener('click', function () { var k = b.dataset.proto; UI.wizard.protocol[k] = !UI.wizard.protocol[k]; renderCurrent(); }); });
      var nextBtn = document.getElementById('wiz-next');
      if (nextBtn) nextBtn.addEventListener('click', function () {
        var w = UI.wizard;
        if (w.step === 1) {
          w.clinic = val('f-clinic');
          w.patient = val('f-patient');
          w.instructions = val('f-instr');
          syncWizardDesign();
        }
        w.step++; renderCurrent();
      });
      var wizBody = document.querySelector('.wiz-body');
      if (wizBody && UI.wizard.step === 1) wizBody.addEventListener('change', function (e) {
        if (e.target.tagName !== 'SELECT') return;
        syncWizardDesign();
        var viz = document.getElementById('toothVizWrap');
        if (viz) viz.innerHTML = toothVizHtml(UI.wizard);
      });
      var backBtn = document.getElementById('wiz-back'); if (backBtn) backBtn.addEventListener('click', function () { UI.wizard.step--; renderCurrent(); });
      var submitBtn = document.getElementById('wiz-submit'); if (submitBtn) submitBtn.addEventListener('click', submitWizard);
      var againBtn = document.getElementById('wiz-again'); if (againBtn) againBtn.addEventListener('click', function () { UI.wizard = freshWizard(); renderCurrent(); });
    }

    if (route === 'shop') {
      document.querySelectorAll('[data-add-product]').forEach(function (b) { b.addEventListener('click', function () { addToCart(b.dataset.addProduct); }); });
      document.querySelectorAll('[data-shop-tab]').forEach(function (b) { b.addEventListener('click', function () { UI.shopTab = b.dataset.shopTab; renderCurrent(); }); });
    }

    if (route === 'services') {
      document.querySelectorAll('[data-guide]').forEach(function (b) { b.addEventListener('click', function () { toast('"' + b.dataset.guide + '" ships with the production build'); }); });
    }

    if (route === 'contact') {
      var bf = document.getElementById('bookingForm');
      if (bf) bf.addEventListener('submit', async function (e) {
        e.preventDefault();
        try {
          await api('/api/appointments', { method: 'POST', body: JSON.stringify({
            name: document.getElementById('bk-name').value,
            phone: document.getElementById('bk-phone').value,
            email: document.getElementById('bk-email').value,
            service: document.getElementById('bk-service').value,
            preferredDate: document.getElementById('bk-date').value,
            note: document.getElementById('bk-note').value
          }) });
          toast('Request sent — we\'ll call to confirm.');
          bf.reset();
        } catch (err) { toast(err.message); }
      });
    }

    if (route === 'careers') {
      document.querySelectorAll('[data-apply]').forEach(function (b) { b.addEventListener('click', function () { openApplyModal(b.dataset.apply); }); });
    }

    if (route === 'portal') {
      document.querySelectorAll('[data-portal-tab]').forEach(function (b) { b.addEventListener('click', function () { UI.portalTab = b.dataset.portalTab; renderCurrent(); }); });
      var ps = document.getElementById('portalSearch');
      if (ps) ps.addEventListener('input', function () {
        var q = ps.value.trim().toLowerCase();
        var shown = 0;
        document.querySelectorAll('#portalTable tbody tr').forEach(function (tr) {
          var hit = !q || (tr.dataset.hay || '').indexOf(q) !== -1;
          tr.hidden = !hit; if (hit) shown++;
        });
        var nm = document.getElementById('portalNoMatch'); if (nm) nm.hidden = shown !== 0;
      });
    }

    if (route === 'studio') {
      document.querySelectorAll('[data-lab-stage]').forEach(function (b) { b.addEventListener('click', function () { UI.labStage = b.dataset.labStage; renderCurrent(); }); });
      var ls = document.getElementById('labSearch');
      if (ls) ls.addEventListener('input', function () {
        var q = ls.value.trim().toLowerCase();
        var shown = 0;
        document.querySelectorAll('#labPipeline .kcard').forEach(function (card) {
          var hit = !q || (card.dataset.hay || '').indexOf(q) !== -1;
          card.hidden = !hit; if (hit) shown++;
        });
        document.querySelectorAll('#labPipeline .lane').forEach(function (lane) {
          var any = lane.querySelector('.kcard:not([hidden])');
          lane.style.display = (q && !any) ? 'none' : '';
        });
        var nm = document.getElementById('labNoMatch'); if (nm) nm.hidden = shown !== 0;
      });
    }

    if (route === 'admin') {
      document.querySelectorAll('[data-admin-tab]').forEach(function (b) { b.addEventListener('click', function () { UI.adminTab = b.dataset.adminTab; renderCurrent(); }); });
      document.querySelectorAll('[data-pay-invoice]').forEach(function (b) { b.addEventListener('click', async function () { try { await api('/api/invoices/' + b.dataset.payInvoice + '/pay', { method: 'POST' }); await loadState(); renderCurrent(); toast('Invoice marked paid'); } catch (e) { toast(e.message); } }); });
      document.querySelectorAll('[data-appt-status]').forEach(function (b) { b.addEventListener('click', async function () { try { await api('/api/appointments/' + b.dataset.apptId + '/status', { method: 'POST', body: JSON.stringify({ status: b.dataset.apptStatus }) }); await loadState(); renderCurrent(); toast('Appointment updated'); } catch (e) { toast(e.message); } }); });
      var ef = document.getElementById('expenseForm');
      if (ef) ef.addEventListener('submit', async function (e) {
        e.preventDefault();
        try {
          await api('/api/expenses', { method: 'POST', body: JSON.stringify({ category: document.getElementById('ex-category').value, description: document.getElementById('ex-desc').value, amount: document.getElementById('ex-amount').value }) });
          await loadState(); renderCurrent(); toast('Expense logged');
        } catch (err) { toast(err.message); }
      });
      var tf = document.getElementById('teamForm');
      if (tf) tf.addEventListener('submit', async function (e) {
        e.preventDefault();
        try {
          await api('/api/team', { method: 'POST', body: JSON.stringify({ name: document.getElementById('tm-name').value, role: document.getElementById('tm-role').value }) });
          await loadState(); renderCurrent(); toast('Team member added');
        } catch (err) { toast(err.message); }
      });
      var sf = document.getElementById('settingsForm');
      if (sf) sf.addEventListener('submit', async function (e) {
        e.preventDefault();
        try {
          await api('/api/settings', { method: 'POST', body: JSON.stringify({
            clinicName: document.getElementById('st-name').value,
            phone: document.getElementById('st-phone').value,
            email: document.getElementById('st-email').value,
            address: document.getElementById('st-address').value,
            hours: document.getElementById('st-hours').value
          }) });
          await loadState(); renderCurrent(); toast('Settings saved');
        } catch (err) { toast(err.message); }
      });

      var paf = document.getElementById('productAddForm');
      if (paf) paf.addEventListener('submit', async function (e) {
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
      document.querySelectorAll('.product-edit-form').forEach(function (f) {
        f.addEventListener('submit', async function (e) {
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
      document.querySelectorAll('[data-del-product]').forEach(function (b) {
        b.addEventListener('click', async function () {
          if (!window.confirm('Delete this product? This can\'t be undone.')) return;
          try {
            await api('/api/products/' + encodeURIComponent(b.dataset.delProduct) + '/delete', { method: 'POST' });
            await loadState(); renderCurrent(); toast('Product deleted');
          } catch (err) { toast(err.message); }
        });
      });
    }

    // case cards / rows (portal + studio)
    document.querySelectorAll('[data-open]').forEach(function (el) { el.addEventListener('click', function () { openDrawer(el.dataset.open, el.dataset.from); }); });
  }

  function openApplyModal(jobId) {
    var div = document.createElement('div');
    div.id = 'applyModalHost';
    div.innerHTML = applyModalHtml(jobId);
    document.body.appendChild(div);
    document.querySelectorAll('[data-close-modal]').forEach(function (b) { b.addEventListener('click', closeApplyModal); });
    document.getElementById('applyModal').addEventListener('click', function (e) { if (e.target.id === 'applyModal') closeApplyModal(); });
    document.getElementById('applyForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      try {
        await api('/api/careers/apply', { method: 'POST', body: JSON.stringify({ jobId: document.getElementById('ap-job').value, name: document.getElementById('ap-name').value, email: document.getElementById('ap-email').value, phone: document.getElementById('ap-phone').value, note: document.getElementById('ap-note').value }) });
        closeApplyModal();
        toast('Application submitted — thank you!');
      } catch (err) { toast(err.message); }
    });
  }
  function closeApplyModal() { var el = document.getElementById('applyModalHost'); if (el) el.remove(); }

  /* ============================== global chrome wiring ============================ */
  document.addEventListener('DOMContentLoaded', function () {
    updateCartBadge();
    injectDrawerShell();

    document.getElementById('dashBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      document.getElementById('dashMenu').classList.toggle('open');
    });
    document.addEventListener('click', function () { document.getElementById('dashMenu').classList.remove('open'); });

    document.getElementById('navToggle').addEventListener('click', function () {
      var nav = document.getElementById('mainNav');
      var open = nav.style.display === 'flex';
      nav.style.display = open ? 'none' : 'flex';
      nav.style.cssText += 'position:absolute; top:64px; left:0; right:0; background:var(--surface); flex-direction:column; padding:14px 24px; border-bottom:1px solid var(--line); gap:16px;';
      nav.style.display = open ? 'none' : 'flex';
    });

    document.getElementById('cartBtn').addEventListener('click', openCart);
    document.getElementById('cartBackdrop').addEventListener('click', closeCart);

    document.body.addEventListener('click', function (e) {
      if (e.target.id === 'cartClose') closeCart();
      if (e.target.id === 'checkoutBtn') checkout();
      var inc = e.target.closest('[data-cart-inc]'); if (inc) changeQty(inc.dataset.cartInc, 1);
      var dec = e.target.closest('[data-cart-dec]'); if (dec) changeQty(dec.dataset.cartDec, -1);
      var act = e.target.closest('[data-act]'); if (act) handleCaseAction(act.dataset.act, act.dataset.id);
    });

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeDrawer(); closeCart(); closeApplyModal(); } });

    window.addEventListener('hashchange', router);
    if (!location.hash) location.hash = '#/';
    router();
  });
})();
