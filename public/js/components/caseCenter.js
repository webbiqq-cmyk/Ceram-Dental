// The Case Command Center — one screen per case, for every role.
//
// Before this, working a case meant one of five places: reception's card
// had the accept controls, the designer page had its own inline panel, the
// technician page had another, QC a third, and the dentist a fourth. Each
// re-implemented the same header, the same file list, the same chat, and
// each disagreed slightly about what the case's state meant.
//
// Now there is one case screen. The station pages are queues that open it.
// Which sections appear, and which actions are offered, follow from the
// viewer's role and the case's own derived state (order.view — see
// src/services/caseView.js); nothing about "what should this role see" is
// decided twice.
//
// Role visibility here is presentation, not security: the server already
// withholds internal notes and QC findings from a dentist at the query
// layer. This file must never be the only thing standing between a clinic
// and a lab-internal note.
import { esc, fmtDateTime, fmtDate } from '../utils/format.js';
import { PrescriptionDetails } from './prescriptionDetails.js';
import { ensureSchema, loadedSchema } from '../utils/prescriptionSchema.js';
import {
  getOrder, listFiles, listMessages, postMessage, doctorDecision, receptionReview,
  designDone, productionDone, qcDecision, confirmCompletion, markDelivered, markCompleted,
  setScheduling, blockCase, resumeCase, listStaff, labOverview, duplicateCase
} from '../utils/ordersApi.js';
import { jobTypeLabel, STATUS_META } from '../utils/workflow.js';
import { journeyHtml, nextActionHtml, ownerHtml, priorityBadge, dueBadge, flagChips } from '../utils/caseView.js';
import { uploadZoneHtml, attachUploadZone } from './caseUpload.js';
import { emptyState } from './emptyState.js';
import { confirmAction } from './confirm.js';
import { toast } from '../toast.js';
import { UI } from '../state.js';
import { renderCurrent } from '../router.js';

const LAB_ROLES = ['receptionist', 'designer', 'technician', 'qc', 'lab', 'admin'];

// Who may actually perform each action, mirrored exactly from
// src/routes/orders.routes.js. Offering a control the server will refuse
// is worse than not offering it: the person does the work of deciding,
// clicks, and gets a permission error for their trouble.
//
// Note where admin is and isn't. An administrator oversees the board and
// may set priority and target dates, but does not stand in for a station:
// they cannot accept intake, hand off a design, pass QC or close a case
// out. That is the server's rule, and this file follows it rather than
// having its own opinion. The lab manager ('lab') is the role that does
// cover every station.
const CAN = {
  intake: ['receptionist', 'lab'],
  handover: ['receptionist', 'lab'],
  design: ['designer', 'lab'],
  production: ['technician', 'lab'],
  block: ['technician', 'lab'],
  resume: ['technician', 'lab', 'receptionist'],
  qc: ['qc', 'lab'],
  scheduling: ['receptionist', 'lab', 'admin']
};
const can = (action, role) => CAN[action].includes(role);
// Roles that get a station's *tab* — everyone who oversees the lab can
// read Production or Quality check; only the roles above can act there.
const SEES = { design: ['designer', 'lab', 'admin'], production: ['technician', 'lab', 'admin'], qc: ['qc', 'lab', 'admin'], intake: ['receptionist', 'lab', 'admin'] };
const sees = (area, role) => SEES[area].includes(role);

// What a technician actually does depends on the job — a night guard is
// printed and cleaned, a crown is milled and glazed. This is a checklist
// to work through before "production done", not tracked state: the
// backend models one in_production → production_done transition, and
// inventing a production_steps table to store tick boxes would be a
// schema built for a UI rather than for the work.
const PRODUCTION_STEPS = {
  veneers: ['Model', 'Milling', 'Layering', 'Glazing', 'Fitting check'],
  crowns: ['Model', 'Milling', 'Glazing', 'Fitting check'],
  bridges: ['Model', 'Milling', 'Layering', 'Glazing', 'Fitting check'],
  implant_crown: ['Model', 'Milling', 'Abutment fit', 'Glazing', 'Fitting check'],
  implant_bridge: ['Model', 'Milling', 'Abutment fit', 'Layering', 'Fitting check'],
  night_guard: ['Model', 'Printing', 'Cleaning', 'Fitting check'],
  bleaching_tray: ['Model', 'Printing', 'Cleaning'],
  essix_retainer: ['Model', 'Printing', 'Trimming', 'Cleaning'],
  surgical_guide: ['Model', 'Printing', 'Cleaning', 'Fitting check'],
  ortho_work: ['Model', 'Printing', 'Cleaning', 'Fitting check'],
  trays: ['Model', 'Fabrication', 'Cleaning'],
  functional_mockup: ['Model', 'Milling', 'Fitting check'],
  other: ['Model', 'Fabrication', 'Fitting check']
};
// Deliberately general. A checklist that asserts clinical requirements the
// lab hasn't agreed to is worse than no checklist, so each line is
// phrased to be skippable-by-meaning ("where applicable") rather than
// pretending every restoration has contacts and occlusion to check.
const QC_CHECKS = [
  'Correct case, restoration and material',
  'Shade matches the prescription',
  'Margins and fit checked where applicable',
  'Contacts and occlusion checked where applicable',
  'Surface finish — no cracks, chips or defects',
  'Doctor instructions satisfied',
  'Cleaned and complete'
];

const BLOCK_REASONS = [
  ['design_issue', 'Design issue'], ['scan_issue', 'Scan issue'], ['material', 'Material unavailable'],
  ['equipment', 'Equipment issue'], ['clarification', 'Dentist clarification needed'], ['other', 'Other']
];
const RETURN_REASONS = [
  ['missing_information', 'Missing information'], ['payment_issue', 'Payment issue'],
  ['file_issue', 'Incorrect or unusable scan/file'], ['clarification', 'Treatment clarification'], ['other', 'Other']
];

// Draft checklist ticks, held per case for the life of the page. Not
// persisted: they are a person's working memory while they do the job,
// and what actually gets recorded is the outcome they submit.
const drafts = { production: {}, qc: {}, findings: {} };
function draft(kind, id) { return (drafts[kind][id] = drafts[kind][id] || {}); }

function stepsFor(order) { return PRODUCTION_STEPS[order.job_type] || PRODUCTION_STEPS.other; }
function isVeneerDemo(o) { return o.job_type === 'veneers' && o.stage_type === 'demo'; }
function isLocked(o) { return o.job_type === 'veneers' && o.stage_type === 'final'; }

// What reception is missing before this case can safely enter the lab.
// Named, not counted: "Incomplete" tells a receptionist nothing they can
// act on, and it is the clinic who has to supply the answer.
function missingItems(order, files) {
  const missing = [];
  if (!order.patient_ref) missing.push('Patient / case reference');
  if (!order.shade && !['surgical_guide', 'trays', 'other'].includes(order.job_type)) missing.push('Shade selection');
  if (!order.instructions) missing.push('Prescription / instructions');
  if (order.job_type === 'implant_crown' || order.job_type === 'implant_bridge') {
    if (!order.scan_body) missing.push('Scan body');
    if (!order.implant_system) missing.push('Implant system');
    if (!order.abutment_size) missing.push('Abutment size');
  }
  if (!files.some(f => ['scan', 'photo', 'instruction'].includes(f.category))) missing.push('Scan, photograph or instruction file');
  return missing;
}

// Design uploads are already append-only in the database (case_files is
// never updated in place), so versions are a reading of history rather
// than a new table: the nth design file of a stage is version n, and the
// newest is current. Nothing is overwritten and nothing is lost.
function designVersions(files) {
  return files
    .filter(f => f.category === 'design_file')
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((file, index) => Object.assign({}, file, { version: index + 1 }))
    .reverse();
}

function fact(label, value) {
  return '<div><dt>' + esc(label) + '</dt><dd>' + esc(value || 'Not specified') + '</dd></div>';
}

function filesHtml(files, { emptyText } = {}) {
  if (!files.length) return emptyState({ iconName: 'inbox', title: 'No files yet', text: emptyText || 'Files attached to this case will appear here.' });
  return '<div class="case-file-gallery">' + files.map(f => {
    const label = (f.category || 'file').replace(/_/g, ' ') + ' · ' + (f.stage_type || '');
    return '<article class="case-file-card">' + (f.preview_url ?
      '<button type="button" class="case-image-button" data-preview-file="' + esc(f.id) + '" aria-label="View ' + esc(label) + '"><img src="' + esc(f.preview_url) + '" alt="' + esc(label) + '" loading="lazy" referrerpolicy="no-referrer"><span>View image</span></button>' : '') +
      '<p>' + esc(label) + '</p><small>' + fmtDateTime(f.created_at) + '</small>' +
      (f.url ? '<a class="workspace-file" target="_blank" rel="noopener noreferrer" href="' + esc(f.url) + '">Download ↗</a>' : '<p class="case-muted">File unavailable.</p>') + '</article>';
  }).join('') + '</div>';
}

function messagesHtml(messages, myRole) {
  const visible = messages.filter(m => !m.internal);
  if (!visible.length) return '<div class="chat-empty">No messages yet. Anything asked here stays attached to this case.</div>';
  return visible.map(m => '<div class="chat-msg' + (m.sender_role === myRole ? ' mine' : '') + '">' +
    '<div class="chat-bubble">' + esc(m.body) + '</div>' +
    '<div class="chat-meta">' + esc(m.sender_name || 'Lab') + ' · ' + fmtDateTime(m.created_at) + '</div></div>').join('');
}

function notesHtml(messages) {
  const notes = messages.filter(m => m.internal);
  if (!notes.length) return '<div class="chat-empty">No internal notes on this case.</div>';
  return notes.map(m => '<div class="chat-msg is-internal">' +
    '<div class="chat-bubble">' + esc(m.body) + '</div>' +
    '<div class="chat-meta">' + esc(m.sender_name || 'Staff') + ' · ' + esc(m.sender_role || '') + ' · ' + fmtDateTime(m.created_at) + '</div></div>').join('');
}

function timelineHtml(history) {
  if (!history.length) return '<p class="case-muted">Nothing recorded yet.</p>';
  return '<ol class="workspace-timeline">' + history.slice().reverse().map(h =>
    '<li><strong>' + esc((STATUS_META[h.status] || {}).label || String(h.status).replace(/_/g, ' ')) + '</strong>' +
      '<time>' + fmtDateTime(h.created_at) + '</time>' +
      (h.note ? '<p>' + esc(h.note) + '</p>' : '') +
      (h.actor_name ? '<small>' + esc(h.actor_name) + '</small>' : '') + '</li>').join('') + '</ol>';
}

// QC's own record, attempt by attempt. Previous attempts are never erased
// — a case that failed twice before passing says so permanently, which is
// the whole point of keeping QC decisions in their own table.
function qcHistoryHtml(approvals) {
  const rows = approvals.filter(a => a.decision_type === 'qc_review');
  if (!rows.length) return '<p class="case-muted">No inspection recorded yet.</p>';
  return '<ol class="qc-history">' + rows.map((a, i) =>
    '<li class="qc-history-item is-' + (a.outcome === 'approved' ? 'pass' : 'fail') + '">' +
      '<span class="qc-history-mark">QC #' + (i + 1) + '</span>' +
      '<div><strong>' + (a.outcome === 'approved' ? 'Passed' : 'Sent for rework') + '</strong>' +
      '<time>' + fmtDateTime(a.created_at) + '</time>' +
      (a.note ? '<p>' + esc(a.note) + '</p>' : '') +
      (a.decided_by_name ? '<small>' + esc(a.decided_by_name) + '</small>' : '') + '</div></li>').join('') + '</ol>';
}

function checklistHtml(items, state, key) {
  return '<div class="qc-checklist">' + items.map(item =>
    '<button type="button" class="qc-item' + (state[item] ? ' checked' : '') + '" aria-pressed="' + !!state[item] + '" data-check="' + key + '" data-check-item="' + esc(item) + '">' +
      '<span class="qc-chk" aria-hidden="true">' + (state[item] ? '✓' : '') + '</span><span class="lbl">' + esc(item) + '</span></button>').join('') + '</div>';
}

function selectHtml(id, label, options, placeholder) {
  return '<label class="case-field"><span>' + esc(label) + '</span><select id="' + id + '">' +
    '<option value="">' + esc(placeholder) + '</option>' +
    options.map(o => '<option value="' + esc(o.id) + '">' + esc(o.name) + '</option>').join('') + '</select></label>';
}

// ---------------------------------------------------------------- tabs

function tabsFor(role, order) {
  const lab = LAB_ROLES.includes(role);
  const tabs = [['overview', 'Overview'], ['prescription', 'Prescription'], ['files', 'Files']];
  if (sees('intake', role) && order.status === 'pending_reception_review') tabs.push(['intake', 'Intake review']);
  if (sees('design', role)) tabs.push(['design', 'Design']);
  else if (designVersionsCount > 0) tabs.push(['design', 'Design']);
  if (sees('production', role)) tabs.push(['production', 'Production']);
  if (sees('qc', role)) tabs.push(['qc', 'Quality check']);
  tabs.push(['messages', role === 'dentist' ? 'Lab messages' : 'Doctor messages']);
  if (lab) tabs.push(['notes', 'Internal notes']);
  tabs.push(['timeline', 'Timeline']);
  return tabs;
}
// Set per render so a dentist still gets a Design tab when there is
// actually a design to look at, and no empty tab when there isn't.
let designVersionsCount = 0;

// ------------------------------------------------------------- sections

function overviewSection(order, files, role, staff) {
  const v = order.view || {};
  const missing = sees('intake', role) && order.status === 'pending_reception_review' ? missingItems(order, files) : [];
  return (order.status === 'blocked' && order.blocked_reason ?
    '<div class="case-alert case-alert-danger"><strong>Production blocked</strong><p>' + esc(order.blocked_reason) + '</p>' +
      (order.blocked_at ? '<small>Blocked ' + fmtDateTime(order.blocked_at) + '</small>' : '') + '</div>' : '') +
    (order.rejection_note && order.status !== 'blocked' ?
      '<div class="case-alert case-alert-warning"><strong>' + (order.status === 'rejected_by_reception' ? 'Returned to the clinic' : 'Latest note') + '</strong><p>' + esc(order.rejection_note) + '</p></div>' : '') +
    (isLocked(order) ? '<div class="case-alert case-alert-info"><strong>Approved design locked.</strong><p>Changes require a new job order. Production and delivery continue on this case.</p></div>' : '') +
    (missing.length ? '<div class="case-alert case-alert-warning"><strong>' + missing.length + ' item' + (missing.length === 1 ? '' : 's') + ' missing</strong><ul>' +
      missing.map(m => '<li>' + esc(m) + '</li>').join('') + '</ul></div>' : '') +
    '<div class="case-overview-grid">' + ownerHtml(v) +
      '<dl class="workspace-facts">' +
        fact('Patient reference', order.patient_ref) +
        fact('Treatment', jobTypeLabel(order.job_type) + (order.job_type === 'veneers' ? ' · ' + (order.stage_type === 'demo' ? 'Demo stage' : 'Final stage') : '')) +
        fact('Shade', order.shade) +
        fact('Collection', order.delivery_method === 'delivery' ? 'Delivery to clinic' : 'In-house pickup') +
        (role !== 'dentist' ? fact('Dentist', order.dentist_name) : '') +
        fact('Target completion', order.target_date ? fmtDate(order.target_date + 'T00:00:00Z') : 'None set') +
        fact('Last updated', fmtDateTime(order.updated_at || order.created_at)) +
      '</dl>' +
    '</div>' +
    (order.instructions ? '<section class="case-sec"><h3>Doctor instructions</h3><p class="case-prose">' + esc(order.instructions) + '</p></section>' : '') +
    (can('scheduling', role) && !(order.view || {}).is_closed ? schedulingSection(order) : '') +
    (role === 'dentist' ? dentistApprovalSection(order) : '') +
    // The two dead ends a clinic can hit: a design that's now locked, and
    // a case reception sent back. Both need the same escape hatch — start
    // a fresh order pre-filled from this one, reviewed before it's sent.
    (role === 'dentist' ?
      '<section class="case-sec"><h3>' +
        (isLocked(order) ? 'Need a different result?' : order.status === 'rejected_by_reception' ? 'Correct and resubmit' : 'Order this again') + '</h3>' +
        '<p class="case-muted">Starts a new draft with this case\'s treatment and preferences. The patient reference, files and dates are not copied — you review everything before it reaches the lab.</p>' +
        '<div class="case-actions"><button class="btn btn-ghost" data-cc-duplicate>Duplicate into a new draft</button></div></section>' : '');
}

function schedulingSection(order) {
  const priority = order.priority || 'normal';
  return '<section class="case-sec case-sec-quiet"><h3>Priority &amp; target</h3>' +
    '<div class="case-inline-form">' +
      '<label class="case-field"><span>Priority</span><select id="ccPriority">' +
        ['normal', 'priority', 'urgent'].map(p => '<option value="' + p + '"' + (p === priority ? ' selected' : '') + '>' +
          { normal: 'Normal', priority: 'Priority', urgent: 'Urgent' }[p] + '</option>').join('') + '</select></label>' +
      '<label class="case-field"><span>Target completion</span><input type="date" id="ccTarget" value="' + esc(order.target_date ? String(order.target_date).slice(0, 10) : '') + '"></label>' +
      '<button class="btn btn-ghost" data-cc-scheduling>Save</button>' +
    '</div>' +
    '<p class="case-muted">A target is what the lab is working to. It is not a delivery guarantee to the clinic.</p></section>';
}

function dentistApprovalSection(order) {
  if (!(isVeneerDemo(order) && order.status === 'waiting_doctor_approval')) return '';
  return '<section class="case-sec case-sec-action"><h3>Review the demo / design</h3>' +
    '<p>Check the design files and ask the lab anything you need before approving.</p>' +
    '<label class="case-field"><span>Notes (required to request changes)</span>' +
      '<textarea id="ccReviewNote" maxlength="4000" placeholder="Describe the changes needed…"></textarea></label>' +
    '<label class="workspace-check"><input id="ccLockAccepted" type="checkbox"> I understand that approval locks this design — any later change requires a new job order.</label>' +
    '<div class="case-actions"><button class="btn btn-primary" data-cc-decision="approve">Approve design</button>' +
    '<button class="btn btn-danger-ghost" data-cc-decision="reject">Request changes</button></div>' +
    '<p class="case-error" data-cc-error role="alert"></p></section>';
}

// The structured prescription where the case has one, the written
// instructions always. Cases created before the clinic sheets were
// modelled carry only the prose, and render exactly as they always did.
function prescriptionSection(order) {
  const structured = PrescriptionDetails(order.prescription, loadedSchema());
  return '<dl class="workspace-facts">' +
      fact('Treatment', jobTypeLabel(order.job_type)) +
      fact('Patient reference', order.patient_ref) +
      fact('Shade', order.shade) +
      (order.scan_body || order.implant_system ? fact('Scan body', order.scan_body) + fact('Implant system', order.implant_system) + fact('Abutment size', order.abutment_size) + fact('Abutment availability', order.abutment_availability) : '') +
      fact('Collection method', order.delivery_method === 'delivery' ? 'Delivery to clinic' : 'In-house pickup') +
      fact('Submitted', fmtDateTime(order.created_at)) +
    '</dl>' +
    (structured ? '<section class="case-sec">' + structured + '</section>' : '') +
    '<section class="case-sec"><h3>Instructions from the clinic</h3>' +
    '<p class="case-prose">' + esc(order.instructions || 'No additional instructions were provided.') + '</p></section>';
}

function intakeSection(order, files, staff) {
  const missing = missingItems(order, files);
  return '<p class="case-lede">Check the order is complete and paid for before it enters the lab. Anything missing is the clinic\'s to supply.</p>' +
    (missing.length ?
      '<div class="case-alert case-alert-warning"><strong>' + missing.length + ' item' + (missing.length === 1 ? '' : 's') + ' missing</strong><ul>' + missing.map(m => '<li>' + esc(m) + '</li>').join('') + '</ul></div>' :
      '<div class="case-alert case-alert-success"><strong>Everything required is present.</strong></div>') +
    '<section class="case-sec"><h3>Intake checks</h3>' +
      '<label class="workspace-check"><input type="checkbox" id="ccPayment"> Payment status confirmed</label>' +
      '<label class="workspace-check"><input type="checkbox" id="ccDetails"> Case details, prescription and files complete</label>' +
    '</section>' +
    '<section class="case-sec"><h3>Assign the case</h3>' +
      selectHtml('ccDesigner', 'Designer', staff.designers, 'Choose a designer…') +
      (order.job_type !== 'veneers' ? selectHtml('ccTechnician', 'Or skip design — straight to production', staff.technicians, 'Choose a technician…') : '<p class="case-muted">Veneers always go through design first.</p>') +
      workloadHintHtml(staff) +
      '<div class="case-actions"><button class="btn btn-primary" data-cc-accept>Accept &amp; assign</button></div>' +
    '</section>' +
    '<section class="case-sec"><h3>Return to the dentist</h3>' +
      '<p class="case-muted">The case goes back to the clinic with your note. Nothing is deleted.</p>' +
      '<label class="case-field"><span>Reason</span><select id="ccReturnReason">' +
        RETURN_REASONS.map(([key, label]) => '<option value="' + key + '">' + esc(label) + '</option>').join('') + '</select></label>' +
      '<label class="case-field"><span>Message to the clinic</span><textarea id="ccReturnNote" maxlength="4000" placeholder="What does the clinic need to send or correct?"></textarea></label>' +
      '<div class="case-actions"><button class="btn btn-danger-ghost" data-cc-return>Return to dentist</button></div>' +
    '</section>';
}

// Assignment awareness, not workforce planning: how many active cases sit
// at each designer's station right now, so reception doesn't hand a sixth
// case to the person already holding five.
function workloadHintHtml(staff) {
  if (!staff.workload || !staff.workload.designer || !staff.workload.designer.length) return '';
  return '<div class="workload-hint">' + staff.workload.designer.slice(0, 5).map(person =>
    '<span class="workload-chip"><b>' + esc(person.name) + '</b> ' + person.active + ' active</span>').join('') + '</div>';
}

function designSection(order, files, role) {
  const versions = designVersions(files);
  const canUpload = can('design', role) && !isLocked(order);
  return (versions.length ?
    '<ol class="design-versions">' + versions.map((f, i) =>
      '<li class="design-version' + (i === 0 ? ' is-current' : '') + '">' +
        '<div class="design-version-head"><strong>Design V' + f.version + '</strong>' +
          (i === 0 ? '<span class="case-badge case-badge-muted">Current</span>' : '') + '</div>' +
        '<time>' + fmtDateTime(f.created_at) + '</time>' +
        (f.preview_url ? '<button type="button" class="case-image-button" data-preview-file="' + esc(f.id) + '"><img src="' + esc(f.preview_url) + '" alt="Design version ' + f.version + '" loading="lazy" referrerpolicy="no-referrer"><span>View</span></button>' : '') +
        (f.url ? '<a class="workspace-file" target="_blank" rel="noopener noreferrer" href="' + esc(f.url) + '">Download ↗</a>' : '') +
      '</li>').join('') + '</ol>' :
    emptyState({ iconName: 'sliders', title: 'No design uploaded yet', text: 'Design files appear here as versions — earlier versions are always kept.' })) +
    (canUpload ? '<section class="case-sec"><h3>Upload a new version</h3>' +
      uploadZoneHtml('cc-design', 'Attach a design file', 'STL, OBJ, screenshot or design export — this becomes V' + (versions.length + 1)) + '</section>' : '') +
    (isLocked(order) ? '<p class="case-muted">This design is approved and locked. Changes require a new job order.</p>' : '');
}

function productionSection(order, role, staff) {
  const steps = stepsFor(order);
  const state = draft('production', order.id);
  const allDone = steps.every(s => state[s]);
  const canWork = can('production', role);
  if (order.status === 'blocked') {
    return '<div class="case-alert case-alert-danger"><strong>Blocked</strong><p>' + esc(order.blocked_reason || '') + '</p></div>' +
      (can('resume', role) ? '<section class="case-sec"><h3>Resume production</h3>' +
        '<label class="case-field"><span>What changed? (optional)</span><input id="ccResumeNote" maxlength="500" placeholder="Material arrived, new scan received…"></label>' +
        '<div class="case-actions"><button class="btn btn-primary" data-cc-resume>Resume production</button></div></section>' : '');
  }
  if (order.status !== 'in_production') {
    return '<p class="case-muted">This case is not in production right now.</p>' +
      '<section class="case-sec"><h3>Production steps for ' + esc(jobTypeLabel(order.job_type)) + '</h3>' + checklistHtml(steps, {}, 'production') + '</section>';
  }
  return '<section class="case-sec"><h3>Production steps</h3>' +
      '<p class="case-muted">Tick each step as you complete it. Skip anything that does not apply to this case by ticking it once checked off.</p>' +
      checklistHtml(steps, state, 'production') + '</section>' +
    (canWork ? '<section class="case-sec"><h3>Send to quality check</h3>' +
      selectHtml('ccQc', 'Quality inspector', staff.qc, 'Choose an inspector…') +
      '<div class="case-actions">' +
        '<button class="btn btn-primary" data-cc-production-done' + (allDone ? '' : ' disabled') + '>Production done → QC</button>' +
        '<span class="case-muted" data-cc-steps-hint' + (allDone ? ' hidden' : '') + '>Complete every step to continue.</span>' +
      '</div></section>' +
      '<section class="case-sec case-sec-quiet"><h3>Hit a blocker?</h3>' +
        '<p class="case-muted">A blocked case is flagged to reception and the lab manager straight away, instead of quietly sitting in your queue.</p>' +
        '<label class="case-field"><span>Reason</span><select id="ccBlockReason">' +
          BLOCK_REASONS.map(([key, label]) => '<option value="' + key + '">' + esc(label) + '</option>').join('') + '</select></label>' +
        '<label class="case-field"><span>What is holding it up?</span><textarea id="ccBlockNote" maxlength="1000" placeholder="Describe the blocker…"></textarea></label>' +
        '<div class="case-actions"><button class="btn btn-danger-ghost" data-cc-block>Block this case</button></div>' +
      '</section>' : '');
}

function qcSection(order, files, approvals, role) {
  const state = draft('qc', order.id);
  const canWork = can('qc', role) && order.status === 'qc_pending';
  const ready = QC_CHECKS.every(c => state[c]) && state.packed;
  const evidence = files.filter(f => f.category === 'qc_photo');
  return '<section class="case-sec"><h3>Inspection history</h3>' + qcHistoryHtml(approvals) + '</section>' +
    (canWork ? '<section class="case-sec"><h3>Inspection checklist</h3>' + checklistHtml(QC_CHECKS, state, 'qc') + '</section>' +
      '<section class="case-sec"><h3>Inspection evidence</h3>' +
        (evidence.length ? '<p class="case-muted">' + evidence.length + ' file' + (evidence.length === 1 ? '' : 's') + ' attached to this inspection.</p>' + filesHtml(evidence) : '') +
        uploadZoneHtml('cc-qc', 'Attach inspection photo or scan', 'Kept with this case permanently') + '</section>' +
      '<section class="case-sec"><h3>Findings</h3>' +
        '<label class="case-field"><span>What did you find?</span><textarea id="ccFindings" maxlength="4000" placeholder="Findings or exceptions; leave blank if every check passed">' + esc(drafts.findings[order.id] || '') + '</textarea></label>' +
        '<button type="button" class="qc-item' + (state.packed ? ' checked' : '') + '" aria-pressed="' + !!state.packed + '" data-check="qc" data-check-item="packed">' +
          '<span class="qc-chk" aria-hidden="true">' + (state.packed ? '✓' : '') + '</span><span class="lbl">Packed and ready to send</span></button>' +
        '<div class="case-actions">' +
          '<button class="btn btn-primary" data-cc-qc="approve"' + (ready ? '' : ' disabled') + '>Pass → ready for collection</button>' +
          '<button class="btn btn-danger-ghost" data-cc-qc="reject">Send for rework</button>' +
          '<span class="case-muted" data-cc-qc-hint' + (ready ? ' hidden' : '') + '>Complete the checklist and confirm packing to pass this case.</span>' +
        '</div></section>' :
      (evidence.length ? '<section class="case-sec"><h3>Inspection evidence</h3>' + filesHtml(evidence) + '</section>' : ''));
}

// Reception's remaining steps once the lab is done with a case.
function handoverSection(order, role) {
  if (!can('handover', role)) return '';
  const actions = {
    qc_approved: ['cc-release', 'Release for collection', 'btn-primary'],
    ready_for_pickup: ['cc-collected', 'Mark collected', 'btn-primary'],
    ready_for_delivery: ['cc-collected', 'Mark delivered', 'btn-primary'],
    delivered: ['cc-close', 'Close case out', 'btn-ghost']
  }[order.status];
  if (!actions) return '';
  return '<section class="case-sec case-sec-action"><h3>Handover</h3>' +
    '<div class="case-actions"><button class="btn ' + actions[2] + '" data-' + actions[0] + '>' + esc(actions[1]) + '</button></div></section>';
}

// Designer's handoff, shown wherever the designer is the current owner.
function designerActionSection(order, role, staff) {
  if (!can('design', role)) return '';
  if (isVeneerDemo(order) && order.status === 'in_design') {
    return '<section class="case-sec case-sec-action"><h3>Send the demo for approval</h3>' +
      '<p class="case-muted">The dentist is notified and the case waits with them until they approve or ask for changes.</p>' +
      '<div class="case-actions"><button class="btn btn-primary" data-cc-design-done>Send demo to the dentist</button></div></section>';
  }
  if (order.status === 'in_design' || order.status === 'doctor_approved') {
    return '<section class="case-sec case-sec-action"><h3>Hand to production</h3>' +
      selectHtml('ccTech', 'Technician', staff.technicians, 'Choose a technician…') +
      '<div class="case-actions"><button class="btn btn-primary" data-cc-design-done>Send to production</button></div></section>';
  }
  return '';
}

// ------------------------------------------------------------- assembly

function header(order, role) {
  const v = order.view || {};
  return '<header class="case-center-head">' +
    '<div class="case-center-title">' +
      '<div>' +
        '<span class="eyebrow-accent">' + esc(jobTypeLabel(order.job_type)) +
          (order.job_type === 'veneers' ? ' · ' + (order.stage_type === 'demo' ? 'Demo stage' : 'Final stage') : '') + '</span>' +
        '<h2 id="orderDetailTitle">' + esc(order.order_number) + '</h2>' +
        '<p class="case-center-sub">' + esc(order.patient_ref || '') +
          (role !== 'dentist' && order.dentist_name ? ' · ' + esc(order.dentist_name) : '') + '</p>' +
      '</div>' +
      '<button class="btn btn-ghost" data-detail-close aria-label="Close case" autofocus>Close</button>' +
    '</div>' +
    // The headline badge already says the case is with the dentist or
    // blocked, so those flags are dropped here rather than repeated
    // beside it.
    '<div class="case-center-badges">' + priorityBadge(v) + dueBadge(v) +
      flagChips(v, { limit: 4, exclude: ['awaiting_doctor', 'blocked'] }) +
      '<span class="case-badge case-badge-muted">' + esc(v.headline || '') + '</span></div>' +
  '</header>';
}

let activeTab = 'overview';
let detailRequest = 0;

/**
 * Open the command center for one case.
 *
 * @param role the viewer's workflow role — decides wording, which tabs
 *             appear and which actions are offered. Access itself is the
 *             server's call, not this parameter's.
 */
export async function showCaseCenter(role, id, { tab } = {}) {
  const request = ++detailRequest, route = location.hash, trigger = document.activeElement;
  try {
    // The catalogue is needed to render a structured prescription; it is
    // fetched once per page load and never blocks a second case. A
    // failure is not fatal — PrescriptionDetails falls back to the prose.
    const [detail] = await Promise.all([getOrder(role, id), ensureSchema(role).catch(() => null)]);
    if (request !== detailRequest || route !== location.hash) return;
    const { order, files, history, messages } = detail;
    const approvals = detail.approvals || [];
    designVersionsCount = designVersions(files).length;

    // Rosters and workload are only fetched for the roles that can
    // actually assign work — a dentist opening their own case has no
    // business pulling the lab's staff list.
    const staff = { designers: [], technicians: [], qc: [], workload: null };
    if (sees('intake', role) && order.status === 'pending_reception_review') {
      const [designers, technicians, overview] = await Promise.all([
        listStaff(role, 'designer').then(r => r.staff).catch(() => []),
        listStaff(role, 'technician').then(r => r.staff).catch(() => []),
        labOverview(role).catch(() => null)
      ]);
      staff.designers = designers; staff.technicians = technicians;
      staff.workload = overview && overview.workload;
    } else if (sees('design', role)) {
      staff.technicians = await listStaff(role, 'technician').then(r => r.staff).catch(() => []);
    }
    if (sees('production', role)) {
      staff.qc = await listStaff(role, 'qc').then(r => r.staff).catch(() => []);
    }

    const tabs = tabsFor(role, order);
    const wanted = tab || activeTab;
    activeTab = tabs.some(t => t[0] === wanted) ? wanted : 'overview';

    const panels = {
      overview: overviewSection(order, files, role, staff) + designerActionSection(order, role, staff) + handoverSection(order, role),
      prescription: prescriptionSection(order),
      files: filesHtml(files) + (role === 'dentist' && !isLocked(order) ?
        '<section class="case-sec"><h3>Attach a file</h3>' + uploadZoneHtml('cc-doctor', 'Add a scan or photograph', 'Images, PDF or scans under 10 MB') + '</section>' : ''),
      intake: intakeSection(order, files, staff),
      design: designSection(order, files, role) + designerActionSection(order, role, staff),
      production: productionSection(order, role, staff),
      qc: qcSection(order, files, approvals, role),
      messages: '<div class="chat-thread" data-cc-chat role="log" aria-label="Case messages" aria-live="polite">' + messagesHtml(messages, role) + '</div>' +
        '<form class="chat-input-row" data-cc-chat-form><input aria-label="Message" placeholder="' +
        (role === 'dentist' ? 'Message your lab team…' : 'Message the clinic…') + '" required maxlength="4000"><button class="btn btn-primary">Send</button></form>',
      notes: '<p class="case-muted">Internal notes are never shown to the clinic.</p>' +
        '<div class="chat-thread" data-cc-notes>' + notesHtml(messages) + '</div>' +
        '<form class="chat-input-row" data-cc-note-form><input aria-label="Internal note" placeholder="Note for lab staff only…" required maxlength="4000"><button class="btn btn-ghost">Add note</button></form>',
      timeline: timelineHtml(history)
    };

    document.getElementById('orderDetail')?.close();
    document.getElementById('orderDetail')?.remove();
    const panel = document.createElement('dialog');
    panel.id = 'orderDetail';
    panel.className = 'workspace-dialog case-center';
    panel.setAttribute('aria-labelledby', 'orderDetailTitle');
    panel.innerHTML = header(order, role) +
      nextActionHtml(order, role) +
      journeyHtml(order.view) +
      '<nav class="case-tabs" role="tablist" aria-label="Case sections">' + tabs.map(([key, label]) =>
        '<button type="button" role="tab" id="cctab-' + key + '" aria-controls="ccpanel-' + key + '" data-cc-tab="' + key + '" aria-selected="' + (key === activeTab) + '">' + esc(label) + '</button>').join('') + '</nav>' +
      tabs.map(([key]) => '<section class="case-panel" role="tabpanel" id="ccpanel-' + key + '" aria-labelledby="cctab-' + key + '"' +
        (key === activeTab ? '' : ' hidden') + '>' + (panels[key] || '') + '</section>').join('');

    (document.getElementById('workspaceContent') || document.body).append(panel);
    panel.addEventListener('close', () => { panel.remove(); if (trigger?.isConnected) trigger.focus(); }, { once: true });
    panel.showModal();
    attachHandlers(panel, role, order, { files, messages });
  } catch (error) { toast(error.message); }
}

/** Kept as the historical entry point — every page already calls this. */
export const showOrderDetail = showCaseCenter;

function attachHandlers(panel, role, order, data) {
  const id = order.id;
  const reopen = tab => showCaseCenter(role, id, { tab: tab || activeTab });

  panel.querySelector('[data-detail-close]').onclick = () => panel.close();

  panel.querySelectorAll('[data-cc-tab]').forEach(button => button.addEventListener('click', () => {
    activeTab = button.dataset.ccTab;
    panel.querySelectorAll('[data-cc-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.ccTab === activeTab)));
    panel.querySelectorAll('.case-panel').forEach(p => { p.hidden = p.id !== 'ccpanel-' + activeTab; });
  }));

  // Checklists are local drafts — no request, no re-render, just the tick.
  panel.querySelectorAll('[data-check]').forEach(button => button.addEventListener('click', () => {
    const state = draft(button.dataset.check, id), key = button.dataset.checkItem;
    state[key] = !state[key];
    button.classList.toggle('checked', state[key]);
    button.setAttribute('aria-pressed', String(state[key]));
    button.querySelector('.qc-chk').textContent = state[key] ? '✓' : '';
    syncChecklistGates(panel, order);
  }));
  panel.querySelector('#ccFindings')?.addEventListener('input', e => { drafts.findings[id] = e.target.value; });

  attachImagePreviews(panel, role, id);
  attachLiveChat(panel, role, id, '[data-cc-chat]');

  panel.querySelector('[data-cc-chat-form]')?.addEventListener('submit', async e => {
    e.preventDefault();
    const input = e.target.querySelector('input'), button = e.target.querySelector('button');
    button.disabled = true;
    try {
      await postMessage(role, id, input.value);
      input.value = '';
      panel.querySelector('[data-cc-chat]').innerHTML = messagesHtml((await listMessages(role, id)).messages, role);
    } catch (error) { toast(error.message); } finally { button.disabled = false; }
  });

  panel.querySelector('[data-cc-note-form]')?.addEventListener('submit', async e => {
    e.preventDefault();
    const input = e.target.querySelector('input'), button = e.target.querySelector('button');
    button.disabled = true;
    try {
      await postMessage(role, id, input.value, true);
      input.value = '';
      panel.querySelector('[data-cc-notes]').innerHTML = notesHtml((await listMessages(role, id)).messages);
    } catch (error) { toast(error.message); } finally { button.disabled = false; }
  });

  // Every transition below goes through `run`: one place that disables the
  // buttons, surfaces the server's own message on failure, and re-renders
  // both the case and the queue behind it on success. No optimistic
  // shortcuts — these are the consequential decisions in the product, and
  // showing a case as approved before the server agrees is exactly the
  // kind of lie an operations tool cannot afford.
  async function run(buttons, fn, successMessage, nextTab) {
    buttons.forEach(b => { b.disabled = true; });
    try {
      await fn();
      if (successMessage) toast(successMessage);
      // Awaited, not fired off: painting the queue behind this panel also
      // tears down any open case dialog, so reopening before that paint
      // lands would close the case the moment it reappeared.
      await renderCurrent();
      await reopen(nextTab);
    } catch (error) {
      toast(error.message);
      buttons.forEach(b => { b.disabled = false; });
    }
  }
  const all = selector => [...panel.querySelectorAll(selector)];

  panel.querySelector('[data-cc-scheduling]')?.addEventListener('click', e => run([e.currentTarget],
    () => setScheduling(role, id, { priority: panel.querySelector('#ccPriority').value, targetDate: panel.querySelector('#ccTarget').value || null }),
    'Case updated.'));

  panel.querySelector('[data-cc-accept]')?.addEventListener('click', e => {
    const designerId = panel.querySelector('#ccDesigner')?.value || '';
    const technicianId = panel.querySelector('#ccTechnician')?.value || '';
    if (!designerId && !technicianId) { toast('Choose a designer, or a technician if this case needs no design.'); return; }
    if (!panel.querySelector('#ccPayment').checked || !panel.querySelector('#ccDetails').checked) { toast('Confirm both intake checks before accepting.'); return; }
    run([e.currentTarget], () => receptionReview(id, {
      decision: 'accept', designerId, technicianId,
      paymentChecked: true, detailsChecked: true
    }), 'Accepted and assigned.', 'overview');
  });

  panel.querySelector('[data-cc-return]')?.addEventListener('click', e => {
    const note = panel.querySelector('#ccReturnNote').value.trim();
    if (!note) { toast('Tell the clinic what is needed.'); panel.querySelector('#ccReturnNote').focus(); return; }
    const reasonSelect = panel.querySelector('#ccReturnReason');
    const reasonLabel = reasonSelect.options[reasonSelect.selectedIndex].text;
    confirmAction({
      title: 'Return ' + order.order_number + ' to the clinic?',
      body: 'The case leaves the lab and goes back to ' + (order.dentist_name || 'the clinic') +
            '. They will need to correct it and submit a new order — this one cannot be resumed.',
      detail: reasonLabel + ': ' + note,
      confirmLabel: 'Return to dentist', tone: 'danger'
    }).then(confirmed => {
      if (confirmed) run([e.currentTarget], () => receptionReview(id, { decision: 'reject', reason: reasonSelect.value, note }), 'Returned to the clinic.', 'overview');
    });
  });

  panel.querySelectorAll('[data-cc-design-done]').forEach(button => button.addEventListener('click', () => {
    const pick = panel.querySelector('#ccTech');
    if (pick && !pick.value) { toast('Choose a technician first.'); return; }
    run([button], () => designDone(id, pick ? pick.value : ''), 'Case handed on.', 'overview');
  }));

  panel.querySelector('[data-cc-production-done]')?.addEventListener('click', e => {
    const pick = panel.querySelector('#ccQc');
    if (!pick || !pick.value) { toast('Choose a quality inspector first.'); return; }
    run([e.currentTarget], () => productionDone(id, pick.value), 'Sent to quality check.', 'overview');
  });

  panel.querySelector('[data-cc-block]')?.addEventListener('click', e => {
    const note = panel.querySelector('#ccBlockNote').value.trim();
    if (!note) { toast('Describe the blocker so it can be resolved.'); panel.querySelector('#ccBlockNote').focus(); return; }
    run([e.currentTarget], () => blockCase(role, id, { reason: panel.querySelector('#ccBlockReason').value, note }), 'Case blocked — reception and the lab manager have been notified.', 'production');
  });

  panel.querySelector('[data-cc-resume]')?.addEventListener('click', e =>
    run([e.currentTarget], () => resumeCase(role, id, { note: panel.querySelector('#ccResumeNote')?.value || '' }), 'Production resumed.', 'production'));

  panel.querySelectorAll('[data-cc-qc]').forEach(button => button.addEventListener('click', () => {
    const decision = button.dataset.ccQc;
    const findings = (panel.querySelector('#ccFindings')?.value || '').trim();
    if (decision === 'reject') {
      if (!findings) { toast('Record what needs fixing before sending this back.'); panel.querySelector('#ccFindings')?.focus(); return; }
      confirmAction({
        title: 'Send ' + order.order_number + ' back to production for rework?',
        body: 'This is recorded permanently as a failed inspection and the case returns to ' +
              (order.technician_name || 'the technician') + '. Previous inspections are kept.',
        detail: findings,
        confirmLabel: 'Send for rework', tone: 'danger'
      }).then(confirmed => {
        if (confirmed) run(all('[data-cc-qc]'), () => qcDecision(id, { decision: 'reject', note: findings }), 'Sent back for rework.', 'qc');
      });
      return;
    }
    const state = draft('qc', id);
    run(all('[data-cc-qc]'), () => qcDecision(id, {
      decision: 'approve', packed: state.packed === true,
      note: QC_CHECKS.join('; ') + '. Findings: ' + (findings || 'All checks passed; no defects found.')
    }), 'Passed QC — reception notified.', 'qc');
  }));

  panel.querySelector('[data-cc-release]')?.addEventListener('click', e =>
    run([e.currentTarget], () => confirmCompletion(id), 'Released for collection.'));
  panel.querySelector('[data-cc-collected]')?.addEventListener('click', e =>
    run([e.currentTarget], () => markDelivered(id), 'Handover recorded.'));
  panel.querySelector('[data-cc-close]')?.addEventListener('click', e => {
    confirmAction({
      title: 'Close ' + order.order_number + ' out?',
      body: 'The case record and its full history are kept, but it leaves every active queue and can no longer be worked on.',
      confirmLabel: 'Close case out'
    }).then(confirmed => { if (confirmed) run([e.currentTarget], () => markCompleted(id), 'Case closed.'); });
  });

  panel.querySelectorAll('[data-cc-decision]').forEach(button => button.addEventListener('click', () => {
    const decision = button.dataset.ccDecision;
    const note = panel.querySelector('#ccReviewNote').value.trim();
    const error = panel.querySelector('[data-cc-error]');
    if (decision === 'approve' && !panel.querySelector('#ccLockAccepted').checked) {
      error.textContent = 'Confirm that you understand the design lock before approving.'; return;
    }
    if (decision === 'reject' && !note) {
      error.textContent = 'Add a note explaining the changes needed.'; panel.querySelector('#ccReviewNote').focus(); return;
    }
    error.textContent = '';
    const go = () => run(all('[data-cc-decision]'), () => doctorDecision(id, { decision, note }),
      decision === 'approve' ? 'Design approved. The lab can begin production.' : 'Your notes are with the design team.', 'overview');
    if (decision !== 'approve') { go(); return; }
    confirmAction({
      title: 'Approve the design for ' + order.order_number + '?',
      body: 'The lab will begin manufacturing to this design. It is locked from this point — any later change needs a new job order.',
      confirmLabel: 'Approve design'
    }).then(confirmed => { if (confirmed) go(); });
  }));

  // Duplication happens on the server, which decides what may be carried.
  // The old client-side version copied the patient reference into the new
  // form — convenient, and exactly how the wrong patient's name reaches a
  // lab. The server copies preferences only and returns a draft.
  panel.querySelector('[data-cc-duplicate]')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const { draft } = await duplicateCase(id);
      const { formFromDraft } = await import('../pages/newOrder.js');
      UI.newOrderForm = formFromDraft(draft);
      panel.close();
      toast('Case details copied. Review the patient information before submitting.');
      location.hash = '#/new-order';
    } catch (error) { toast(error.message); button.disabled = false; }
  });

  // Upload zones re-open the case when a file lands so the new file (and,
  // for a design, its new version number) is visible immediately.
  const zones = [
    ['cc-doctor', { role, orderId: id, stageType: order.stage_type, category: 'scan' }],
    ['cc-design', { role, orderId: id, stageType: order.stage_type, category: 'design_file' }],
    ['cc-qc', { role, orderId: id, stageType: 'final', category: 'qc_photo' }]
  ];
  for (const [zone, options] of zones) attachUploadZone(panel, zone, options);
  panel.addEventListener('case-file-uploaded', () => reopen(), { once: true });
}

// Re-evaluates the two gated buttons (production done, QC pass) after a
// tick, without re-rendering the panel and losing the person's place.
function syncChecklistGates(panel, order) {
  const production = panel.querySelector('[data-cc-production-done]');
  if (production) {
    const ready = stepsFor(order).every(s => draft('production', order.id)[s]);
    production.disabled = !ready;
    const hint = panel.querySelector('[data-cc-steps-hint]'); if (hint) hint.hidden = ready;
  }
  const pass = panel.querySelector('[data-cc-qc="approve"]');
  if (pass) {
    const state = draft('qc', order.id);
    const ready = QC_CHECKS.every(c => state[c]) && state.packed;
    pass.disabled = !ready;
    const hint = panel.querySelector('[data-cc-qc-hint]'); if (hint) hint.hidden = ready;
  }
}

function attachImagePreviews(panel, role, id) {
  panel.querySelectorAll('[data-preview-file]').forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      // Refresh the private link and recheck case access each time a viewer opens.
      const { files } = await listFiles(role, id);
      if (!panel.isConnected) return;
      const file = files.find(f => String(f.id) === button.dataset.previewFile);
      if (!file?.preview_url) throw new Error('Image preview unavailable. Reopen the case and try again.');
      const viewer = document.createElement('dialog');
      viewer.className = 'workspace-dialog case-image-viewer';
      viewer.setAttribute('aria-label', 'Case image preview');
      viewer.innerHTML = '<header><h2>Case image</h2><button class="btn btn-ghost" autofocus>Close image</button></header><p role="status">Loading image…</p><img alt="Uploaded case image" referrerpolicy="no-referrer">';
      const img = viewer.querySelector('img'), status = viewer.querySelector('[role="status"]');
      img.onload = () => { status.hidden = true; };
      img.onerror = () => { img.hidden = true; status.textContent = 'Could not load this image. Close and reopen the viewer to retry.'; };
      img.src = file.preview_url;
      panel.append(viewer);
      viewer.querySelector('button').onclick = () => viewer.close();
      viewer.addEventListener('close', () => { viewer.remove(); if (button.isConnected) button.focus(); }, { once: true });
      viewer.showModal();
    } catch (error) { toast(error.message); }
    finally { button.disabled = false; }
  }));
  panel.querySelectorAll('.case-image-button img').forEach(img => img.addEventListener('error', () => { img.hidden = true; }, { once: true }));
}

// Polls the case thread while the panel is open. Five seconds is slow
// enough to be invisible on the network and fast enough that a
// conversation doesn't feel like email; it stops the moment the panel
// leaves the document rather than running on forever behind a closed
// dialog.
export function attachLiveChat(root, role, id, selector) {
  if (!root.querySelector(selector)) return;
  let timer;
  const refresh = async () => {
    if (!root.isConnected) return;
    try {
      const { messages } = await listMessages(role, id);
      if (root.isConnected) {
        const thread = root.querySelector(selector);
        const html = messagesHtml(messages, role);
        if (thread && thread.innerHTML !== html) thread.innerHTML = html;
      }
    } catch { /* keep the conversation on screen through a connection blip */ }
    if (root.isConnected) timer = setTimeout(refresh, 5000);
  };
  timer = setTimeout(refresh, 5000);
  const observer = new MutationObserver(() => { if (!root.isConnected) { clearTimeout(timer); observer.disconnect(); } });
  observer.observe(document.getElementById('app'), { childList: true, subtree: true });
}
