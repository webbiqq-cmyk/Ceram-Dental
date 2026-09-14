import { DATA, api } from '../state.js';
import { esc, field } from '../utils/format.js';
import { toast } from '../toast.js';
import { effectiveLang } from '../i18n.js';

const CUSTOM_ROLE = '__custom__';

const S = {
  en: {
    apply: 'Apply', applyTo: 'Apply to Ceram', position: 'Position', otherRole: 'General application — other role',
    whichRole: 'Which role are you interested in?', whichRolePh: 'e.g. Dental Assistant, Front Desk…',
    name: 'Full name', nationality: 'Nationality', phone: 'Phone number', email: 'Email',
    note: 'Portfolio / note', notePh: 'Link to a portfolio, or anything you’d like us to know',
    submit: 'Submit application', errRole: 'Please tell us which role you’re interested in.', errPick: 'Please choose a role.',
    success: 'Application submitted — thank you!'
  },
  ar: {
    apply: 'تقديم طلب', applyTo: 'التقديم إلى سيرام', position: 'الوظيفة', otherRole: 'طلب عام — وظيفة أخرى',
    whichRole: 'ما الوظيفة التي تهتم بها؟', whichRolePh: 'مثال: مساعد أسنان، استقبال…',
    name: 'الاسم الكامل', nationality: 'الجنسية', phone: 'رقم الهاتف', email: 'البريد الإلكتروني',
    note: 'ملف الأعمال / ملاحظة', notePh: 'رابط لملف أعمالك، أو أي شيء تود إخبارنا به',
    submit: 'إرسال الطلب', errRole: 'يرجى إخبارنا بالوظيفة التي تهتم بها.', errPick: 'يرجى اختيار وظيفة.',
    success: 'تم إرسال الطلب — شكرًا لك!'
  }
};

function applyModalHtml(jobId) {
  const t = S[effectiveLang()];
  const jobs = DATA.jobs || [];
  const selected = jobs.find(j => j.id === jobId);
  // No specific job passed in (the page-level "Apply now" button, not one
  // tied to a listing) -> default to the custom-role option so applying
  // isn't gated on picking one of the current openings.
  const isCustom = !selected;
  const roleOptions = jobs.map(j =>
    '<option value="' + esc(j.id) + '"' + (j.id === jobId ? ' selected' : '') + '>' + esc(j.title) + '</option>'
  ).join('');
  return (
    '<div class="modal-backdrop" id="applyModal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="applyModalTitle" tabindex="-1">' +
      '<div class="modal-head"><h3 id="applyModalTitle">' + (selected ? t.apply + ' — ' + esc(selected.title) : t.applyTo) + '</h3><button class="drawer-close" data-close-modal aria-label="Close">✕</button></div>' +
      '<form id="applyForm" class="form-grid">' +
        '<div class="field full"><label for="ap-job">' + t.position + '</label><select id="ap-job" required>' +
          '<option value="' + CUSTOM_ROLE + '"' + (isCustom ? ' selected' : '') + '>' + t.otherRole + '</option>' +
          roleOptions +
        '</select></div>' +
        '<div class="field full" id="ap-custom-wrap"' + (isCustom ? '' : ' hidden') + '><label for="ap-custom-role">' + t.whichRole + '</label><input id="ap-custom-role" type="text" placeholder="' + t.whichRolePh + '"' + (isCustom ? ' required' : '') + '></div>' +
        field('full', 'text', 'ap-name', t.name, true) +
        field('full', 'text', 'ap-nationality', t.nationality, true) +
        field('full', 'tel', 'ap-phone', t.phone, true) +
        field('full', 'email', 'ap-email', t.email, true) +
        '<div class="field full"><label for="ap-note">' + t.note + '</label><textarea id="ap-note" placeholder="' + t.notePh + '"></textarea></div>' +
        '<div class="field full"><button class="btn btn-primary btn-block" type="submit">' + t.submit + '</button></div>' +
      '</form>' +
    '</div></div>'
  );
}

export function openApplyModal(jobId) {
  const t = S[effectiveLang()];
  const div = document.createElement('div');
  div.id = 'applyModalHost';
  div.innerHTML = applyModalHtml(jobId);
  document.body.appendChild(div);
  div.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', closeApplyModal));
  document.getElementById('applyModal').addEventListener('click', e => { if (e.target.id === 'applyModal') closeApplyModal(); });
  const jobSelect = document.getElementById('ap-job');
  const customWrap = document.getElementById('ap-custom-wrap');
  const customInput = document.getElementById('ap-custom-role');
  jobSelect.addEventListener('change', () => {
    const custom = jobSelect.value === CUSTOM_ROLE;
    customWrap.hidden = !custom;
    customInput.required = custom;
    if (custom) customInput.focus();
  });
  (jobSelect.value === CUSTOM_ROLE ? customInput : document.getElementById('ap-name')).focus();
  document.getElementById('applyForm').addEventListener('submit', async e => {
    e.preventDefault();
    const val = id => document.getElementById(id).value.trim();
    const custom = jobSelect.value === CUSTOM_ROLE;
    const jobId = custom ? val('ap-custom-role') : val('ap-job');
    if (!jobId) { toast(custom ? t.errRole : t.errPick); return; }
    try {
      await api('/api/careers/apply', { method: 'POST', body: JSON.stringify({
        jobId, name: val('ap-name'), nationality: val('ap-nationality'),
        phone: val('ap-phone'), email: val('ap-email'), note: val('ap-note')
      }) });
      closeApplyModal();
      toast(t.success);
    } catch (err) { toast(err.message); }
  });
}

export function closeApplyModal() {
  const el = document.getElementById('applyModalHost');
  if (el) el.remove();
}
