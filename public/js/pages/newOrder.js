import { UI } from '../state.js';
import { esc } from '../utils/format.js';
import { JOB_TYPES, jobTypeLabel } from '../utils/workflow.js';
import { createOrder } from '../utils/ordersApi.js';
import { uploadZoneHtml, attachUploadZone } from '../components/caseUpload.js';
import { renderCurrent } from '../router.js';

const IMPLANT_TYPES = ['implant_crown','implant_bridge'];
function freshForm() { return {patientRef:'',jobType:'',shade:'',instructions:'',scanBody:'',implantSystem:'',abutmentSize:'',abutmentAvailability:'',deliveryMethod:'pickup',step:0,createdOrder:null}; }
function field(key,label,f,required=false) { return '<div class="field"><label for="order-' + key + '">' + label + (required ? ' *' : '') + '</label><input id="order-' + key + '" data-order-field="' + key + '" value="' + esc(f[key]) + '"' + (required ? ' required' : '') + ' maxlength="250"></div>'; }
function details(f) {
  return '<h2>Details for the lab</h2><p class="lede">Fields marked * are required. Use a patient reference rather than a full name.</p><div class="field-grid">' + field('patientRef','Patient reference',f,true) + field('shade','Shade',f) + (IMPLANT_TYPES.includes(f.jobType) ? field('scanBody','Scan body',f,true)+field('implantSystem','Implant system',f,true)+field('abutmentSize','Abutment size',f,true)+field('abutmentAvailability','Abutment availability',f) : '') + '<div class="field full"><label for="order-instructions">Instructions for the lab</label><textarea id="order-instructions" data-order-field="instructions" maxlength="4000" placeholder="Teeth involved, material, fitting details and any special requests…">' + esc(f.instructions) + '</textarea></div><div class="field full"><label for="order-deliveryMethod">Pickup or delivery</label><select id="order-deliveryMethod" data-order-field="deliveryMethod"><option value="pickup"' + (f.deliveryMethod==='pickup'?' selected':'') + '>In-house pickup</option><option value="delivery"' + (f.deliveryMethod==='delivery'?' selected':'') + '>Delivery to your clinic</option></select></div></div><div class="workspace-notice">' + (IMPLANT_TYPES.includes(f.jobType) ? 'Have your implant scans and component references ready.' : f.jobType==='veneers' ? 'Have clinical photos, shade references and scans ready for the demo/design.' : 'Have any relevant photos, scans or impressions ready for the lab.') + ' You can attach files securely after creating the order.</div>';
}
export function renderNewOrder() {
  const f=UI.newOrderForm || (UI.newOrderForm=freshForm()); f.step=f.step || 0;
  if(f.createdOrder) {
    const o=f.createdOrder;
    return '<div class="page"><div class="u"><div class="page-head"><div><span class="eyebrow-accent">New case</span><h1>Your order is with reception.</h1><p class="lede">' + esc(o.order_number) + ' · ' + esc(jobTypeLabel(o.job_type)) + '</p></div></div><section class="wizard"><div class="wiz-body"><h2>Add supporting files</h2><p class="lede">Attach photos, scans or reference documents where needed. Each file must be under 10 MB.</p>' + uploadZoneHtml('no-scan','Scan or reference file','STL, OBJ, PLY, PDF or an image') + '<br>' + uploadZoneHtml('no-photo','Clinical or shade photo','Choose a photo from this case') + '<p class="workspace-notice">Reception will check your details and payment status before assigning the case.</p></div><div class="wiz-foot"><button class="btn btn-ghost" id="newOrderAgain">Create another case</button><a class="btn btn-primary" href="#/portal" id="newOrderDone">View my cases</a></div></section></div></div>';
  }
  const steps=['Job type','Case details','Review & send'];
  let body;
  if(f.step===0) body='<h2>What are we making?</h2><p class="lede">Choose the work needed for this case.</p><div class="svc-pick-grid">' + JOB_TYPES.map(j=>'<button type="button" class="svc-pick' + (f.jobType===j.key?' selected':'') + '" data-pick-jobtype="' + j.key + '" aria-pressed="' + (f.jobType===j.key) + '"><div class="t">' + j.label + '</div><div class="d">' + (j.key==='veneers'?'Two steps · demo approval, then production':'One step · production & quality check') + '</div></button>').join('') + '</div>';
  else if(f.step===1) body=details(f);
  else body='<h2>Review your order</h2><p class="lede">Check the details before sending them to reception.</p><dl class="workspace-facts">' + [['Job type',jobTypeLabel(f.jobType)],['Patient reference',f.patientRef],['Shade',f.shade || 'Not specified'],['Collection',f.deliveryMethod==='pickup'?'In-house pickup':'Delivery'],...(IMPLANT_TYPES.includes(f.jobType)?[['Scan body',f.scanBody],['Implant system',f.implantSystem],['Abutment size',f.abutmentSize]]:[])].map(([k,v])=>'<div><dt>' + k + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl><h3>Instructions</h3><p style="white-space:pre-wrap">' + esc(f.instructions || 'No additional instructions.') + '</p><div class="workspace-notice">' + (f.jobType==='veneers' ? '<strong>Veneer is a two-step case.</strong> You will review the demo/design before production. Once approved, the design is locked; any change requires a new job order.' : 'This is a one-step case. The lab will complete production and QC, then arrange pickup or delivery. No final doctor approval is required.') + '</div><p class="lede">You can upload supporting files on the next screen.</p>';
  return '<div class="page"><div class="u"><div class="page-head"><div><span class="eyebrow-accent">Dentist workspace</span><h1>Create a new case</h1><p class="lede">A few clear steps to give your lab the details it needs.</p></div></div><form class="wizard" id="newOrderForm"><div class="wiz-body"><ol class="workspace-steps" aria-label="New case progress">' + steps.map((label,i)=>'<li' + (i===f.step?' aria-current="step"':'') + '><span>' + (i<f.step?'✓':i+1) + '</span>' + label + '</li>').join('') + body + '<p id="orderFormError" role="alert"></p></div><div class="wiz-foot">' + (f.step ? '<button class="btn btn-ghost" type="button" id="orderBack">Back</button>' : '<a class="btn btn-ghost" href="#/portal">Back to overview</a>') + '<button class="btn btn-primary" type="submit">' + (f.step===2?'Send to reception':'Continue') + '</button></div></form></div></div>';
}
function readForm() { document.querySelectorAll('[data-order-field]').forEach(el=>{ UI.newOrderForm[el.dataset.orderField]=el.value; }); }
export function attachNewOrderHandlers() {
  const f=UI.newOrderForm;
  if(f.createdOrder) {
    for(const [id,category] of [['no-scan','scan'],['no-photo','photo']]) attachUploadZone(document,id,{role:'dentist',orderId:f.createdOrder.id,stageType:f.createdOrder.stage_type,category});
    document.getElementById('newOrderAgain')?.addEventListener('click',()=>{ UI.newOrderForm=freshForm();renderCurrent(); });
    document.getElementById('newOrderDone')?.addEventListener('click',()=>{ UI.portalTab='orders';UI.portalFilter='all';UI.newOrderForm=null; });
    return;
  }
  document.querySelectorAll('[data-order-field]').forEach(el=>el.addEventListener('input',readForm));
  document.querySelectorAll('[data-pick-jobtype]').forEach(button=>button.addEventListener('click',()=>{
    f.jobType=button.dataset.pickJobtype;
    document.querySelectorAll('[data-pick-jobtype]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});
    document.getElementById('orderFormError').textContent='';
  }));
  document.getElementById('orderBack')?.addEventListener('click',()=>{readForm();f.step--;renderCurrent();});
  document.getElementById('newOrderForm')?.addEventListener('submit',async e=>{
    e.preventDefault();readForm();const error=document.getElementById('orderFormError');
    if(!f.jobType){error.textContent='Choose a job type to continue.';return;}
    if(f.step<2){f.step++;renderCurrent();return;}
    const button=e.target.querySelector('[type=submit]');button.disabled=true;button.textContent='Sending…';
    try { const {order}=await createOrder(f);f.createdOrder=order;renderCurrent(); }
    catch(err){error.textContent=err.message;button.disabled=false;button.textContent='Send to reception';}
  });
}
