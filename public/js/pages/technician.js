// Production — a manufacturing queue and nothing else.
//
// A technician should be able to answer "what do I make next" without
// reading a status, and should have somewhere to put a genuine blocker
// other than leaving the case looking like work in progress. Both live
// one click away, in the shared case screen's Production tab.
import { UI } from '../state.js';
import { esc } from '../utils/format.js';
import { listOrders } from '../utils/ordersApi.js';
import { showCaseCenter } from '../components/caseCenter.js';
import { caseQueue, attachCaseQueue, queueTabs, attachQueueSearch, metricCard, defaultQueue } from '../components/caseQueue.js';
import { renderCurrent } from '../router.js';

const QUEUES = {
  active: {
    label: 'In production',
    match: o => o.status === 'in_production',
    empty: { title: 'Production queue is clear', text: 'No cases are currently waiting to be manufactured.' }
  },
  blocked: {
    label: 'Blocked',
    match: o => o.status === 'blocked',
    empty: { title: 'Nothing blocked', text: 'Cases you flag as blocked appear here until the issue is resolved.' }
  },
  qc: {
    label: 'Sent to QC',
    match: o => ['production_done', 'qc_pending'].includes(o.status),
    empty: { title: 'Nothing with QC', text: 'Cases you finish and send for inspection appear here.' }
  },
  all: { label: 'Everything', match: () => true, empty: { title: 'Nothing assigned to you', text: 'Work reaches you from design, or straight from reception on cases that need no design.' } }
};

export async function renderTechnician() {
  let orders = [];
  try { orders = (await listOrders('technician')).orders; }
  catch (error) {
    return '<div class="page"><div class="u"><div class="page-head"><div><span class="eyebrow-accent">Lab · Production</span><h1>Production queue</h1></div></div>' +
      '<div class="case-alert case-alert-danger"><strong>Couldn\'t load your queue.</strong><p>' + esc(error.message) + '</p>' +
      '<button class="btn btn-ghost" id="retryPage">Try again</button></div></div></div>';
  }

  // Smart default: what is ready to be made.
  const counts = Object.fromEntries(Object.entries(QUEUES).map(([key, q]) => [key, orders.filter(q.match).length]));
  const active = defaultQueue(QUEUES, counts, UI.technicianTab, 'active');
  UI.technicianTab = active;
  const urgent = orders.filter(o => QUEUES.active.match(o) && (o.view || {}).priority === 'urgent').length;

  return '<div class="page"><div class="u">' +
    '<div class="page-head"><div><span class="eyebrow-accent">Lab · Production</span><h1>Production queue</h1>' +
      '<p class="lede">What needs making, in the order it should be made. Open a case for its brief, files and steps.</p></div></div>' +

    '<div class="stat-row">' +
      metricCard(counts.active, 'To make', { iconName: 'box', meta: urgent ? urgent + ' urgent' : '', tone: urgent ? 'gold' : '', filter: 'active' }) +
      metricCard(counts.blocked, 'Blocked', { iconName: 'alert', tone: counts.blocked ? 'danger' : '', meta: counts.blocked ? 'Needs resolving' : 'None', filter: 'blocked' }) +
      metricCard(counts.qc, 'With QC', { iconName: 'check', filter: 'qc' }) +
    '</div>' +

    queueTabs(Object.entries(QUEUES).map(([key, q]) => [key, q.label, counts[key]]), active, 'technician-tab') +
    '<div class="workspace-toolbar"><input type="search" id="technicianSearch" aria-label="Search your queue" placeholder="Search case number, patient or treatment…"></div>' +
    '<section aria-live="polite">' + caseQueue(orders.filter(QUEUES[active].match), { empty: QUEUES[active].empty }) + '</section>' +
    '<p class="empty-note" id="technicianNoMatch" hidden>No cases match your search.</p>' +
  '</div></div>';
}

export function attachTechnicianHandlers() {
  document.querySelectorAll('[data-technician-tab]').forEach(button => button.addEventListener('click', () => {
    UI.technicianTab = button.dataset.technicianTab; renderCurrent();
  }));
  document.querySelectorAll('[data-queue-metric]').forEach(button => button.addEventListener('click', () => {
    UI.technicianTab = button.dataset.queueMetric; renderCurrent();
  }));
  attachCaseQueue('technician', id => showCaseCenter('technician', id, { tab: 'production' }));
  attachQueueSearch('technicianSearch', 'technicianNoMatch');
}
