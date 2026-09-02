import { DATA } from '../state.js';
import { SERVICES } from '../constants.js';
import { doctorCard } from '../components/doctor.js';
import { footer } from '../components/footer.js';

function statTile(n, label) { return '<div class="value-tile reveal"><div class="n">' + n + '</div><span>' + label + '</span></div>'; }

export function renderAbout() {
  const depts = [
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
      '<div class="section-head"><div><span class="eyebrow">Our doctors</span><h2 style="font-size:21px; margin-top:4px;">Meet the team</h2>' +
        '<p class="lede" style="margin-top:8px;">' + DATA.team.length + ' dentists and specialists &mdash; orthodontics, periodontics, endodontics, oral surgery, implants and cosmetic dentistry, all under one roof.</p></div></div>' +
      '<div class="doctor-grid">' + DATA.team.map((d, i) => doctorCard(d, i)).join('') + '</div>' +
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
      '<div class="dept-grid" style="margin-top:18px;">' + depts.map((d, i) =>
        '<div class="dept-card reveal" style="--i:' + i + '"><div class="dept-avatar">' + d.n + '</div><h3>' + d.t + '</h3><p>' + d.d + '</p></div>'
      ).join('') + '</div>' +
    '</div>' +

    '<div class="section space-grid">' +
      '<div class="space-card reveal" style="background-image:url(/images/clinic-reception.jpg); min-height:300px;"><span class="tag">Reception, New Zinj</span></div>' +
      '<div class="space-card reveal" style="background-image:url(/images/clinic-front.jpg); min-height:300px;"><span class="tag">Ceram Dental at night</span></div>' +
    '</div>' +
    '</div></div>' + footer()
  );
}
