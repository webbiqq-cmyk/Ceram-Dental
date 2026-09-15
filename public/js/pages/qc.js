// Quality inspection — what needs inspecting, and what has been inspected.
//
// The checklist, the evidence and the pass/rework decision all live in the
// shared case screen's Quality check tab, alongside the full inspection
// history: a case that failed twice before passing says so permanently,
// which is the entire point of keeping QC decisions rather than only the
// current status.
import { UI } from '../state.js';
import { esc } from '../utils/format.js';
import { listOrders } from '../utils/ordersApi.js';
import { showCaseCenter } from '../components/caseCenter.js';
import { caseQueue, attachCaseQueue, queueTabs, attachQueueSearch, metricCard, defaultQueue } from '../components/caseQueue.js';
import { renderCurrent } from '../router.js';

const QUEUES = {
  awaiting: {
    label: 'Awaiting inspection',
    match: o => o.status === 'qc_pending',
    empty: { title: 'Nothing waiting for inspection', text: 'Cases arrive here when production finishes them.' }
  },
  rework: {
    label: 'Out for rework',
    match: o => o.status === 'qc_rejected' || (o.status === 'in_production' && !!o.assigned_qc_id),
    empty: { title: 'Nothing out for rework', text: 'Cases you send back appear here until production returns them.' }
  },
  passed: {
    label: 'Passed',
    match: o => ['qc_approved', 'ready_for_pickup', 'ready_for_delivery', 'delivered', 'completed'].includes(o.status),
    empty: { title: 'No passed cases yet', text: 'Cases you approve move to reception for collection.' }
  },
  all: { label: 'Everything', match: () => true, empty: { title: 'No cases assigned to you', text: 'Technicians send cases here when production is complete.' } }
};

export async function renderQC() {
  let orders = [];
  try { orders = (await listOrders('qc')).orders; }
  catch (error) {
    return '<div class="page"><div class="u"><div class="page-head"><div><span class="eyebrow-accent">Lab · Quality inspection</span><h1>Quality inspection</h1></div></div>' +
      '<div class="case-alert case-alert-danger"><strong>Couldn\'t load your queue.</strong><p>' + esc(error.message) + '</p>' +
      '<button class="btn btn-ghost" id="retryPage">Try again</button></div></div></div>';
  }

  // Smart default: what needs inspecting.
  const counts = Object.fromEntries(Object.entries(QUEUES).map(([key, q]) => [key, orders.filter(q.match).length]));
  const active = defaultQueue(QUEUES, counts, UI.qcTab, 'awaiting');
  UI.qcTab = active;

  return '<div class="page"><div class="u">' +
    '<div class="page-head"><div><span class="eyebrow-accent">Lab · Quality inspection</span><h1>Quality inspection</h1>' +
      '<p class="lede">Work through the checklist, record what you find, and pass or return the case.</p></div></div>' +

    '<div class="stat-row">' +
      metricCard(counts.awaiting, 'Awaiting inspection', { iconName: 'check', tone: counts.awaiting ? 'gold' : '', filter: 'awaiting' }) +
      metricCard(counts.rework, 'Out for rework', { iconName: 'alert', tone: counts.rework ? 'danger' : '', filter: 'rework' }) +
      metricCard(counts.passed, 'Passed', { iconName: 'box', filter: 'passed' }) +
    '</div>' +

    queueTabs(Object.entries(QUEUES).map(([key, q]) => [key, q.label, counts[key]]), active, 'qc-tab') +
    '<div class="workspace-toolbar"><input type="search" id="qcSearch" aria-label="Search your queue" placeholder="Search case number, patient or treatment…"></div>' +
    '<section aria-live="polite">' + caseQueue(orders.filter(QUEUES[active].match), { empty: QUEUES[active].empty }) + '</section>' +
    '<p class="empty-note" id="qcNoMatch" hidden>No cases match your search.</p>' +
  '</div></div>';
}

export function attachQCHandlers() {
  document.querySelectorAll('[data-qc-tab]').forEach(button => button.addEventListener('click', () => {
    UI.qcTab = button.dataset.qcTab; renderCurrent();
  }));
  document.querySelectorAll('[data-queue-metric]').forEach(button => button.addEventListener('click', () => {
    UI.qcTab = button.dataset.queueMetric; renderCurrent();
  }));
  attachCaseQueue('qc', id => showCaseCenter('qc', id, { tab: 'qc' }));
  attachQueueSearch('qcSearch', 'qcNoMatch');
}
