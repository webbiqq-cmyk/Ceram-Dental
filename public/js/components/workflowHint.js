// TEMPORARY onboarding aid — a small sticky-note that explains the flow for
// whichever workspace you're on. Self-contained: this file, its CSS block in
// workspace.css (".wf-hint"), and the one call from router.js. Delete those
// three and it's gone. It parks bottom-right (empty on workspace routes —
// the WhatsApp FAB is hidden there) so it never covers an action.

const HINTS = {
  portal: ['Start a case with + New case — pick the job type and fill the details.',
    'Track every case here as reception, design, production and QC move it along.',
    'For veneers: open the case, review the demo/design, then Approve. Approval is final — changes need a new job order.'],
  studio: ['This is the whole board. Open any station card to work its queue.',
    'Flow: Reception → Design → Production → QC → Packing → Collection.',
    'Veneers add a demo/design + doctor approval before production; every other job is one pass.'],
  reception: ['Check payment status and case details on each incoming order.',
    'Accept and assign a designer — or send straight to a technician if no design is needed.',
    'After QC, use the Pickup / delivery tab to hand the case over, then mark it complete.'],
  designer: ['Open a case to see the doctor’s files, notes and a direct chat.',
    'For veneers, submit the demo/design for the doctor to approve.',
    'Once approved (or for one-step jobs) hand off to a technician.'],
  technician: ['Open your assigned case to see requirements, files and notes.',
    'Tick each production step as you finish it.',
    'When every step is done, choose a QC reviewer and hand off.'],
  qc: ['Open a case that production has handed over.',
    'Record your findings and attach photos/scans where required.',
    'Complete the checklist and confirm packing, then approve to reception — or reject back to the technician.'],
  'new-order': ['Step 1 — pick the job type. Step 2 — case details. Step 3 — review and send to reception.',
    'Veneers run demo → approval → production. Everything else completes in one pass, no doctor approval.'],
  admin: ['Every internal record lives here — use the left nav.',
    'Enquiries and appointments come from the public site; billing, expenses and products are managed here.',
    'Case Tracking shows lab job orders; Accounts & Access manages every login.']
};

const key = route => 'ceram_hint_dismissed_' + route;
function isDismissed(route) { try { return localStorage.getItem(key(route)) === '1'; } catch { return false; } }
function setDismissed(route, v) { try { v ? localStorage.setItem(key(route), '1') : localStorage.removeItem(key(route)); } catch {} }

export function removeWorkflowHint() { document.getElementById('wfHint')?.remove(); }

export function showWorkflowHint(route) {
  removeWorkflowHint();
  const steps = HINTS[route];
  if (!steps) return;
  const host = document.createElement('div');
  host.id = 'wfHint';
  render(host, route, steps, isDismissed(route));
  document.body.appendChild(host);
}

function render(host, route, steps, collapsed) {
  if (collapsed) {
    host.className = 'wf-hint wf-hint-mini';
    host.innerHTML = '<button type="button" aria-label="Show workflow tips">?</button>';
    host.querySelector('button').addEventListener('click', () => { setDismissed(route, false); render(host, route, steps, false); });
    return;
  }
  host.className = 'wf-hint';
  host.innerHTML = '<div class="wf-hint-head"><span>Workflow guide</span>' +
    '<button type="button" class="wf-hint-x" aria-label="Dismiss">&times;</button></div>' +
    '<ol>' + steps.map(s => '<li>' + s + '</li>').join('') + '</ol>' +
    '<p class="wf-hint-foot">Temporary help while the team learns the flow.</p>';
  host.querySelector('.wf-hint-x').addEventListener('click', () => { setDismissed(route, true); render(host, route, steps, true); });
}
