import { DATA } from '../../state.js';
import { money } from '../../utils/format.js';
import { icon } from '../../components/icons.js';

function sparkline(trend) {
  trend=Array.isArray(trend)&&trend.length?trend:[{label:'Today',total:0}];
  const w = 280, h = 64, pad = 6;
  const max = Math.max.apply(null, trend.map(t => t.total).concat([1]));
  const stepX = trend.length > 1 ? (w - pad * 2) / (trend.length - 1) : 0;
  const pts = trend.map((t, i) => [pad + i * stepX, h - pad - (t.total / max) * (h - pad * 2)]);
  const lineD = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const areaD = lineD + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (h - pad) + ' L' + pts[0][0].toFixed(1) + ' ' + (h - pad) + ' Z';
  const last = pts[pts.length - 1];
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" style="width:100%; height:64px; display:block;">' +
      '<path d="' + areaD + '" fill="var(--violet-soft)" stroke="none"></path>' +
      '<path d="' + lineD + '" fill="none" stroke="var(--violet)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>' +
      '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="3.5" fill="var(--violet)"></circle>' +
    '</svg>' +
    '<div style="display:flex; justify-content:space-between; margin-top:6px;">' + trend.map(t => '<span class="mono" style="font-size:10px; color:var(--ink-soft);">' + t.label + '</span>').join('') + '</div>';
}

function metric(count, label, iconName, meta, tone) {
  return '<div class="stat-card stat-card-v2' + (tone ? ' tone-' + tone : '') + '"><div class="stat-card-icon">' + icon(iconName) + '</div><div class="stat-card-body"><div class="n">' + count + '</div><div class="l">' + label + '</div>' + (meta ? '<div class="stat-card-meta' + (tone === 'danger' ? ' is-action' : '') + '">' + meta + '</div>' : '') + '</div></div>';
}

export function adminOverview() {
  const s = DATA.summary;
  // Primary financial card (Revenue + Net + trend) plus supporting tiles —
  // one hierarchy instead of five near-identical boxes.
  const attention = [];
  if (s.overdue) attention.push('Outstanding balance is overdue — follow up on invoices.');
  if (s.newAppointments) attention.push(s.newAppointments + ' new appointment request' + (s.newAppointments === 1 ? '' : 's') + ' to confirm.');
  if (s.newMessages) attention.push(s.newMessages + ' contact message' + (s.newMessages === 1 ? '' : 's') + ' waiting for a reply.');
  if (s.openApplications) attention.push(s.openApplications + ' careers application' + (s.openApplications === 1 ? '' : 's') + ' to review.');

  return '<div class="workspace-quick-actions" aria-label="Administration shortcuts"><button type="button" data-admin-tab="invoices">' + icon('receipt') + ' Manage invoices <span aria-hidden="true">↗</span></button><button type="button" data-admin-tab="orders">' + icon('clipboard') + ' Track orders <span aria-hidden="true">↗</span></button><button type="button" data-admin-tab="appointments">' + icon('calendar') + ' Appointments <span aria-hidden="true">↗</span></button></div><div class="admin-hero reveal">' +
      '<div class="admin-hero-primary"><span class="eyebrow-accent">Revenue, last 7 days</span><div class="admin-hero-figure">' + money(s.revenue) + '</div>' +
        '<p class="lede">Net ' + money(s.net) + (s.net >= 0 ? ' after ' + money(s.totalExpenses) + ' in expenses this week.' : ' — expenses outpaced revenue this week.') + '</p>' +
        '<div style="margin-top:10px;">' + sparkline(s.trend) + '</div></div>' +
      '<div class="admin-hero-side">' +
        metric(money(s.outstanding), 'Outstanding', 'wallet', s.overdue ? 'Overdue — follow up' : '', s.overdue ? 'danger' : '') +
        metric(money(s.totalExpenses), 'Expenses (this week)', 'receipt', '') +
        metric(s.activeCases, 'Active Cases', 'clipboard', s.readyCases ? s.readyCases + ' ready for pickup' : '') +
      '</div>' +
    '</div>' +
    (attention.length ?
      '<div class="card reveal" style="margin-bottom:20px;"><h3 style="display:flex;align-items:center;gap:8px;">' + icon('alert') + ' Needs your attention</h3>' +
        '<ul class="workspace-list" style="margin-top:8px;">' + attention.map(a => '<li>' + a + '</li>').join('') + '</ul></div>'
      : '') +
    '<div class="grid-2">' +
      '<div class="card reveal"><span class="eyebrow">Appointments</span><div class="val" style="font-family:var(--font-display); font-size:22px; margin-top:8px;">' + s.newAppointments + ' new request' + (s.newAppointments === 1 ? '' : 's') + '</div><p style="margin-top:6px;">' + s.totalAppointments + ' total booking requests on file.</p></div>' +
      '<div class="card reveal"><span class="eyebrow">Shop</span><div class="val" style="font-family:var(--font-display); font-size:22px; margin-top:8px;">' + money(s.shopRevenue) + ' in orders</div><p style="margin-top:6px;">' + DATA.orders.length + ' orders placed via the shop.</p></div>' +
      '<div class="card reveal"><span class="eyebrow">Pipeline</span><div class="val" style="font-family:var(--font-display); font-size:22px; margin-top:8px;">' + s.readyCases + ' ready for pickup</div><p style="margin-top:6px;">' + s.activeCases + ' cases still in production.</p></div>' +
      '<div class="card reveal"><span class="eyebrow">Inbox</span><div class="val" style="font-family:var(--font-display); font-size:22px; margin-top:8px;">' + s.openApplications + ' applications</div><p style="margin-top:6px;">' + s.newMessages + ' contact messages waiting.</p></div>' +
    '</div>';
}
