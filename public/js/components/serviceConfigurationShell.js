import { esc } from '../utils/format.js';
import { VisualOptionGrid } from './visualOptionCard.js';
import { ShadeSelector } from './shadeSelector.js';
import { toothMeta } from './toothMetadata.js';

const COPY={
  veneer:{title:'Veneer prescription',intro:'Visual direction for the selected veneer teeth.',materials:[['e.max','Lithium disilicate'],['Zirconia','High-strength ceramic'],['Other','Custom specification']],secondaryLabel:'Smile / tooth form',secondary:['Natural','Soft','Defined','Bold','Custom'],finishLabel:'Surface character',finishes:['Smooth','Natural texture','Pronounced texture'],extraLabel:'Translucency / character',extra:['Low','Natural','High','Custom']},
  crown:{title:'Crown prescription',intro:'Restorative preferences for full-coverage units.',materials:[['Zirconia','High-strength ceramic'],['e.max','Lithium disilicate'],['Other','Custom specification']],secondaryLabel:'Restoration type',secondary:['Full Crown','Custom'],finishLabel:'Finish',finishes:['Glazed','Mechanical polish','Custom'],extraLabel:'Occlusion',extra:['Standard','Light','Out of occlusion','Custom'],contact:['Normal','Tight','Open','Custom']},
  bridge:{title:'Fixed bridge prescription',intro:'One shared prescription for the connected span.',materials:[['Zirconia','High-strength ceramic'],['e.max','Lithium disilicate'],['Other','Custom specification']],secondaryLabel:'Pontic preference',secondary:['Ridge lap','Modified ridge lap','Hygienic','Ovate','Custom'],finishLabel:'Finish',finishes:['Glazed','Mechanical polish','Custom'],extraLabel:'Occlusion',extra:['Standard','Light','Out of occlusion','Custom'],contact:['Normal','Tight','Open','Custom']},
  implant:{title:'Implant restoration',intro:'Existing implant fields plus visual restoration instructions.',materials:[['Zirconia','High-strength ceramic'],['e.max','Lithium disilicate'],['Other','Custom specification']],secondaryLabel:'Restoration',secondary:['Single Implant Crown','Implant Bridge'],finishLabel:'Abutment',finishes:['Stock','Custom','Other'],extraLabel:'Retention',extra:['Screw Retained','Cement Retained','Custom']}
};
const optionIcons={'e.max':'◇','Zirconia':'◈','Other':'＋','Natural':'∿','Soft':'⌒','Defined':'△','Bold':'◆','Custom':'C','Smooth':'—','Natural texture':'≋','Pronounced texture':'≋','Full Crown':'C','Glazed':'✧','Mechanical polish':'○','Single Implant Crown':'I','Implant Bridge':'B','Stock':'S','Screw Retained':'↧','Cement Retained':'●','Standard':'•','Light':'◦','Out of occlusion':'○','Normal':'•','Tight':'↔','Open':'↕','Ridge lap':'⌒','Modified ridge lap':'∿','Hygienic':'—','Ovate':'◡','Low':'L','High':'H'};
function cards(group,values,selected) { return VisualOptionGrid(values.map(item=>{const value=Array.isArray(item)?item[0]:item;return {group,value,title:value,description:Array.isArray(item)?item[1]:'',selected:value===selected,icon:optionIcons[value]};})); }
function input(key,label,value='',required=false) { return '<div class="field"><label for="config-'+key+'">'+label+(required?' *':'')+'</label><input id="config-'+key+'" data-config-field="'+key+'" value="'+esc(value)+'" maxlength="250"'+(required?' required':'')+'></div>'; }
function otherField(key,label,value) { return '<div class="field full prescription-other"><label for="config-'+key+'">'+label+'</label><input id="config-'+key+'" data-config-field="'+key+'" value="'+esc(value||'')+'" maxlength="250" placeholder="Specify details"></div>'; }
function needsOther(value) { return value==='Other' || value==='Custom'; }

export function ServiceConfigurationShell(service,teeth,config,index,total) {
  const c=COPY[service];
  const implant=service==='implant';
  const chips=teeth.map(n=>'<span title="'+esc(toothMeta(n).name)+'">FDI '+n+'</span>').join('');
  const span=service==='bridge'&&teeth.length>1?'<p class="bridge-span">Selected span: '+Math.min(...teeth)+' - '+Math.max(...teeth)+'</p>':'';
  return '<div class="service-config"><header class="service-config-head"><div><span class="eyebrow-accent">Service '+(index+1)+' of '+total+'</span><h2>'+c.title+'</h2><p class="lede">'+c.intro+'</p></div><div class="selected-teeth-chip"><span>Selected teeth</span><strong>'+teeth.join(', ')+'</strong></div></header>'+
    '<div class="prescription-teeth">'+chips+'</div>'+span+
    '<section><h3>Restoration material</h3>'+cards('material',c.materials,config.material)+(needsOther(config.material)?otherField('materialOther','Specify material',config.materialOther):'')+'</section>'+
    '<section><h3>Shade</h3>'+ShadeSelector(config.shade)+(config.shade==='Other'?otherField('shadeOther','Specify shade',config.shadeOther):'')+'</section>'+
    '<section><h3>'+c.secondaryLabel+'</h3>'+cards(implant?'restorationType':'secondary',c.secondary,config[implant?'restorationType':'secondary'])+(needsOther(config[implant?'restorationType':'secondary'])?otherField((implant?'restorationType':'secondary')+'Other','Specify '+c.secondaryLabel.toLowerCase(),config[(implant?'restorationType':'secondary')+'Other']):'')+'</section>'+
    '<section><h3>'+c.finishLabel+'</h3>'+cards(implant?'abutment':'finish',c.finishes,config[implant?'abutment':'finish'])+(needsOther(config[implant?'abutment':'finish'])?otherField((implant?'abutment':'finish')+'Other','Specify '+c.finishLabel.toLowerCase(),config[(implant?'abutment':'finish')+'Other']):'')+'</section>'+
    '<section><h3>'+c.extraLabel+'</h3>'+cards('character',c.extra,config.character)+(needsOther(config.character)?otherField('characterOther','Specify '+c.extraLabel.toLowerCase(),config.characterOther):'')+'</section>'+
    (c.contact?'<section><h3>Contact instructions</h3>'+cards('contact',c.contact,config.contact)+(needsOther(config.contact)?otherField('contactOther','Specify contact instructions',config.contactOther):'')+'</section>':'')+
    '<div class="field-grid config-fields">'+(implant?input('implantSystem','Implant system',config.implantSystem,true)+input('scanBody','Scan body',config.scanBody,true)+input('abutmentSize','Abutment size',config.abutmentSize,true)+input('abutmentAvailability','Abutment availability',config.abutmentAvailability):'')+'<div class="field full"><label for="config-notes">Clinical instructions</label><textarea id="config-notes" data-config-field="notes" maxlength="3000" placeholder="Clinical details or special requests...">'+esc(config.notes||'')+'</textarea></div></div></div>';
}
