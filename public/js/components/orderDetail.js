import { esc, fmtDateTime } from '../utils/format.js';
import { getOrder, listMessages, postMessage, doctorDecision } from '../utils/ordersApi.js';
import { stageTrackerHtml, statusPill, jobTypeLabel, STATUS_META } from '../utils/workflow.js';
import { uploadZoneHtml, attachUploadZone } from './caseUpload.js';
import { toast } from '../toast.js';
import { UI } from '../state.js';
import { renderCurrent } from '../router.js';

function messagesHtml(messages) {
  return messages.map(m => '<div class="chat-msg"><div class="chat-bubble">' + esc(m.body) + '</div><div class="chat-meta">' + esc(m.sender_name || 'Lab') + ' · ' + fmtDateTime(m.created_at) + '</div></div>').join('') || '<p>No messages yet. Start a conversation with your case team.</p>';
}
let detailRequest = 0;
export async function showOrderDetail(role, id) {
  const request=++detailRequest, route=location.hash, trigger=document.activeElement;
  try {
    const {order: o, files, history, messages} = await getOrder(role, id);
    if (request !== detailRequest || route !== location.hash) return;
    document.getElementById('orderDetail')?.close();
    document.getElementById('orderDetail')?.remove();
    const panel = document.createElement('dialog');
    panel.id = 'orderDetail'; panel.className = 'workspace-dialog'; panel.setAttribute('aria-labelledby','orderDetailTitle');
    const locked = o.job_type === 'veneers' && o.stage_type === 'final';
    const review = role === 'dentist' && o.job_type === 'veneers' && o.stage_type === 'demo' && o.status === 'waiting_doctor_approval';
    const fact=(label,value)=>'<div><dt>' + label + '</dt><dd>' + esc(value || 'Not specified') + '</dd></div>';
    panel.innerHTML = '<header><div><span class="eyebrow-accent">' + esc(jobTypeLabel(o.job_type)) + '</span><h2 id="orderDetailTitle">' + esc(o.order_number) + '</h2>' + statusPill(o.status) + '</div><button class="btn btn-ghost" data-detail-close aria-label="Close case details" autofocus>Close</button></header>' +
      (locked ? '<div class="workspace-notice"><strong>Approved design locked.</strong> Changes require a new job order. Production and delivery continue on this case.</div>' : '') +
      stageTrackerHtml({jobType:o.job_type, stageType:o.stage_type, status:o.status}) +
      '<dl class="workspace-facts">' + fact('Patient reference',o.patient_ref) + fact('Shade',o.shade) + fact('Collection method',o.delivery_method === 'delivery' ? 'Delivery to clinic' : 'In-house pickup') + fact('Last updated',fmtDateTime(o.updated_at || o.created_at)) + (o.scan_body ? fact('Scan body',o.scan_body)+fact('Implant system',o.implant_system)+fact('Abutment',o.abutment_size) : '') + '</dl>' +
      '<div class="workspace-detail-grid"><div><section><h3>Instructions & notes</h3><p style="white-space:pre-wrap">' + esc(o.instructions || 'No additional instructions.') + '</p>' + (o.rejection_note ? '<div class="workspace-notice">' + esc(o.rejection_note) + '</div>' : '') + '</section>' +
      '<section><h3>Case files & design</h3>' + (files.length ? files.map(f => '<a class="workspace-file" target="_blank" rel="noopener" href="' + esc(f.url) + '"><span>' + esc(f.category.replace(/_/g,' ')) + ' · ' + esc(f.stage_type) + '</span><span>Open ↗</span></a>').join('') : '<p class="lede">No files attached yet.</p>') +
      (role === 'dentist' && !locked ? uploadZoneHtml('doctor-file', 'Attach case file', 'Images, PDF or scans under 10 MB') : '') + '</section>' +
      (review ? '<section class="workspace-notice"><h3>Review veneer demo / design</h3><p>Review the design files and discuss any questions with the lab before approving.</p><label for="demoReviewNote">Review notes (required for rejection)</label><textarea id="demoReviewNote" maxlength="4000" placeholder="Describe any changes needed…"></textarea><label class="workspace-check"><input id="demoLockAccepted" type="checkbox"> I understand that approval locks this design. Any later change requires a new job order.</label><div class="drawer-actions"><button class="btn btn-primary" data-demo-decision="approve">Approve demo / design</button><button class="btn btn-danger-ghost" data-demo-decision="reject">Request changes</button></div><p data-review-error role="alert"></p></section>' : '') +
      (role === 'dentist' && (locked || o.status === 'rejected_by_reception') ? '<section><h3>' + (locked ? 'Need a different result?' : 'Correct and resubmit') + '</h3><p class="lede">Create a new order using these details. Review and correct the information, then attach the required files again.</p><button class="btn btn-ghost" data-new-from-case>Create new order from these details</button></section>' : '') +
      '<section><h3>Case conversation</h3><div class="chat-thread" data-order-chat role="log" aria-label="Case messages" aria-live="polite">' + messagesHtml(messages) + '</div><form class="chat-input-row"><input aria-label="Case message" placeholder="Message your case team…" required maxlength="4000"><button class="btn btn-primary">Send</button></form></section></div>' +
      '<section><h3>Case timeline</h3><ol class="workspace-timeline">' + history.map(h => '<li><strong>' + esc(STATUS_META[h.status]?.label || h.status.replace(/_/g,' ')) + '</strong><time>' + fmtDateTime(h.created_at) + '</time><p>' + esc(h.note || '') + '</p>' + (h.actor_name ? '<small>' + esc(h.actor_name) + '</small>' : '') + '</li>').join('') + '</ol></section></div>';
    document.getElementById('workspaceContent').append(panel);
    panel.addEventListener('close', () => { panel.remove(); if (trigger?.isConnected) trigger.focus(); }, {once:true});
    panel.querySelector('[data-detail-close]').onclick = () => panel.close();
    panel.showModal();
    attachLiveChat(panel, role, id, '[data-order-chat]');
    panel.querySelector('form').onsubmit = async e => {
      e.preventDefault(); const input=panel.querySelector('form input'), button=panel.querySelector('form button'); button.disabled=true;
      try { await postMessage(role,id,input.value); input.value=''; panel.querySelector('[data-order-chat]').innerHTML=messagesHtml((await listMessages(role,id)).messages); }
      catch(error) { toast(error.message); } finally { button.disabled=false; }
    };
    panel.querySelectorAll('[data-demo-decision]').forEach(button => button.addEventListener('click', async () => {
      const decision=button.dataset.demoDecision, note=panel.querySelector('#demoReviewNote').value.trim(), error=panel.querySelector('[data-review-error]');
      if (decision==='approve' && !panel.querySelector('#demoLockAccepted').checked) { error.textContent='Confirm that you understand the design lock before approving.'; return; }
      if (decision==='reject' && !note) { error.textContent='Add a note explaining the changes needed.'; panel.querySelector('#demoReviewNote').focus(); return; }
      const buttons=panel.querySelectorAll('[data-demo-decision]'); buttons.forEach(b=>b.disabled=true);
      try { await doctorDecision(id,{decision,note}); panel.close(); toast(decision==='approve' ? 'Demo approved. Design locked and ready for technician handoff.' : 'Notes sent to the designer.'); renderCurrent(); }
      catch(e) { error.textContent=e.message; buttons.forEach(b=>b.disabled=false); }
    }));
    panel.querySelector('[data-new-from-case]')?.addEventListener('click',()=>{
      UI.newOrderForm={patientRef:o.patient_ref,jobType:o.job_type,shade:o.shade || '',instructions:o.instructions || '',scanBody:o.scan_body || '',implantSystem:o.implant_system || '',abutmentSize:o.abutment_size || '',abutmentAvailability:o.abutment_availability || '',deliveryMethod:o.delivery_method || 'pickup',step:0,createdOrder:null};
      panel.close(); location.hash='#/new-order';
    });
    if (role === 'dentist' && !locked) attachUploadZone(panel,'doctor-file',{role,orderId:id,stageType:o.stage_type,category:'scan'});
    panel.addEventListener('case-file-uploaded',()=>showOrderDetail(role,id),{once:true});
  } catch(error) { toast(error.message); }
}

export function attachLiveChat(root, role, id, selector) {
  let timer;
  const refresh = async () => {
    if (!root.isConnected) return;
    try {
      const {messages} = await listMessages(role,id);
      if (root.isConnected) { const thread=root.querySelector(selector), html=messagesHtml(messages); if(thread.innerHTML!==html) thread.innerHTML=html; }
    } catch { /* Keep the existing conversation visible during a connection interruption. */ }
    if (root.isConnected) timer=setTimeout(refresh,5000);
  };
  timer=setTimeout(refresh,5000);
  const observer=new MutationObserver(() => { if (!root.isConnected) { clearTimeout(timer); observer.disconnect(); } });
  observer.observe(document.getElementById('app'),{childList:true,subtree:true});
}
