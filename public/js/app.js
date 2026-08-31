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

  /* ============================== helpers =============================== */
  function money(n) { return 'BD ' + Number(n || 0).toFixed(3); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function fmtDate(d) { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  function fmtDateTime(d) { return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function labelFor(stageKey) { return STAGES[STAGE_INDEX[stageKey]].label; }
  function svcLabel(key) { return SVC[key] ? SVC[key].label : key; }

  async function api(path, opts) {
    var res = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
    var json = await res.json().catch(function () { return {}; });
    if (!res.ok || json.ok === false) throw new Error(json.error || 'Something went wrong.');
    return json;
  }

  /* ================================ state ================================ */
  var DATA = { cases: [], invoices: [], expenses: [], products: [], jobs: [], applications: [], messages: [], orders: [], summary: {} };
  var UI = {
    cart: JSON.parse(localStorage.getItem('ceram_cart') || '[]'),
    wizard: null,
    drawer: null,
    adminTab: 'overview',
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
  var revealObserver = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); } });
  }, { threshold: 0.1 }) : null;
  function initReveal() {
    var els = document.querySelectorAll('#app .reveal');
    els.forEach(function (el, i) {
      el.style.setProperty('--i', i % 8);
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
    return (
      '<footer class="site-footer"><div class="u"><div class="footer-grid">' +
        '<div><div class="footer-brand"><span class="brand-mark"><img src="/images/icon.png" alt=""></span>Ceram Dental</div>' +
          '<p class="about-copy">A digital ceramics lab built around one shared case record — from a clinic\'s scan to a restoration ready for pickup.</p>' +
          '<div class="social-row" style="margin-top:16px;">' + socialIcons() + '</div></div>' +
        '<div><h4>Explore</h4><a href="#/about">About</a><a href="#/services">Services</a><a href="#/shop">Shop</a><a href="#/careers">Careers</a></div>' +
        '<div><h4>Dashboards</h4><a href="#/new-case">Start a Case</a><a href="#/portal">Dentist Portal</a><a href="#/studio">Lab Studio</a><a href="#/admin">Accounts &amp; Admin</a></div>' +
        '<div><h4>Visit</h4><a href="tel:+97317131123">+973 1713 1123</a><a href="mailto:hello@ceram-dental.com">hello@ceram-dental.com</a><a href="#/contact">Highway 35, New Zinj, Manama</a></div>' +
      '</div><div class="footer-bottom"><span>© ' + new Date().getFullYear() + ' Ceram Dental. Click-through demo.</span><span>Built on Ceram Dental\'s own brand &amp; photography.</span></div></div></footer>'
    );
  }

  function socialIcons() {
    var icons = {
      instagram: 'M12 2.2c2.7 0 3 0 4.1.06 1.1.05 1.8.22 2.4.46.65.25 1.2.6 1.75 1.15.55.55.9 1.1 1.15 1.75.24.6.41 1.3.46 2.4.06 1.1.06 1.4.06 4.1s0 3-.06 4.1c-.05 1.1-.22 1.8-.46 2.4-.25.65-.6 1.2-1.15 1.75-.55.55-1.1.9-1.75 1.15-.6.24-1.3.41-2.4.46-1.1.06-1.4.06-4.1.06s-3 0-4.1-.06c-1.1-.05-1.8-.22-2.4-.46a4.9 4.9 0 0 1-1.75-1.15 4.9 4.9 0 0 1-1.15-1.75c-.24-.6-.41-1.3-.46-2.4C2.2 15 2.2 14.7 2.2 12s0-3 .06-4.1c.05-1.1.22-1.8.46-2.4.25-.65.6-1.2 1.15-1.75A4.9 4.9 0 0 1 5.62 2.6c.6-.24 1.3-.41 2.4-.46C9.12 2.2 9.4 2.2 12 2.2Zm0 1.8c-2.66 0-2.97 0-4.02.06-.9.04-1.38.18-1.7.31-.43.16-.73.36-1.05.68-.32.32-.52.62-.68 1.05-.13.32-.27.8-.31 1.7C4.2 8.85 4.2 9.16 4.2 12s0 3.15.06 4.2c.04.9.18 1.38.31 1.7.16.43.36.73.68 1.05.32.32.62.52 1.05.68.32.13.8.27 1.7.31 1.05.06 1.36.06 4.02.06s2.97 0 4.02-.06c.9-.04 1.38-.18 1.7-.31.43-.16.73-.36 1.05-.68.32-.32.52-.62.68-1.05.13-.32.27-.8.31-1.7.06-1.05.06-1.36.06-4.2s0-3.15-.06-4.2c-.04-.9-.18-1.38-.31-1.7a2.8 2.8 0 0 0-.68-1.05 2.8 2.8 0 0 0-1.05-.68c-.32-.13-.8-.27-1.7-.31C14.97 4 14.66 4 12 4Zm0 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Zm5.2-1.98a1.17 1.17 0 1 1-2.34 0 1.17 1.17 0 0 1 2.34 0Z',
      facebook: 'M13.5 21v-7.6h2.55l.38-2.96h-2.93V8.55c0-.86.24-1.44 1.47-1.44h1.57V4.46c-.27-.04-1.2-.12-2.28-.12-2.26 0-3.8 1.38-3.8 3.9v2.18H7.99v2.96h2.47V21h3.04Z',
      tiktok: 'M14.5 3h2.2c.15 1.2.7 2.2 1.6 2.95.85.7 1.9 1.05 3.2 1.1v2.3c-1.35-.03-2.55-.35-3.6-.95v6.2c0 3.1-2.15 5.4-5.35 5.4-3 0-5.35-2.15-5.35-5.05 0-2.85 2.2-5.05 5.1-5.05.35 0 .7.03 1 .1v2.35a2.8 2.8 0 0 0-1-.18c-1.55 0-2.8 1.15-2.8 2.7 0 1.55 1.2 2.75 2.7 2.75 1.6 0 2.9-1.2 2.9-3.15V3Z'
    };
    var links = { instagram: 'https://instagram.com/ceramdental', facebook: 'https://facebook.com/ceramdental', tiktok: 'https://tiktok.com/@ceramdental' };
    return Object.keys(icons).map(function (k) {
      return '<a href="' + links[k] + '" target="_blank" rel="noopener" aria-label="' + k + '"><svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="' + icons[k] + '"/></svg></a>';
    }).join('');
  }

  /* ================================== HOME ================================ */
  function renderHome() {
    var active = DATA.cases.filter(function (c) { return c.stage !== 'ready'; }).length;
    var ready = DATA.cases.filter(function (c) { return c.stage === 'ready'; }).length;
    return (
      '<div class="page"><div class="u">' +
      '<div class="hero-site reveal"><div class="photo"></div><div class="scrim"></div>' +
        '<div class="content">' +
          '<span class="eyebrow-accent">Ceram Dental — digital ceramics lab</span>' +
          '<h1>Precision restorations,<br>ordered in minutes.</h1>' +
          '<p class="lede">Send a case straight to our CAD-CAM studio with your scan, shade and design notes — and track it through every stage until it\'s on your desk.</p>' +
          '<div class="cta-row"><a class="btn btn-primary" href="#/new-case">Start a new case</a><a class="btn btn-onphoto" href="#/portal">Track my cases</a></div>' +
        '</div></div>' +

      '<div class="stat-strip reveal">' +
        '<div class="chipstat"><b>' + active + '</b><span>Active cases</span></div>' +
        '<div class="chipstat"><b>' + ready + '</b><span>Ready this week</span></div>' +
        '<div class="chipstat"><b>' + SERVICES.length + '</b><span>Services offered</span></div>' +
      '</div>' +

      '<div class="section">' +
        '<span class="eyebrow">Step inside</span><h2 style="font-size:21px; margin-top:4px;">The studio behind the work</h2>' +
        '<div class="space-grid">' +
          '<div class="space-card reveal" style="background-image:url(/images/reception.jpg)"><span class="tag">Reception, New Zinj</span></div>' +
          '<div class="space-card reveal" style="background-image:url(/images/lounge.jpg)"><span class="tag">Patient lounge</span></div>' +
        '</div>' +
      '</div>' +

      '<div class="section">' +
        '<div class="section-head"><div><span class="eyebrow">Services</span><h2 style="font-size:21px; margin-top:4px;">Six ways to start a case</h2></div>' +
          '<a class="btn btn-ghost btn-sm" href="#/services">All services →</a></div>' +
        '<div class="services-grid">' + SERVICES.map(function (s, i) {
          return '<a href="#/new-case" class="svc-card reveal" style="--i:' + i + '">' +
            '<div class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="' + s.icon + '"/></svg></div>' +
            '<h3>' + s.label + '</h3><p>' + s.desc + '</p></a>';
        }).join('') + '</div>' +
      '</div>' +

      '<div class="section grid-2">' +
        '<div class="vm-card vision reveal"><span class="eyebrow">Why clinics choose us</span>' +
          '<h2 style="color:#fff; font-size:22px; margin-top:10px;">One protocol, every case, no surprises.</h2>' +
          '<p>Every case is checked against the same five-point protocol before it reaches a technician — so what you send is what gets built.</p></div>' +
        '<div class="card reveal"><span class="eyebrow">Shop</span><h3 style="margin-top:8px;">Chairside kits &amp; patient retail</h3>' +
          '<p>Shade guides, retraction cord and take-home whitening — the essentials, ordered alongside your cases.</p>' +
          '<a class="btn btn-ghost btn-sm" style="margin-top:14px;" href="#/shop">Visit the shop →</a></div>' +
      '</div>' +

      '</div></div>' + footer()
    );
  }

  /* =================================== ABOUT =============================== */
  function renderAbout() {
    var depts = [
      { n: 'RC', t: 'Reception', d: 'First read on every incoming case' },
      { n: 'QC', t: 'Quality Control', d: 'Protocol checks, in and out' },
      { n: 'DS', t: 'Design Studio', d: 'Digital design & mockups' },
      { n: 'CC', t: 'CAD-CAM & Milling', d: 'Zirconia, wax and print' }
    ];
    return (
      '<div class="page"><div class="u">' +
      '<div class="page-head reveal"><span class="eyebrow-accent">About Ceram Dental</span>' +
        '<h1>A ceramics lab built around one case record.</h1>' +
        '<p class="lede">We started as a chairside ceramics studio and grew into a full digital lab — CAD-CAM, an in-house design team, and a QC desk that checks every case the same way, twice.</p></div>' +

      '<div class="section vm-grid">' +
        '<div class="vm-card vision reveal"><span class="eyebrow">Vision</span>' +
          '<p style="font-size:16px; line-height:1.6; margin-top:14px;">To be the lab clinics trust with their most demanding smile cases — where precision is checked, not assumed.</p></div>' +
        '<div class="vm-card mission reveal"><span class="eyebrow">Mission</span>' +
          '<p style="font-size:16px; line-height:1.6; margin-top:14px; color:var(--ink);">Give every clinic a clear protocol, a live view of their case, and a lab team that treats a revision as a fix — not a fight.</p></div>' +
      '</div>' +

      '<div class="section">' +
        '<span class="eyebrow">By the numbers</span>' +
        '<div class="value-row" style="margin-top:14px;">' +
          statTile('6', 'Restoration types') + statTile('5', 'Protocol checks per case') +
          statTile('8', 'Pipeline stages') + statTile('1', 'Shared case record') +
        '</div>' +
      '</div>' +

      '<div class="section">' +
        '<span class="eyebrow">Inside the lab</span><h2 style="font-size:21px; margin-top:4px;">Departments a case passes through</h2>' +
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
        '<h1>Six restorations, one protocol.</h1>' +
        '<p class="lede">Every case — whatever it is — is checked against the same acceptance protocol before it reaches a technician.</p></div>' +

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

      '<div class="section">' +
        '<span class="eyebrow">New to working with us?</span><h2 style="font-size:21px; margin-top:4px;">Start-here guides</h2>' +
        '<div class="grid-3" style="margin-top:16px;">' + GUIDES.map(function (g, i) {
          return '<div class="card reveal" style="--i:' + i + '"><h3>' + g.t + '</h3><p>' + g.d + '</p>' +
            '<button class="btn btn-ghost btn-sm" data-guide="' + esc(g.t) + '" style="margin-top:12px;">View guide</button></div>';
        }).join('') + '</div>' +
      '</div>' +

      '<div class="section" style="text-align:center;"><a class="btn btn-primary" href="#/new-case">Start a new case →</a></div>' +
      '</div></div>' + footer()
    );
  }

  /* ================================== SHOP =================================== */
  function renderShop() {
    return (
      '<div class="page"><div class="u">' +
      '<div class="page-head reveal"><span class="eyebrow-accent">Shop</span>' +
        '<h1>Chairside kits &amp; patient retail.</h1>' +
        '<p class="lede">Order the essentials alongside your cases — shipped with your next pickup.</p></div>' +
      '<div class="product-grid">' + DATA.products.map(function (p, i) {
        return '<div class="product-card reveal" style="--i:' + i + '"><span class="cat">' + p.category + '</span><h3>' + p.name + '</h3><p>' + p.desc + '</p>' +
          '<div class="row"><span class="price">' + money(p.price) + '</span><button class="btn btn-primary btn-sm" data-add-product="' + p.id + '">Add to cart</button></div></div>';
      }).join('') + '</div>' +
      '</div></div>' + footer()
    );
  }

  /* ================================= CONTACT ================================= */
  function renderContact() {
    return (
      '<div class="page"><div class="u">' +
      '<div class="page-head reveal"><span class="eyebrow-accent">Contact</span><h1>Talk to the lab.</h1>' +
        '<p class="lede">Questions about a case, a pickup, or getting your clinic set up — reach us any of these ways.</p></div>' +
      '<div class="section grid-2">' +
        '<div class="card reveal info-card">' +
          infoRow('M2.5 6.5A2 2 0 0 1 4.5 4.5h1.7a1 1 0 0 1 .95.69l1 3a1 1 0 0 1-.27 1.04L6.6 10.5a11 11 0 0 0 5 5l1.27-1.28a1 1 0 0 1 1.04-.27l3 1a1 1 0 0 1 .69.95v1.7a2 2 0 0 1-2 2A15.5 15.5 0 0 1 2.5 6.5Z', 'Phone &amp; WhatsApp', '<a href="tel:+97317131123">+973 1713 1123</a>') +
          infoRow('M3 6h18v12H3Zm0 0 9 7 9-7', 'Email', '<a href="mailto:hello@ceram-dental.com">hello@ceram-dental.com</a>') +
          infoRow('M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'Address', 'Highway 35, New Zinj, Manama, Bahrain') +
          '<div><span class="eyebrow" style="margin-bottom:10px;">Follow along</span><div class="social-row">' + socialIcons() + '</div></div>' +
        '</div>' +
        '<div class="card reveal">' +
          '<span class="eyebrow" style="margin-bottom:14px;">Send a message</span>' +
          '<form id="contactForm" class="form-grid">' +
            field('full', 'text', 'cf-name', 'Name', true) +
            field('full', 'email', 'cf-email', 'Email', true) +
            '<div class="field full"><label>Message</label><textarea id="cf-message" required placeholder="How can we help?"></textarea></div>' +
            '<div class="field full"><button class="btn btn-primary btn-block" type="submit">Send message</button></div>' +
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
    return { step: 0, service: preService || null, clinic: 'Dr. R. Haddad — Bright Smile Clinic', patient: '', shade: 'A2', layering: LAYERING_STYLES[0], glaze: GLAZE_TYPES[0], surface: SURFACE_TEXTURES[0], instructions: '', protocol: { photos: false, scan: false, retraction: false, margins: false, contacts: false } };
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
      var extraFields = w.service === 'veneers' ? (
        selectField('w-layering', 'Layering style', LAYERING_STYLES, w.layering) +
        selectField('w-glaze', 'Glaze type', GLAZE_TYPES, w.glaze) +
        selectField('w-surface', 'Surface structure', SURFACE_TEXTURES, w.surface)
      ) : '';
      body = '<div class="field-grid">' +
        '<div class="field full"><label>Clinic / Doctor</label><input id="f-clinic" value="' + esc(w.clinic) + '"></div>' +
        '<div class="field"><label>Patient reference</label><input id="f-patient" placeholder="e.g. Patient #4521" value="' + esc(w.patient) + '"></div>' +
        selectField('f-shade', 'Shade', SHADES, w.shade) +
        extraFields +
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
      body = '<div class="review-block">' +
        row('Service', svcLabel(w.service)) + row('Clinic', w.clinic) + row('Patient', w.patient || '—') +
        row('Shade', w.shade) + (w.service === 'veneers' ? row('Layering / Glaze / Surface', w.layering + ' · ' + w.glaze + ' · ' + w.surface) : '') +
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
    try {
      var res = await api('/api/cases', { method: 'POST', body: JSON.stringify({ clinic: w.clinic, patient: w.patient, service: w.service, shade: w.shade, instructions: w.instructions, protocol: w.protocol }) });
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
    var rows = DATA.cases.map(function (c) {
      var idx = STAGE_INDEX[c.stage];
      var dots = STAGES.map(function (s, i) { return '<i class="' + (i < idx ? 'done' : (i === idx ? 'now' : '')) + '"></i>'; }).join('');
      var last = c.history[c.history.length - 1];
      return '<tr class="clickable" data-open="' + c.id + '" data-from="mycases">' +
        '<td class="cid-cell">' + c.id + '</td><td>' + svcLabel(c.service) + '</td><td>' + esc(c.patient) + '</td>' +
        '<td>' + pillHtml(c) + (c.stage === 'doctor_approval' ? '<span class="action-flag">Needs your review</span>' : '') + '<div class="progress-mini">' + dots + '</div></td>' +
        '<td>' + fmtDate(last ? last.at : c.createdAt) + '</td>' +
        '<td><button class="btn btn-ghost btn-sm" data-open="' + c.id + '" data-from="mycases">Open</button></td></tr>';
    }).join('');
    return '<div class="table-wrap reveal"><table class="cases-table"><thead><tr><th>Case</th><th>Service</th><th>Patient</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
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
  function renderStudio() {
    var cols = STAGES.map(function (s) {
      var cards = DATA.cases.filter(function (c) { return c.stage === s.key; });
      return '<div class="col"><div class="col-head"><h3>' + s.label + '</h3><span class="cnt">' + cards.length + '</span></div><div class="col-cards">' + cards.map(kcardHtml).join('') + '</div></div>';
    }).join('');
    return '<div class="page"><div class="u">' +
      '<div class="page-head reveal" style="margin-bottom:14px;"><span class="eyebrow-accent">Internal · Lab Studio</span><h1 style="font-size:1.9rem;">Case pipeline</h1></div>' +
      '<div class="lab-legend"><span><i style="background:var(--violet)"></i>In lab hands</span><span><i style="background:var(--amber)"></i>Awaiting doctor / in production</span><span><i style="background:var(--ready)"></i>Ready for pickup</span></div>' +
      '<div class="board reveal">' + cols + '</div>' +
    '</div></div>';
  }
  function kcardHtml(c) {
    var waiting = c.stage === 'doctor_approval';
    return '<button class="kcard" data-open="' + c.id + '" data-from="lab"><div class="top"><span class="cid">' + c.id + '</span><span class="svc">' + svcLabel(c.service) + '</span></div>' +
      '<div class="clinic">' + esc(c.clinic) + '</div><div class="patient">' + esc(c.patient) + '</div>' +
      (waiting ? '<div class="waiting">Awaiting doctor</div>' : '') + (c.revisions > 0 ? '<div class="rev">Rev ' + (c.revisions + 1) + '</div>' : '') +
      '<div class="meta"><span class="tech">● ' + c.tech + '</span><span class="shade">' + c.shade + '</span></div></button>';
  }

  /* ================================== ADMIN ===================================== */
  function renderAdmin() {
    var tab = UI.adminTab;
    var tabs = [['overview', 'Overview'], ['invoices', 'Invoices'], ['expenses', 'Expenses'], ['orders', 'Shop Orders'], ['applications', 'Careers'], ['messages', 'Messages']];
    var body =
      tab === 'invoices' ? adminInvoices() :
      tab === 'expenses' ? adminExpenses() :
      tab === 'orders' ? adminOrders() :
      tab === 'applications' ? adminApplications() :
      tab === 'messages' ? adminMessages() : adminOverview();
    return '<div class="page"><div class="u">' +
      '<div class="page-head reveal"><span class="eyebrow-accent">Accounts &amp; Admin</span><h1 style="font-size:1.9rem;">Run the business, not just the pipeline.</h1></div>' +
      '<div class="dash-tabs">' + tabs.map(function (t) { return '<button class="dash-tab' + (tab === t[0] ? ' active' : '') + '" data-admin-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      body +
    '</div></div>';
  }

  function adminOverview() {
    var s = DATA.summary;
    var tiles = [
      ['Revenue collected', money(s.revenue), 'pos'], ['Outstanding', money(s.outstanding), s.overdue ? 'neg' : ''],
      ['Expenses (this week)', money(s.totalExpenses), ''], ['Net', money(s.net), s.net >= 0 ? 'pos' : 'neg'],
      ['Active cases', s.activeCases, '']
    ];
    var maxBar = Math.max(s.revenue, s.totalExpenses, 1);
    return '<div class="stat-grid reveal">' + tiles.map(function (t) { return '<div class="stat-tile ' + t[2] + '"><div class="lbl">' + t[0] + '</div><div class="val">' + t[1] + '</div></div>'; }).join('') + '</div>' +
      '<div class="card reveal" style="margin-bottom:24px;"><span class="eyebrow">Revenue vs expenses</span>' +
        '<div class="bars"><div class="bar-col"><div class="bar" style="height:' + Math.round(s.revenue / maxBar * 120) + 'px"></div><span class="lbl">Revenue</span></div>' +
        '<div class="bar-col"><div class="bar exp" style="height:' + Math.round(s.totalExpenses / maxBar * 120) + 'px"></div><span class="lbl">Expenses</span></div></div></div>' +
      '<div class="grid-2">' +
        '<div class="card reveal"><span class="eyebrow">Shop</span><div class="val" style="font-family:var(--font-display); font-size:22px; margin-top:8px;">' + money(s.shopRevenue) + ' in orders</div><p style="margin-top:6px;">' + DATA.orders.length + ' orders placed via the shop.</p></div>' +
        '<div class="card reveal"><span class="eyebrow">Pipeline in / pending</span><div class="val" style="font-family:var(--font-display); font-size:22px; margin-top:8px;">' + s.readyCases + ' ready for pickup</div><p style="margin-top:6px;">' + s.openApplications + ' open applications · ' + s.newMessages + ' contact messages.</p></div>' +
      '</div>';
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

    document.getElementById('dw-body').innerHTML =
      '<div class="drawer-sec"><h4>Case</h4>' +
        kv('Service', svcLabel(c.service)) + kv('Patient', c.patient) + kv('Shade', c.shade) + kv('Assigned tech', c.tech) + kv('Current stage', labelFor(c.stage)) +
        (inv ? kv('Invoice', inv.id + ' · ' + money(inv.amount) + ' · ' + inv.status) : '') +
      '</div>' +
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
          w.clinic = document.getElementById('f-clinic').value;
          w.patient = document.getElementById('f-patient').value;
          w.shade = document.getElementById('f-shade').value;
          if (document.getElementById('w-layering')) { w.layering = document.getElementById('w-layering').value; w.glaze = document.getElementById('w-glaze').value; w.surface = document.getElementById('w-surface').value; }
          w.instructions = document.getElementById('f-instr').value;
        }
        w.step++; renderCurrent();
      });
      var backBtn = document.getElementById('wiz-back'); if (backBtn) backBtn.addEventListener('click', function () { UI.wizard.step--; renderCurrent(); });
      var submitBtn = document.getElementById('wiz-submit'); if (submitBtn) submitBtn.addEventListener('click', submitWizard);
      var againBtn = document.getElementById('wiz-again'); if (againBtn) againBtn.addEventListener('click', function () { UI.wizard = freshWizard(); renderCurrent(); });
    }

    if (route === 'shop') {
      document.querySelectorAll('[data-add-product]').forEach(function (b) { b.addEventListener('click', function () { addToCart(b.dataset.addProduct); }); });
    }

    if (route === 'services') {
      document.querySelectorAll('[data-guide]').forEach(function (b) { b.addEventListener('click', function () { toast('"' + b.dataset.guide + '" ships with the production build'); }); });
    }

    if (route === 'contact') {
      var cf = document.getElementById('contactForm');
      if (cf) cf.addEventListener('submit', async function (e) {
        e.preventDefault();
        try {
          await api('/api/contact', { method: 'POST', body: JSON.stringify({ name: document.getElementById('cf-name').value, email: document.getElementById('cf-email').value, message: document.getElementById('cf-message').value }) });
          toast('Message sent — we\'ll be in touch.');
          cf.reset();
        } catch (err) { toast(err.message); }
      });
    }

    if (route === 'careers') {
      document.querySelectorAll('[data-apply]').forEach(function (b) { b.addEventListener('click', function () { openApplyModal(b.dataset.apply); }); });
    }

    if (route === 'portal') {
      document.querySelectorAll('[data-portal-tab]').forEach(function (b) { b.addEventListener('click', function () { UI.portalTab = b.dataset.portalTab; renderCurrent(); }); });
    }

    if (route === 'admin') {
      document.querySelectorAll('[data-admin-tab]').forEach(function (b) { b.addEventListener('click', function () { UI.adminTab = b.dataset.adminTab; renderCurrent(); }); });
      document.querySelectorAll('[data-pay-invoice]').forEach(function (b) { b.addEventListener('click', async function () { try { await api('/api/invoices/' + b.dataset.payInvoice + '/pay', { method: 'POST' }); await loadState(); renderCurrent(); toast('Invoice marked paid'); } catch (e) { toast(e.message); } }); });
      var ef = document.getElementById('expenseForm');
      if (ef) ef.addEventListener('submit', async function (e) {
        e.preventDefault();
        try {
          await api('/api/expenses', { method: 'POST', body: JSON.stringify({ category: document.getElementById('ex-category').value, description: document.getElementById('ex-desc').value, amount: document.getElementById('ex-amount').value }) });
          await loadState(); renderCurrent(); toast('Expense logged');
        } catch (err) { toast(err.message); }
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
