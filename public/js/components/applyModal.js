import { DATA, api } from '../state.js';
import { esc, field } from '../utils/format.js';
import { toast } from '../toast.js';

function applyModalHtml(jobId) {
  const job = DATA.jobs.find(j => j.id === jobId);
  return (
    '<div class="modal-backdrop" id="applyModal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="applyModalTitle" tabindex="-1">' +
      '<div class="modal-head"><h3 id="applyModalTitle">Apply — ' + esc(job ? job.title : '') + '</h3><button class="drawer-close" data-close-modal aria-label="Close">✕</button></div>' +
      '<form id="applyForm" class="form-grid">' +
        '<input type="hidden" id="ap-job" value="' + jobId + '">' +
        field('full', 'text', 'ap-name', 'Full name', true) +
        field('full', 'email', 'ap-email', 'Email', true) +
        field('full', 'text', 'ap-phone', 'Phone', false) +
        '<div class="field full"><label>Portfolio / note</label><textarea id="ap-note" placeholder="Link to portfolio, or anything you\'d like us to know"></textarea></div>' +
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
  document.getElementById('ap-name').focus();
  document.getElementById('applyForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api('/api/careers/apply', { method: 'POST', body: JSON.stringify({ jobId: document.getElementById('ap-job').value, name: document.getElementById('ap-name').value, email: document.getElementById('ap-email').value, phone: document.getElementById('ap-phone').value, note: document.getElementById('ap-note').value }) });
      closeApplyModal();
      toast('Application submitted — thank you!');
    } catch (err) { toast(err.message); }
  });
}

export function closeApplyModal() {
  const el = document.getElementById('applyModalHost');
  if (el) el.remove();
}
