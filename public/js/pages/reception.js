// Reception — the intake gate and the collection desk.
//
// Reception is the only station that sees a case twice: once on the way
// in, where the job is to stop an incomplete order before it costs the
// lab a day, and once on the way out, where the job is to get finished
// work to the right clinic. So this page is queues, not a dashboard: the
// work sits in the tab that is open by default (New orders), and every
// row opens the one case screen the whole lab shares.
import { UI } from '../state.js';
import { esc } from '../utils/format.js';
import { listOrders, labOverview } from '../utils/ordersApi.js';
import { showCaseCenter } from '../components/caseCenter.js';
import { caseQueue, attachCaseQueue, queueTabs, attachQueueSearch, metricCard, defaultQueue } from '../components/caseQueue.js';
import { renderCurrent } from '../router.js';

// Reception's queues, mapped from the case's own derived stage and flags
// rather than from a hand-written list of statuses — so a new status
// added to the workflow lands in the right queue without touching this.
const QUEUES = {
  incoming: {
    label: 'New orders', icon: 'inbox',
    match: o => o.status === 'pending_reception_review',
    empty: { title: 'No new orders waiting', text: 'Orders submitted by clinics land here for checking.', iconName: 'check' }
  },
  returned: {
    label: 'With the clinic', icon: 'alert',
    match: o => (o.view || {}).waiting_on === 'dentist',
    empty: { title: 'Nothing waiting on a clinic', text: 'Cases you send back, and designs awaiting approval, appear here.' }
  },
  attention: {
    label: 'Needs attention', icon: 'alert',
    match: o => (o.view || {}).needs_attention && !(o.view || {}).is_closed,
    empty: { title: 'Nothing needs chasing', text: 'Blocked and overdue cases, and anything waiting longer than expected, surface here first.' }
  },
  lab: {
    label: 'In the lab', icon: 'sliders',
    match: o => { const v = o.view || {}; return !v.is_closed && v.waiting_on === 'lab' && !['reception', 'collection'].includes(v.stage); },
    empty: { title: 'The lab floor is clear', text: 'Cases in design, production or QC appear here.' }
  },
  collection: {
    label: 'Ready & collection', icon: 'box',
    match: o => (o.view || {}).stage === 'collection' && !(o.view || {}).is_closed,
    empty: { title: 'Nothing ready for collection', text: 'Cases that pass QC arrive here to be released and handed over.' }
  },
  completed: {
    label: 'Completed', icon: 'history',
    match: o => (o.view || {}).is_closed,
    empty: { title: 'No completed cases yet', text: 'Closed cases stay here as a permanent record.' }
  }
};

export async function renderReception() {
  let orders = [], overview = null;
  try {
    [orders, overview] = await Promise.all([
      listOrders('receptionist').then(r => r.orders),
      labOverview('receptionist').catch(() => null)
    ]);
  } catch (error) {
    return errorPage('Order intake', error.message);
  }

  // Smart default: reception's day starts with what just came in.
  const counts = Object.fromEntries(Object.entries(QUEUES).map(([key, q]) => [key, orders.filter(q.match).length]));
  const active = defaultQueue(QUEUES, counts, UI.receptionTab, 'incoming');
  UI.receptionTab = active;
  const today = (overview && overview.today) || {};

  return '<div class="page"><div class="u">' +
    '<div class="page-head"><div><span class="eyebrow-accent">Lab · Reception</span><h1>Order intake &amp; collection</h1>' +
      '<p class="lede">Check every new order before it reaches the floor, and get finished work back to the clinic.</p></div></div>' +

    '<div class="stat-row">' +
      metricCard(counts.incoming, 'To review', { iconName: 'inbox', meta: counts.incoming ? 'Check and assign' : 'All clear', tone: counts.incoming ? 'gold' : '', filter: 'incoming' }) +
      metricCard(counts.attention, 'Needs attention', { iconName: 'alert', meta: today.blocked ? today.blocked + ' blocked' : (today.overdue ? today.overdue + ' overdue' : ''), tone: counts.attention ? 'danger' : '', filter: 'attention' }) +
      metricCard(counts.returned, 'Waiting on clinics', { iconName: 'clock', filter: 'returned' }) +
      metricCard(counts.collection, 'Ready for collection', { iconName: 'box', filter: 'collection' }) +
    '</div>' +

    queueTabs(Object.entries(QUEUES).map(([key, q]) => [key, q.label, counts[key]]), active, 'reception-tab') +

    '<div class="workspace-toolbar">' +
      '<input type="search" id="receptionSearch" aria-label="Search this queue" placeholder="Search case number, patient, clinic or treatment…">' +
    '</div>' +

    '<section aria-live="polite">' + caseQueue(orders.filter(QUEUES[active].match), { empty: QUEUES[active].empty }) + '</section>' +
    '<p class="empty-note" id="receptionNoMatch" hidden>No cases in this queue match your search.</p>' +
  '</div></div>';
}

function errorPage(title, message) {
  return '<div class="page"><div class="u"><div class="page-head"><div><span class="eyebrow-accent">Lab · Reception</span><h1>' + esc(title) + '</h1></div></div>' +
    '<div class="case-alert case-alert-danger"><strong>Couldn\'t load the queue.</strong><p>' + esc(message) + '</p>' +
    '<button class="btn btn-ghost" id="retryPage">Try again</button></div></div></div>';
}

export function attachReceptionHandlers() {
  document.querySelectorAll('[data-reception-tab]').forEach(button => button.addEventListener('click', () => {
    UI.receptionTab = button.dataset.receptionTab;
    renderCurrent();
  }));
  document.querySelectorAll('[data-queue-metric]').forEach(button => button.addEventListener('click', () => {
    UI.receptionTab = button.dataset.queueMetric;
    renderCurrent();
  }));
  attachCaseQueue('receptionist', id => showCaseCenter('receptionist', id, { tab: UI.receptionTab === 'incoming' ? 'intake' : 'overview' }));
  attachQueueSearch('receptionSearch', 'receptionNoMatch');
}
