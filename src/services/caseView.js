// One case, one derivation. Every surface in Ceram — the dentist's
// "what needs me", reception's queues, a designer's card, the admin
// pipeline — used to answer "where is this and who has it?" by
// re-implementing its own filter over the raw `status` column. Six
// implementations of the same question drift, and the moment one of them
// disagrees with the state machine the product is lying to somebody.
//
// So the derivation happens once, here, on the server, and travels with
// the order as a `view` object. Clients render it; they never re-derive
// it. Adding a status to the workflow means editing this file and every
// screen updates together.
//
// Nothing here writes: it is a pure function of a job_orders row plus the
// audience reading it.

// The canonical journey a case travels, independent of the twenty
// database statuses that make it up. A person tracking a case thinks in
// these six steps, not in `assigned_to_technician`.
const STEPS = {
  reception: 'Reception',
  design: 'Design',
  approval: 'Your approval',
  production: 'Production',
  qc: 'Quality check',
  collection: 'Ready',
  complete: 'Complete'
};

// Which journey step each database status sits in. Statuses the workflow
// only ever passes through in the same transaction (accepted_by_reception,
// design_done, production_done…) are mapped too, so a case caught
// mid-transition still renders somewhere sensible rather than nowhere.
const STATUS_STEP = {
  submitted: 'reception', pending_reception_review: 'reception', rejected_by_reception: 'reception',
  accepted_by_reception: 'design', assigned_to_designer: 'design', in_design: 'design', design_done: 'design',
  waiting_doctor_approval: 'approval', doctor_rejected: 'design', doctor_approved: 'design',
  assigned_to_technician: 'production', in_production: 'production', blocked: 'production', production_done: 'production',
  qc_pending: 'qc', qc_rejected: 'qc',
  qc_approved: 'collection', ready_for_pickup: 'collection', ready_for_delivery: 'collection',
  delivered: 'complete', completed: 'complete'
};

// Who is holding the case, by workflow role. 'dentist' here means the work
// has genuinely gone back out to the clinic — it is not a polite way of
// saying the lab is busy.
const STATUS_OWNER_ROLE = {
  submitted: 'receptionist', pending_reception_review: 'receptionist',
  rejected_by_reception: 'dentist',
  accepted_by_reception: 'designer', assigned_to_designer: 'designer', in_design: 'designer',
  design_done: 'designer', doctor_rejected: 'designer', doctor_approved: 'designer',
  waiting_doctor_approval: 'dentist',
  assigned_to_technician: 'technician', in_production: 'technician', blocked: 'technician', production_done: 'technician',
  qc_pending: 'qc', qc_rejected: 'technician',
  qc_approved: 'receptionist', ready_for_pickup: 'receptionist', ready_for_delivery: 'receptionist',
  delivered: 'receptionist', completed: null
};

const OWNER_LABEL = { receptionist: 'Reception', designer: 'Design', technician: 'Production', qc: 'Quality inspection', dentist: 'Dentist' };

// Plain language, twice: once for the clinic and once for the floor. The
// dentist wording never names an internal stage the clinic has no way to
// act on, and never exposes a database token. The lab wording stays
// operational — a designer does not want to be told a case is "being
// carefully prepared".
//
// `d(order)` forms exist for the handful of statuses whose meaning depends
// on the case itself (a veneer demo is not the same event as a final).
const HEADLINES = {
  submitted:                 { dentist: 'Sent to the lab',                     lab: 'Just arrived' },
  pending_reception_review:  { dentist: 'With the lab for checking',           lab: 'Waiting for reception review' },
  rejected_by_reception:     { dentist: 'Returned to you — details needed',    lab: 'Returned to the dentist' },
  accepted_by_reception:     { dentist: 'Accepted by the lab',                 lab: 'Accepted, assigning' },
  assigned_to_designer:      { dentist: 'With the design team',                lab: 'Assigned to a designer' },
  // The one status whose meaning genuinely differs case by case: a demo
  // being prepared for the first time and a demo being reworked after the
  // dentist asked for changes are the same row, and telling a dentist who
  // just requested changes that the lab is "preparing your demo" reads as
  // though they were ignored.
  in_design:                 { dentist: o => o.rejection_note ? 'Your changes are being made'
                                 : o.job_type === 'veneers' && o.stage_type === 'demo' ? 'Designer preparing your demo'
                                 : 'Design team is working on your case',
                               lab: o => o.rejection_note ? 'Changes requested — back in design' : 'In design' },
  design_done:               { dentist: 'Design complete',                     lab: 'Design done — handing to production' },
  waiting_doctor_approval:   { dentist: 'Your approval needed',                lab: 'Waiting on the dentist' },
  doctor_rejected:           { dentist: 'Your change request sent',            lab: 'Changes requested by the dentist' },
  doctor_approved:           { dentist: 'Approved — moving to production',     lab: 'Demo approved — ready for production' },
  assigned_to_technician:    { dentist: 'Being made',                          lab: 'Assigned to a technician' },
  in_production:             { dentist: 'Being made in the lab',               lab: 'In production' },
  blocked:                   { dentist: 'On hold — the lab is resolving an issue', lab: 'Blocked' },
  production_done:           { dentist: 'Made — going to quality check',       lab: 'Production done' },
  qc_pending:                { dentist: 'Final quality inspection',            lab: 'Waiting for QC inspection' },
  qc_rejected:               { dentist: 'Being finished in the lab',           lab: 'Returned for production rework' },
  qc_approved:               { dentist: 'Passed inspection — being prepared',  lab: 'Passed QC — preparing for collection' },
  ready_for_pickup:          { dentist: 'Ready for collection',                lab: 'Ready for pickup' },
  ready_for_delivery:        { dentist: 'Ready — out for delivery',            lab: 'Ready for delivery' },
  delivered:                 { dentist: 'Delivered',                           lab: 'Delivered — ready to close' },
  completed:                 { dentist: 'Completed',                           lab: 'Completed' }
};

// What has to happen next, phrased as an instruction to whoever must do
// it. Empty for a finished case: "no next action" is a real answer and
// inventing one just adds noise to a completed row.
const NEXT_ACTIONS = {
  submitted: 'Review the new order',
  pending_reception_review: 'Check payment and case details, then accept or return',
  rejected_by_reception: 'Correct the details and submit a new order',
  accepted_by_reception: 'Assign the case',
  assigned_to_designer: 'Start the design',
  in_design: o => o.job_type === 'veneers' && o.stage_type === 'demo' ? 'Prepare the demo and send it for approval' : 'Prepare the design and hand it to production',
  design_done: 'Hand the case to a technician',
  waiting_doctor_approval: 'Review the demo and approve or request changes',
  doctor_rejected: 'Apply the requested changes',
  doctor_approved: 'Hand the approved case to a technician',
  assigned_to_technician: 'Start manufacturing',
  in_production: 'Manufacture the case, then send it to QC',
  blocked: 'Resolve the blocker and resume production',
  production_done: 'Send the case to QC',
  qc_pending: 'Inspect the case and record findings',
  qc_rejected: 'Rework the case and return it to QC',
  qc_approved: 'Release the case for collection',
  ready_for_pickup: 'Hand the case over and mark it collected',
  ready_for_delivery: 'Send the case out and mark it delivered',
  delivered: 'Close the case out',
  completed: ''
};

// Statuses where nobody is doing anything until the clinic replies. Kept
// separate from STATUS_OWNER_ROLE because "the dentist owns it" and "the
// lab is blocked on the dentist" are the same fact read from two sides,
// and the lab's queues need the second reading.
const WAITING_ON_DENTIST = new Set(['rejected_by_reception', 'waiting_doctor_approval']);
const CLOSED = new Set(['completed']);

function resolve(entry, order) { return typeof entry === 'function' ? entry(order) : entry; }

function ms(value) { const t = value ? new Date(value).getTime() : NaN; return Number.isFinite(t) ? t : null; }

// Whole days between today and the target date, counted in dates rather
// than in 24-hour blocks: a case due tomorrow should read "1 day left"
// all day today, not flip to "0" mid-afternoon.
function dueState(order, now) {
  if (!order.target_date) return null;
  const target = new Date(order.target_date);
  if (Number.isNaN(target.getTime())) return null;
  const day = 86400000;
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startOfTarget = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const days = Math.round((startOfTarget - startOfToday) / day);
  // A finished case is never late — it was delivered, whenever that was.
  const state = CLOSED.has(order.status) ? 'met' : days < 0 ? 'overdue' : days === 0 ? 'due_today' : 'on_track';
  return { date: order.target_date, days_remaining: days, state };
}

// The journey rail. Veneers genuinely are two passes through the lab, so
// they get two labelled groups rather than one nine-step caterpillar that
// makes both halves illegible.
function journeyFor(order, currentStep) {
  const skippedDesign = !order.assigned_designer_id && !!order.assigned_technician_id;
  const mark = (keys, position) => keys.map(key => ({
    key, label: STEPS[key],
    state: position === -1 ? 'todo' : keys.indexOf(key) < position ? 'done' : keys.indexOf(key) === position ? (CLOSED.has(order.status) ? 'done' : 'current') : 'todo'
  }));

  if (order.job_type !== 'veneers') {
    const keys = ['reception', skippedDesign ? null : 'design', 'production', 'qc', 'collection', 'complete'].filter(Boolean);
    return [{ label: '', steps: mark(keys, keys.indexOf(currentStep)) }];
  }

  const demoKeys = ['reception', 'design', 'approval'];
  const finalKeys = ['production', 'qc', 'collection', 'complete'];
  if (order.stage_type === 'demo') {
    return [
      { label: 'Demo cycle', steps: mark(demoKeys, demoKeys.indexOf(currentStep)) },
      { label: 'Final cycle', steps: finalKeys.map(key => ({ key, label: STEPS[key], state: 'todo' })) }
    ];
  }
  return [
    { label: 'Demo cycle', steps: demoKeys.map(key => ({ key, label: STEPS[key], state: 'done' })) },
    // 'design' after approval is the handoff step, not a second design
    // pass — it is folded into the final cycle's first entry so the rail
    // doesn't show Design twice for one case.
    { label: 'Final cycle', steps: mark(finalKeys, finalKeys.indexOf(currentStep === 'design' ? 'production' : currentStep)) }
  ];
}

// Operational exceptions, in the order a person should notice them. These
// drive the "Attention required" panels, the row highlights and the admin
// bottleneck counts — all from one definition, so a case flagged on one
// screen is flagged identically on every other.
function flagsFor(order, derived, now, thresholds, voice) {
  const flags = [];
  if (order.status === 'blocked') flags.push({ key: 'blocked', label: 'Blocked', tone: 'danger' });
  if (derived.due && derived.due.state === 'overdue') flags.push({ key: 'overdue', label: 'Overdue', tone: 'danger' });
  if (order.priority === 'urgent') flags.push({ key: 'urgent', label: 'Urgent', tone: 'danger' });
  else if (order.priority === 'priority') flags.push({ key: 'priority', label: 'Priority', tone: 'warning' });
  if (order.status === 'rejected_by_reception') flags.push({ key: 'returned', label: 'Returned to dentist', tone: 'warning' });
  if (order.status === 'qc_rejected') flags.push({ key: 'rework', label: 'QC rework', tone: 'warning' });
  // The same fact, addressed to whoever is reading it: the lab is waiting
  // on a doctor; the doctor is being waited on.
  if (derived.waiting_on === 'dentist' && !CLOSED.has(order.status)) {
    flags.push({ key: 'awaiting_doctor', label: voice === 'dentist' ? 'Waiting on you' : 'Waiting on doctor', tone: 'info' });
  }
  if (derived.due && derived.due.state === 'due_today') flags.push({ key: 'due_today', label: 'Due today', tone: 'warning' });
  // A case sitting far longer in one stage than that stage should take is
  // the single most useful thing a lab manager can be shown, and it needs
  // no configuration to be true — only a threshold that is obviously
  // generous. See THRESHOLDS below.
  const limit = thresholds[derived.stage];
  if (limit && !CLOSED.has(order.status) && derived.time_in_stage_ms > limit) {
    flags.push({ key: 'stalled', label: 'Stalled in ' + derived.stage_label.toLowerCase(), tone: 'warning' });
  }
  return flags;
}

// Hours a case may sit in each stage before it counts as stalled. Chosen
// to be uncontroversially long rather than aspirational: these exist to
// catch cases nobody is looking at, not to grade anyone's speed. Override
// per deployment with CASE_STAGE_HOURS="reception=8,design=48".
const DEFAULT_STAGE_HOURS = { reception: 12, design: 48, approval: 72, production: 48, qc: 12, collection: 72 };
function loadThresholds() {
  const out = {};
  for (const [stage, hours] of Object.entries(DEFAULT_STAGE_HOURS)) out[stage] = hours * 3600000;
  for (const pair of String(process.env.CASE_STAGE_HOURS || '').split(',')) {
    const [stage, hours] = pair.split('=').map(s => (s || '').trim());
    if (out[stage] && Number(hours) > 0) out[stage] = Number(hours) * 3600000;
  }
  return out;
}
const THRESHOLDS = loadThresholds();

/**
 * Derive everything a screen needs to explain one case.
 *
 * @param order    a job_orders row (with the assignee-name columns the
 *                 repo joins in — absent names simply render as a role).
 * @param audience 'dentist' for the clinic's wording, anything else for
 *                 the lab's. Only affects language, never visibility:
 *                 field-level access control belongs in the query layer,
 *                 not in a formatting helper.
 */
function describe(order, { audience = 'lab', now = new Date() } = {}) {
  if (!order) return null;
  const voice = audience === 'dentist' ? 'dentist' : 'lab';
  const step = STATUS_STEP[order.status] || 'reception';
  const ownerRole = STATUS_OWNER_ROLE[order.status] || null;
  // A clinic reading their own case should be told "You", not their own
  // name — "Current owner: Dr. Hassan" is technically true and reads like
  // the software is talking about somebody else.
  const ownerName = voice === 'dentist' && ownerRole === 'dentist'
    ? 'You'
    : { designer: order.designer_name, technician: order.technician_name, qc: order.qc_name, dentist: order.dentist_name }[ownerRole] || null;

  const enteredAt = ms(order.stage_entered_at) ?? ms(order.updated_at) ?? ms(order.created_at);
  const derived = {
    stage: step,
    stage_label: STEPS[step],
    headline: resolve((HEADLINES[order.status] || {})[voice], order) || String(order.status).replace(/_/g, ' '),
    next_action: resolve(NEXT_ACTIONS[order.status], order) || '',
    // Who must perform the next action — the half of "what happens next"
    // that stops a case sitting still because two people each assumed the
    // other had it.
    next_actor_role: ownerRole,
    next_actor_label: ownerRole ? OWNER_LABEL[ownerRole] : '',
    owner_role: ownerRole,
    owner_name: ownerName,
    owner_label: ownerRole ? OWNER_LABEL[ownerRole] : '',
    waiting_on: CLOSED.has(order.status) ? null : WAITING_ON_DENTIST.has(order.status) ? 'dentist' : 'lab',
    time_in_stage_ms: enteredAt ? Math.max(0, now.getTime() - enteredAt) : null,
    is_closed: CLOSED.has(order.status),
    is_blocked: order.status === 'blocked',
    priority: order.priority || 'normal'
  };
  derived.due = dueState(order, now);
  derived.journey = journeyFor(order, step);
  derived.flags = flagsFor(order, derived, now, THRESHOLDS, voice);
  derived.needs_attention = derived.flags.some(f => ['blocked', 'overdue', 'returned', 'rework', 'stalled'].includes(f.key));
  return derived;
}

/** Attach describe() to an order (or a list of them) without mutating the row. */
function withView(order, options) { return order && Object.assign({}, order, { view: describe(order, options) }); }
function withViews(orders, options) { return (orders || []).map(o => withView(o, options)); }

module.exports = { describe, withView, withViews, STEPS, STATUS_STEP, STATUS_OWNER_ROLE, THRESHOLDS };
