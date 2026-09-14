export function DentalLegend() {
  return '<div class="dental-legend" aria-label="Dental chart legend"><strong>Legend</strong>' + [['veneer','V','Veneer'],['crown','C','Crown'],['bridge','B','Bridge'],['implant','I','Implant']].map(([key,mark,label])=>'<span data-legend="' + key + '"><i aria-hidden="true">' + mark + '</i>' + label + '</span>').join('') + '</div>';
}
