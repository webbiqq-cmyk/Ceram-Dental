import { DATA, UI } from '../state.js';
import { esc, svcLabel } from '../utils/format.js';
import { STAGES } from '../constants.js';
// Circular with router.js (router.js's routes table needs renderStudio) —
// safe here since renderCurrent is only called from inside event handlers.
import { renderCurrent } from '../router.js';

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

export function renderStudio() {
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
    '<div class="page-head reveal" style="margin-bottom:16px;"><span class="eyebrow-accent">Internal · Lab Studio</span><h1 style="font-size:1.9rem;">Case pipeline</h1></div>' +
    '<div class="stat-strip reveal" style="margin:0 0 20px;">' +
      '<div class="chipstat"><b>' + inLab + '</b><span>In lab hands</span></div>' +
      '<div class="chipstat"><b>' + awaitingDoc + '</b><span>Awaiting doctor</span></div>' +
      '<div class="chipstat"><b>' + readyN + '</b><span>Ready for pickup</span></div>' +
      '<div class="chipstat"><b>' + revs + '</b><span>In revision</span></div>' +
    '</div>' +
    '<div class="lab-toolbar reveal"><input type="search" id="labSearch" placeholder="Search case, clinic, patient…" autocomplete="off">' +
      '<div class="lab-chips">' + chips + '</div></div>' +
    '<div class="lab-pipeline reveal" id="labPipeline">' + lanes + '</div>' +
    '<div class="empty-note" id="labNoMatch" hidden>No cases match that search.</div>' +
  '</div></div>';
}

export function attachStudioHandlers() {
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
}
