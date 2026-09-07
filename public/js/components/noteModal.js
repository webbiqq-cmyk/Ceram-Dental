// Shared "action + note" modal — reception's reject, the doctor's request-
// changes, QC's reject, the designer's modification note. One clean,
// consistent surface instead of a native prompt() (which the platform
// can't theme, and reads as an unfinished corner of an otherwise premium
// screen) or four near-identical bespoke modals.
import { esc } from '../utils/format.js';

function html({ title, label, confirmLabel, danger }) {
  return (
    '<div class="modal-backdrop" id="noteModal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="noteModalTitle" tabindex="-1" style="max-width:440px;">' +
      '<div class="modal-head"><h3 id="noteModalTitle">' + esc(title) + '</h3><button class="drawer-close" data-close-note-modal aria-label="Close">✕</button></div>' +
      '<form id="noteModalForm">' +
        '<div class="field full"><label>' + esc(label) + '</label><textarea id="noteModalText" required placeholder="Be specific — this note goes straight to them."></textarea></div>' +
        '<div class="field full" style="margin-top:14px;"><button class="btn ' + (danger ? 'btn-danger-ghost' : 'btn-primary') + ' btn-block" type="submit">' + esc(confirmLabel) + '</button></div>' +
      '</form>' +
    '</div></div>'
  );
}

// onSubmit(note) — called with the trimmed note text; the modal closes
// itself right after, whether onSubmit is sync or returns a promise.
export function openNoteModal(opts, onSubmit) {
  const div = document.createElement('div');
  div.id = 'noteModalHost';
  div.innerHTML = html(opts);
  document.body.appendChild(div);
  div.querySelectorAll('[data-close-note-modal]').forEach(b => b.addEventListener('click', closeNoteModal));
  document.getElementById('noteModal').addEventListener('click', e => { if (e.target.id === 'noteModal') closeNoteModal(); });
  const textEl = document.getElementById('noteModalText');
  textEl.focus();
  document.getElementById('noteModalForm').addEventListener('submit', async e => {
    e.preventDefault();
    const note = textEl.value.trim();
    if (!note) return;
    closeNoteModal();
    await onSubmit(note);
  });
}

export function closeNoteModal() {
  const el = document.getElementById('noteModalHost');
  if (el) el.remove();
}
