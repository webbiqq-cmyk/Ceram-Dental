import { DATA } from '../state.js';
import { footer } from '../components/footer.js';
import { openApplyModal } from '../components/applyModal.js';
import { editorialImage } from '../components/editorialImage.js';

export function renderCareers() {
  return (
    '<div class="page"><div class="u">' +
    '<div class="page-head reveal"><span class="eyebrow-accent">Careers</span><h1 class="serif">Build the lab with us.</h1>' +
      '<p class="lede">We\'re hiring across reception, quality control, design and CAD-CAM.</p></div>' +
    editorialImage('careers-studio', { wide: true, cls: 'collection-banner' }) +
    '<div class="careers-intro reveal"><span class="eyebrow">Work with purpose</span><p>Join a close clinical and laboratory team where thoughtful communication, craft and patient trust matter as much as technical skill. Choose a role below to see the short application form.</p><div class="careers-perks"><span>Learning budget</span><span>Modern digital workflows</span><span>Respectful team culture</span></div></div>' +
    '<div class="section careers-list"><div class="section-head"><div><span class="eyebrow">Open positions</span><h2 class="serif">Find your place at Ceram.</h2></div></div>' + DATA.jobs.map((j, i) =>
      '<div class="job-card reveal" style="--i:' + i + '"><div><span class="type">' + j.type + '</span><h3>' + j.title + '</h3><p>' + j.desc + '</p></div>' +
        '<button class="btn btn-primary btn-sm" data-apply="' + j.id + '">Apply</button></div>'
    ).join('') + '</div>' +
    '</div></div>' + footer()
  );
}

export function attachCareersHandlers() {
  document.querySelectorAll('[data-apply]').forEach(b => b.addEventListener('click', () => openApplyModal(b.dataset.apply)));
}
