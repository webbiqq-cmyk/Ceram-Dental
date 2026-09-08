export const JOB_TYPES = [
  { key: 'veneers', label: 'Veneers' }, { key: 'crowns', label: 'Crowns' }, { key: 'bridges', label: 'Bridges' },
  { key: 'implant_crown', label: 'Implant Crown' }, { key: 'implant_bridge', label: 'Implant Bridge' },
  { key: 'ortho_work', label: 'Ortho Work' }, { key: 'night_guard', label: 'Night Guard' },
  { key: 'bleaching_tray', label: 'Bleaching Tray' }, { key: 'essix_retainer', label: 'Essix Retainer' },
  { key: 'surgical_guide', label: 'Surgical Guide' }, { key: 'functional_mockup', label: 'Functional Mockup' },
  { key: 'trays', label: 'Trays' }, { key: 'other', label: 'Other' }
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
  waiting_doctor_approval: { label: 'Demo/design awaiting doctor', tone: 'progress' },
  doctor_rejected: { label: 'Doctor requested changes', tone: 'danger' },
  doctor_approved: { label: 'Demo approved · ready for technician', tone: 'success' },
  ready_for_delivery: { label: 'Ready for delivery', tone: 'success' },
  ready_for_pickup: { label: 'Ready for pickup', tone: 'success' },
  delivered: { label: 'Delivered', tone: 'success' },
  completed: { label: 'Completed', tone: 'success' }
};
export function statusPill(status) {
  const m = STATUS_META[status] || { label: status, tone: 'neutral' };
  return '<span class="pill pill-' + m.tone + '"><span class="dot"></span>' + m.label + '</span>';
}

const ONE_STEP_FLOW = ['pending_reception_review','in_design','in_production','qc_pending','qc_approved','ready_for_pickup','completed'];
const FLOW_LABELS = {pending_reception_review:'Reception',in_design:'Design',assigned_to_technician:'Handoff',in_production:'Production',qc_pending:'QC',qc_approved:'Packing',waiting_doctor_approval:'Review',doctor_approved:'Approved',ready_for_pickup:'Collection',completed:'Complete'};
export function stageTrackerHtml(order) {
  const alias={submitted:'pending_reception_review',accepted_by_reception:'in_design',assigned_to_designer:'in_design',design_done:'in_design',production_done:'qc_pending',ready_for_delivery:'ready_for_pickup',delivered:'completed',rejected_by_reception:'pending_reception_review',doctor_rejected:'in_design',qc_rejected:'qc_pending'};
  const status=alias[order.status] || order.status;
  function steps(phase,current,allDone=false) {
    const index=phase.indexOf(current);
    return '<div class="st-row" role="list">' + phase.map((key,i)=>{
      const done=allDone || i<index || current==='completed' && i===index;
      const now=!done && i===index;
      return '<div role="listitem" class="st-step ' + (done?'done':now?'now':'') + '"' + (now?' aria-current="step"':'') + '><span class="st-dot">' + (done?'✓':i+1) + '</span><span class="st-label">' + FLOW_LABELS[key] + '</span></div>';
    }).join('') + '</div>';
  }
  if(order.jobType!=='veneers') return '<div class="stage-tracker">' + steps(ONE_STEP_FLOW,status) + '</div>';
  const demo=order.stageType==='demo';
  return '<div class="stage-tracker two-part"><div><div class="st-group-label">1 · Demo / design</div>' + steps(['pending_reception_review','in_design','waiting_doctor_approval','doctor_approved'],demo?status:null,!demo) + '</div><div><div class="st-group-label">2 · Final production</div>' + steps(['assigned_to_technician','in_production','qc_pending','qc_approved','ready_for_pickup','completed'],demo?null:['doctor_approved','in_design'].includes(status)?'assigned_to_technician':status) + '</div></div>';
}
