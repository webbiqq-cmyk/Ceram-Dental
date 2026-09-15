// Shared renderers for the lab-wide operational read (/api/lab/overview).
// Used by both the Lab Studio overview and the Administration dashboard —
// the same numbers, drawn the same way, so the manager and the
// administrator are never looking at two different versions of today.
import { esc } from '../utils/format.js';
import { durationShort } from '../utils/caseView.js';
import { jobTypeLabel } from '../utils/workflow.js';
import { icon } from './icons.js';
import { emptyState } from './emptyState.js';

/** The day in one line. Only counts that are actually actionable. */
export function todayStrip(today) {
  const tiles = [
    [today.active, 'Active cases', '', ''],
    [today.need_action, 'Need action', today.need_action ? 'Blocked, overdue or stalled' : 'Nothing outstanding', today.need_action ? 'danger' : ''],
    [today.waiting_on_dentist, 'Waiting on doctors', '', ''],
    [today.due_today, 'Due today', '', today.due_today ? 'gold' : ''],
    [today.overdue, 'Overdue', '', today.overdue ? 'danger' : '']
  ];
  return '<div class="lab-today">' + tiles.map(([value, label, meta, tone]) =>
    '<div class="lab-today-tile' + (tone ? ' tone-' + tone : '') + '"><div class="n">' + value + '</div><div class="l">' + esc(label) + '</div>' +
    (meta ? '<div class="m">' + esc(meta) + '</div>' : '') + '</div>').join('') + '</div>';
}

/**
 * The pipeline. Bar width is each station's share of the active board, so
 * a bottleneck is visible as a shape rather than as a number somebody has
 * to compare against five others. Drawn in CSS — a charting library for
 * six bars would cost more to download than the entire application.
 */
export function pipelineHtml(stations, { clickable = true } = {}) {
  const total = Math.max(1, stations.reduce((sum, s) => sum + s.total, 0));
  return '<div class="lab-pipeline-v2" role="group" aria-label="Case pipeline">' + stations.map(station => {
    const share = Math.round((station.total / total) * 100);
    const tag = clickable && station.route ? 'a' : 'div';
    const href = clickable && station.route ? ' href="#/' + station.route + '"' : '';
    return '<' + tag + ' class="pipe-stage' + (station.attention ? ' has-attention' : '') + '"' + href + '>' +
      '<div class="pipe-stage-head"><span class="pipe-label">' + esc(station.label) + '</span>' +
        '<span class="pipe-count">' + station.total + '</span></div>' +
      '<div class="pipe-bar"><span style="width:' + Math.max(share, station.total ? 6 : 0) + '%"></span></div>' +
      '<div class="pipe-meta">' +
        (station.attention ? '<span class="case-badge case-badge-danger">' + station.attention + ' need action</span>' : '') +
        (station.waiting_on_dentist ? '<span class="case-badge case-badge-info">' + station.waiting_on_dentist + ' with doctors</span>' : '') +
        (!station.attention && !station.waiting_on_dentist ? '<span class="case-muted">Clear</span>' : '') +
      '</div></' + tag + '>';
  }).join('') + '</div>';
}

/**
 * Exceptions, worst first. A manager's job is the cases that are not
 * behaving; the ones that are need no attention and get none here.
 */
export function attentionHtml(rows, { title = 'Attention required' } = {}) {
  if (!rows.length) {
    return '<section class="card">' + emptyState({
      iconName: 'check', title: 'Nothing needs attention',
      text: 'No case is blocked, overdue or sitting longer than it should.'
    }) + '</section>';
  }
  return '<section class="card attention-card"><h3>' + icon('alert') + ' ' + esc(title) + '</h3>' +
    '<ul class="attention-list">' + rows.map(row =>
      '<li><button type="button" class="attention-row" data-case-open="' + esc(row.id) + '">' +
        '<span class="attention-id">' + esc(row.order_number) + '</span>' +
        '<span class="attention-why">' + row.flags.map(f => '<span class="case-badge case-badge-' + f.tone + '">' + esc(f.label) + '</span>').join('') + '</span>' +
        '<span class="attention-detail">' + esc(row.headline) +
          (row.time_in_stage_ms ? ' · ' + esc(durationShort(row.time_in_stage_ms)) + ' in ' + esc(row.stage_label.toLowerCase()) : '') + '</span>' +
        '<span class="attention-owner">' + esc(row.owner_name || row.owner_label || 'Unassigned') + '</span>' +
      '</button></li>').join('') + '</ul></section>';
}

/** Who is carrying what right now — for assignment, not for scoring people. */
export function workloadHtml(workload) {
  if (!workload) return '';
  const groups = [['designer', 'Design'], ['technician', 'Production'], ['qc', 'Quality']];
  const populated = groups.filter(([key]) => (workload[key] || []).length);
  if (!populated.length) return '';
  return '<section class="card"><h3>Team workload</h3><p class="case-muted">Active cases currently at each person\'s station.</p>' +
    '<div class="workload-grid">' + populated.map(([key, label]) =>
      '<div class="workload-group"><span class="eyebrow">' + esc(label) + '</span>' +
        (workload[key] || []).slice(0, 6).map(person =>
          '<div class="workload-row"><span>' + esc(person.name) + '</span>' +
          '<span class="workload-count' + (person.urgent ? ' has-urgent' : '') + '">' + person.active +
          (person.urgent ? ' · ' + person.urgent + ' urgent' : '') + '</span></div>').join('') +
      '</div>').join('') + '</div></section>';
}

/**
 * Turnaround and quality. Both refuse to print a figure until there are
 * enough finished cases for one to mean anything — an average of three
 * cases is a number, not a fact, and a dashboard that shows it teaches
 * people to distrust the dashboard.
 */
export function analyticsHtml(turnaround, quality, treatments) {
  const cards = [];
  cards.push('<div class="analytic"><span class="eyebrow">Average turnaround</span>' +
    (turnaround && turnaround.sufficient
      ? '<strong>' + esc(durationShort(turnaround.average_ms)) + '</strong><p class="case-muted">Across ' + turnaround.sample_size + ' completed cases.</p>'
      : '<strong class="is-muted">Not enough data</strong><p class="case-muted">' + ((turnaround && turnaround.sample_size) || 0) + ' completed so far — an average needs at least 5.</p>') + '</div>');

  cards.push('<div class="analytic"><span class="eyebrow">QC first-pass rate</span>' +
    (quality && quality.sufficient
      ? '<strong>' + quality.first_pass_rate + '%</strong><p class="case-muted">' +
        (quality.repeat_failures ? quality.repeat_failures + ' case' + (quality.repeat_failures === 1 ? '' : 's') + ' failed more than once.' : 'No case has failed twice.') + '</p>'
      : '<strong class="is-muted">Not enough data</strong><p class="case-muted">' + ((quality && quality.sample_size) || 0) + ' inspected so far.</p>') + '</div>');

  const reasons = (quality && quality.top_reasons) || [];
  if (reasons.length) {
    cards.push('<div class="analytic"><span class="eyebrow">Most common rework reason</span>' +
      '<strong class="is-text">' + esc(reasons[0].reason) + '</strong>' +
      '<p class="case-muted">' + reasons[0].count + ' occurrence' + (reasons[0].count === 1 ? '' : 's') + '.</p></div>');
  }

  const mix = (treatments || []).slice(0, 5);
  const mixTotal = Math.max(1, mix.reduce((sum, t) => sum + t.count, 0));
  if (mix.length) {
    cards.push('<div class="analytic analytic-wide"><span class="eyebrow">Active case mix</span>' +
      '<div class="mix-bars">' + mix.map(t =>
        '<div class="mix-row"><span>' + esc(jobTypeLabel(t.job_type)) + '</span>' +
        '<span class="mix-bar"><i style="width:' + Math.round((t.count / mixTotal) * 100) + '%"></i></span>' +
        '<b>' + t.count + '</b></div>').join('') + '</div></div>');
  }

  return '<section class="card"><h3>Operations</h3><div class="analytic-grid">' + cards.join('') + '</div></section>';
}
