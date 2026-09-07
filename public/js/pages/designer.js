// Designer dashboard — design preview (see reception.js's header comment;
// same caveat applies here: sample data from utils/mockWorkflow.js).
import { UI } from '../state.js';
import { esc, fmtDateTime } from '../utils/format.js';
import { MOCK_ORDERS, jobTypeLabel, statusPill, stageTrackerHtml } from '../utils/mockWorkflow.js';
import { toast } from '../toast.js';
import { renderCurrent } from '../router.js';

// A little in-memory chat so the preview feels real when you type in it —
// keyed by order id, cleared on page reload like everything else here.
const CHAT = {
  'JO-0998': [
    { from: 'doctor', body: 'Patient wants a slightly warmer shade than the scan suggests — see the intraoral photo I attached.', at: '2026-09-05T10:05:00Z' },
    { from: 'me', body: 'Got it — I\'ll bias toward A3 on the body and keep the incisal translucent. Will share the first design pass shortly.', at: '2026-09-05T10:22:00Z' }
  ]
};

function assignedCases() { return MOCK_ORDERS.filter(o => ['assigned_to_designer', 'in_design', 'design_done'].includes(o.status)); }

function fileChip(label) {
  return '<div class="upload-thumb" style="display:flex; align-items:center; justify-content:center; color:var(--ink-soft);"><span class="cat">' + esc(label) + '</span>' +
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/></svg></div>';
}

function caseDetail(o) {
  const chat = CHAT[o.id] || [];
  return '<div class="card reveal" style="margin-top:14px;">' +
    '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:14px; flex-wrap:wrap;">' +
      '<div><h3 style="margin-bottom:2px;">' + o.id + ' · ' + esc(jobTypeLabel(o.jobType)) + '</h3><p>' + esc(o.clinic) + ' · ' + esc(o.patient) + '</p></div>' +
      statusPill(o.status) +
    '</div>' +
    stageTrackerHtml(o) +
    '<div class="drawer-sec" style="margin-top:22px;"><h4>Case requirements from the doctor</h4>' +
      '<div class="kv"><span class="k">Shade</span><span class="v">' + esc(o.shade) + '</span></div>' +
      (o.scanBody ? '<div class="kv"><span class="k">Scan body</span><span class="v">' + esc(o.scanBody) + '</span></div>' : '') +
      (o.implantSystem ? '<div class="kv"><span class="k">Implant system</span><span class="v">' + esc(o.implantSystem) + ' · ' + esc(o.abutmentSize || '—') + '</span></div>' : '') +
      (o.note ? '<div class="kv"><span class="k">Note</span><span class="v" style="color:var(--critical); text-align:left; max-width:60%;">' + esc(o.note) + '</span></div>' : '') +
    '</div>' +
    '<div class="drawer-sec"><h4>Doctor files</h4><div class="upload-grid" style="grid-template-columns:repeat(auto-fill,minmax(84px,1fr));">' +
      fileChip('Scan') + fileChip('Photo') + fileChip('Photo') + fileChip('Instructions') +
    '</div></div>' +
    '<div class="drawer-sec"><h4>Case chat with ' + esc(o.clinic.split('—')[0].trim()) + '</h4>' +
      '<div class="chat-thread" id="designerChat">' + (chat.length ? chat.map(m =>
        '<div class="chat-msg' + (m.from === 'me' ? ' mine' : '') + '"><div class="chat-bubble">' + esc(m.body) + '</div><div class="chat-meta">' + fmtDateTime(m.at) + '</div></div>'
      ).join('') : '<div class="chat-empty">No messages yet — say hello.</div>') + '</div>' +
      '<form class="chat-input-row" id="designerChatForm" data-order="' + o.id + '"><input id="designerChatInput" placeholder="Message the doctor…" autocomplete="off"><button class="btn btn-primary btn-sm" type="submit">Send</button></form>' +
    '</div>' +
    '<div class="drawer-actions" style="margin-top:20px; border-top:1px solid var(--line); padding-top:18px; background:none;">' +
      (o.status === 'design_done'
        ? '<span class="pill pill-progress">Design marked done — waiting for technician pickup</span>'
        : '<button class="btn btn-gold" data-designer-done="' + o.id + '">Mark design done → send to technician</button>') +
      '<button class="btn btn-ghost" data-designer-close="1">Close</button>' +
    '</div>' +
  '</div>';
}

export function renderDesigner() {
  const cases = assignedCases();
  const openId = UI.designerOpenId && cases.some(c => c.id === UI.designerOpenId) ? UI.designerOpenId : null;
  const inProgress = cases.filter(c => c.status === 'in_design').length;
  const done = cases.filter(c => c.status === 'design_done').length;

  return '<div class="page"><div class="u">' +
    '<div class="page-head reveal"><span class="eyebrow-accent">Lab · Design</span><h1 style="font-size:1.9rem;">My design queue</h1>' +
      '<p class="lede">Cases assigned to you, with everything the doctor sent and a direct line to ask them anything.</p></div>' +
    '<div class="empty-note" style="text-align:left; background:var(--gold-soft); border:1px solid color-mix(in srgb, var(--gold) 30%, var(--line)); border-radius:12px; padding:14px 16px; margin-bottom:24px;"><b style="color:var(--gold);">Design preview</b> — sample data; wires to the real workflow backend once Phase 2 lands.</div>' +
    '<div class="stat-row reveal">' +
      '<div class="stat-card"><div class="n">' + cases.length + '</div><div class="l">Assigned to you</div></div>' +
      '<div class="stat-card"><div class="n">' + inProgress + '</div><div class="l">In progress</div></div>' +
      '<div class="stat-card tone-gold"><div class="n">' + done + '</div><div class="l">Done, awaiting pickup</div></div>' +
    '</div>' +
    '<div class="case-list reveal">' + cases.map(o => {
      const modNote = o.jobType === 'veneers' && o.note ? '<div class="cc-sub" style="color:var(--critical); margin-top:6px; font-weight:600;">⚑ ' + esc(o.note) + '</div>' : '';
      return '<div class="case-card' + (openId === o.id ? '' : '') + '">' +
        '<div class="cc-top"><div><div class="cc-id">' + o.id + '</div><div class="cc-type">' + esc(jobTypeLabel(o.jobType)) + (o.jobType === 'veneers' ? ' · ' + (o.stageType === 'demo' ? 'Demo' : 'Final') : '') + '</div></div>' + statusPill(o.status) + '</div>' +
        '<div class="cc-title">' + esc(o.clinic) + '</div><div class="cc-sub">' + esc(o.patient) + ' · Shade ' + esc(o.shade) + '</div>' +
        modNote +
        '<div class="cc-foot"><span class="mono" style="font-size:11px; color:var(--ink-soft);">' + fmtDateTime(o.submittedAt) + '</span>' +
        '<button class="btn btn-ghost btn-sm" data-designer-open="' + o.id + '">' + (openId === o.id ? 'Close' : 'Open case') + '</button></div>' +
      '</div>';
    }).join('') + '</div>' +
    (openId ? caseDetail(cases.find(c => c.id === openId)) : '') +
  '</div></div>';
}

export function attachDesignerHandlers() {
  document.querySelectorAll('[data-designer-open]').forEach(b => b.addEventListener('click', () => {
    UI.designerOpenId = UI.designerOpenId === b.dataset.designerOpen ? null : b.dataset.designerOpen;
    renderCurrent();
  }));
  const closeBtn = document.querySelector('[data-designer-close]');
  if (closeBtn) closeBtn.addEventListener('click', () => { UI.designerOpenId = null; renderCurrent(); });
  document.querySelectorAll('[data-designer-done]').forEach(b => b.addEventListener('click', () => {
    const o = MOCK_ORDERS.find(x => x.id === b.dataset.designerDone);
    if (o) { o.status = 'design_done'; toast(o.id + ' marked done — sent to technician.'); renderCurrent(); }
  }));
  const chatForm = document.getElementById('designerChatForm');
  if (chatForm) chatForm.addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('designerChatInput');
    const body = input.value.trim();
    if (!body) return;
    const id = chatForm.dataset.order;
    CHAT[id] = CHAT[id] || [];
    CHAT[id].push({ from: 'me', body, at: new Date().toISOString() });
    input.value = '';
    renderCurrent();
  });
}
