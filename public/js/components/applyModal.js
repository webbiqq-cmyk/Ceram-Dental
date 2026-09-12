import { DATA, api } from '../state.js';
import { esc, field } from '../utils/format.js';
import { toast } from '../toast.js';

const CUSTOM_ROLE = '__custom__';

function applyModalHtml(jobId) {
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
      '<div class="modal-head"><h3 id="applyModalTitle">Apply' + (selected ? ' — ' + esc(selected.title) : ' to Ceram') + '</h3><button class="drawer-close" data-close-modal aria-label="Close">✕</button></div>' +
      '<form id="applyForm" class="form-grid">' +
        '<div class="field full"><label for="ap-job">Position</label><select id="ap-job" required>' +
          '<option value="' + CUSTOM_ROLE + '"' + (isCustom ? ' selected' : '') + '>General application — other role</option>' +
          roleOptions +
        '</select></div>' +
        '<div class="field full" id="ap-custom-wrap"' + (isCustom ? '' : ' hidden') + '><label for="ap-custom-role">Which role are you interested in?</label><input id="ap-custom-role" type="text" placeholder="e.g. Dental Assistant, Front Desk…"' + (isCustom ? ' required' : '') + '></div>' +
        field('full', 'text', 'ap-name', 'Full name', true) +
        field('full', 'text', 'ap-nationality', 'Nationality', true) +
        field('full', 'tel', 'ap-phone', 'Phone number', true) +
        field('full', 'email', 'ap-email', 'Email', true) +
        '<div class="field full"><label for="ap-note">Portfolio / note</label><textarea id="ap-note" placeholder="Link to a portfolio, or anything you\'d like us to know"></textarea></div>' +
        '<div class="field full"><button class="btn btn-primary btn-block" type="submit">Submit application</button></div>' +
      '</form>' +
    '</div></div>'
  );
}

export function openApplyModal(jobId) {
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
    if (!jobId) { toast(custom ? 'Please tell us which role you\'re interested in.' : 'Please choose a role.'); return; }
    try {
      await api('/api/careers/apply', { method: 'POST', body: JSON.stringify({
        jobId, name: val('ap-name'), nationality: val('ap-nationality'),
        phone: val('ap-phone'), email: val('ap-email'), note: val('ap-note')
      }) });
      closeApplyModal();
      toast('Application submitted — thank you!');
    } catch (err) { toast(err.message); }
  });
}

export function closeApplyModal() {
  const el = document.getElementById('applyModalHost');
  if (el) el.remove();
}
