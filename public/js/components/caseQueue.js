// The shared queue. Every station in the lab looks at a list of cases and
// asks the same four questions of each row — what is it, where is it, who
// has it, when is it due — so every station renders the same row, and the
// only thing that differs is which cases are in it.
//
// Two densities, because a lab's Monday morning and a designer's personal
// queue are not the same screen: cards when there are a handful of cases
// and the extra context helps, a compact table once a queue is long enough
// that scanning matters more than detail. The switch is automatic; nobody
// should have to choose a view mode to get their work done.
import { esc } from '../utils/format.js';
import { jobTypeLabel } from '../utils/workflow.js';
import { statusChip, priorityBadge, dueBadge, flagChips, durationShort } from '../utils/caseView.js';
import { emptyState } from './emptyState.js';
import { icon } from './icons.js';

const CARD_LIMIT = 8;

function searchKey(order) {
  return [order.order_number, order.patient_ref, jobTypeLabel(order.job_type), order.dentist_name,
    order.designer_name, order.technician_name, order.qc_name, (order.view || {}).headline]
    .filter(Boolean).join(' ').toLowerCase();
}

function cardHtml(order) {
  const v = order.view || {};
  return '<button type="button" class="case-card' + (v.needs_attention ? ' is-attention' : '') + '" data-case-open="' + esc(order.id) + '" data-case-search="' + esc(searchKey(order)) + '">' +
    '<div class="cc-top">' +
      '<div><div class="cc-id">' + esc(order.order_number) + '</div>' +
      '<div class="cc-type">' + esc(jobTypeLabel(order.job_type)) +
        (order.job_type === 'veneers' ? ' · ' + (order.stage_type === 'demo' ? 'Demo' : 'Final') : '') + '</div></div>' +
      '<div class="cc-badges">' + priorityBadge(v) + dueBadge(v) + '</div>' +
    '</div>' +
    '<div class="cc-title">' + esc(order.patient_ref || '—') + (order.shade ? ' · Shade ' + esc(order.shade) : '') + '</div>' +
    '<div class="cc-status">' + statusChip(order) + '</div>' +
    (v.next_action ? '<p class="cc-next">' + esc(v.next_action) + '</p>' : '') +
    flagChips(v) +
    '<div class="cc-foot">' +
      '<span class="cc-owner">' + esc(v.owner_name || v.owner_label || '—') +
        (v.time_in_stage_ms ? ' · ' + esc(durationShort(v.time_in_stage_ms)) : '') + '</span>' +
      '<span class="cc-open">Open case →</span>' +
    '</div>' +
  '</button>';
}

function rowHtml(order) {
  const v = order.view || {};
  return '<tr class="clickable' + (v.needs_attention ? ' is-attention' : '') + '" data-case-open="' + esc(order.id) + '" data-case-search="' + esc(searchKey(order)) + '">' +
    '<td class="cid-cell">' + esc(order.order_number) + priorityBadge(v) + '</td>' +
    '<td>' + esc(jobTypeLabel(order.job_type)) + '</td>' +
    '<td>' + esc(order.patient_ref || '—') + '</td>' +
    '<td>' + statusChip(order) + '</td>' +
    '<td>' + esc(v.owner_name || v.owner_label || '—') + '</td>' +
    '<td>' + (v.due ? dueBadge(v) : '<span class="case-muted">—</span>') + '</td>' +
    '<td>' + (v.time_in_stage_ms ? esc(durationShort(v.time_in_stage_ms)) : '—') + '</td>' +
    '<td><span class="cc-open">Open →</span></td>' +
  '</tr>';
}

/**
 * @param orders  the cases in this queue, already filtered by the caller.
 * @param empty   {title, text, iconName} for an honestly empty queue —
 *                "nothing waiting" is good news and should read like it.
 * @param density 'auto' (default), 'cards' or 'table'.
 */
export function caseQueue(orders, { empty = {}, density = 'auto' } = {}) {
  if (!orders.length) {
    return emptyState({
      iconName: empty.iconName || 'check',
      title: empty.title || 'Nothing here',
      text: empty.text || ''
    });
  }
  const useTable = density === 'table' || (density === 'auto' && orders.length > CARD_LIMIT);
  if (!useTable) return '<div class="case-list">' + orders.map(cardHtml).join('') + '</div>';
  return '<div class="table-wrap"><table class="cases-table queue-table">' +
    '<thead><tr><th>Case</th><th>Treatment</th><th>Patient</th><th>Status</th><th>Owner</th><th>Due</th><th>In stage</th><th></th></tr></thead>' +
    '<tbody>' + orders.map(rowHtml).join('') + '</tbody></table></div>';
}

/** Wires every row/card in the page to open the command center. */
export function attachCaseQueue(role, open) {
  document.querySelectorAll('[data-case-open]').forEach(el => el.addEventListener('click', () => open(el.dataset.caseOpen)));
}

/**
 * Picks which queue to open on.
 *
 * A remembered choice always wins — someone who switched tabs meant it.
 * Otherwise the station's own default, unless that default is empty and
 * another queue is not: landing a designer on an empty "To work on" while
 * three of their cases sit in "Changes requested" is technically the
 * right default and practically a dead end.
 */
export function defaultQueue(queues, counts, remembered, preferred) {
  if (remembered && queues[remembered]) return remembered;
  if (counts[preferred]) return preferred;
  const populated = Object.keys(queues).find(key => key !== 'all' && counts[key]);
  return populated || preferred;
}

/** Queue tabs. `counts` keeps each tab honest about how much is behind it. */
export function queueTabs(tabs, activeKey, attribute) {
  return '<div class="workspace-tabs" role="tablist" aria-label="Queues">' + tabs.map(([key, label, count]) =>
    '<button type="button" data-' + attribute + '="' + key + '" aria-pressed="' + (key === activeKey) + '">' +
      esc(label) + '<span class="tab-count">' + count + '</span></button>').join('') + '</div>';
}

/** Filters a rendered queue in place — no refetch, no re-render. */
export function attachQueueSearch(inputId, emptyId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll('[data-case-search]').forEach(el => {
      const hit = !query || el.dataset.caseSearch.includes(query);
      el.hidden = !hit;
      if (hit) shown += 1;
    });
    const none = document.getElementById(emptyId);
    if (none) none.hidden = shown !== 0;
  });
}

export function metricCard(count, label, { iconName, meta, tone, filter } = {}) {
  const tag = filter ? 'button' : 'div';
  return '<' + tag + ' class="stat-card stat-card-v2' + (tone ? ' tone-' + tone : '') + '"' + (filter ? ' type="button" data-queue-metric="' + esc(filter) + '"' : '') + '>' +
    (iconName ? '<div class="stat-card-icon">' + icon(iconName) + '</div>' : '') +
    '<div class="stat-card-body"><div class="n">' + count + '</div><div class="l">' + esc(label) + '</div>' +
    (meta ? '<div class="stat-card-meta' + (tone === 'danger' ? ' is-action' : '') + '">' + esc(meta) + '</div>' : '') +
    '</div></' + tag + '>';
}
