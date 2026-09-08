import { listOrders } from '../utils/ordersApi.js';
import { statusPill, jobTypeLabel } from '../utils/workflow.js';
import { showOrderDetail } from '../components/orderDetail.js';
import { DATA, UI } from '../state.js';
import { esc, svcLabel } from '../utils/format.js';
import { STAGES } from '../constants.js';
// Circular with router.js (router.js's routes table needs renderStudio) —
// safe here since renderCurrent is only called from inside event handlers.
import { renderCurrent } from '../router.js';
import { renderLoginGate, attachAuthGateHandlers, logout } from '../components/authGate.js';

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

  return '<div class="page"><div class="u">' +
    '<div class="page-head reveal" style="margin-bottom:16px;"><span class="eyebrow-accent">Internal · Lab Studio</span><h1 style="font-size:1.9rem;">Case pipeline</h1>' +
      (DATA.loginRequired ? '<button class="btn btn-ghost btn-sm" id="studioLogoutBtn" style="margin-top:14px;">Sign out</button>' : '') + '</div>' +
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

const ROLE_VIEWS = [
  ['receptionist','reception','Reception','Review new orders, confirm details, and coordinate collection.'],
  ['designer','designer','Design','Prepare designs, review doctor notes, and hand off approved work.'],
  ['technician','technician','Production','Follow the production steps for each assigned case.'],
  ['qc','qc','Quality inspection','Record findings, check completeness, and confirm packing.']
];
export async function renderStudio() {
  if (UI.studioLegacy && DATA.auth.lab) return '<button class="btn btn-ghost" data-studio-view="current">← Back to lab overview</button>' + renderLegacyStudio();
  const manager=DATA.auth.lab;
  const signed=manager || ROLE_VIEWS.some(([role])=>DATA.auth[role]);
  const views=ROLE_VIEWS.filter(([role])=>!signed || DATA.auth[role] || manager);
  let orders=[];
  if(manager) orders=(await listOrders('lab')).orders;
  const pending=orders.filter(o=>o.status==='pending_reception_review').length;
  const production=orders.filter(o=>['in_design','doctor_approved','in_production'].includes(o.status)).length;
  const ready=orders.filter(o=>['qc_approved','ready_for_delivery','ready_for_pickup'].includes(o.status)).length;
  return '<div class="page"><div class="u"><div class="page-head"><div><span class="eyebrow-accent">Ceram · Lab Studio</span><h1>A clear view of the work ahead.</h1><p class="lede">' + (signed?'Open your role workspace to find the cases and actions assigned to you.':'Choose your role to sign in to your workspace.') + '</p></div>' + (DATA.auth.lab && DATA.loginRequired?'<button class="btn btn-ghost" id="studioLogoutBtn">Sign out</button>':'') + '</div>' +
    (manager?'<div class="stat-row"><div class="stat-card"><div class="n">' + pending + '</div><div class="l">Incoming orders</div></div><div class="stat-card"><div class="n">' + production + '</div><div class="l">Design & production</div></div><div class="stat-card"><div class="n">' + orders.filter(o=>o.status==='qc_pending').length + '</div><div class="l">Quality review</div></div><div class="stat-card"><div class="n">' + ready + '</div><div class="l">Packing & collection</div></div></div>':'') +
    '<div class="workspace-role-grid">' + views.map(([,path,title,description],i)=>'<a class="workspace-role-card" href="#/' + path + '"><span>0' + (i+1) + ' / WORKSPACE</span><h3>' + title + '</h3><p>' + description + '</p><span>Open workspace →</span></a>').join('') + '</div>' +
    (manager?'<section class="card" style="margin-top:26px"><h3>Recent case updates</h3>' + (UI.workflowHasMore || UI.dataPage>1?'<p class="lede">Showing cases on this page.</p>':'') + '<ul class="workspace-list">' + orders.slice(0,8).map(o=>'<li><button class="link-btn" data-studio-order="' + o.id + '">' + esc(o.order_number) + ' · ' + esc(jobTypeLabel(o.job_type)) + '</button><p>' + statusPill(o.status) + '</p></li>').join('') + (!orders.length?'<li>New job orders will appear here.</li>':'') + '</ul></section>':'') +
    (DATA.auth.lab?'<button class="btn btn-ghost" style="margin-top:24px" data-studio-view="legacy">Earlier case pipeline</button>':'') + '</div></div>';
}
export function attachStudioHandlers() {
  if(UI.studioLegacy && DATA.auth.lab) attachLegacyStudioHandlers();
  document.querySelectorAll('[data-studio-view]').forEach(b=>b.addEventListener('click',()=>{UI.studioLegacy=b.dataset.studioView==='legacy';renderCurrent();}));
  document.querySelectorAll('[data-studio-order]').forEach(b=>b.addEventListener('click',()=>showOrderDetail('lab',b.dataset.studioOrder)));
  if(!UI.studioLegacy) document.getElementById('studioLogoutBtn')?.addEventListener('click',()=>logout('lab'));
}
