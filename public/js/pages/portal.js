import { DATA, UI } from '../state.js';
import { esc, money, fmtDate, svcLabel, labelFor } from '../utils/format.js';
import { shadeCombo } from '../utils/design.js';
import { STAGES, STAGE_INDEX } from '../constants.js';
import { footer } from '../components/footer.js';
import { pillHtml } from '../components/drawer.js';
import { renderCurrent } from '../router.js';
import { renderLoginGate, attachAuthGateHandlers, logout } from '../components/authGate.js';

function isSignedIn() { return !!(DATA.auth && DATA.auth.dentist); }

function portalCases() {
  if (!DATA.cases.length) return '<div class="empty-note">No cases yet — start one from the website.</div>';

  const active = DATA.cases.filter(c => c.stage !== 'ready').length;
  const review = DATA.cases.filter(c => c.stage === 'doctor_approval');
  const ready = DATA.cases.filter(c => c.stage === 'ready' && !c.pickedUp);
  const outstanding = DATA.invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);

  const strip = '<div class="stat-strip reveal" style="margin:0 0 22px;">' +
    '<div class="chipstat"><b>' + active + '</b><span>Active cases</span></div>' +
    '<div class="chipstat"><b>' + review.length + '</b><span>Awaiting your review</span></div>' +
    '<div class="chipstat"><b>' + ready.length + '</b><span>Ready for pickup</span></div>' +
    '<div class="chipstat"><b>' + money(outstanding) + '</b><span>Outstanding balance</span></div>' +
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

export function renderPortal() {
  if (!isSignedIn()) {
    return renderLoginGate({ role: 'dentist', title: 'Dentist portal', subtitle: 'Sign in to track your cases and approve mockups.' });
  }
  const tab = UI.portalTab || 'cases';
  const body = tab === 'billing' ? portalBilling() : portalCases();
  return '<div class="page"><div class="u">' +
    '<div class="page-head reveal"><span class="eyebrow-accent">Dentist portal</span><h1 style="font-size:1.9rem;">My cases</h1>' +
      '<p class="lede">Track every case you\'ve sent us, and approve mockups the moment they\'re ready.</p>' +
      '<button class="btn btn-ghost btn-sm" id="portalLogoutBtn" style="margin-top:14px;">Sign out</button></div>' +
    '<div class="dash-tabs">' +
      '<button class="dash-tab' + (tab === 'cases' ? ' active' : '') + '" data-portal-tab="cases">Cases</button>' +
      '<button class="dash-tab' + (tab === 'billing' ? ' active' : '') + '" data-portal-tab="billing">Billing</button>' +
    '</div>' + body +
  '</div></div>' + footer();
}

export function attachPortalHandlers() {
  if (!isSignedIn()) { attachAuthGateHandlers(); return; }
  document.querySelectorAll('[data-portal-tab]').forEach(b => b.addEventListener('click', () => { UI.portalTab = b.dataset.portalTab; renderCurrent(); }));
  const ps = document.getElementById('portalSearch');
  if (ps) ps.addEventListener('input', () => {
    const q = ps.value.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll('#portalTable tbody tr').forEach(tr => {
      const hit = !q || (tr.dataset.hay || '').indexOf(q) !== -1;
      tr.hidden = !hit; if (hit) shown++;
    });
    const nm = document.getElementById('portalNoMatch'); if (nm) nm.hidden = shown !== 0;
  });
  const logoutBtn = document.getElementById('portalLogoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => logout('dentist'));
}
