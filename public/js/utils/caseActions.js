// Mirrors src/models/case.model.js's actOnCase() exactly, so the UI can
// show the result of a lab/dentist action immediately instead of waiting
// on a full round trip — see drawer.js's handleCaseAction(). A lab tech
// moving several cases through the pipeline shouldn't feel a network
// delay on every single click.
//
// Returns a new case object and never mutates the one passed in, so the
// caller can hold onto the original and roll back cleanly if the request
// then fails — the server's own actOnCase() stays the single source of
// truth; this only predicts its result for the moment before the real
// response arrives.
import { STAGES } from '../constants.js';

const STAGE_KEYS = STAGES.map(s => s.key);

export function predictCaseAfterAction(c, act) {
  const idx = STAGE_KEYS.indexOf(c.stage);
  const next = Object.assign({}, c, { history: c.history.slice() });
  const push = (stage, note) => next.history.push({ stage, at: new Date().toISOString(), note, pending: true });

  if (act === 'advance') {
    const stage = STAGE_KEYS[Math.min(idx + 1, STAGE_KEYS.length - 1)];
    next.stage = stage; push(stage);
  } else if (act === 'qc-accept') {
    next.stage = 'designer'; push('designer', 'QC accepted');
  } else if (act === 'qc-reject') {
    next.stage = 'reception'; push('reception', 'Returned by QC — incomplete protocol items');
  } else if (act === 'approve') {
    next.stage = 'cadcam'; push('cadcam', 'Mockup approved by doctor');
  } else if (act === 'reject') {
    next.revisions = c.revisions + 1; next.stage = 'designer';
    push('designer', next.revisions > 1 ? 'Modification requested — additional charges apply' : 'Modification requested');
  } else if (act === 'pickup') {
    next.pickedUp = true;
  } else {
    return null; // unknown action — let the server reject it as it already does
  }
  return next;
}
