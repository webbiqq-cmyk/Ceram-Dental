import { esc } from '../utils/format.js';
export function VisualOptionCard({group,value,title,description='',selected=false,icon='',disabled=false}) {
  return '<button type="button" class="visual-option' + (selected?' selected':'') + '" data-option-group="' + esc(group) + '" data-option-value="' + esc(value) + '" aria-pressed="' + String(selected) + '"' + (disabled?' disabled':'') + '><span class="visual-option-icon" aria-hidden="true">' + (icon || title.slice(0,1)) + '</span><span><strong>' + esc(title) + '</strong>' + (description?'<small>'+esc(description)+'</small>':'') + '</span><i aria-hidden="true">✓</i></button>';
}
export function VisualOptionGrid(options) { return '<div class="visual-option-grid">' + options.map(VisualOptionCard).join('') + '</div>'; }
