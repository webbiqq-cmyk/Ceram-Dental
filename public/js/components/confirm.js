// Consequential actions get a dialog that says what will happen, not one
// that asks "are you sure?".
//
// Native confirm() was doing this job in Phase 1. It blocks the main
// thread, cannot be styled, cannot carry the detail that makes the
// decision answerable, and reads as a browser warning rather than as part
// of the product. This is a <dialog>: focus-trapped by the platform,
// Escape-dismissable, and able to say "Send JO-1048 back to Production
// for rework?" with the reason underneath it.
import { esc } from '../utils/format.js';

/**
 * @param title    the decision, phrased as the question being answered.
 * @param body     what happens if they proceed. Required — a confirmation
 *                 without a consequence is just a speed bump.
 * @param detail   optional supporting text (a note, a reason, a count).
 * @param confirmLabel the verb, matching the action ("Send for rework").
 * @param tone     'danger' for anything destructive or hard to undo.
 * @returns Promise<boolean>
 */
export function confirmAction({ title, body, detail, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = '' }) {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.className = 'confirm-dialog';
    dialog.setAttribute('aria-labelledby', 'confirmTitle');
    dialog.innerHTML =
      '<h2 id="confirmTitle">' + esc(title) + '</h2>' +
      '<p>' + esc(body) + '</p>' +
      (detail ? '<div class="confirm-detail">' + esc(detail) + '</div>' : '') +
      '<div class="confirm-actions">' +
        '<button class="btn btn-ghost" value="cancel" autofocus>' + esc(cancelLabel) + '</button>' +
        '<button class="btn ' + (tone === 'danger' ? 'btn-danger-ghost' : 'btn-primary') + '" value="ok">' + esc(confirmLabel) + '</button>' +
      '</div>';
    document.body.append(dialog);

    let answer = false;
    dialog.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      answer = button.value === 'ok';
      dialog.close();
    }));
    // Covers Escape and any other platform dismissal, which must always
    // mean "no" — a cancelled confirmation can never be a yes.
    dialog.addEventListener('close', () => { dialog.remove(); resolve(answer); }, { once: true });
    dialog.showModal();
  });
}
