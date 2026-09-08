import { DATA, api } from '../state.js';
import { esc, field } from '../utils/format.js';
import { toast } from '../toast.js';

function applyModalHtml(jobId) {
  const jobs = DATA.jobs || [];
  const selected = jobs.find(j => j.id === jobId);
  const roleOptions = jobs.map(j =>
    '<option value="' + esc(j.id) + '"' + (j.id === jobId ? ' selected' : '') + '>' + esc(j.title) + '</option>'
  ).join('');
  return (
    '<div class="modal-backdrop" id="applyModal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="applyModalTitle" tabindex="-1">' +
      '<div class="modal-head"><h3 id="applyModalTitle">Apply' + (selected ? ' — ' + esc(selected.title) : ' to Ceram') + '</h3><button class="drawer-close" data-close-modal aria-label="Close">✕</button></div>' +
      '<form id="applyForm" class="form-grid">' +
        '<div class="field full"><label for="ap-job">Position</label><select id="ap-job" required>' +
          '<option value="" disabled' + (selected ? '' : ' selected') + '>Choose a role…</option>' +
          roleOptions +
        '</select></div>' +
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
  (document.getElementById('ap-job').value ? document.getElementById('ap-name') : document.getElementById('ap-job')).focus();
  document.getElementById('applyForm').addEventListener('submit', async e => {
    e.preventDefault();
    const val = id => document.getElementById(id).value.trim();
    if (!val('ap-job')) { toast('Please choose a role.'); return; }
    try {
      await api('/api/careers/apply', { method: 'POST', body: JSON.stringify({
        jobId: val('ap-job'), name: val('ap-name'), nationality: val('ap-nationality'),
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
