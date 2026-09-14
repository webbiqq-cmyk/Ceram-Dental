import { esc } from '../utils/format.js';

const SHADES=['A1','A2','A3','A3.5','A4','B1','B2','B3','B4','C1','C2','C3','C4','D2','D3','D4','Other'];
const TONES={A:'#f2dfb8',B:'#f6e7c6',C:'#dfd6c7',D:'#ead8bd',O:'#f5f1ea'};

export function ShadeSelector(value='') {
  return '<div class="shade-selector" role="group" aria-label="Shade prescription">' + SHADES.map(shade=>{
    const tone=TONES[shade[0]] || TONES.O;
    return '<button type="button" class="shade-tab' + (value===shade?' selected':'') + '" data-option-group="shade" data-option-value="' + esc(shade) + '" aria-pressed="' + String(value===shade) + '"><i style="background:' + tone + '"></i><span>' + esc(shade) + '</span></button>';
  }).join('') + '</div>';
}
