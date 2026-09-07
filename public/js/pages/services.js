import { money, esc } from '../utils/format.js';
import { SERVICE_GROUPS, CLINICAL_SERVICES, SVC, PROTOCOL, GUIDES, LAYERING_STYLES, GLAZE_TYPES, SURFACE_TEXTURES } from '../constants.js';
import { footer } from '../components/footer.js';
import { editorialImage } from '../components/editorialImage.js';

function treatment(key, i) {
  const s = SVC[key];
  const finishes = key === 'veneers' ? '<div class="treatment-finishes"><h4>Ceramic finishes</h4><p>' +
    LAYERING_STYLES.concat(GLAZE_TYPES, SURFACE_TEXTURES).map(esc).join(' &middot; ') + '</p></div>' : '';
  return '<details class="treatment" data-service="' + key + '"' + (i === 0 ? ' open' : '') + '>' +
    '<summary><span class="treatment-number">0' + (i + 1) + '</span><h3>' + esc(s.label) + '</h3><span class="treatment-toggle" aria-hidden="true"></span></summary>' +
    '<div class="treatment-body"><p>' + esc(s.desc) + '</p>' + finishes +
    '<div class="treatment-action"><span>From ' + money(s.fee) + '</span><a href="#/contact" class="text-link">Discuss this treatment &rarr;</a></div></div></details>';
}

export function renderServices() {
  return '<div class="page page-flush editorial-page services-page">' +
    '<header class="editorial-hero">' + editorialImage('services-hero', { hero: true }) +
    '<div class="u editorial-hero-copy"><span class="eyebrow">Care, considered</span><h1 class="serif">Dentistry.<br>With intention.</h1>' +
    '<p>From the smallest detail to a complete smile plan.<br>Discover the care that feels right for you.</p><a class="btn btn-white" href="#/contact">Book a consultation &rarr;</a></div></header>' +
    '<div class="u"><nav class="chapter-nav" aria-label="Treatment categories">' +
    SERVICE_GROUPS.map((g, i) => '<button type="button" data-jump="service-' + g.key + '"><span>0' + (i + 1) + '</span>' + esc(g.label) + '</button>').join('') +
    '<button type="button" data-jump="clinical-services"><span>04</span>Clinical care</button></nav>' +
    '<div class="editorial-intro reveal"><span class="eyebrow">A considered approach</span><h2 class="serif">Your smile is personal.<br>Your care should be, too.</h2><p>We bring specialist dentistry and an in-house ceramics lab together, so your treatment can be planned with the whole picture in mind.</p></div>' +
    SERVICE_GROUPS.map((g, i) => '<section class="treatment-chapter" id="service-' + g.key + '" aria-labelledby="heading-' + g.key + '">' +
      '<div class="chapter-heading reveal"><span class="chapter-number">0' + (i + 1) + '</span><div><span class="eyebrow">The care collection</span><h2 id="heading-' + g.key + '" class="serif">' + esc(g.label) + '</h2><p>' + esc(g.desc) + '</p></div></div>' +
      '<div class="chapter-content"><figure class="chapter-image reveal">' + editorialImage('service-' + g.key) + '<figcaption>' + ['A natural expression of you.', 'Care in every contour.', 'A clearer view of what comes next.'][i] + '</figcaption></figure>' +
      '<div class="treatment-list reveal">' + g.services.map(treatment).join('') + '</div></div></section>').join('') +
    '<section class="clinical-chapter" id="clinical-services"><div><span class="eyebrow">04 / Specialist care</span><h2 class="serif">Other Clinical<br>Dental Procedures</h2><p>Care for the foundations of a healthy smile. Your doctor will discuss treatment and fees following an assessment.</p><a class="text-link" href="#/about">Meet your specialists &rarr;</a></div>' +
    '<div>' + CLINICAL_SERVICES.map(s => '<article class="clinical-row"><h3>' + esc(s.label) + '</h3><p>' + esc(s.desc) + '</p></article>').join('') + '</div></section>' +
    '<section class="referral-section"><div><span class="eyebrow">For referring dentists</span><h2 class="serif">Good work begins<br>with a clear brief.</h2><a class="text-link" href="#/portal">Open Dentist Portal &rarr;</a></div><div>' +
    GUIDES.map(g => '<details class="guide-detail"><summary>' + esc(g.t) + '</summary><p>' + esc(g.d) + '</p><ul>' + PROTOCOL.map(p => '<li>' + esc(p.label) + '</li>').join('') + '</ul></details>').join('') +
    '</div></section><section class="editorial-booking"><span class="eyebrow">Your next chapter</span><h2 class="serif">Let us start with a conversation.</h2><a class="btn btn-primary" href="#/contact">Book a consultation &rarr;</a></section></div></div>' + footer();
}

export function attachServicesHandlers() {
  document.querySelectorAll('[data-jump]').forEach(button => button.addEventListener('click', () => {
    const section = document.getElementById(button.dataset.jump);
    if (!section) return;
    section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    section.setAttribute('tabindex', '-1');
    section.focus({ preventScroll: true });
  }));
}
