import { listOrders, labOverview } from '../utils/ordersApi.js';
import { showCaseCenter } from '../components/caseCenter.js';
import { todayStrip, attentionHtml, workloadHtml, stationCardsHtml } from '../components/labOps.js';
import { caseQueue, attachCaseQueue } from '../components/caseQueue.js';
import { DATA, UI, api, loadState } from '../state.js';
import { esc, svcLabel } from '../utils/format.js';
import { STAGES } from '../constants.js';
// Circular with router.js (router.js's routes table needs renderStudio) —
// safe here since renderCurrent is only called from inside event handlers.
import { renderCurrent } from '../router.js';
import { renderLoginGate, attachAuthGateHandlers, logout } from '../components/authGate.js';
import { icon } from '../components/icons.js';

// Each station's real backend role/cookie (see src/models/user.model.js
// ROLES and src/middleware/auth.js) — 'lab' is the same manager account
// the "Earlier case pipeline" view already signs into for real.
const LAB_BACKEND_ROLE = { manager: 'lab', reception: 'receptionist', designer: 'designer', technician: 'technician', qc: 'qc' };

function isSignedIn() { return !!(DATA.auth && DATA.auth.lab); }

function stageTone(key) {
  if (key === 'ready') return 'var(--ready)';
  if (key === 'reception' || key === 'qc') return 'var(--violet)';
  return 'var(--amber)';
}

function kcardHtml(c) {
  const waiting = c.stage === 'doctor_approval';
  const hay = (c.id + ' ' + svcLabel(c.service) + ' ' + c.clinic + ' ' + c.patient + ' ' + c.tech + ' ' + (c.design ? c.design.material : '')).toLowerCase();
  return '<button class="kcard" data-open="' + c.id + '" data-from="lab" data-hay="' + esc(hay) + '"><div class="top"><span class="cid">' + c.id + '</span><span class="svc">' + svcLabel(c.service) + '</span></div>' +
    '<div class="clinic">' + esc(c.clinic) + '</div><div class="patient">' + esc(c.patient) + '</div>' +
    (c.design ? '<div class="kdesign">' + esc(c.design.material) + (c.design.fabrication ? ' · ' + esc(c.design.fabrication) : '') + '</div>' : '') +
    (waiting ? '<div class="waiting">Awaiting doctor</div>' : '') + (c.revisions > 0 ? '<div class="rev">Rev ' + (c.revisions + 1) + '</div>' : '') +
    '<div class="meta"><span class="tech">● ' + esc(c.tech) + '</span><span class="shade">' + esc(c.shade) + '</span></div></button>';
}

function renderLegacyStudio() {
  if (!isSignedIn()) {
    return renderLoginGate({ role: 'lab', title: 'Lab Studio', subtitle: 'Sign in to view and progress the case pipeline.' });
  }
  const stageFilter = UI.labStage || 'all';
  const lanes = STAGES.filter(s => stageFilter === 'all' || stageFilter === s.key).map(s => {
    const cards = DATA.cases.filter(c => c.stage === s.key);
    const inner = cards.length
      ? '<div class="lane-cards">' + cards.map(kcardHtml).join('') + '</div>'
      : '<div class="lane-cards lane-empty">No cases at this stage.</div>';
    return '<section class="lane' + (cards.length ? '' : ' is-empty') + '">' +
      '<div class="lane-head"><span class="dot" style="background:' + stageTone(s.key) + '"></span><h3>' + s.label + '</h3>' +
      '<span class="cnt">' + cards.length + '</span></div>' + inner + '</section>';
  }).join('');

  const awaitingDoc = DATA.cases.filter(c => c.stage === 'doctor_approval').length;
  const inLab = DATA.cases.filter(c => c.stage !== 'ready' && c.stage !== 'doctor_approval').length;
  const readyN = DATA.cases.filter(c => c.stage === 'ready').length;
  const revs = DATA.cases.filter(c => c.revisions > 0 && c.stage !== 'ready').length;

  const chips = '<button class="lab-chip' + (stageFilter === 'all' ? ' active' : '') + '" data-lab-stage="all">All stages</button>' +
    STAGES.map(s => {
      const n = DATA.cases.filter(c => c.stage === s.key).length;
      return '<button class="lab-chip' + (stageFilter === s.key ? ' active' : '') + '" data-lab-stage="' + s.key + '">' + s.label + ' ' + n + '</button>';
    }).join('');

  const labMe = DATA.me && DATA.me.lab;
  const eyebrow = 'Welcome, ' + esc(labMe?.name || 'Lab Studio');
  return '<div class="page"><div class="u">' +
    '<div class="page-head reveal" style="margin-bottom:16px;"><span class="eyebrow-accent">' + eyebrow + '</span><h1 style="font-size:1.9rem;">Case pipeline</h1>' +
      '<button class="btn btn-ghost btn-sm" id="studioLogoutBtn" style="margin-top:14px;">Sign out</button></div>' +
    '<div class="stat-row reveal">' +
      '<div class="stat-card"><div class="n">' + inLab + '</div><div class="l">In lab hands</div></div>' +
      '<div class="stat-card tone-gold"><div class="n">' + awaitingDoc + '</div><div class="l">Awaiting doctor</div></div>' +
      '<div class="stat-card"><div class="n">' + readyN + '</div><div class="l">Ready for pickup</div></div>' +
      '<div class="stat-card' + (revs ? ' tone-danger' : '') + '"><div class="n">' + revs + '</div><div class="l">In revision</div></div>' +
    '</div>' +
    '<div class="lab-chips reveal" style="margin-bottom:24px;">' +
      '<a class="lab-chip" href="#/reception">→ Reception</a><a class="lab-chip" href="#/designer">→ Design</a>' +
      '<a class="lab-chip" href="#/technician">→ Technician</a><a class="lab-chip" href="#/qc">→ Quality Inspector</a>' +
    '</div>' +
    '<div class="lab-toolbar reveal"><input type="search" id="labSearch" placeholder="Search case, clinic, patient…" autocomplete="off">' +
      '<div class="lab-chips">' + chips + '</div></div>' +
    '<div class="lab-pipeline reveal" id="labPipeline">' + lanes + '</div>' +
    '<div class="empty-note" id="labNoMatch" hidden>No cases match that search.</div>' +
  '</div></div>';
}

function attachLegacyStudioHandlers() {
  if (!isSignedIn()) { attachAuthGateHandlers(); return; }
  document.querySelectorAll('[data-lab-stage]').forEach(b => b.addEventListener('click', () => { UI.labStage = b.dataset.labStage; renderCurrent(); }));
  const ls = document.getElementById('labSearch');
  if (ls) ls.addEventListener('input', () => {
    const q = ls.value.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll('#labPipeline .kcard').forEach(card => {
      const hit = !q || (card.dataset.hay || '').indexOf(q) !== -1;
      card.hidden = !hit; if (hit) shown++;
    });
    document.querySelectorAll('#labPipeline .lane').forEach(lane => {
      const any = lane.querySelector('.kcard:not([hidden])');
      lane.style.display = (q && !any) ? 'none' : '';
    });
    const nm = document.getElementById('labNoMatch'); if (nm) nm.hidden = shown !== 0;
  });
  const logoutBtn = document.getElementById('studioLogoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => logout('lab'));
}

// [key, station route, label, blurb]. 'manager' is the lab-wide overview.
const LAB_ROLES = [
  ['manager','studio','Lab manager','Oversee the whole board — every incoming order, every stage, packing and collection.'],
  ['reception','reception','Reception','Review new orders, confirm details, and coordinate collection.'],
  ['designer','designer','Design','Prepare designs, review doctor notes, and hand off approved work.'],
  ['technician','technician','Production','Follow the production steps for each assigned case.'],
  ['qc','qc','Quality inspection','Record findings, check completeness, and confirm packing.']
];

function rolePicker() {
  return '<div class="page role-pick-page"><div class="u">' +
    '<div class="page-head"><div><span class="eyebrow-accent">Ceram · Lab Studio</span><h1>Choose your station</h1>' +
      '<p class="lede">Pick your role, then sign in with the credentials your administrator assigned you.</p></div></div>' +
    '<div class="role-pick-grid">' + LAB_ROLES.map((r,i) =>
      '<button type="button" class="role-pick' + (r[0] === 'manager' ? ' role-pick-wide' : '') + '" data-lab-role-pick="' + r[0] + '">' +
        '<span class="rp-num">' + icon(['grid','inbox','sliders','box','check'][i]) + '</span>' +
        '<span class="rp-body"><b>' + esc(r[2]) + '</b><small>' + esc(r[3]) + '</small></span>' +
        '<span class="rp-go" aria-hidden="true">&rarr;</span></button>').join('') +
    '</div></div></div>';
}

function signinScreen(r, error) {
  return '<div class="page lab-signin-page"><div class="u"><div class="lab-signin-inner">' +
    '<div class="page-head lab-signin-head"><div><span class="eyebrow-accent">Ceram · Lab Studio</span><h1>Sign in &middot; ' + esc(r[2]) + '</h1>' +
      '<p class="lede">Use the credentials assigned to you in the admin panel.</p></div></div>' +
    '<form class="wizard" id="labSigninForm"><div class="wiz-body">' +
      '<div class="field"><label for="labUser">Username</label><input id="labUser" autocomplete="username" placeholder="' + esc(r[0]) + '.ceram"></div>' +
      '<div class="field"><label for="labPass">Password</label><input id="labPass" type="password" autocomplete="current-password" placeholder="••••••••"></div>' +
      '<p class="workspace-notice">Checked against the account your admin assigned in Accounts &amp; Access &rarr; Team.</p>' +
      (error ? '<p role="alert" style="color:var(--critical)">' + esc(error) + '</p>' : '') +
    '</div><div class="wiz-foot">' +
      '<button type="button" class="btn btn-ghost" data-lab-role-back>&larr; Choose a different role</button>' +
      '<button type="submit" class="btn btn-primary">Sign in</button></div></form>' +
  '</div></div></div>';
}

// The lab manager's overview answers, in order: how much work is there,
// where is it, what is going wrong, and who is carrying it. Routine work
// is deliberately last — a manager who has to scroll past twenty healthy
// cases to find the blocked one is being given a report, not a tool.
async function managerOverview() {
  if (UI.studioLegacy) return '<button class="btn btn-ghost" data-studio-view="current">&larr; Back to lab overview</button>' + renderLegacyStudio();
  let overview, orders = [];
  try {
    [overview, orders] = await Promise.all([
      labOverview('lab'),
      listOrders('lab').then(r => r.orders).catch(() => [])
    ]);
  } catch (error) {
    return '<div class="page"><div class="u"><div class="page-head"><div><span class="eyebrow-accent">Ceram · Lab Studio</span><h1>Lab overview</h1></div></div>' +
      '<div class="case-alert case-alert-danger"><strong>Couldn\'t load the lab overview.</strong><p>' + esc(error.message) + '</p>' +
      '<button class="btn btn-ghost" id="retryPage">Try again</button></div></div></div>';
  }

  const recent = [...orders]
    .filter(o => !(o.view || {}).is_closed)
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 6);

  return '<div class="page"><div class="u">' +
    '<div class="page-head"><div><span class="eyebrow-accent">Ceram · Lab Studio</span><h1>The lab today</h1>' +
      '<p class="lede">Where every case is, what needs chasing, and who is carrying the work.</p></div></div>' +

    todayStrip(overview.today) +

    // One pipeline, not two. An earlier pass had a bar chart of the six
    // stages directly above six station cards carrying the same six
    // counts — the same information twice, costing a screenful. The
    // station cards win because they also say what is wrong at each
    // stage and open it.
    '<div class="sec-head"><h2>Pipeline</h2><span class="sec-note">Open a station to work its queue</span></div>' +
    stationCardsHtml(overview.stations) +

    '<div class="lab-ops-grid">' +
      attentionHtml(overview.attention) +
      workloadHtml(overview.workload) +
    '</div>' +

    '<div class="sec-head"><h2>Recently updated</h2><span class="sec-note">Across every station</span></div>' +
    caseQueue(recent, { density: 'table', empty: { title: 'No active cases', text: 'New job orders from clinics will appear here.', iconName: 'inbox' } }) +

    '<button class="btn btn-ghost" style="margin-top:24px" data-studio-view="legacy">Earlier case pipeline</button>' +
  '</div></div>';
}

let labSigninError = '';

export async function renderStudio() {
  if (UI.labRole === 'manager') {
    if (!(DATA.auth && DATA.auth.lab)) return renderLoginGate({ role: 'lab', title: 'Lab Studio', subtitle: 'Sign in with the lab manager account assigned in Accounts & Access.' });
    return managerOverview();
  }
  if (UI.labRolePick) return signinScreen(LAB_ROLES.find(r => r[0] === UI.labRolePick) || LAB_ROLES[0], labSigninError);
  return rolePicker();
}

export function attachStudioHandlers() {
  if (UI.labRole === 'manager' && !(DATA.auth && DATA.auth.lab)) { attachAuthGateHandlers(); return; }
  if (UI.labRole === 'manager' && UI.studioLegacy) attachLegacyStudioHandlers();
  document.querySelectorAll('[data-lab-role-pick]').forEach(b => b.addEventListener('click', () => { UI.labRolePick = b.dataset.labRolePick; labSigninError = ''; renderCurrent(); }));
  document.querySelector('[data-lab-role-back]')?.addEventListener('click', () => { UI.labRolePick = ''; labSigninError = ''; renderCurrent(); });
  document.getElementById('labSigninForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const pick = UI.labRolePick || 'manager';
    const role = LAB_BACKEND_ROLE[pick];
    const username = document.getElementById('labUser').value;
    const password = document.getElementById('labPass').value;
    // Real check against whatever account the admin has assigned for this
    // station — no more falling through on failure. Nothing set up yet
    // for this station, or the wrong details, both just stay here with an
    // error; Accounts & Access → Team is where a real account gets made.
    try {
      await api('/api/auth/' + role + '/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      await loadState();
      labSigninError = '';
      UI.labRolePick = ''; UI.labRole = pick; UI.studioLegacy = false; UI.dataPage = 1;
      if (pick === 'manager') renderCurrent(); else location.hash = '#/' + pick;
    } catch (err) { labSigninError = err.message; renderCurrent(); }
  });
  document.querySelectorAll('[data-lab-signout]').forEach(b => b.addEventListener('click', () => {
    // Switching station stays inside Lab Studio — unlike authGate's
    // logout() (built for leaving a private workspace entirely, so it
    // redirects home), this just clears whatever real session the
    // previous station actually established, if any, and stays put.
    const prevRole = LAB_BACKEND_ROLE[UI.labRole];
    if (prevRole) api('/api/auth/' + prevRole + '/logout', { method: 'POST' }).catch(() => {});
    UI.labRole = ''; UI.labRolePick = ''; UI.studioLegacy = false; renderCurrent();
  }));
  document.querySelectorAll('[data-studio-view]').forEach(b => b.addEventListener('click', () => { UI.studioLegacy = b.dataset.studioView === 'legacy'; renderCurrent(); }));
  // Both the attention list and the recently-updated queue open the same
  // case screen the stations use — there is one way to work a case.
  attachCaseQueue('lab', id => showCaseCenter('lab', id));
}
