import { esc } from '../utils/format.js';
export const SERVICE_META={
  veneer:{label:'Veneers',restoration:'Veneer',mark:'V'},
  crown:{label:'Crowns',restoration:'Crown',mark:'C'},
  bridge:{label:'Fixed bridge',restoration:'Bridge',mark:'B'},
  implant:{label:'Implant restoration',restoration:'Implant restoration',mark:'I'}
};
export function groupServices(teeth) {
  return Object.keys(SERVICE_META).map(key=>({key,...SERVICE_META[key],teeth:teeth.filter(t=>t.service===key).map(t=>t.number).sort((a,b)=>a-b)})).filter(g=>g.teeth.length);
}
export function prescriptionStatus(service,config={}) {
  if(service==='implant') {
    const missing=['implantSystem','scanBody','abutmentSize'].filter(k=>!String(config[k]||'').trim());
    return missing.length ? {state:'incomplete',label:missing[0].replace(/([A-Z])/g,' $1').replace(/^./,m=>m.toUpperCase())+' required',icon:'◐'} : {state:'ready',label:'Ready',icon:'✓'};
  }
  if(!config.shade) return {state:'incomplete',label:'Shade needed',icon:'◐'};
  return {state:'ready',label:'Ready',icon:'✓'};
}
export function SelectedServicesSummary(teeth,configs={},activeKey='') {
  const groups=groupServices(teeth);
  if(!groups.length) return '<div class="active-prescriptions-empty">No active prescriptions yet. Select teeth on the chart, then assign a restoration.</div>';
  return '<div class="selected-services active-prescriptions-list">' + groups.map(g=>{const c=configs[g.key]||{},s=prescriptionStatus(g.key,c);const summary=[c.material,c.shade,c.secondary||c.restorationType,c.finish].filter(Boolean).join(' • ');return '<article class="selected-service-card prescription-card' + (activeKey===g.key?' active':'') + '" data-service-summary="' + g.key + '"><div class="service-card-mark" data-service="' + g.key + '">' + g.mark + '</div><div><span class="service-card-kicker">' + esc(g.label) + '</span><h3>' + g.teeth.length + ' ' + (g.teeth.length===1?'tooth':'teeth') + '</h3><p>' + g.teeth.join(' · ') + '</p>' + (summary?'<small>'+esc(summary)+'</small>':'') + '<strong class="prescription-status '+s.state+'">'+s.icon+' '+esc(s.label)+'</strong></div><div class="prescription-actions"><button type="button" aria-label="Edit '+esc(g.label)+' prescription" title="Edit prescription" data-configure-service="' + g.key + '">✎</button><button type="button" aria-label="Delete '+esc(g.label)+' prescription" title="Delete prescription" data-delete-prescription="' + g.key + '">×</button></div></article>';}).join('') + '</div>';
}
