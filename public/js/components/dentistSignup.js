// Public self-service entry point for a new dentist/clinic that wants to
// start sending cases — distinct from the plain "Dentist Portal" link,
// which is for a dentist who already has an account (in-house or
// referring). Submitting here creates a real account via the existing
// /api/auth/dentist/register endpoint (already wired for session issuance
// in auth.controller.js) and drops the person straight into their new
// portal — no separate "wait for an email" step.
import { api, loadState } from '../state.js';
import { field } from '../utils/format.js';
import { toast } from '../toast.js';
import { effectiveLang } from '../i18n.js';

const S = {
  en: {
    title: 'Sign up to send cases',
    intro: 'Create a free account to submit cases, track their status and see invoices — whether you work at Ceram or refer cases from your own practice.',
    kind: 'I am', inHouse: 'An in-house Ceram dentist', outside: 'An outside dentist / clinic sending cases',
    clinicName: 'Clinic / practice name', clinicPh: 'e.g. Smile Studio Clinic',
    name: 'Full name', email: 'Email', phone: 'Phone', username: 'Choose a username',
    password: 'Choose a password', passwordPh: 'At least 10 characters',
    submit: 'Create account &amp; open my portal',
    errClinic: 'Please tell us your clinic or practice name.', success: 'Account created — welcome to your Dentist Portal.'
  },
  ar: {
    title: 'سجّل لإرسال الحالات',
    intro: 'أنشئ حسابًا مجانيًا لإرسال الحالات ومتابعة حالتها والاطلاع على الفواتير — سواء كنت تعمل في سيرام أو تحوّل حالات من عيادتك الخاصة.',
    kind: 'أنا', inHouse: 'طبيب أسنان في سيرام', outside: 'طبيب / عيادة خارجية أرسل حالات',
    clinicName: 'اسم العيادة / المنشأة', clinicPh: 'مثال: عيادة سمايل ستوديو',
    name: 'الاسم الكامل', email: 'البريد الإلكتروني', phone: 'الهاتف', username: 'اختر اسم مستخدم',
    password: 'اختر كلمة مرور', passwordPh: '10 أحرف على الأقل',
    submit: 'إنشاء الحساب وفتح بوابتي',
    errClinic: 'يرجى إخبارنا باسم عيادتك أو منشأتك.', success: 'تم إنشاء الحساب — مرحبًا بك في بوابة الأطباء.'
  }
};

function dentistSignupHtml() {
  const t = S[effectiveLang()];
  return (
    '<div class="modal-backdrop" id="dentistSignupModal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="dentistSignupTitle" tabindex="-1">' +
      '<div class="modal-head"><h3 id="dentistSignupTitle">' + t.title + '</h3><button class="drawer-close" data-close-modal aria-label="Close">✕</button></div>' +
      '<p class="lede" style="margin:-6px 0 18px;font-size:13px;">' + t.intro + '</p>' +
      '<form id="dentistSignupForm" class="form-grid">' +
        '<div class="field full"><label for="ds-kind">' + t.kind + '</label><select id="ds-kind" required>' +
          '<option value="individual">' + t.inHouse + '</option>' +
          '<option value="clinic">' + t.outside + '</option>' +
        '</select></div>' +
        '<div class="field full" id="ds-company-wrap" hidden><label for="ds-company">' + t.clinicName + '</label><input id="ds-company" placeholder="' + t.clinicPh + '"></div>' +
        field('full', 'text', 'ds-name', t.name, true) +
        field('', 'email', 'ds-email', t.email, true) +
        field('', 'tel', 'ds-phone', t.phone, true) +
        field('', 'text', 'ds-username', t.username, true) +
        '<div class="field full"><label for="ds-password">' + t.password + '</label><input id="ds-password" type="password" autocomplete="new-password" minlength="10" placeholder="' + t.passwordPh + '" required></div>' +
        '<div class="field full"><button class="btn btn-primary btn-block" type="submit">' + t.submit + '</button></div>' +
      '</form>' +
    '</div></div>'
  );
}

export function openDentistSignupModal() {
  const t = S[effectiveLang()];
  const div = document.createElement('div');
  div.id = 'dentistSignupHost';
  div.innerHTML = dentistSignupHtml();
  document.body.appendChild(div);
  div.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', closeDentistSignupModal));
  document.getElementById('dentistSignupModal').addEventListener('click', e => { if (e.target.id === 'dentistSignupModal') closeDentistSignupModal(); });

  const kindSelect = document.getElementById('ds-kind');
  const companyWrap = document.getElementById('ds-company-wrap');
  const companyInput = document.getElementById('ds-company');
  kindSelect.addEventListener('change', () => {
    const isClinic = kindSelect.value === 'clinic';
    companyWrap.hidden = !isClinic;
    companyInput.required = isClinic;
    if (isClinic) companyInput.focus();
  });
  document.getElementById('ds-name').focus();

  document.getElementById('dentistSignupForm').addEventListener('submit', async e => {
    e.preventDefault();
    const val = id => document.getElementById(id).value.trim();
    const accountType = kindSelect.value;
    if (accountType === 'clinic' && !val('ds-company')) { toast(t.errClinic); return; }
    try {
      await api('/api/auth/dentist/register', { method: 'POST', body: JSON.stringify({
        name: val('ds-name'), email: val('ds-email'), phone: val('ds-phone'),
        username: val('ds-username'), password: document.getElementById('ds-password').value,
        accountType, company: accountType === 'clinic' ? val('ds-company') : 'In-house'
      }) });
      closeDentistSignupModal();
      await loadState();
      location.hash = '#/portal';
      toast(t.success);
    } catch (err) { toast(err.message); }
  });
}

export function closeDentistSignupModal() {
  const el = document.getElementById('dentistSignupHost');
  if (el) el.remove();
}
