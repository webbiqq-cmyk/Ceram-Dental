import { DATA } from '../state.js';
import { footer } from '../components/footer.js';
import { openApplyModal } from '../components/applyModal.js';
import { editorialImage } from '../components/editorialImage.js';
import { effectiveLang } from '../i18n.js';

const S = {
  en: {
    eyebrow: 'Careers', title: 'Build the lab with us.',
    lede: 'We’re hiring across reception, quality control, design and CAD-CAM.',
    applyNow: 'Apply now', openPositions: 'Open positions', findYourPlace: 'Find your place at Ceram.', apply: 'Apply'
  },
  ar: {
    eyebrow: 'وظائف', title: 'ابنِ المختبر معنا.',
    lede: 'نوظّف حاليًا في الاستقبال، ضبط الجودة، التصميم وتقنية CAD-CAM.',
    applyNow: 'قدّم الآن', openPositions: 'الوظائف الشاغرة', findYourPlace: 'جد مكانك في سيرام.', apply: 'تقديم'
  }
};

export function renderCareers() {
  const t = S[effectiveLang()];
  return (
    '<div class="page"><div class="u">' +
    '<div class="page-head reveal"><span class="eyebrow-accent">' + t.eyebrow + '</span><h1 class="serif">' + t.title + '</h1>' +
      '<p class="lede">' + t.lede + '</p></div>' +
    editorialImage('careers-studio', { wide: true, cls: 'collection-banner' }) +
    '<div class="reveal" style="padding:28px 0;border-bottom:1px solid var(--line);text-align:right"><button class="btn btn-primary" data-apply="">' + t.applyNow + '</button></div>' +
    '<div class="section careers-list"><div class="section-head"><div><span class="eyebrow">' + t.openPositions + '</span><h2 class="serif">' + t.findYourPlace + '</h2></div></div>' + DATA.jobs.map((j, i) =>
      '<div class="job-card reveal" style="--i:' + i + '"><div><span class="type">' + j.type + '</span><h3>' + j.title + '</h3><p>' + j.desc + '</p></div>' +
        '<button class="btn btn-primary btn-sm" data-apply="' + j.id + '">' + t.apply + '</button></div>'
    ).join('') + '</div>' +
    '</div></div>' + footer()
  );
}

export function attachCareersHandlers() {
  document.querySelectorAll('[data-apply]').forEach(b => b.addEventListener('click', () => openApplyModal(b.dataset.apply)));
}
