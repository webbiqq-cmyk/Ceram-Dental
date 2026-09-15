import { DATA, UI, api } from '../state.js';
import { esc, money, fmtDate, fmtDateTime, svcLabel, labelFor } from '../utils/format.js';
import { shadeCombo } from '../utils/design.js';
import { STAGES, STAGE_INDEX } from '../constants.js';
import { pillHtml } from '../components/drawer.js';
import { renderCurrent } from '../router.js';
import { renderLoginGate, attachAuthGateHandlers } from '../components/authGate.js';
import { jobTypeLabel, stageTrackerHtml } from '../utils/workflow.js';
import { listOrders, listDrafts, deleteDraft, getDraft, duplicateCase } from '../utils/ordersApi.js';
import { confirmAction } from '../components/confirm.js';
import { toast } from '../toast.js';
import { showCaseCenter } from '../components/caseCenter.js';
import { journeyHtml, statusChip, dueBadge, durationShort } from '../utils/caseView.js';
import { icon } from '../components/icons.js';
import { emptyState } from '../components/emptyState.js';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
const ACTIVITY_ICON = { in_design:'sliders', design_done:'sliders', in_production:'box', production_done:'box', qc_pending:'check', qc_approved:'check', waiting_doctor_approval:'alert', doctor_rejected:'alert', ready_for_pickup:'check', ready_for_delivery:'check', delivered:'check', completed:'check' };

function isSignedIn() { return !!(DATA.auth && DATA.auth.dentist); }

function portalCases() {
  if (!DATA.cases.length) return '<div class="empty-note">No cases yet — start one from the website.</div>';

  const active = DATA.cases.filter(c => c.stage !== 'ready').length;
  const review = DATA.cases.filter(c => c.stage === 'doctor_approval');
  const ready = DATA.cases.filter(c => c.stage === 'ready' && !c.pickedUp);
  const outstanding = DATA.invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);

  const strip = '<div class="stat-row reveal">' +
    '<div class="stat-card"><div class="n">' + active + '</div><div class="l">Active cases</div></div>' +
    '<div class="stat-card' + (review.length ? ' tone-gold' : '') + '"><div class="n">' + review.length + '</div><div class="l">Awaiting your review</div></div>' +
    '<div class="stat-card"><div class="n">' + ready.length + '</div><div class="l">Ready for pickup</div></div>' +
    '<div class="stat-card"><div class="n">' + money(outstanding) + '</div><div class="l">Outstanding balance</div></div>' +
  '</div>';

  const reviewBlock = review.length ? (
    '<div class="review-panel reveal"><div class="review-panel-head"><span class="eyebrow" style="color:var(--amber);">Action needed</span>' +
      '<h3 style="font-size:16px; margin-top:4px;">' + review.length + ' mockup' + (review.length === 1 ? '' : 's') + ' waiting on your approval</h3></div>' +
    review.map(c =>
      '<div class="review-item"><div><div class="cid-cell" style="font-size:13px;">' + c.id + ' · ' + esc(svcLabel(c.service)) + '</div>' +
        '<div style="font-size:12.5px; color:var(--ink-soft);">' + esc(c.patient) + ' · shade ' + esc(c.shade) + (c.design ? ' · ' + esc(c.design.material) : '') + '</div></div>' +
        '<div class="review-item-actions"><button class="btn btn-primary btn-sm" data-act="approve" data-id="' + c.id + '">Approve</button>' +
        '<button class="btn btn-danger-ghost btn-sm" data-act="reject" data-id="' + c.id + '">Request change</button>' +
        '<button class="btn btn-ghost btn-sm" data-open="' + c.id + '" data-from="mycases">Open</button></div></div>'
    ).join('') + '</div>'
  ) : '';

  const rows = DATA.cases.map(c => {
    const idx = STAGE_INDEX[c.stage];
    const dots = STAGES.map((s, i) => '<i class="' + (i < idx ? 'done' : (i === idx ? 'now' : '')) + '"></i>').join('');
    const last = c.history[c.history.length - 1];
    const hay = (c.id + ' ' + svcLabel(c.service) + ' ' + c.patient + ' ' + labelFor(c.stage) + ' ' + (c.design ? c.design.material : '')).toLowerCase();
    return '<tr class="clickable" data-open="' + c.id + '" data-from="mycases" data-hay="' + esc(hay) + '">' +
      '<td class="cid-cell">' + c.id + '</td><td>' + svcLabel(c.service) + '</td><td>' + esc(c.patient) + '</td>' +
      '<td>' + (c.design ? esc(c.design.material) + '<br><span style="color:var(--ink-soft); font-size:11.5px;">' + esc(shadeCombo(c.design.shade)) + '</span>' : '<span style="color:var(--ink-soft);">—</span>') + '</td>' +
      '<td>' + pillHtml(c) + (c.stage === 'doctor_approval' ? '<span class="action-flag">Review</span>' : '') + '<div class="progress-mini">' + dots + '</div></td>' +
      '<td>' + fmtDate(last ? last.at : c.createdAt) + '</td>' +
      '<td><button class="btn btn-ghost btn-sm" data-open="' + c.id + '" data-from="mycases">Open</button></td></tr>';
  }).join('');

  return strip + reviewBlock +
    '<div class="dash-toolbar reveal"><input type="search" id="portalSearch" placeholder="Search case, patient, shade…" autocomplete="off"></div>' +
    '<div class="table-wrap reveal"><table class="cases-table" id="portalTable"><thead><tr><th>Case</th><th>Service</th><th>Patient</th><th>Restoration</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div class="empty-note" id="portalNoMatch" hidden>No cases match that search.</div></div>';
}

function portalBilling() {
  if (!DATA.invoices.length) return '<div class="empty-note">No invoices yet.</div>';
  const rows = DATA.invoices.map(inv =>
    '<tr><td class="cid-cell">' + inv.id + '</td><td>' + inv.caseId + '</td><td>' + svcLabel(inv.service) + '</td><td>' + money(inv.amount) + '</td>' +
      '<td><span class="pill st-' + inv.status + '"><span class="dot"></span>' + inv.status + '</span></td>' +
      '<td>' + fmtDate(inv.issuedAt) + '</td></tr>'
  ).join('');
  const outstanding = DATA.invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
  return '<div class="stat-strip reveal" style="margin:0 0 22px;"><div class="chipstat"><b>' + money(outstanding) + '</b><span>Outstanding balance</span></div>' +
    '<div class="chipstat"><b>' + DATA.invoices.length + '</b><span>Total invoices</span></div></div>' +
    '<div class="table-wrap reveal"><table class="cases-table"><thead><tr><th>Invoice</th><th>Case</th><th>Service</th><th>Amount</th><th>Status</th><th>Issued</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

let jobOrdersCache = [];
// "Does this need the dentist?" is now the server's answer, not a guess
// assembled from statuses in the browser — the same derivation the lab
// sees, read from the clinic's side (see src/services/caseView.js).
const needsMe = o => (o.view || {}).waiting_on === 'dentist';
const needsReview = o => o.status === 'waiting_doctor_approval';
const needsAttention = o => o.status === 'rejected_by_reception';

function orderCard(o) {
  const v = o.view || {};
  // The whole card opens the case, not just the button in the corner —
  // it's a real <button> so the click target covers the entire box.
  return '<button type="button" class="case-card' + (needsMe(o) ? ' is-attention' : '') + '" data-case-open="' + o.id + '" data-case-search="' + esc((o.order_number + ' ' + o.patient_ref + ' ' + jobTypeLabel(o.job_type)).toLowerCase()) + '">' +
    '<div class="cc-top"><div><div class="cc-id">' + esc(o.order_number) + '</div><div class="cc-type">' + esc(jobTypeLabel(o.job_type)) + '</div></div>' +
      '<div class="cc-badges">' + dueBadge(v) + '</div></div>' +
    '<h3 class="cc-title">' + esc(o.patient_ref) + '</h3>' +
    '<div class="cc-status">' + statusChip(o) + '</div>' +
    (o.rejection_note ? '<p class="workspace-notice">' + esc(o.rejection_note) + '</p>' : '') +
    '<div class="case-progress">' + (v.journey ? journeyHtml(v) : stageTrackerHtml({ jobType: o.job_type, stageType: o.stage_type, status: o.status })) + '</div>' +
    '<div class="cc-foot"><time>' + fmtDate(o.updated_at || o.created_at) + '</time>' +
      '<span class="btn ' + (needsReview(o) ? 'btn-gold' : 'btn-ghost') + '">' +
      (needsReview(o) ? 'Review design' : needsAttention(o) ? 'Read notes &amp; next steps' : 'Open case') + '</span></div></button>' +
    // Sits outside the card's own button — a card is one big click target,
    // and a nested button inside it would be invalid markup and
    // unreachable by keyboard.
    ((o.view || {}).is_closed
      ? '<div class="case-card-aside"><button type="button" class="link-btn" data-duplicate-case="' + o.id + '">Order this again</button></div>'
      : '');
}

// The single most important block in the dentist portal: the cases that
// cannot move until this clinic does something. Stated as the action,
// with how long it has been waiting — not as a status to interpret.
function requiresActionHtml(rows) {
  if (!rows.length) {
    return emptyState({ iconName: 'check', title: 'You\'re all caught up', text: 'Nothing is waiting on you. We\'ll let you know the moment something needs your attention.' });
  }
  return '<div class="action-required">' + rows.map(o => {
    const v = o.view || {};
    return '<button type="button" class="action-required-row" data-case-open="' + o.id + '">' +
      '<span class="ar-mark">' + icon('alert') + '</span>' +
      '<span class="ar-body">' +
        '<span class="ar-id">' + esc(o.order_number) + ' · ' + esc(jobTypeLabel(o.job_type)) + '</span>' +
        '<span class="ar-action">' + esc(v.next_action || 'Needs your attention') + '</span>' +
        '<span class="ar-meta">' + esc(o.patient_ref || '') +
          (v.time_in_stage_ms ? ' · waiting ' + esc(durationShort(v.time_in_stage_ms)) : '') + '</span>' +
      '</span>' +
      '<span class="ar-go">' + (needsReview(o) ? 'Review design' : 'Open') + ' →</span></button>';
  }).join('') + '</div>';
}
let draftsCache = [];

const SERVICE_LABEL = { veneer: 'Veneers', crown: 'Crowns', bridge: 'Bridges', implant: 'Implants' };
function draftTitle(draft) {
  const services = (draft.summary.services || []).map(s => SERVICE_LABEL[s] || s);
  return draft.summary.patientRef || (services.length ? services.join(' + ') + ' case' : 'Untitled case');
}
function draftDetail(draft) {
  const bits = [];
  const services = (draft.summary.services || []).map(s => SERVICE_LABEL[s] || s);
  if (services.length) bits.push(services.join(', '));
  if (draft.summary.units) bits.push(draft.summary.units + ' unit' + (draft.summary.units === 1 ? '' : 's'));
  if (draft.origin === 'duplicate' && draft.originOrderNumber) bits.push('copied from ' + draft.originOrderNumber);
  bits.push('saved ' + fmtDateTime(draft.updatedAt));
  return bits.join(' · ');
}

// Deliberately a quiet strip, not a queue. A draft is a private
// half-thought, and it should be easy to pick back up without competing
// with the cases that are actually in the lab.
function draftsStrip() {
  if (!draftsCache.length) return '';
  const first = draftsCache[0];
  return '<div class="draft-strip">' +
    '<span class="draft-strip-mark">' + icon('clipboard') + '</span>' +
    '<span class="draft-strip-body"><strong>' + draftsCache.length + ' saved draft' + (draftsCache.length === 1 ? '' : 's') + '</strong>' +
    '<span>' + esc(draftTitle(first)) + ' · ' + esc(draftDetail(first)) + '</span></span>' +
    '<span class="draft-actions">' +
      '<button class="btn btn-ghost btn-sm" data-resume-draft="' + esc(first.id) + '">Continue</button>' +
      (draftsCache.length > 1 ? '<button class="btn btn-ghost btn-sm" data-portal-tab="drafts">See all</button>' : '') +
    '</span></div>';
}

function draftsPanel() {
  if (!draftsCache.length) {
    return emptyState({ iconName: 'clipboard', title: 'No saved drafts',
      text: 'Start a case and use Save draft to come back to it later.' });
  }
  return '<div class="draft-list">' + draftsCache.map(draft =>
    '<div class="draft-row"><span class="draft-row-main"><strong>' + esc(draftTitle(draft)) + '</strong>' +
    '<span>' + esc(draftDetail(draft)) + '</span></span>' +
    '<span class="draft-actions">' +
      '<button class="btn btn-primary btn-sm" data-resume-draft="' + esc(draft.id) + '">Continue</button>' +
      '<button class="btn btn-ghost btn-sm" data-discard-draft="' + esc(draft.id) + '">Discard</button>' +
    '</span></div>').join('') + '</div>';
}

// Recent activity as a dated feed rather than a stack of cards: a clinic
// scans this for "what changed", which is a reading task, not a browsing
// one.
function activityFeed() {
  const rows = [...jobOrdersCache]
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 8);
  if (!rows.length) {
    return emptyState({ iconName: 'history', title: 'No activity yet',
      text: 'Updates on your cases appear here as the lab works on them.' });
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = today.getTime() - 86400000;
  const dayOf = when => {
    const t = new Date(when).getTime();
    return t >= today.getTime() ? 'Today' : t >= yesterday ? 'Yesterday' : fmtDate(when);
  };
  let lastDay = '';
  return '<div class="feed">' + rows.map(o => {
    const when = o.updated_at || o.created_at;
    const day = dayOf(when);
    const heading = day === lastDay ? '' : '<p class="feed-day">' + esc(day) + '</p>';
    lastDay = day;
    const time = new Date(when).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return heading + '<button type="button" class="feed-row" data-case-open="' + o.id + '">' +
      '<span class="feed-time">' + esc(time) + '</span>' +
      '<span class="feed-what">' + esc((o.view || {}).headline || '') + ' · <b>' + esc(o.order_number) + '</b> ' + esc(o.patient_ref || '') + '</span>' +
      '<span class="feed-go" aria-hidden="true">Open →</span></button>';
  }).join('') + '</div>';
}

function ordersSection(rows, empty, emptyIcon) {
  return rows.length ? '<div class="case-list">' + rows.map(o => '<div class="case-cell">' + orderCard(o) + '</div>').join('') + '</div>' :
    emptyState({ iconName: emptyIcon || 'inbox', title: 'Nothing here yet', text: empty });
}
function overview() {
  const active = jobOrdersCache.filter(o => !(o.view || {}).is_closed && o.status !== 'rejected_by_reception');
  const mine = jobOrdersCache.filter(needsMe);
  const waiting = jobOrdersCache.filter(needsReview);
  const rejected = jobOrdersCache.filter(needsAttention);
  const completed = jobOrdersCache.filter(o => (o.view || {}).is_closed);
  const inProduction = active.filter(o => (o.view || {}).stage === 'production').length;
  const ready = active.filter(o => (o.view || {}).stage === 'collection').length;
  const metric = (count,label,filter,iconName,meta,tone) => '<button class="stat-card stat-card-v2' + (tone ? ' tone-' + tone : '') + '" data-portal-filter="' + filter + '"><div class="stat-card-icon">' + icon(iconName) + '</div><div class="stat-card-body"><div class="n">' + count + '</div><div class="l">' + label + '</div>' + (meta ? '<div class="stat-card-meta' + (tone === 'danger' ? ' is-action' : '') + '">' + meta + '</div>' : '') + '</div></button>';

  // Requires-your-action comes first, above the metrics. A number is
  // something to read; this is something to do.
  return draftsStrip() +
    '<section class="reveal action-required-panel' + (mine.length ? ' is-live' : '') + '">' +
      '<div class="section-head"><h2>' + (mine.length ? 'Requires your action' : 'Nothing needs you right now') + '</h2>' +
      (mine.length ? '<span class="case-badge case-badge-danger">' + mine.length + ' waiting</span>' : '') + '</div>' +
      requiresActionHtml(mine) +
    '</section>' +

    '<div class="stat-row reveal">' +
      metric(active.length,'Active cases','active','clipboard', inProduction ? inProduction + ' being made now' : (ready ? ready + ' ready for collection' : '')) +
      metric(waiting.length,'Awaiting your approval','approval','check', waiting.length ? 'Review the design' : '', waiting.length ? 'gold' : '') +
      metric(rejected.length,'Returned to you','attention','alert', rejected.length ? 'Action required' : '', rejected.length ? 'danger' : '') +
      metric(completed.length,'Completed','completed','history', completed.length ? 'View history' : '') +
    '</div>' +
    (UI.workflowHasMore || UI.dataPage > 1 ? '<p class="cc-sub">Summary of cases on this page. Use the page controls for earlier cases.</p>' : '') +
    '<div class="section-head reveal"><h2>Your current cases</h2><button class="btn btn-ghost" data-portal-tab="orders">View case history</button></div>' +
    '<div class="reveal">' + ordersSection(active.slice(0,4),'Your current lab cases will appear here once you send an order to the lab.','inbox') + '</div>' +
    '<div class="sec-head reveal"><h2>Recent activity</h2>' +
      (jobOrdersCache.length ? '<span class="sec-note">Your last updates from the lab</span>' : '') + '</div>' +
    '<div class="reveal">' + activityFeed() + '</div>';
}

function history(attentionOnly) {
  const filter = attentionOnly ? 'attention' : UI.portalFilter || 'all';
  const rows = jobOrdersCache.filter(o =>
    filter === 'all' ||
    filter === 'approval' && needsReview(o) ||
    filter === 'attention' && needsMe(o) ||
    filter === 'completed' && (o.view || {}).is_closed ||
    filter === 'active' && !(o.view || {}).is_closed && o.status !== 'rejected_by_reception');
  return '<div class="workspace-toolbar"><input type="search" id="orderSearch" aria-label="Search cases on this page" placeholder="Search case number, patient or job type…">' + (attentionOnly ? '' : '<div class="workspace-tabs" aria-label="Filter cases">' + [['all','All'],['active','Active'],['approval','Approvals'],['completed','Completed']].map(([key,label])=>'<button data-portal-filter="' + key + '" aria-pressed="' + (filter===key) + '">' + label + '</button>').join('') + '</div>') + '</div>' + ordersSection(rows,attentionOnly ? 'No cases need your attention right now.' : 'No cases in this view.', attentionOnly ? 'check' : 'history') + '<p class="empty-note" id="orderNoMatch" hidden>No cases match your search on this page.</p>';
}
export async function renderPortal() {
  if (!isSignedIn()) return renderLoginGate({role:'dentist',title:'Welcome to your workspace',subtitle:'Sign in to manage cases and stay in touch with your lab.'});
  const tab = UI.portalTab || 'overview';
  const me = DATA.me && DATA.me.dentist; // real account identity, if this visitor actually has one (see state.controller.js)
  let body;
  if (tab === 'billing') body=portalBilling();
  else if (tab === 'cases') body=portalCases();
  else if (tab === 'profile') {
    const {user} = await api('/api/auth/dentist/me');
    body='<section class="card"><h3>My profile</h3><dl class="workspace-facts"><div><dt>Name</dt><dd>' + esc(user?.name || 'Dentist') + '</dd></div><div><dt>Username</dt><dd>' + esc(user?.username || '—') + '</dd></div><div><dt>Role</dt><dd>Dentist</dd></div>' + (user?.phone ? '<div><dt>Phone</dt><dd>' + esc(user.phone) + '</dd></div>' : '') + (user?.email ? '<div><dt>Email</dt><dd>' + esc(user.email) + '</dd></div>' : '') + '</dl><p class="lede">Contact your lab administrator to update account details or access.</p></section>';
  } else {
    // Drafts and cases load together on the overview so the strip and the
    // queue paint in one pass — two sequential fetches would show the
    // dashboard, then move it.
    const [orders, drafts] = await Promise.all([
      listOrders('dentist'),
      // A failed draft fetch must not take the whole dashboard down with
      // it: cases are what the clinic came for.
      listDrafts().catch(() => ({ drafts: [] }))
    ]);
    jobOrdersCache = orders.orders;
    draftsCache = drafts.drafts || [];
    // Surfaced in the sidebar badge, which renders before this page's body.
    UI.draftCount = draftsCache.length;
    body = tab === 'overview' ? overview() : tab === 'drafts' ? draftsPanel() : history(tab === 'rejected');
  }
  const titles={overview:'Here’s what needs your attention today.',orders:'Case history',rejected:'Cases needing attention',drafts:'Saved drafts',billing:'Billing',profile:'Your profile',cases:'Earlier cases'};
  // Always shown, real name once there's a real account signed in (see
  // dentistSignup.js), a friendly fallback otherwise — not gated behind
  // having signed up, so it's not invisible-by-default for a plain visitor.
  const eyebrow = tab === 'overview' ? greeting() + ', ' + esc(me?.name || 'Dentist') : 'Dentist workspace';
  const lede = tab === 'overview' ? 'A clear view of your cases, from first details to final delivery.'
    : tab === 'rejected' ? 'Read the lab notes and choose the next step for each case.'
    : tab === 'drafts' ? 'Cases you started and saved. Nothing here has reached the lab.'
    : 'A clear view of your cases, from first details to final delivery.';
  return '<div class="page"><div class="u">' +
    '<header class="portal-hero"><div class="portal-hero-text">' +
      '<span class="eyebrow-accent">' + eyebrow + '</span>' +
      '<h1>' + titles[tab] + '</h1><p>' + lede + '</p></div>' +
      '<div class="portal-hero-actions"><a class="btn btn-primary" href="#/new-order">+ New case</a></div>' +
    '</header>' + body +
    '<div class="workspace-toolbar" style="margin-top:22px"><button class="link-btn" data-portal-tab="cases">View earlier case records</button></div></div></div>';
}
export function attachPortalHandlers() {
  if (!isSignedIn()) { attachAuthGateHandlers(); return; }
  document.querySelectorAll('[data-portal-tab]').forEach(b => b.addEventListener('click', () => { UI.portalTab=b.dataset.portalTab; UI.dataPage=1; renderCurrent(); }));
  document.querySelectorAll('[data-portal-filter]').forEach(b => b.addEventListener('click', () => { UI.portalFilter=b.dataset.portalFilter; UI.portalTab=UI.portalFilter==='attention' ? 'rejected' : 'orders'; renderCurrent(); }));
  document.querySelectorAll('[data-case-open]').forEach(b => b.addEventListener('click', () => showCaseCenter('dentist', b.dataset.caseOpen)));

  // Resuming a draft rebuilds the wizard form from what was stored and
  // hands it to the New Case route — the same form, not a copy of it, so
  // continuing and saving again updates the one draft rather than
  // spawning another.
  document.querySelectorAll('[data-resume-draft]').forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const { draft } = await getDraft(button.dataset.resumeDraft);
      const { formFromDraft } = await import('./newOrder.js');
      UI.newOrderForm = formFromDraft(draft);
      location.hash = '#/new-order';
    } catch (error) { toast(error.message); button.disabled = false; }
  }));

  document.querySelectorAll('[data-discard-draft]').forEach(button => button.addEventListener('click', async () => {
    const draft = draftsCache.find(d => d.id === button.dataset.discardDraft);
    const confirmed = await confirmAction({
      title: 'Discard this draft?',
      body: 'The saved case details are deleted. Nothing was ever sent to the lab, so no case is affected.',
      detail: draft ? draftTitle(draft) : '',
      confirmLabel: 'Discard draft', tone: 'danger'
    });
    if (!confirmed) return;
    try { await deleteDraft(button.dataset.discardDraft); toast('Draft discarded.'); renderCurrent(); }
    catch (error) { toast(error.message); }
  }));

  // Duplicating produces a draft, never a second case, and lands the
  // dentist in the wizard with the copied preferences to review.
  document.querySelectorAll('[data-duplicate-case]').forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const { draft } = await duplicateCase(button.dataset.duplicateCase);
      const { formFromDraft } = await import('./newOrder.js');
      UI.newOrderForm = formFromDraft(draft);
      toast('Case details copied. Review the patient information before submitting.');
      location.hash = '#/new-order';
    } catch (error) { toast(error.message); button.disabled = false; }
  }));
  document.getElementById('orderSearch')?.addEventListener('input', e => {
    const q=e.target.value.trim().toLowerCase(); let shown=0;
    document.querySelectorAll('[data-case-search]').forEach(card => { card.hidden=!card.dataset.caseSearch.includes(q); if(!card.hidden)shown++; });
    document.getElementById('orderNoMatch').hidden=shown>0;
  });
  document.getElementById('portalSearch')?.addEventListener('input', e => {
    let shown=0; document.querySelectorAll('#portalTable tbody tr').forEach(tr=>{ tr.hidden=!(tr.dataset.hay || '').includes(e.target.value.trim().toLowerCase());if(!tr.hidden)shown++; });
    document.getElementById('portalNoMatch').hidden=shown>0;
  });
}
