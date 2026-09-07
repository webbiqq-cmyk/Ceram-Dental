import { DATA } from '../state.js';
import { esc } from '../utils/format.js';
import { doctorCard } from '../components/doctor.js';
import { footer } from '../components/footer.js';
import { editorialImage } from '../components/editorialImage.js';

export function renderAbout() {
  return '<div class="page page-flush editorial-page about-page">' +
    '<header class="editorial-hero about-hero">' + editorialImage('about-hero', { hero: true }) +
    '<div class="u editorial-hero-copy"><span class="eyebrow">The people behind your care</span><h1 class="serif">Ceram Dental</h1><p>Specialist minds. Thoughtful hands.<br>One shared standard of care.</p><a class="btn btn-white" href="#/contact">Meet us in person &rarr;</a></div></header>' +
    '<div class="u"><section class="editorial-intro reveal"><span class="eyebrow">Our philosophy</span><h2 class="serif">Precision with<br>a personal touch.</h2><p>A dental clinic and ceramics studio under one roof. Our doctors and lab team bring clinical judgement, digital planning and careful finishing to each stage of your care.</p></section>' +
    '<section class="team-section"><div class="team-heading"><div><span class="eyebrow">Meet the clinicians</span><h2 class="serif">Different specialties.<br>A shared commitment.</h2></div><div><p>' + DATA.team.length + ' doctors, with experience spanning cosmetic care, implants, orthodontics and specialist dentistry.</p><label class="doctor-search-label" for="doctorSearch">Find a doctor or specialty</label><input id="doctorSearch" type="search" placeholder="Name, specialty or treatment" autocomplete="off"></div></div>' +
    '<div class="doctor-grid">' + DATA.team.map((d, i) => '<div class="doctor-profile" data-doctor-search="' + esc([d.name, d.nameAr, d.role, ...(d.credentials || [])].join(' ').toLowerCase()) + '">' + doctorCard(d, i) + '</div>').join('') + '</div>' +
    '<p id="doctorNoMatch" class="empty-note" hidden>No doctors match your search.</p></section>' +
    '<section class="about-craft"><figure>' + editorialImage('about-craft') + '</figure><div><span class="eyebrow">The in-house studio</span><h2 class="serif">Where science<br>meets a careful hand.</h2><p>From digital design to ceramic finishing, the lab is part of the conversation. Shape, shade and fit are considered alongside the clinical plan.</p><a class="text-link" href="#/services">Explore our approach &rarr;</a><div class="craft-values"><span>Digital planning</span><span>Careful finishing</span><span>Clinical review</span></div></div></section>' +
    '<section class="editorial-booking"><span class="eyebrow">Get to know us</span><h2 class="serif">Your first visit is the beginning.</h2><a class="btn btn-primary" href="#/contact">Arrange a consultation &rarr;</a></section></div></div>' + footer();
}

export function attachAboutHandlers() {
  const input = document.getElementById('doctorSearch');
  if (!input) return;
  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    let count = 0;
    document.querySelectorAll('[data-doctor-search]').forEach(card => {
      card.hidden = !card.dataset.doctorSearch.includes(query);
      if (!card.hidden) count++;
    });
    document.getElementById('doctorNoMatch').hidden = count > 0;
  });
}
