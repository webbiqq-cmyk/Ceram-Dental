// Design — a personal work queue.
//
// A designer's question is never "what is the state of the lab", it is
// "what am I making next, and is anything of mine stuck". So this is one
// list with the answer on every row, opening into the shared case screen
// where the brief, the files, the doctor conversation and the handoff all
// live together.
import { UI } from '../state.js';
import { esc } from '../utils/format.js';
import { listOrders } from '../utils/ordersApi.js';
import { showCaseCenter } from '../components/caseCenter.js';
import { caseQueue, attachCaseQueue, queueTabs, attachQueueSearch, metricCard, defaultQueue } from '../components/caseQueue.js';
import { renderCurrent } from '../router.js';

const QUEUES = {
  active: {
    label: 'To work on',
    match: o => o.status === 'in_design' && !o.rejection_note,
    empty: { title: 'Your queue is clear', text: 'New cases assigned to you will appear here.' }
  },
  changes: {
    label: 'Changes requested',
    match: o => o.status === 'in_design' && !!o.rejection_note,
    empty: { title: 'No change requests', text: 'Cases a dentist sends back for changes arrive here first.' }
  },
  waiting: {
    label: 'With the dentist',
    match: o => o.status === 'waiting_doctor_approval',
    empty: { title: 'Nothing awaiting approval', text: 'Demos you send for approval wait here until the dentist answers.' }
  },
  handoff: {
    label: 'Ready to hand off',
    match: o => o.status === 'doctor_approved' || o.status === 'design_done',
    empty: { title: 'Nothing to hand over', text: 'Approved designs waiting for a technician appear here.' }
  },
  all: { label: 'Everything', match: () => true, empty: { title: 'No cases assigned to you', text: 'Reception assigns design work from the intake queue.' } }
};

export async function renderDesigner() {
  let orders = [];
  try { orders = (await listOrders('designer')).orders; }
  catch (error) {
    return '<div class="page"><div class="u"><div class="page-head"><div><span class="eyebrow-accent">Lab · Design</span><h1>My design queue</h1></div></div>' +
      '<div class="case-alert case-alert-danger"><strong>Couldn\'t load your queue.</strong><p>' + esc(error.message) + '</p>' +
      '<button class="btn btn-ghost" id="retryPage">Try again</button></div></div></div>';
  }

  // Smart default: what is actually assigned and workable right now.
  const counts = Object.fromEntries(Object.entries(QUEUES).map(([key, q]) => [key, orders.filter(q.match).length]));
  const active = defaultQueue(QUEUES, counts, UI.designerTab, 'active');
  UI.designerTab = active;
  const attention = orders.filter(o => (o.view || {}).needs_attention).length;

  return '<div class="page"><div class="u">' +
    '<div class="page-head"><div><span class="eyebrow-accent">Lab · Design</span><h1>My design queue</h1>' +
      '<p class="lede">Everything assigned to you, with the doctor\'s brief and a direct line to ask them anything.</p></div></div>' +

    '<div class="stat-row">' +
      metricCard(counts.active, 'To work on', { iconName: 'sliders', filter: 'active' }) +
      metricCard(counts.changes, 'Changes requested', { iconName: 'alert', tone: counts.changes ? 'danger' : '', meta: counts.changes ? 'Action required' : '', filter: 'changes' }) +
      metricCard(counts.waiting, 'With the dentist', { iconName: 'clock', filter: 'waiting' }) +
      metricCard(attention, 'Needs attention', { iconName: 'alert', tone: attention ? 'danger' : '', meta: attention ? 'Overdue or stalled' : 'Nothing overdue' }) +
    '</div>' +

    queueTabs(Object.entries(QUEUES).map(([key, q]) => [key, q.label, counts[key]]), active, 'designer-tab') +
    '<div class="workspace-toolbar"><input type="search" id="designerSearch" aria-label="Search your queue" placeholder="Search case number, patient or treatment…"></div>' +
    '<section aria-live="polite">' + caseQueue(orders.filter(QUEUES[active].match), { empty: QUEUES[active].empty }) + '</section>' +
    '<p class="empty-note" id="designerNoMatch" hidden>No cases match your search.</p>' +
  '</div></div>';
}

export function attachDesignerHandlers() {
  document.querySelectorAll('[data-designer-tab]').forEach(button => button.addEventListener('click', () => {
    UI.designerTab = button.dataset.designerTab; renderCurrent();
  }));
  document.querySelectorAll('[data-queue-metric]').forEach(button => button.addEventListener('click', () => {
    UI.designerTab = button.dataset.queueMetric; renderCurrent();
  }));
  attachCaseQueue('designer', id => showCaseCenter('designer', id, { tab: 'design' }));
  attachQueueSearch('designerSearch', 'designerNoMatch');
}
