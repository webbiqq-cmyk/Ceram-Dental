// Designer dashboard — wired to the real workflow backend.
import { UI } from '../state.js';
import { esc, fmtDateTime } from '../utils/format.js';
import { jobTypeLabel, statusPill, stageTrackerHtml } from '../utils/workflow.js';
import { listOrders, listStaff, getOrder, designDone, postMessage } from '../utils/ordersApi.js';
import { uploadZoneHtml, attachUploadZone } from '../components/caseUpload.js';
import { attachLiveChat } from '../components/orderDetail.js';
import { toast } from '../toast.js';
import { renderCurrent } from '../router.js';

let technicianOptions = [];
let detailCache = null; // { order, history, files, messages } for whichever case is open

function fileChip(f) {
  return '<a class="upload-thumb" href="' + esc(f.url) + '" target="_blank" rel="noopener" style="display:flex; align-items:center; justify-content:center; color:var(--ink-soft); text-decoration:none;"><span class="cat">' + esc(f.category) + '</span>' +
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/></svg></a>';
}

function caseDetail() {
  if (!detailCache) return '';
  const { order: o, files, messages } = detailCache;
  return '<div class="card reveal" style="margin-top:14px;">' +
    '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:14px; flex-wrap:wrap;">' +
      '<div><h3 style="margin-bottom:2px;">' + o.order_number + ' · ' + esc(jobTypeLabel(o.job_type)) + '</h3><p>' + esc(o.patient_ref) + '</p></div>' +
      statusPill(o.status) +
    '</div>' +
    stageTrackerHtml({ jobType: o.job_type, stageType: o.stage_type, status: o.status }) +
    '<div class="drawer-sec" style="margin-top:22px;"><h4>Case requirements from the doctor</h4>' +
      '<div class="kv"><span class="k">Shade</span><span class="v">' + esc(o.shade || '—') + '</span></div>' +
      (o.scan_body ? '<div class="kv"><span class="k">Scan body</span><span class="v">' + esc(o.scan_body) + '</span></div>' : '') +
      (o.implant_system ? '<div class="kv"><span class="k">Implant system</span><span class="v">' + esc(o.implant_system) + ' · ' + esc(o.abutment_size || '—') + '</span></div>' : '') +
      (o.instructions ? '<div class="kv"><span class="k">Instructions</span><span class="v" style="text-align:left; max-width:60%;">' + esc(o.instructions) + '</span></div>' : '') +
    '</div>' +
    '<div class="drawer-sec"><h4>Doctor files</h4>' +
      (files.length ? '<div class="upload-grid" style="grid-template-columns:repeat(auto-fill,minmax(84px,1fr));">' + files.map(fileChip).join('') + '</div>' : '<p style="color:var(--ink-soft); font-size:13px;">No files attached yet.</p>') +
    '</div>' +
    (o.job_type === 'veneers' && o.stage_type === 'final' ? '<p>Approved design locked. Changes require a new job order.</p>' : '<div class="drawer-sec"><h4>Attach a design file</h4>' + uploadZoneHtml('des-file', 'Design file', 'STL, screenshot, or design export') + '</div>') +
    (o.rejection_note ? '<p>' + esc(o.rejection_note) + '</p>' : '') +
    '<div class="drawer-sec"><h4>Case chat</h4>' +
      '<div class="chat-thread" id="designerChat">' + (messages.length ? messages.map(m =>
        '<div class="chat-msg' + (m.sender_role === 'designer' ? ' mine' : '') + '"><div class="chat-bubble">' + esc(m.body) + '</div><div class="chat-meta">' + esc(m.sender_name) + ' · ' + fmtDateTime(m.created_at) + '</div></div>'
      ).join('') : '<div class="chat-empty">No messages yet — say hello.</div>') + '</div>' +
      '<form class="chat-input-row" id="designerChatForm"><input id="designerChatInput" placeholder="Message the doctor…" autocomplete="off"><button class="btn btn-primary btn-sm" type="submit">Send</button></form>' +
    '</div>' +
    '<div class="drawer-actions" style="margin-top:20px; border-top:1px solid var(--line); padding-top:18px; background:none; flex-wrap:wrap;">' +
      (o.status === 'in_design' && o.stage_type === 'demo'
        ? '<button class="btn btn-gold" data-designer-done="' + o.id + '">Send demo/design to doctor</button>'
        : (o.status === 'in_design' || o.status === 'doctor_approved')
          ? '<select id="techPick" aria-label="Choose a technician"><option value="">Choose a technician…</option>' + technicianOptions.map(t => '<option value="' + t.id + '">' + esc(t.name) + '</option>').join('') + '</select><button class="btn btn-gold" data-designer-done="' + o.id + '">Send to technician</button>'
          : '<span>Waiting for the next workflow stage</span>') +
      '<button class="btn btn-ghost" data-designer-close="1">Close</button>' +
    '</div>' +
  '</div>';
}

export async function renderDesigner() {
  let orders = [];
  try {
    const [ordersRes, techRes] = await Promise.all([listOrders('designer'), listStaff('designer', 'technician')]);
    orders = ordersRes.orders; technicianOptions = techRes.staff;
  } catch (e) {
    return '<div class="page"><div class="u"><div class="page-head reveal"><span class="eyebrow-accent">Lab · Design</span><h1 style="font-size:1.9rem;">My design queue</h1></div>' +
      '<div class="empty-note">Couldn\'t reach the workflow backend (' + esc(e.message) + ').</div></div></div>';
  }

  if (UI.designerOpenId && !orders.some(o => o.id === UI.designerOpenId)) UI.designerOpenId = null;
  if (UI.designerOpenId) {
    try { detailCache = await getOrder('designer', UI.designerOpenId); }
    catch (e) { detailCache = null; }
  } else detailCache = null;

  const inProgress = orders.filter(o => o.status === 'in_design').length;
  const done = orders.filter(o => o.status === 'doctor_approved').length;

  return '<div class="page"><div class="u">' +
    '<div class="page-head reveal"><span class="eyebrow-accent">Lab · Design</span><h1 style="font-size:1.9rem;">My design queue</h1>' +
      '<p class="lede">Cases assigned to you, with everything the doctor sent and a direct line to ask them anything.</p></div>' +
    '<div class="stat-row reveal">' +
      '<div class="stat-card"><div class="n">' + orders.length + '</div><div class="l">Assigned to you</div></div>' +
      '<div class="stat-card"><div class="n">' + inProgress + '</div><div class="l">In progress</div></div>' +
      '<div class="stat-card tone-gold"><div class="n">' + done + '</div><div class="l">Approved for handoff</div></div>' +
    '</div>' +
    (orders.length ? '<div class="case-list reveal">' + orders.map(o =>
      '<div class="case-card"><div class="cc-top"><div><div class="cc-id">' + o.order_number + '</div><div class="cc-type">' + esc(jobTypeLabel(o.job_type)) + (o.job_type === 'veneers' ? ' · ' + (o.stage_type === 'demo' ? 'Demo' : 'Final') : '') + '</div></div>' + statusPill(o.status) + '</div>' +
      '<div class="cc-title">' + esc(o.patient_ref) + (o.shade ? ' · Shade ' + esc(o.shade) : '') + '</div>' +
      '<div class="cc-foot"><span class="mono" style="font-size:11px; color:var(--ink-soft);">' + fmtDateTime(o.created_at) + '</span>' +
      '<button class="btn btn-ghost btn-sm" data-designer-open="' + o.id + '">' + (UI.designerOpenId === o.id ? 'Close' : 'Open case') + '</button></div></div>'
    ).join('') + '</div>' : '<div class="empty-note">Nothing assigned to you right now.</div>') +
    caseDetail() +
  '</div></div>';
}

export function attachDesignerHandlers() {
  document.querySelectorAll('[data-designer-open]').forEach(b => b.addEventListener('click', () => {
    UI.designerOpenId = UI.designerOpenId === b.dataset.designerOpen ? null : b.dataset.designerOpen;
    renderCurrent();
  }));
  const closeBtn = document.querySelector('[data-designer-close]');
  if (closeBtn) closeBtn.addEventListener('click', () => { UI.designerOpenId = null; renderCurrent(); });
  document.querySelectorAll('[data-designer-done]').forEach(b => b.addEventListener('click', async () => {
    const techPick = document.getElementById('techPick');
    const technicianId = techPick ? techPick.value : '';
    if (techPick && !technicianId) { toast('Choose a technician first.'); return; }
    try {
      const res = await designDone(b.dataset.designerDone, technicianId);
      toast(res.order.order_number + (res.order.status === 'waiting_doctor_approval' ? ' — demo sent to doctor.' : ' — sent to technician.'));
      renderCurrent();
    } catch (e) { toast(e.message); }
  }));
  if (detailCache) attachUploadZone(document, 'des-file', { role: 'designer', orderId: detailCache.order.id, stageType: detailCache.order.stage_type, category: 'design_file' });
  const thread = document.getElementById('designerChat');
  if (thread && detailCache) attachLiveChat(thread.parentElement, 'designer', detailCache.order.id, '#designerChat');
  const chatForm = document.getElementById('designerChatForm');
  if (chatForm) chatForm.addEventListener('submit', async e => {
    e.preventDefault();
    const input = document.getElementById('designerChatInput');
    const body = input.value.trim();
    if (!body || !detailCache) return;
    try { await postMessage('designer', detailCache.order.id, body); input.value = ''; renderCurrent(); }
    catch (err) { toast(err.message); }
  });
  document.addEventListener('case-file-uploaded', () => renderCurrent(), { once: true });
}
