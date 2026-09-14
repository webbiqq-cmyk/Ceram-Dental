const SERVICES=[
  ['none','No treatment','Clear assignment','×'],
  ['veneer','Veneer','Facial ceramic restoration','V'],
  ['crown','Crown','Full-coverage restoration','C'],
  ['bridge','Bridge','Fixed multi-unit restoration','B'],
  ['implant','Implant restoration','Implant-supported restoration','I']
];
export function DentalServiceToolbar(selectedCount=0) {
  return '<div class="dental-toolbar" aria-label="Assign a restoration"><div class="dental-toolbar-head"><strong>Treatment controls</strong><span>' + selectedCount + ' selected</span></div><div class="dental-toolbar-actions">' + SERVICES.map(([key,label,desc,mark])=>'<button type="button" data-assign-service="' + key + '"' + (!selectedCount?' disabled':'') + '><span aria-hidden="true">' + mark + '</span><b>' + label + '</b><small>' + desc + '</small></button>').join('') + '</div></div>';
}
