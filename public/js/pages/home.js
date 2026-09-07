import { DATA } from '../state.js';
import { esc } from '../utils/format.js';
import { SERVICE_GROUPS, SVC } from '../constants.js';
import { doctorTile } from '../components/doctor.js';
import { footer } from '../components/footer.js';
import { visitSection } from '../components/visit.js';
import { reviewSection } from '../components/reviews.js';
import { brandLogoStack } from '../components/brand.js';
import { editorialImage } from '../components/editorialImage.js';

function step(n, t, d) {
  return '<div class="step reveal"><span class="num">' + n + '</span><h3>' + t + '</h3><p>' + d + '</p></div>';
}

export function renderHome() {
  const st = DATA.settings || {};
  const phone = st.phone || '+973 1713 1123';
  const faqs = [
    ['Do you make crowns and veneers in-house?', 'Yes. Ceram has its own CAD-CAM ceramics lab, so many restorations are designed, milled, layered and checked under the same roof as the clinic.'],
    ['Can I book a cosmetic consultation first?', 'Yes. Start with a consultation, photos and a digital plan before deciding on veneers, crowns, whitening, aligners or a larger smile design.'],
    ['Where is Ceram Dental located?', (st.address || 'Highway 35, New Zinj, Manama, Bahrain') + '. The clinic is open ' + (st.hours || 'Sat-Thu, 9:00 AM - 7:00 PM') + '.']
    ,['How long does a first consultation take?', 'Allow around 45–60 minutes. We review your goals, examine your smile, take digital records where useful and explain suitable next steps.']
    ,['Do you offer payment plans?', 'Treatment fees are explained before treatment starts. Ask our team about the payment options currently available for your plan.']
    ,['Do you treat nervous patients?', 'Yes. Tell us when booking so we can allow extra time, explain each step and keep the appointment comfortable and predictable.']
    ,['Can you repair or replace an old crown?', 'Often, yes. The doctor will assess the tooth, bite, gum health and existing restoration before recommending repair or replacement.']
    ,['Do you see children?', 'We welcome children for preventive visits, gentle check-ups and age-appropriate guidance.']
  ];
  return (
    '<div class="page page-flush">' +
    '<section class="home-hero">' +
      '<div class="hero-copy reveal">' +
        '<span class="hero-loc">Specialist dental center &middot; New Zinj, Manama</span>' +
        brandLogoStack({ dark: true, id: 'hero', cls: 'hero-wordmark' }) +
        '<h1 class="serif">Ceram Dental</h1>' +
        '<p class="hero-tagline serif">The art of a considered smile.</p>' +
        '<p class="welcome">Specialist dentistry and an in-house ceramics lab. Thoughtful care, from your first conversation to the finishing touches.</p>' +
        '<div class="cta-row">' +
          '<a class="btn btn-gold btn-lg" href="#/contact">Book a consultation</a>' +
          '<a class="btn btn-onphoto btn-lg" href="#/services">Explore treatments</a>' +
        '</div>' +
      '</div>' +
      '<div class="hero-photo">' +
        editorialImage('home-hero', { hero: true }) +
      '</div>' +
    '</section>' +

    '<div class="u">' +

    '<div class="stat-strip reveal">' +
      '<div class="chipstat"><b>In-house</b><span>CAD-CAM ceramics lab</span></div>' +
      '<div class="chipstat"><b>5-point</b><span>restoration quality check</span></div>' +
      '<div class="chipstat"><b>' + DATA.team.length + '</b><span>doctors and specialists</span></div>' +
      '<div class="chipstat"><b>Sat-Thu</b><span>9:00 AM - 7:00 PM</span></div>' +
    '</div>' +

    '<section class="section signature-section reveal">' +
      '<div class="signature-panel">' +
        '<span class="eyebrow-accent">The Ceram Difference</span>' +
        '<h2 class="serif">A boutique patient experience with lab-grade control.</h2>' +
        '<p>Most dental clinics separate the appointment from the restoration. Ceram keeps the planning, smile design, ceramic work and quality control close, so the final result can be adjusted with real clinical context.</p>' +
        '<div class="signature-points">' +
          '<span>Digital smile planning</span><span>On-site milling</span><span>Hand-finished ceramics</span><span>Doctor-led approvals</span>' +
        '</div>' +
      '</div>' +
      '<div class="signature-media">' +
        editorialImage('home-care') +
        editorialImage('home-lounge') +
      '</div>' +
    '</section>' +

    '<section class="section">' +
      '<div class="section-head luxe-head"><div><span class="eyebrow">Comprehensive care tailored to you</span><h2 class="serif">Services we offer</h2></div>' +
        '<a class="btn btn-ghost btn-sm" href="#/services">Explore services →</a></div>' +
      '<div class="services-grid luxe-services">' + SERVICE_GROUPS.map((s, i) =>
        '<a href="#/services" class="svc-card reveal" style="--i:' + i + '">' +
          '<h3>' + esc(s.label) + '</h3><p>' + esc(s.desc) + '</p>' +
          '<ul class="service-category-list">' + s.services.map(key => '<li>' + esc(SVC[key].label) + '</li>').join('') + '</ul>' +
          '<span class="svc-more">Explore services →</span></a>'
      ).join('') + '</div>' +
      '<a class="clinical-services-link" href="#/services">Other Clinical Dental Procedures →</a>' +
    '</section>' +

    '<section class="section experience-band">' +
      '<div class="experience-copy reveal">' +
        '<span class="eyebrow">Your visit</span>' +
        '<h2 class="serif">Precise dentistry should still feel soft.</h2>' +
        '<p>From the first greeting to the final fit, the experience is designed to feel composed: private conversations, digital scans, transparent costs, and enough time for the doctor to explain the why behind each step.</p>' +
      '</div>' +
      '<div class="steps-grid">' +
        step('01', 'Consultation & plan', 'We listen, examine and photograph, then map out the treatment and the cost with you before anything starts.') +
        step('02', 'Digital scan', 'A quick intraoral scan replaces the putty tray and gives the lab an exact model to work from.') +
        step('03', 'Made in our lab', 'Your restoration is designed, milled and layered upstairs — not shipped to a lab you never meet.') +
        step('04', 'Fitted & checked', 'We seat it, check the bite and the margins, and only finish once it looks and feels right.') +
      '</div>' +
    '</section>' +

    '<section class="section">' +
      '<div class="section-head luxe-head"><div><span class="eyebrow">Our doctors</span><h2 class="serif">Meet the clinicians</h2>' +
        '</div>' +
        '<a class="btn btn-ghost btn-sm" href="#/about">Meet the team →</a></div>' +
      '<div class="doctor-tiles">' + DATA.team.map((d, i) => doctorTile(d, i)).join('') + '</div>' +
    '</section>' +

    visitSection() + reviewSection() +

    '<section class="section faq-section reveal">' +
      '<div class="section-head luxe-head"><div><span class="eyebrow">FAQs</span><h2 class="serif">Before you book</h2></div></div>' +
      '<div class="faq-grid">' + faqs.map((f, i) =>
        '<details class="faq-card reveal" style="--i:' + i + '"' + (i === 0 ? ' open' : '') + '><summary>' + esc(f[0]) + '</summary><p>' + esc(f[1]) + '</p></details>'
      ).join('') + '</div>' +
    '</section>' +

    '<section class="section shop-strip reveal">' +
      '<div><span class="eyebrow">Ceram Dental Shop</span><h3>Take-home care &amp; chairside essentials</h3>' +
        '<p>Whitening kits, retainer cases and the products your dentist recommends — ready to collect at your next visit.</p></div>' +
      '<a class="btn btn-ghost" href="#/shop">Visit the shop →</a>' +
    '</section>' +

    '<section class="section cta-banner reveal">' +
      '<span class="eyebrow-accent">Ceram Specialist Dental Center</span>' +
      '<h2 class="serif">Ready for a smile plan that feels considered?</h2>' +
      '<p>Book a consultation and our team will help you find the right treatment — no pressure, just a clear plan.</p>' +
      '<div class="cta-row"><a class="btn btn-white" href="#/contact">Book a consultation</a><a class="btn btn-ghost" href="tel:+97317131123">Call ' + esc(phone) + '</a></div>' +
    '</section>' +

    '</div></div>' + footer()
  );
}
