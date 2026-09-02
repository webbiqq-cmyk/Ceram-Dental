import { DATA } from '../state.js';
import { footer } from '../components/footer.js';
import { openApplyModal } from '../components/applyModal.js';

export function renderCareers() {
  return (
    '<div class="page"><div class="u">' +
    '<div class="page-head reveal"><span class="eyebrow-accent">Careers</span><h1>Build the lab with us.</h1>' +
      '<p class="lede">We\'re hiring across reception, quality control, design and CAD-CAM.</p></div>' +
    '<div class="section">' + DATA.jobs.map((j, i) =>
      '<div class="job-card reveal" style="--i:' + i + '"><div><span class="type">' + j.type + '</span><h3>' + j.title + '</h3><p>' + j.desc + '</p></div>' +
        '<button class="btn btn-primary btn-sm" data-apply="' + j.id + '">Apply</button></div>'
    ).join('') + '</div>' +
    '</div></div>' + footer()
  );
}

export function attachCareersHandlers() {
  document.querySelectorAll('[data-apply]').forEach(b => b.addEventListener('click', () => openApplyModal(b.dataset.apply)));
}
