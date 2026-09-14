import { esc } from '../utils/format.js';
import { toothMeta } from './toothMetadata.js';

export const FDI_ARCHES = [
  { key:'upper', label:'Upper arch', teeth:[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28] },
  { key:'lower', label:'Lower arch', teeth:[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38] }
];

function toothSvg(number, service) {
  const lower=number>=31;
  const kind=toothMeta(number).kind;
  const shapes={
    incisor:'<path class="tooth-fill" d="M15 7c5-4 14-4 18 0 3 5 1 13-1 20-2 9-2 24-8 24s-6-15-8-24c-2-8-4-15-1-20Z"/><path class="tooth-detail" d="M18 13c4 2 8 2 12 0M20 23h8M24 16v28"/>',
    canine:'<path class="tooth-fill" d="M15 9c4-5 14-6 18 0 4 7-2 17-4 24-2 8-1 18-5 18s-4-10-5-18c-2-7-8-17-4-24Z"/><path class="tooth-detail" d="M18 15c4 2 8 2 12 0M24 17l-4 13M24 17l4 13"/>',
    premolar:'<path class="tooth-fill" d="M12 10c3-6 10-7 14-3 5-4 13-2 15 5 2 7-3 13-4 20-2 9-2 20-7 20-4 0-3-12-6-12s-3 12-7 12c-5 0-5-11-7-20-1-8-3-15 2-22Z"/><path class="tooth-detail" d="M16 14c5 3 13 3 18 0M18 24l6-5 6 5M24 20v18"/>',
    molar:'<path class="tooth-fill" d="M10 10c3-6 10-7 15-3 5-5 13-4 15 2 4 8-3 16-4 24-1 9-2 19-7 19-4 0-3-11-5-11s-2 11-6 11c-5 0-6-10-7-19-1-8-6-16-1-23Z"/><path class="tooth-detail" d="M14 15c6 4 16 4 22 0M17 24l5-4 4 5 5-5M18 33c4-3 8-3 12 0"/>'
  };
  const body=shapes[kind] || shapes.incisor;
  const implant=service==='implant' ? '<g class="implant-mark"><path d="M24 31v20M18 37h12M19 42h10M20 47h8M21 52h6"/><path d="M19 27c4 3 8 3 11 0"/></g>' : '';
  return '<svg viewBox="0 0 48 58" aria-hidden="true" class="tooth-svg ' + (lower?'is-lower':'is-upper') + '">' + body + implant + '</svg>';
}

export function Tooth(tooth) {
  const service=tooth.service || 'none';
  const meta=toothMeta(tooth.number);
  const label=service==='none' ? 'No service' : service==='implant' ? 'Implant restoration' : service[0].toUpperCase()+service.slice(1);
  const status=service==='none'?'No treatment assigned':'Current treatment: '+label;
  return '<button type="button" class="dental-tooth" data-tooth="' + tooth.number + '" data-service="' + service + '" data-kind="' + meta.kind + '" data-selected="' + String(!!tooth.selected) + '" aria-pressed="' + String(!!tooth.selected) + '" aria-label="FDI ' + tooth.number + ' — ' + esc(meta.name) + ' — ' + esc(label) + '">' + toothSvg(tooth.number,service) + '<span class="tooth-number">' + tooth.number + '</span><span class="tooth-service-mark" aria-hidden="true">' + ({veneer:'V',crown:'C',bridge:'B',implant:'I'}[service] || '') + '</span><span class="tooth-tooltip" role="tooltip"><strong>FDI ' + tooth.number + '</strong><b>' + esc(meta.name) + '</b><span>' + esc(status) + '</span><small>' + (service==='none'?'Click to select':'Click to edit') + '</small></span></button>';
}

export function DentalArch(arch, teeth) {
  const byNumber=new Map(teeth.map(t=>[t.number,t]));
  return '<section class="dental-arch dental-arch-' + arch.key + '" aria-label="' + arch.label + '"><div class="dental-arch-label"><span>' + arch.label + '</span><small>FDI notation</small></div><div class="dental-arch-scroll"><div class="dental-teeth">' + arch.teeth.map((number,index)=>(index===8?'<span class="quadrant-divider" aria-hidden="true"></span>':'')+Tooth(byNumber.get(number) || {number,service:'none',selected:false})).join('') + '</div></div></section>';
}

export function DentalChart(teeth) {
  return '<div class="dental-chart" aria-label="Full mouth dental chart">' + FDI_ARCHES.map(a=>DentalArch(a,teeth)).join('') + '</div>';
}
