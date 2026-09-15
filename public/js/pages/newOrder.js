import { UI } from '../state.js';
import { esc } from '../utils/format.js';
import { JOB_TYPES, jobTypeLabel } from '../utils/workflow.js';
import { createOrder } from '../utils/ordersApi.js';
import { uploadZoneHtml, attachUploadZone } from '../components/caseUpload.js';
import { DentalChart, FDI_ARCHES } from '../components/dentalChart.js';
import { DentalServiceToolbar } from '../components/dentalServiceToolbar.js';
import { DentalLegend } from '../components/dentalLegend.js';
import { SelectedServicesSummary, groupServices, prescriptionStatus, SERVICE_META } from '../components/selectedServicesSummary.js';
import { ServiceConfigurationShell } from '../components/serviceConfigurationShell.js';
import { ReviewSummary } from '../components/reviewSummary.js';
import { toothMeta } from '../components/toothMetadata.js';
import { renderCurrent, repaintCurrent } from '../router.js';

const SERVICE_JOB_TYPES={veneer:'veneers',crown:'crowns',bridge:'bridges'};
const STEPS=['Case details','Dental prescription','Review & submit'];
const ALL_TEETH=FDI_ARCHES.flatMap(arch=>arch.teeth);

function defaultConfig(service) {
  if(service==='veneer') return {material:'e.max',secondary:'Natural',finish:'Natural texture',character:'Natural',shade:'',notes:''};
  if(service==='crown') return {material:'Zirconia',secondary:'Full Crown',finish:'Glazed',character:'Standard',contact:'Normal',shade:'',notes:''};
  if(service==='bridge') return {material:'Zirconia',secondary:'Modified ridge lap',finish:'Glazed',character:'Standard',contact:'Normal',shade:'',notes:''};
  if(service==='implant') return {restorationType:'Single Implant Crown',abutment:'Stock',material:'Zirconia',character:'Screw Retained',shade:'',implantSystem:'',scanBody:'',abutmentSize:'',abutmentAvailability:'',notes:''};
  return {};
}
function freshForm(seed={}) {
  return {patientRef:seed.patientRef||'',caseKind:'New case',deliveryMethod:seed.deliveryMethod||'pickup',targetDate:'',step:0,teeth:ALL_TEETH.map(number=>({number,service:'none',selected:false})),configs:{veneer:defaultConfig('veneer'),crown:defaultConfig('crown'),bridge:defaultConfig('bridge'),implant:defaultConfig('implant')},activeConfigIndex:0,createdOrders:[],submissionComplete:false,submissionError:''};
}
function normalizeForm(form) {
  if(!form || !Array.isArray(form.teeth)) return freshForm(form||{});
  form.step=Number.isInteger(form.step)?Math.min(2,Math.max(0,form.step>2?1:form.step)):0;
  form.caseKind=form.caseKind||'New case'; form.deliveryMethod=form.deliveryMethod||'pickup'; form.targetDate=form.targetDate||''; form.configs=form.configs||{};
  for(const key of ['veneer','crown','bridge','implant']) form.configs[key]={...defaultConfig(key),...(form.configs[key]||{})};
  form.createdOrders=form.createdOrders||[]; form.activeConfigIndex=form.activeConfigIndex||0; return form;
}
function stepHeader(step) {
  return '<ol class="workspace-steps new-order-steps" aria-label="New case progress">'+STEPS.map((label,i)=>'<li'+(i===step?' aria-current="step"':'')+'><span>'+(i<step?'✓':i+1)+'</span><em>'+label+'</em></li>').join('')+'</ol>';
}
function caseDetails(form) {
  return '<div class="new-order-intro"><span class="eyebrow-accent">Start with the essentials</span><h2>Who is this case for?</h2><p class="lede">Use a patient reference rather than a full name. Clinical choices come next.</p></div><div class="case-detail-panel"><div class="field full"><label for="order-patientRef">Patient reference *</label><input id="order-patientRef" data-order-field="patientRef" value="'+esc(form.patientRef)+'" maxlength="250" required autocomplete="off" placeholder="e.g. PT-1048"></div><fieldset class="segmented-field"><legend>Case type</legend><div><button type="button" data-case-kind="New case" aria-pressed="'+(form.caseKind==='New case')+'">New</button><button type="button" data-case-kind="Redo" aria-pressed="'+(form.caseKind==='Redo')+'">Redo</button></div></fieldset><div class="field full"><label for="order-deliveryMethod">Collection</label><select id="order-deliveryMethod" data-order-field="deliveryMethod"><option value="pickup"'+(form.deliveryMethod==='pickup'?' selected':'')+'>In-house pickup</option><option value="delivery"'+(form.deliveryMethod==='delivery'?' selected':'')+'>Delivery to your clinic</option></select></div><div class="field full"><label for="order-targetDate">Requested completion <span class="field-optional">Optional</span></label><input type="date" id="order-targetDate" data-order-field="targetDate" value="'+esc(form.targetDate||'')+'" min="'+new Date().toISOString().slice(0,10)+'"><small class="field-hint">The lab works towards this date where it can. Reception will confirm what is achievable.</small></div></div><div class="workspace-notice">You will add the teeth, services and lab prescription in the following steps.</div>';
}
function inspector(form) {
  const selected=form.teeth.filter(t=>t.selected), groups=groupServices(form.teeth);
  if(selected.length>1) return '<aside class="prescription-inspector"><span class="service-card-kicker">Selected teeth</span><h3>'+selected.length+' teeth selected</h3><ul>'+selected.map(t=>'<li><strong>'+t.number+'</strong><span>'+esc(toothMeta(t.number).name)+'</span></li>').join('')+'</ul><p>Assign one restoration to this selection from the treatment controls.</p></aside>';
  if(selected.length===1) { const t=selected[0], meta=toothMeta(t.number), label=t.service==='none'?'No treatment':SERVICE_META[t.service]?.restoration || t.service; return '<aside class="prescription-inspector"><span class="service-card-kicker">Selected tooth</span><h3>FDI '+t.number+'</h3><p>'+esc(meta.name)+'</p><dl><div><dt>Class</dt><dd>'+esc(meta.className)+'</dd></div><div><dt>Current prescription</dt><dd>'+esc(label)+'</dd></div></dl>'+(t.service!=='none'?'<button type="button" class="btn btn-ghost btn-sm" data-configure-service="'+esc(t.service)+'">Open prescription</button><button type="button" class="text-button" data-remove-selected>Remove treatment</button>':'')+'</aside>'; }
  const active=groups[form.activeConfigIndex], status=active?prescriptionStatus(active.key,form.configs[active.key]):null;
  return '<aside class="prescription-inspector"><span class="service-card-kicker">Dental prescription</span><h3>'+(active?esc(active.label):'Treatment map')+'</h3><p>'+(active?active.teeth.length+' selected unit'+(active.teeth.length===1?'':'s'):'Select teeth to begin a prescription.')+'</p>'+(status?'<strong class="prescription-status '+status.state+'">'+status.icon+' '+esc(status.label)+'</strong>':'')+'</aside>';
}
function prescriptionWorkspace(form) {
  const selected=form.teeth.filter(t=>t.selected).length;
  const groups=groupServices(form.teeth); form.activeConfigIndex=Math.min(form.activeConfigIndex,Math.max(0,groups.length-1)); const group=groups[form.activeConfigIndex];
  return '<div class="prescription-workspace"><div class="prescription-top"><div><span class="eyebrow-accent">Dental prescription</span><h2>Treatment map</h2><p class="lede">Select teeth, assign restorations, and complete the lab prescription without losing chart context.</p></div>'+DentalLegend()+'</div><div class="prescription-grid"><main>'+DentalChart(form.teeth)+DentalServiceToolbar(selected)+'<section class="active-prescriptions"><div class="review-section-head"><span class="review-label">Active prescriptions</span><strong>'+groups.length+'</strong></div>'+SelectedServicesSummary(form.teeth,form.configs,group?.key || '')+'</section></main>'+inspector(form)+'</div>'+(group?'<section class="inline-prescription-panel">'+ServiceConfigurationShell(group.key,group.teeth,form.configs[group.key],form.activeConfigIndex,groups.length)+'</section>':'<div class="workspace-notice">Assign a restoration to at least one tooth to open prescription details.</div>')+'</div>';
}
function confirmation(form) {
  const incomplete=!!form.submissionError;
  return '<div class="page new-order-page"><div class="u"><div class="page-head"><div><span class="eyebrow-accent">'+(incomplete?'Case update':'Case created')+'</span><h1>'+(incomplete?'Some orders need attention.':'Your case is with reception.')+'</h1><p class="lede">'+(incomplete?'Created orders are listed below. No duplicate orders were sent.':'Attach supporting files to the relevant service order below.')+'</p></div></div><section class="wizard new-order-wizard confirmation-wizard"><div class="wiz-body">'+(incomplete?'<p class="form-error" role="alert">'+esc(form.submissionError)+'</p>':'')+'<div class="created-orders">'+form.createdOrders.map((row,index)=>{const o=row.order;return '<article class="created-order"><header><div><span class="service-card-kicker">'+esc(row.label)+'</span><h2>'+esc(o.order_number)+'</h2><p>'+esc(jobTypeLabel(o.job_type))+'</p></div><span class="created-check" aria-hidden="true">✓</span></header><details'+(form.createdOrders.length===1?' open':'')+'><summary>Add supporting files</summary><div class="created-upload-grid">'+uploadZoneHtml('order-'+index+'-scan','Scan or reference file','STL, OBJ, PLY, PDF or image under 10 MB')+uploadZoneHtml('order-'+index+'-photo','Clinical or shade photo','Choose a photo from this case')+'</div></details></article>';}).join('')+'</div>'+(incomplete?'<div class="workspace-notice">Please contact reception with the patient reference to complete any missing service order safely.</div>':'<div class="workspace-notice">Reception will check the details and payment status before assigning each order.</div>')+'</div><div class="wiz-foot"><button class="btn btn-ghost" id="newOrderAgain">Create another case</button><a class="btn btn-primary" href="#/portal" id="newOrderDone">View my cases</a></div></section></div></div>';
}
export function renderNewOrder() {
  const form=UI.newOrderForm=normalizeForm(UI.newOrderForm);
  if(form.submissionComplete || form.submissionError && form.createdOrders.length) return confirmation(form);
  const body=[()=>caseDetails(form),()=>prescriptionWorkspace(form),()=>ReviewSummary(form)][form.step]();
  const groups=groupServices(form.teeth);
  const submitLabel=form.step===2?'Submit to Ceram Lab':'Continue';
  return '<div class="page new-order-page"><div class="u"><div class="page-head new-order-page-head"><div><span class="eyebrow-accent">Dentist workspace</span><h1>Create a new case</h1><p class="lede">A precise digital prescription, built tooth by tooth.</p></div></div><form class="wizard new-order-wizard" id="newOrderForm"><div class="wiz-body">'+stepHeader(form.step)+body+'<p class="form-error" id="orderFormError" role="alert"></p></div><div class="wiz-foot">'+(form.step?'<button class="btn btn-ghost" type="button" id="orderBack">Back</button>':'<a class="btn btn-ghost" href="#/portal">Back to overview</a>')+'<button class="btn btn-primary" type="submit"'+(form.step===1&&!groups.length?' disabled':'')+'>'+submitLabel+'</button></div></form></div></div>';
}
function readFields(form) {
  document.querySelectorAll('[data-order-field]').forEach(el=>{form[el.dataset.orderField]=el.value;});
  const active=groupServices(form.teeth)[form.activeConfigIndex]; if(active) document.querySelectorAll('[data-config-field]').forEach(el=>{form.configs[active.key][el.dataset.configField]=el.value;});
}
function renderWithoutScrollJump() {
  const x=window.scrollX, y=window.scrollY;
  repaintCurrent();
  requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo(x,y)));
}
function validateConfig(service,config) { if(service==='implant'&&(!config.implantSystem.trim()||!config.scanBody.trim()||!config.abutmentSize.trim())) return 'Implant system, scan body and abutment size are required.'; if(!config.shade) return 'Shade is required for each active prescription.'; return ''; }
function withOther(value,other) {
  const text=String(other||'').trim();
  return text && (value==='Other' || value==='Custom') ? value+': '+text : value;
}
function serializeInstructions(form,group) {
  const c=form.configs[group.key], lines=['DENTAL PRESCRIPTION','','RESTORATION: '+(SERVICE_META[group.key]?.label || group.key).toUpperCase(),'','TEETH'];
  group.teeth.forEach(number=>lines.push(number+' - '+toothMeta(number).name));
  const fields=[['CASE',form.caseKind],['MATERIAL',withOther(c.material,c.materialOther)],['SHADE',withOther(c.shade,c.shadeOther)],['TOOTH FORM',group.key==='veneer'?withOther(c.secondary,c.secondaryOther):''],['RESTORATION TYPE',group.key==='implant'?withOther(c.restorationType,c.restorationTypeOther):(group.key==='crown'?withOther(c.secondary,c.secondaryOther):'')],['PONTIC PREFERENCE',group.key==='bridge'?withOther(c.secondary,c.secondaryOther):''],['SURFACE CHARACTER',group.key==='veneer'?withOther(c.finish,c.finishOther):''],['FINISH',group.key!=='veneer'?withOther(c.finish,c.finishOther):''],['TRANSLUCENCY / CHARACTER',withOther(c.character,c.characterOther)],['CONTACT INSTRUCTIONS',withOther(c.contact,c.contactOther)],['ABUTMENT',withOther(c.abutment,c.abutmentOther)],['IMPLANT SYSTEM',c.implantSystem],['SCAN BODY',c.scanBody],['ABUTMENT SIZE',c.abutmentSize],['ABUTMENT AVAILABILITY',c.abutmentAvailability]];
  fields.forEach(([label,value])=>{if(value) lines.push('',label,String(value));});
  if(c.notes?.trim()) lines.push('','CLINICAL INSTRUCTIONS',c.notes.trim()); return lines.join('\n');
}
function orderBody(form,group) {
  const c=form.configs[group.key], implant=group.key==='implant', jobType=implant?(c.restorationType==='Implant Bridge'?'implant_bridge':'implant_crown'):SERVICE_JOB_TYPES[group.key];
  if(!JOB_TYPES.some(j=>j.key===jobType)) throw new Error('Unsupported service type.');
  return {patientRef:form.patientRef.trim(),jobType,shade:withOther(c.shade,c.shadeOther)||'',instructions:serializeInstructions(form,group),scanBody:implant?c.scanBody:'',implantSystem:implant?c.implantSystem:'',abutmentSize:implant?c.abutmentSize:'',abutmentAvailability:implant?c.abutmentAvailability:'',deliveryMethod:form.deliveryMethod,targetDate:form.targetDate||null};
}
export function attachNewOrderHandlers() {
  const form=UI.newOrderForm;
  if(form.submissionComplete || form.submissionError && form.createdOrders.length) {
    form.createdOrders.forEach((row,index)=>{const o=row.order;attachUploadZone(document,'order-'+index+'-scan',{role:'dentist',orderId:o.id,stageType:o.stage_type,category:'scan'});attachUploadZone(document,'order-'+index+'-photo',{role:'dentist',orderId:o.id,stageType:o.stage_type,category:'photo'});});
    document.getElementById('newOrderAgain')?.addEventListener('click',()=>{UI.newOrderForm=freshForm();renderCurrent();}); document.getElementById('newOrderDone')?.addEventListener('click',()=>{UI.portalTab='orders';UI.portalFilter='all';UI.newOrderForm=null;}); return;
  }
  document.querySelectorAll('[data-order-field],[data-config-field]').forEach(el=>el.addEventListener('input',()=>readFields(form)));
  document.querySelectorAll('[data-case-kind]').forEach(button=>button.addEventListener('click',()=>{form.caseKind=button.dataset.caseKind;renderCurrent();}));
  document.querySelectorAll('[data-tooth]').forEach(button=>button.addEventListener('click',()=>{const tooth=form.teeth.find(t=>t.number===Number(button.dataset.tooth));tooth.selected=!tooth.selected;renderWithoutScrollJump();}));
  document.querySelectorAll('[data-assign-service]').forEach(button=>button.addEventListener('click',()=>{const service=button.dataset.assignService;form.teeth.filter(t=>t.selected).forEach(t=>{t.service=service;t.selected=false;});const i=groupServices(form.teeth).findIndex(g=>g.key===service);if(i>=0)form.activeConfigIndex=i;renderWithoutScrollJump();}));
  document.querySelector('[data-remove-selected]')?.addEventListener('click',()=>{form.teeth.filter(t=>t.selected).forEach(t=>{t.service='none';});renderWithoutScrollJump();});
  document.querySelectorAll('[data-delete-prescription]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();form.teeth.forEach(t=>{if(t.service===button.dataset.deletePrescription){t.service='none';t.selected=false;}});form.activeConfigIndex=0;renderWithoutScrollJump();}));
  document.querySelectorAll('[data-configure-service],[data-service-summary]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();const service=button.dataset.configureService||button.dataset.serviceSummary;const index=groupServices(form.teeth).findIndex(g=>g.key===service);if(index>=0)form.activeConfigIndex=index;renderWithoutScrollJump();}));
  document.querySelectorAll('[data-option-group]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();const active=groupServices(form.teeth)[form.activeConfigIndex];form.configs[active.key][button.dataset.optionGroup]=button.dataset.optionValue;renderWithoutScrollJump();}));
  document.querySelectorAll('[data-edit-step]').forEach(button=>button.addEventListener('click',()=>{form.step=Number(button.dataset.editStep);renderCurrent();}));
  document.getElementById('orderBack')?.addEventListener('click',()=>{readFields(form);form.step--;renderCurrent();});
  document.getElementById('newOrderForm')?.addEventListener('submit',async event=>{
    event.preventDefault(); readFields(form); const error=document.getElementById('orderFormError');
    if(form.step===0&&!form.patientRef.trim()){error.textContent='Patient reference is required.';document.getElementById('order-patientRef')?.focus();return;}
    const groups=groupServices(form.teeth); if(form.step===1&&!groups.length){error.textContent='Assign a restoration to at least one tooth.';return;}
    if(form.step<2){form.step++;renderCurrent();return;}
    for(const group of groups){const message=validateConfig(group.key,form.configs[group.key]);if(message){form.activeConfigIndex=groups.indexOf(group);form.step=1;renderCurrent();document.getElementById('orderFormError').textContent=message;return;}}
    const button=event.target.querySelector('[type=submit]');button.disabled=true;button.textContent='Creating orders…';form.createdOrders=[];form.submissionError='';
    try {for(const group of groups){const {order}=await createOrder(orderBody(form,group));form.createdOrders.push({service:group.key,label:group.label,order});}form.submissionComplete=true;renderCurrent();}
    catch(err){form.submissionError='The remaining service orders could not be created: '+err.message;renderCurrent();}
  });
}
