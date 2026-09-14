import { DATA } from '../state.js';
import { esc } from '../utils/format.js';
import { effectiveLang } from '../i18n.js';

const S = {
  en: { expertise: 'Expertise &amp; qualifications', more: 'Full profile &rarr;', years: y => y + '+ years’ experience', yrs: y => y + '+ yrs', training: 'Training &amp; credentials', book: 'Book a consultation' },
  ar: { expertise: 'الخبرات والمؤهلات', more: '← الملف الكامل', years: y => 'خبرة ' + y + '+ سنوات', yrs: y => y + '+ سنة', training: 'التدريب والشهادات', book: 'احجز استشارة' }
};

export function doctorAvatar(d) {
  return d.photo
    ? '<div class="doc-photo"><img src="' + esc(d.photo) + '" alt="' + esc(d.name) + '" loading="lazy" decoding="async"></div>'
    : '<div class="doc-photo doc-photo-fallback">' + esc(d.initials || '') + '</div>';
}

export function doctorCard(d, i) {
  const t = S[effectiveLang()];
  const creds = (d.credentials || []).map(c => '<li>' + esc(c) + '</li>').join('');
  return '<button type="button" class="doctor-card reveal" data-doctor="' + esc(d.id) + '" style="--i:' + (i || 0) + '">' +
    doctorAvatar(d) +
    '<div class="doc-body">' +
      '<div class="doc-head"><h3>' + esc(d.name) + '</h3>' + (d.nameAr ? '<span class="doc-ar" dir="rtl">' + esc(d.nameAr) + '</span>' : '') + '</div>' +
      '<span class="doc-role">' + esc(d.role) + '</span>' +
      (d.years ? '<span class="doc-years">' + t.years(d.years) + '</span>' : '') +
      (creds ? '<span class="doc-credentials-label">' + t.expertise + '</span><ul class="doc-creds">' + creds + '</ul>' : '') +
      '<span class="doc-more">' + t.more + '</span>' +
    '</div>' +
  '</button>';
}

export function doctorTile(d, i) {
  const t = S[effectiveLang()];
  return '<button type="button" class="doctor-tile reveal" data-doctor="' + esc(d.id) + '" style="--i:' + (i % 6) + '">' +
    (d.photo
      ? '<span class="dt-photo"><img src="' + esc(d.photo) + '" alt="' + esc(d.name) + '" loading="lazy" decoding="async"></span>'
      : '<span class="dt-photo dt-photo-fallback">' + esc(d.initials || '') + '</span>') +
    '<span class="dt-name">' + esc(d.name) + '</span>' +
    (d.nameAr ? '<span class="dt-ar" dir="rtl">' + esc(d.nameAr) + '</span>' : '') +
    '<span class="dt-role">' + esc(d.role) + '</span>' +
    (d.years ? '<span class="dt-years">' + t.yrs(d.years) + '</span>' : '') +
  '</button>';
}

function doctorModalHtml(d) {
  if (!d) return '';
  const t = S[effectiveLang()];
  const creds = (d.credentials || []).map(c => '<li>' + esc(c) + '</li>').join('');
  return '<div class="modal-backdrop" id="doctorModal"><div class="modal doctor-modal" role="dialog" aria-modal="true" aria-label="' + esc(d.name) + '" tabindex="-1">' +
    '<button class="drawer-close doctor-modal-close" data-close-modal aria-label="Close">✕</button>' +
    '<div class="dm-top">' +
      (d.photo
        ? '<div class="dm-photo"><img src="' + esc(d.photo) + '" alt="' + esc(d.name) + '"></div>'
        : '<div class="dm-photo dt-photo-fallback">' + esc(d.initials || '') + '</div>') +
      '<div>' +
        '<h3>' + esc(d.name) + '</h3>' +
        (d.nameAr ? '<div class="dm-ar" dir="rtl">' + esc(d.nameAr) + '</div>' : '') +
        '<span class="doc-role">' + esc(d.role) + '</span>' +
        (d.years ? '<div class="dm-years">' + t.years(d.years) + '</div>' : '') +
      '</div>' +
    '</div>' +
    (creds ? '<div class="dm-creds"><h4>' + t.training + '</h4><ul>' + creds + '</ul></div>' : '') +
    '<a class="btn btn-primary" href="#/contact" data-close-modal>' + t.book + '</a>' +
  '</div></div>';
}

export function openDoctorModal(id) {
  const d = (DATA.team || []).find(x => x.id === id);
  if (!d) return;
  closeDoctorModal();
  const host = document.createElement('div');
  host.id = 'doctorModalHost';
  host.innerHTML = doctorModalHtml(d);
  document.body.appendChild(host);
  host.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', closeDoctorModal));
  document.getElementById('doctorModal').addEventListener('click', e => { if (e.target.id === 'doctorModal') closeDoctorModal(); });
  host.querySelector('.doctor-modal').focus();
}

export function closeDoctorModal() {
  const el = document.getElementById('doctorModalHost');
  if (el) el.remove();
}
