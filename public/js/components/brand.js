import { esc } from '../utils/format.js';

export function brandLogoCompact(opts = {}) {
  return '<img class="ceram-emblem ' + esc(opts.cls || '') + '" src="/images/ceram-emblem.png" width="1254" height="1254" alt="Ceram Specialist Dental Center" decoding="async">';
}

export function brandLogoStack(opts = {}) {
  return brandLogoCompact(opts);
}
