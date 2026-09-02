import { DATA } from '../state.js';
import { esc } from '../utils/format.js';
import { SERVICES } from '../constants.js';
import { doctorTile } from '../components/doctor.js';
import { footer } from '../components/footer.js';

function step(n, t, d) {
  return '<div class="step reveal"><span class="num">' + n + '</span><h3>' + t + '</h3><p>' + d + '</p></div>';
}

export function renderHome() {
  const st = DATA.settings || {};
  const phone = st.phone || '+973 1713 1123';
  return (
    '<div class="page page-flush">' +
    '<section class="home-hero">' +
      '<div class="hero-copy reveal">' +
        '<span class="hero-loc">Ceram Dental &middot; New Zinj, Manama</span>' +
        '<h1>Your smile, in careful hands.</h1>' +
        '<p class="welcome">Come in for a routine check-up or a full smile makeover — either way you&rsquo;re looked after by doctors who take the time to explain, and a ceramics lab one floor up that shapes your crowns and veneers by hand. No rush, no pressure. Just a clear plan, a comfortable visit, and a result that looks like it was always yours.</p>' +
        '<div class="cta-row">' +
          '<a class="btn btn-primary btn-lg" href="#/contact">Book a consultation</a>' +
          '<a class="btn btn-ghost btn-lg" href="#/about">Learn more about us</a>' +
        '</div>' +
      '</div>' +
      '<div class="hero-photo reveal">' +
        '<img src="/images/clinic-front.jpg" alt="The front of the Ceram Dental clinic at night, New Zinj, Manama" fetchpriority="high" decoding="async">' +
      '</div>' +
    '</section>' +

    '<div class="u">' +

    '<div class="stat-strip reveal">' +
      '<div class="chipstat"><b>In-house</b><span>CAD-CAM ceramics lab</span></div>' +
      '<div class="chipstat"><b>' + SERVICES.length + '</b><span>Dental specialties</span></div>' +
      '<div class="chipstat"><b>Sat&ndash;Thu</b><span>9:00 AM &ndash; 7:00 PM</span></div>' +
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
        '<img src="/images/clinic-care.jpg" alt="A Ceram Dental dentist treating a patient in the clinic" loading="lazy" decoding="async">' +
        '<div class="split-badge"><b>5-point QC</b><span>on every case, before pickup</span></div>' +
      '</div>' +
    '</div>' +

    '<div class="section">' +
      '<div class="section-head"><div><span class="eyebrow">Treatments</span><h2>Services we\'re known for</h2></div>' +
        '<a class="btn btn-ghost btn-sm" href="#/services">All services →</a></div>' +
      '<div class="services-grid">' + SERVICES.map((s, i) =>
        '<a href="#/services" class="svc-card reveal" style="--i:' + i + '">' +
          '<div class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="' + s.icon + '"/></svg></div>' +
          '<h3>' + s.label + '</h3><p>' + s.desc + '</p>' +
          '<span class="svc-more">Learn more →</span></a>'
      ).join('') + '</div>' +
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
      '<div class="section-head"><div><span class="eyebrow">Our doctors</span><h2>Meet the clinicians</h2>' +
        '<p class="lede" style="margin-top:8px;">Tap any doctor to see their training and experience.</p></div>' +
        '<a class="btn btn-ghost btn-sm" href="#/about">Meet the team →</a></div>' +
      '<div class="doctor-tiles">' + DATA.team.map((d, i) => doctorTile(d, i)).join('') + '</div>' +
    '</div>' +

    '<div class="section">' +
      '<div class="section-head"><div><span class="eyebrow">Step inside</span><h2>Visit the clinic</h2></div></div>' +
      '<div class="visit-grid">' +
        '<div class="space-card reveal" style="background-image:url(/images/clinic-front.jpg)"><span class="tag">Ceram Dental, New Zinj</span></div>' +
        '<div class="space-card reveal" style="background-image:url(/images/clinic-reception.jpg)"><span class="tag">Reception</span></div>' +
        '<div class="space-card reveal" style="background-image:url(/images/clinic-lounge.jpg)"><span class="tag">Patient lounge</span></div>' +
        '<div class="space-card reveal" style="background-image:url(/images/clinic-care.jpg)"><span class="tag">In the chair</span></div>' +
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
