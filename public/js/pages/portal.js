import { DATA, UI, api } from '../state.js';
import { esc, money, fmtDate, fmtDateTime, svcLabel, labelFor } from '../utils/format.js';
import { shadeCombo } from '../utils/design.js';
import { STAGES, STAGE_INDEX } from '../constants.js';
import { footer } from '../components/footer.js';
import { pillHtml } from '../components/drawer.js';
import { renderCurrent } from '../router.js';
import { renderLoginGate, attachAuthGateHandlers, logout } from '../components/authGate.js';
import { jobTypeLabel, statusPill } from '../utils/workflow.js';
import { listOrders } from '../utils/ordersApi.js';
import { showOrderDetail } from '../components/orderDetail.js';

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
const needsReview = o => o.job_type === 'veneers' && o.stage_type === 'demo' && o.status === 'waiting_doctor_approval';
const needsAttention = o => o.status === 'rejected_by_reception' || !!o.rejection_note && o.status === 'in_design';

function orderCard(o) {
  // The whole card opens the case now, not just the button in the corner —
  // it's a real <button> (not <article>) so the click target covers the
  // entire box; the pill in the footer is now just a visual label.
  return '<button type="button" class="case-card" data-order-detail="' + o.id + '" data-case-search="' + esc((o.order_number + ' ' + o.patient_ref + ' ' + jobTypeLabel(o.job_type)).toLowerCase()) + '"><div class="cc-top"><div><div class="cc-id">' + esc(o.order_number) + '</div><div class="cc-type">' + esc(jobTypeLabel(o.job_type)) + '</div></div>' + statusPill(o.status) + '</div><h3 class="cc-title">' + esc(o.patient_ref) + '</h3><p class="cc-sub">' + (o.job_type === 'veneers' ? (o.stage_type === 'demo' ? 'Step 1 · Demo / design' : 'Step 2 · Final production') : 'One-step case') + ' · ' + esc(o.delivery_method === 'delivery' ? 'Delivery' : 'In-house pickup') + '</p>' +
    (o.rejection_note ? '<p class="workspace-notice">' + esc(o.rejection_note) + '</p>' : '') +
    '<div class="cc-foot"><time>' + fmtDate(o.updated_at || o.created_at) + '</time><span class="btn ' + (needsReview(o) ? 'btn-gold' : 'btn-ghost') + '">' + (needsReview(o) ? 'Review demo / design' : needsAttention(o) ? 'Read notes & next steps' : 'Open case') + '</span></div></button>';
}
function ordersSection(rows, empty) {
  return rows.length ? '<div class="case-list">' + rows.map(orderCard).join('') + '</div>' : '<div class="empty-note">' + empty + '</div>';
}
function overview() {
  const active = jobOrdersCache.filter(o => !['completed','delivered','rejected_by_reception'].includes(o.status));
  const waiting = jobOrdersCache.filter(needsReview);
  const rejected = jobOrdersCache.filter(needsAttention);
  const completed = jobOrdersCache.filter(o => ['completed','delivered'].includes(o.status));
  const metric = (count,label,filter) => '<button class="stat-card" data-portal-filter="' + filter + '"><div class="n">' + count + '</div><div class="l">' + label + ' →</div></button>';
  return '<div class="stat-row">' + metric(active.length,'Active cases','active') + metric(waiting.length,'Demo approvals','approval') + metric(rejected.length,'Needs attention','attention') + metric(completed.length,'Completed cases','completed') + '</div>' +
    (UI.workflowHasMore || UI.dataPage > 1 ? '<p class="cc-sub">Summary of cases on this page. Use the page controls for earlier cases.</p>' : '') +
    '<div class="section-head"><h2>' + (waiting.length ? 'Ready for your review' : 'Your current cases') + '</h2><button class="btn btn-ghost" data-portal-tab="orders">View case history</button></div>' + ordersSection((waiting.length ? waiting : active).slice(0,4),'Your workspace is ready. Create a new case to send an order to the lab.') +
    '<div class="workspace-two-col" style="margin-top:16px"><section class="card"><h3>Recent activity</h3><ul class="workspace-list">' + [...jobOrdersCache].sort((a,b)=>new Date(b.updated_at || b.created_at)-new Date(a.updated_at || a.created_at)).slice(0,5).map(o => '<li><button class="link-btn" data-order-detail="' + o.id + '">' + esc(o.order_number) + ' · ' + esc(o.patient_ref) + '</button><p>' + statusPill(o.status) + '</p><time>' + fmtDateTime(o.updated_at || o.created_at) + '</time></li>').join('') + (jobOrdersCache.length ? '' : '<li>Case updates will appear here.</li>') + '</ul></section><section class="card"><span class="eyebrow-accent">A clear path to completion</span><h3>One case. Every detail.</h3><p class="lede">Keep instructions, files and conversations together. Open any case to contact your lab team.</p><div class="workspace-notice"><strong>Veneer approval is final.</strong><br>Review the demo/design carefully. After approval, changes require a new job order.</div></section></div>';
}
function history(attentionOnly) {
  const filter = attentionOnly ? 'attention' : UI.portalFilter || 'all';
  const rows = jobOrdersCache.filter(o => filter === 'all' || filter === 'approval' && needsReview(o) || filter === 'attention' && needsAttention(o) || filter === 'completed' && ['completed','delivered'].includes(o.status) || filter === 'active' && !['completed','delivered','rejected_by_reception'].includes(o.status));
  return '<div class="workspace-toolbar"><input type="search" id="orderSearch" aria-label="Search cases on this page" placeholder="Search case number, patient or job type…">' + (attentionOnly ? '' : '<div class="workspace-tabs" aria-label="Filter cases">' + [['all','All'],['active','Active'],['approval','Approvals'],['completed','Completed']].map(([key,label])=>'<button data-portal-filter="' + key + '" aria-pressed="' + (filter===key) + '">' + label + '</button>').join('') + '</div>') + '</div>' + ordersSection(rows,attentionOnly ? 'No cases need your attention right now.' : 'No cases in this view.') + '<p class="empty-note" id="orderNoMatch" hidden>No cases match your search on this page.</p>';
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
  } else { jobOrdersCache=(await listOrders('dentist')).orders; body=tab==='overview' ? overview() : history(tab==='rejected'); }
  const titles={overview:'Your cases, at a glance.',orders:'Case history',rejected:'Cases needing attention',billing:'Billing',profile:'Your profile',cases:'Earlier cases'};
  // Always shown, real name once there's a real account signed in (see
  // dentistSignup.js), a friendly fallback otherwise — not gated behind
  // having signed up, so it's not invisible-by-default for a plain visitor.
  const eyebrow = tab === 'overview' ? 'Welcome, ' + esc(me?.name || 'Dentist') : 'Dentist workspace';
  return '<div class="page"><div class="u"><div class="page-head"><div><span class="eyebrow-accent">' + eyebrow + '</span><h1>' + titles[tab] + '</h1><p class="lede">' + (tab==='rejected' ? 'Read the lab notes and choose the next step for each case.' : 'A clear view of your cases, from first details to final delivery.') + '</p></div><a class="btn btn-primary" href="#/new-order">+ New case</a></div>' + body + '<div class="workspace-toolbar" style="margin-top:16px"><button class="link-btn" data-portal-tab="cases">View earlier case records</button><button class="btn btn-ghost" id="portalLogoutBtn">Sign out</button></div></div></div>';
}
export function attachPortalHandlers() {
  if (!isSignedIn()) { attachAuthGateHandlers(); return; }
  document.querySelectorAll('[data-portal-tab]').forEach(b => b.addEventListener('click', () => { UI.portalTab=b.dataset.portalTab; UI.dataPage=1; renderCurrent(); }));
  document.querySelectorAll('[data-portal-filter]').forEach(b => b.addEventListener('click', () => { UI.portalFilter=b.dataset.portalFilter; UI.portalTab=UI.portalFilter==='attention' ? 'rejected' : 'orders'; renderCurrent(); }));
  document.querySelectorAll('[data-order-detail]').forEach(b => b.addEventListener('click', () => showOrderDetail('dentist',b.dataset.orderDetail)));
  document.getElementById('orderSearch')?.addEventListener('input', e => {
    const q=e.target.value.trim().toLowerCase(); let shown=0;
    document.querySelectorAll('[data-case-search]').forEach(card => { card.hidden=!card.dataset.caseSearch.includes(q); if(!card.hidden)shown++; });
    document.getElementById('orderNoMatch').hidden=shown>0;
  });
  document.getElementById('portalSearch')?.addEventListener('input', e => {
    let shown=0; document.querySelectorAll('#portalTable tbody tr').forEach(tr=>{ tr.hidden=!(tr.dataset.hay || '').includes(e.target.value.trim().toLowerCase());if(!tr.hidden)shown++; });
    document.getElementById('portalNoMatch').hidden=shown>0;
  });
  document.getElementById('portalLogoutBtn')?.addEventListener('click',()=>logout('dentist'));
}
