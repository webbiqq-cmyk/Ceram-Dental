// Sample data for the four new lab-role dashboards (Receptionist,
// Designer, Technician, Quality Inspector) — these pages are a visual
// preview ahead of the real backend (job_orders, assignments, messages —
// see src/db/migrations/), not wired to it yet, so every dashboard reads
// from this one shared, coherent set of orders instead of inventing its
// own unrelated numbers. Swapping this for a real /api/orders fetch is
// the only change needed once that backend lands.
export const JOB_TYPES = [
  { key: 'veneers', label: 'Veneers' }, { key: 'crowns', label: 'Crowns' }, { key: 'bridges', label: 'Bridges' },
  { key: 'implant_crown', label: 'Implant Crown' }, { key: 'implant_bridge', label: 'Implant Bridge' },
  { key: 'ortho_work', label: 'Ortho Work' }, { key: 'night_guard', label: 'Night Guard' },
  { key: 'bleaching_tray', label: 'Bleaching Tray' }, { key: 'essix_retainer', label: 'Essix Retainer' },
  { key: 'surgical_guide', label: 'Surgical Guide' }, { key: 'functional_mockup', label: 'Functional Mockup' },
  { key: 'other', label: 'Other' }
];
const JT = {}; JOB_TYPES.forEach(j => { JT[j.key] = j.label; });
export function jobTypeLabel(key) { return JT[key] || key; }

// status -> { label, tone } — tone is one of the four semantic pill
// classes (pill-neutral / pill-progress / pill-success / pill-danger).
export const STATUS_META = {
  submitted: { label: 'Submitted', tone: 'neutral' },
  pending_reception_review: { label: 'Pending reception review', tone: 'neutral' },
  rejected_by_reception: { label: 'Rejected by reception', tone: 'danger' },
  accepted_by_reception: { label: 'Accepted', tone: 'neutral' },
  assigned_to_designer: { label: 'Assigned to designer', tone: 'neutral' },
  in_design: { label: 'In design', tone: 'progress' },
  design_done: { label: 'Design done', tone: 'progress' },
  assigned_to_technician: { label: 'Assigned to technician', tone: 'neutral' },
  in_production: { label: 'In production', tone: 'progress' },
  production_done: { label: 'Production done', tone: 'progress' },
  qc_pending: { label: 'QC pending', tone: 'progress' },
  qc_rejected: { label: 'QC rejected', tone: 'danger' },
  qc_approved: { label: 'QC approved', tone: 'progress' },
  waiting_doctor_approval: { label: 'Waiting on doctor', tone: 'progress' },
  doctor_rejected: { label: 'Doctor requested changes', tone: 'danger' },
  doctor_approved: { label: 'Doctor approved', tone: 'success' },
  ready_for_delivery: { label: 'Ready for delivery', tone: 'success' },
  ready_for_pickup: { label: 'Ready for pickup', tone: 'success' },
  delivered: { label: 'Delivered', tone: 'success' },
  completed: { label: 'Completed', tone: 'success' }
};
export function statusPill(status) {
  const m = STATUS_META[status] || { label: status, tone: 'neutral' };
  return '<span class="pill pill-' + m.tone + '"><span class="dot"></span>' + m.label + '</span>';
}

// One linear step list per job — veneer gets its own two-group list
// (Demo, then Final) built by stageTrackerSteps() below.
const ONE_STEP_FLOW = ['accepted_by_reception', 'in_design', 'in_production', 'qc_pending', 'waiting_doctor_approval', 'ready_for_pickup'];
const FLOW_LABELS = { accepted_by_reception: 'Reception', in_design: 'Design', in_production: 'Production', qc_pending: 'QC', waiting_doctor_approval: 'Doctor', ready_for_pickup: 'Ready' };

export function stageTrackerHtml(order) {
  function stepsHtml(steps, currentStatus, rejected) {
    const idx = steps.indexOf(currentStatus);
    return '<div class="st-row">' + steps.map((s, i) => {
      let cls = '';
      if (rejected && i === idx) cls = 'rejected';
      else if (i < idx || (i === steps.length - 1 && ['ready_for_delivery', 'ready_for_pickup', 'delivered', 'completed'].includes(currentStatus))) cls = 'done';
      else if (i === idx) cls = 'now';
      return '<div class="st-step ' + cls + '"><span class="st-dot">' + (cls === 'done' ? '✓' : i + 1) + '</span><span class="st-label">' + FLOW_LABELS[s] + '</span></div>';
    }).join('') + '</div>';
  }
  const rejected = ['rejected_by_reception', 'qc_rejected', 'doctor_rejected'].includes(order.status);
  if (order.jobType !== 'veneers') {
    return '<div class="stage-tracker">' + stepsHtml(ONE_STEP_FLOW, order.status, rejected) + '</div>';
  }
  const activeGroup = order.stageType === 'demo' ? 0 : 1;
  return '<div class="stage-tracker two-part">' +
    '<div><div class="st-group-label">1 · Demo / Mockup</div>' + stepsHtml(ONE_STEP_FLOW, activeGroup === 0 ? order.status : 'ready_for_pickup', activeGroup === 0 && rejected) + '</div>' +
    '<div><div class="st-group-label">2 · Final Product</div>' + stepsHtml(ONE_STEP_FLOW, activeGroup === 1 ? order.status : ONE_STEP_FLOW[0], activeGroup === 1 && rejected) + '</div>' +
  '</div>';
}

export const MOCK_ORDERS = [
  { id: 'JO-1001', patient: 'Patient #4471', clinic: 'Dr. R. Haddad — Bright Smile Clinic', jobType: 'crowns', stageType: 'final', status: 'pending_reception_review', shade: 'A2', designer: null, technician: null, submittedAt: '2026-09-07T08:10:00Z' },
  { id: 'JO-1000', patient: 'Patient #2290', clinic: 'Dr. L. Farouk — City Dental', jobType: 'bridges', stageType: 'final', status: 'rejected_by_reception', shade: 'B1', designer: null, technician: null, rejectionNote: 'Scan is missing the opposing arch — please re-upload and resubmit.', submittedAt: '2026-09-06T14:20:00Z' },
  { id: 'JO-0998', patient: 'Patient #1187', clinic: 'Dr. N. Saleh — OrthoPlus', jobType: 'implant_crown', stageType: 'final', status: 'in_design', shade: 'A3', designer: 'Rana', technician: null, scanBody: 'Straumann BLX', implantSystem: 'Straumann', abutmentSize: 'RC, 3.5mm', submittedAt: '2026-09-05T09:00:00Z' },
  { id: 'JO-0996', patient: 'Patient #3350', clinic: 'Dr. A. Nasser — Pearl Dental', jobType: 'night_guard', stageType: 'final', status: 'in_production', shade: '—', designer: 'Rana', technician: 'Malvin', submittedAt: '2026-09-04T09:00:00Z' },
  { id: 'JO-0993', patient: 'Patient #2201', clinic: 'Dr. L. Farouk — City Dental', jobType: 'surgical_guide', stageType: 'final', status: 'qc_pending', shade: '—', designer: 'Omar', technician: 'Malvin', submittedAt: '2026-09-03T09:00:00Z' },
  { id: 'JO-0990', patient: 'Patient #1090', clinic: 'Dr. N. Saleh — OrthoPlus', jobType: 'veneers', stageType: 'demo', status: 'waiting_doctor_approval', shade: 'B2', designer: 'Rana', technician: 'Malvin', submittedAt: '2026-09-02T09:00:00Z' },
  { id: 'JO-0985', patient: 'Patient #3299', clinic: 'Dr. A. Nasser — Pearl Dental', jobType: 'veneers', stageType: 'final', status: 'in_design', shade: 'C2', designer: 'Omar', technician: null, note: 'Demo approved by doctor on Sep 5 — final restoration now in progress.', submittedAt: '2026-08-29T09:00:00Z' },
  { id: 'JO-0980', patient: 'Patient #4102', clinic: 'Dr. R. Haddad — Bright Smile Clinic', jobType: 'essix_retainer', stageType: 'final', status: 'ready_for_pickup', shade: '—', designer: 'Rana', technician: 'Omar', submittedAt: '2026-08-27T09:00:00Z' },
  { id: 'JO-0977', patient: 'Patient #2050', clinic: 'Dr. N. Saleh — OrthoPlus', jobType: 'implant_bridge', stageType: 'final', status: 'completed', shade: 'A2', designer: 'Omar', technician: 'Malvin', submittedAt: '2026-08-20T09:00:00Z' }
];
