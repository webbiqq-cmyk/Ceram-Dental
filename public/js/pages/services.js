import { money } from '../utils/format.js';
import { SERVICES, PROTOCOL, GUIDES, LAYERING_STYLES, GLAZE_TYPES, SURFACE_TEXTURES } from '../constants.js';
import { footer } from '../components/footer.js';
import { toast } from '../toast.js';

export function renderServices() {
  return (
    '<div class="page"><div class="u">' +
    '<div class="page-head reveal"><span class="eyebrow-accent">Services</span>' +
      '<h1>Six treatments, one careful process.</h1>' +
      '<p class="lede">Whatever brings you in, your doctor follows the same thorough process — a clear plan, an accurate scan, and a restoration checked before it ever reaches your mouth.</p></div>' +

    '<div class="section">' + SERVICES.map((s, i) => {
      const extra = s.key === 'veneers'
        ? '<div class="tag-row">' + LAYERING_STYLES.concat(GLAZE_TYPES, SURFACE_TEXTURES).map(x => '<span>' + x + '</span>').join('') + '</div>'
        : '';
      return '<div class="svc-detail reveal" style="--i:' + i + '">' +
        '<div class="svc-detail-head"><div><h3>' + s.label + '</h3><p style="color:var(--ink-soft); font-size:13.5px; margin-top:6px; max-width:60ch;">' + s.desc + '</p></div>' +
        '<div class="fee">from ' + money(s.fee) + '</div></div>' + extra +
        '<div class="protocol-strip">' + PROTOCOL.map(p => '<span>' + p.label + '</span>').join('') + '</div>' +
      '</div>';
    }).join('') + '</div>' +

    '<div class="section" style="text-align:center;"><a class="btn btn-primary" href="#/contact">Book a consultation →</a></div>' +

    '<div class="section" style="border-top:1px solid var(--line); padding-top:44px;">' +
      '<span class="eyebrow">For dentists &amp; referring clinics</span><h2 style="font-size:21px; margin-top:4px;">Sending us a case?</h2>' +
      '<p class="lede" style="margin-top:8px; margin-bottom:20px;">These guides cover exactly what our lab needs to accept a case on the first pass.</p>' +
      '<div class="grid-3">' + GUIDES.map((g, i) =>
        '<div class="card reveal" style="--i:' + i + '"><h3>' + g.t + '</h3><p>' + g.d + '</p>' +
          '<button class="btn btn-ghost btn-sm" data-guide="' + g.t + '" style="margin-top:12px;">View guide</button></div>'
      ).join('') + '</div>' +
      '<div style="margin-top:24px;"><a class="btn btn-ghost" href="#/new-case">Refer a case →</a></div>' +
    '</div>' +
    '</div></div>' + footer()
  );
}

export function attachServicesHandlers() {
  document.querySelectorAll('[data-guide]').forEach(b => b.addEventListener('click', () => toast('"' + b.dataset.guide + '" ships with the production build')));
}
