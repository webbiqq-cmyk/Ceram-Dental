// Small, pure display-formatting helpers used across every page — currency,
// HTML escaping, dates, and reading values off form elements.
import { STAGES, STAGE_INDEX, SVC } from '../constants.js';

export function money(n) { return 'BD ' + Number(n || 0).toFixed(3); }

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

export function fmtDate(d) { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
export function fmtDateTime(d) { return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }

export function val(id) { const el = document.getElementById(id); return el ? el.value : ''; }
export function fval(form, name) { const el = form.querySelector('[name="' + name + '"]'); return el ? el.value : ''; }

export function specsToText(specs) { return (specs || []).map(s => (s.value ? s.label + ': ' + s.value : s.label)).join('\n'); }
export function specsFromText(text) {
  return String(text || '').split('\n').map(line => {
    const i = line.indexOf(':');
    if (i === -1) { const only = line.trim(); return only ? { label: only, value: '' } : null; }
    const label = line.slice(0, i).trim();
    return label ? { label: label, value: line.slice(i + 1).trim() } : null;
  }).filter(Boolean);
}

export function labelFor(stageKey) { return STAGES[STAGE_INDEX[stageKey]].label; }
export function svcLabel(key) { return SVC[key] ? SVC[key].label : key; }
export function chanSlug(c) { return String(c || '').toLowerCase().replace(/[^a-z]+/g, ''); }

// Tiny shared field builder — one labeled input, reused by the contact,
// careers-apply and cart checkout forms.
export function field(cls, type, id, label, required) {
  return '<div class="field ' + cls + '"><label>' + label + '</label><input type="' + type + '" id="' + id + '" ' + (required ? 'required' : '') + '></div>';
}
