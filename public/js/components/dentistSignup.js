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

function dentistSignupHtml() {
  return (
    '<div class="modal-backdrop" id="dentistSignupModal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="dentistSignupTitle" tabindex="-1">' +
      '<div class="modal-head"><h3 id="dentistSignupTitle">Sign up to send cases</h3><button class="drawer-close" data-close-modal aria-label="Close">✕</button></div>' +
      '<p class="lede" style="margin:-6px 0 18px;font-size:13px;">Create a free account to submit cases, track their status and see invoices — whether you work at Ceram or refer cases from your own practice.</p>' +
      '<form id="dentistSignupForm" class="form-grid">' +
        '<div class="field full"><label for="ds-kind">I am</label><select id="ds-kind" required>' +
          '<option value="individual">An in-house Ceram dentist</option>' +
          '<option value="clinic">An outside dentist / clinic sending cases</option>' +
        '</select></div>' +
        '<div class="field full" id="ds-company-wrap" hidden><label for="ds-company">Clinic / practice name</label><input id="ds-company" placeholder="e.g. Smile Studio Clinic"></div>' +
        field('full', 'text', 'ds-name', 'Full name', true) +
        field('', 'email', 'ds-email', 'Email', true) +
        field('', 'tel', 'ds-phone', 'Phone', true) +
        field('', 'text', 'ds-username', 'Choose a username', true) +
        '<div class="field full"><label for="ds-password">Choose a password</label><input id="ds-password" type="password" autocomplete="new-password" minlength="10" placeholder="At least 10 characters" required></div>' +
        '<div class="field full"><button class="btn btn-primary btn-block" type="submit">Create account &amp; open my portal</button></div>' +
      '</form>' +
    '</div></div>'
  );
}

export function openDentistSignupModal() {
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
    if (accountType === 'clinic' && !val('ds-company')) { toast('Please tell us your clinic or practice name.'); return; }
    try {
      await api('/api/auth/dentist/register', { method: 'POST', body: JSON.stringify({
        name: val('ds-name'), email: val('ds-email'), phone: val('ds-phone'),
        username: val('ds-username'), password: document.getElementById('ds-password').value,
        accountType, company: accountType === 'clinic' ? val('ds-company') : 'In-house'
      }) });
      closeDentistSignupModal();
      await loadState();
      location.hash = '#/portal';
      toast('Account created — welcome to your Dentist Portal.');
    } catch (err) { toast(err.message); }
  });
}

export function closeDentistSignupModal() {
  const el = document.getElementById('dentistSignupHost');
  if (el) el.remove();
}
