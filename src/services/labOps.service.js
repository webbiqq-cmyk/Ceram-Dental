// The lab-wide read: how much work exists, where it is, what has stopped
// moving, and who is carrying it. Every figure here is counted from real
// job_orders rows through the same caseView derivation the individual
// screens use, so a case the Lab Overview calls "stalled in design" is the
// same case the designer's own queue flags — there is no second definition
// of anything.
//
// Deliberately not a metrics framework: one aggregate, computed on demand,
// over the orders the lab already lists. Analytics that can't be computed
// honestly from the data present are omitted rather than estimated.
const repo = require('../db/jobOrders.store');
const caseView = require('./caseView');

// The stations a case can be sitting at, in pipeline order. Mapped from
// the derived journey step rather than raw status, so adding a status
// changes nothing here.
const STATIONS = [
  { key: 'reception', label: 'Reception', route: 'reception' },
  { key: 'design', label: 'Design', route: 'designer' },
  { key: 'approval', label: 'With dentist', route: null },
  { key: 'production', label: 'Production', route: 'technician' },
  { key: 'qc', label: 'Quality check', route: 'qc' },
  { key: 'collection', label: 'Ready', route: 'reception' }
];

const ACTIVE = order => order.view && !order.view.is_closed;

function average(values) {
  const usable = values.filter(v => Number.isFinite(v) && v >= 0);
  if (!usable.length) return null;
  return Math.round(usable.reduce((sum, v) => sum + v, 0) / usable.length);
}

/**
 * @param scope 'lab' for the floor view, 'admin' for the same plus the
 *              per-person workload and turnaround panels. The caller has
 *              already been authorised; this only decides how much is
 *              worth computing.
 */
async function overview(scope = 'lab') {
  const rows = await repo.listOrders('lab', null, { limit: 1000, offset: 0 });
  const orders = caseView.withViews(rows, { audience: 'lab' });
  const active = orders.filter(ACTIVE);

  const stations = STATIONS.map(station => {
    const here = active.filter(o => o.view.stage === station.key);
    return {
      key: station.key, label: station.label, route: station.route,
      total: here.length,
      // Three numbers per station, because "8 cases in design" alone
      // doesn't tell a manager whether to worry.
      waiting_on_dentist: here.filter(o => o.view.waiting_on === 'dentist').length,
      blocked: here.filter(o => o.view.is_blocked).length,
      attention: here.filter(o => o.view.needs_attention).length
    };
  });

  // Exceptions, worst first, each carrying the reason it is listed so the
  // panel never shows a case without saying why it's there.
  const attention = active
    .filter(o => o.view.needs_attention)
    .map(o => ({
      id: o.id, order_number: o.order_number, job_type: o.job_type, patient_ref: o.patient_ref,
      stage_label: o.view.stage_label, headline: o.view.headline,
      owner_label: o.view.owner_label, owner_name: o.view.owner_name,
      priority: o.view.priority, time_in_stage_ms: o.view.time_in_stage_ms,
      flags: o.view.flags, due: o.view.due
    }))
    .sort((a, b) => severity(b) - severity(a) || (b.time_in_stage_ms || 0) - (a.time_in_stage_ms || 0))
    .slice(0, 25);

  const today = {
    active: active.length,
    need_action: active.filter(o => o.view.needs_attention).length,
    waiting_on_dentist: active.filter(o => o.view.waiting_on === 'dentist').length,
    due_today: active.filter(o => o.view.due && o.view.due.state === 'due_today').length,
    overdue: active.filter(o => o.view.due && o.view.due.state === 'overdue').length,
    blocked: active.filter(o => o.view.is_blocked).length,
    unassigned: active.filter(o => o.view.stage === 'design' && !o.assigned_designer_id).length,
    ready: active.filter(o => o.view.stage === 'collection').length
  };

  const result = { today, stations, attention };
  if (scope === 'admin') {
    result.workload = workload(active);
    result.turnaround = await turnaround();
    result.quality = await quality();
    result.treatments = treatments(active);
  }
  return result;
}

const SEVERITY = { blocked: 5, overdue: 4, rework: 3, returned: 2, stalled: 2, urgent: 1 };
function severity(row) { return Math.max(0, ...row.flags.map(f => SEVERITY[f.key] || 0)); }

// Who is carrying what, for assignment decisions — not for grading people.
// Counted from the live assigned_* columns only, so it always reflects the
// board as it is right now.
function workload(active) {
  const buckets = { designer: new Map(), technician: new Map(), qc: new Map() };
  const field = { designer: ['assigned_designer_id', 'designer_name'], technician: ['assigned_technician_id', 'technician_name'], qc: ['assigned_qc_id', 'qc_name'] };
  for (const order of active) {
    for (const role of Object.keys(buckets)) {
      const [idKey, nameKey] = field[role];
      // Only count a case against someone while it is actually at their
      // station — a designer shouldn't look overloaded because six of
      // their old cases are sitting in QC.
      const atTheirStation = { designer: 'design', technician: 'production', qc: 'qc' }[role] === order.view.stage;
      if (!order[idKey] || !atTheirStation) continue;
      const entry = buckets[role].get(order[idKey]) || { id: order[idKey], name: order[nameKey] || 'Unassigned', active: 0, urgent: 0 };
      entry.active += 1;
      if (order.view.priority === 'urgent') entry.urgent += 1;
      buckets[role].set(order[idKey], entry);
    }
  }
  return Object.fromEntries(Object.entries(buckets).map(([role, map]) =>
    [role, [...map.values()].sort((a, b) => b.active - a.active)]));
}

// Turnaround is reported only when there are enough finished cases for an
// average to mean anything. Below that the panel says so instead of
// printing a number derived from two cases.
const MIN_SAMPLES = 5;
async function turnaround() {
  const samples = await repo.completionSamples(500);
  const durations = samples.map(s => new Date(s.completed_at).getTime() - new Date(s.created_at).getTime());
  return {
    sample_size: samples.length,
    sufficient: samples.length >= MIN_SAMPLES,
    average_ms: samples.length >= MIN_SAMPLES ? average(durations) : null
  };
}

// First-pass rate: of the cases QC has ruled on, how many passed without
// ever being sent back. Counted per case, not per inspection, or a single
// case failing four times would look like four bad cases.
async function quality() {
  const samples = await repo.qcSamples(1000);
  const byCase = new Map();
  for (const row of samples) {
    const entry = byCase.get(row.job_order_id) || { failures: 0, passed: false, reasons: [] };
    if (row.outcome === 'approved') entry.passed = true;
    else { entry.failures += 1; if (row.note) entry.reasons.push(String(row.note).split('\n')[0].slice(0, 80)); }
    byCase.set(row.job_order_id, entry);
  }
  const cases = [...byCase.values()];
  const reasons = new Map();
  for (const c of cases) for (const reason of c.reasons) reasons.set(reason, (reasons.get(reason) || 0) + 1);
  return {
    sample_size: cases.length,
    sufficient: cases.length >= MIN_SAMPLES,
    first_pass_rate: cases.length >= MIN_SAMPLES ? Math.round((cases.filter(c => c.failures === 0).length / cases.length) * 100) : null,
    repeat_failures: cases.filter(c => c.failures >= 2).length,
    top_reasons: [...reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([reason, count]) => ({ reason, count }))
  };
}

function treatments(active) {
  const counts = new Map();
  for (const order of active) counts.set(order.job_type, (counts.get(order.job_type) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([job_type, count]) => ({ job_type, count }));
}

module.exports = { overview, STATIONS };
