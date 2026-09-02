import { DATA } from '../../state.js';
import { money } from '../../utils/format.js';

function sparkline(trend) {
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

export function adminOverview() {
  const s = DATA.summary;
  const tiles = [
    ['Revenue collected', money(s.revenue), 'pos'], ['Outstanding', money(s.outstanding), s.overdue ? 'neg' : ''],
    ['Expenses (this week)', money(s.totalExpenses), ''], ['Net', money(s.net), s.net >= 0 ? 'pos' : 'neg'],
    ['Active cases', s.activeCases, '']
  ];
  return '<div class="stat-grid reveal">' + tiles.map(t => '<div class="stat-tile ' + t[2] + '"><div class="lbl">' + t[0] + '</div><div class="val">' + t[1] + '</div></div>').join('') + '</div>' +
    '<div class="card reveal trend-card" style="margin-bottom:24px;">' +
      '<div class="trend-chart"><span class="eyebrow">Revenue, last 7 days</span><div style="margin-top:10px;">' + sparkline(s.trend) + '</div></div>' +
    '</div>' +
    '<div class="grid-2">' +
      '<div class="card reveal"><span class="eyebrow">Appointments</span><div class="val" style="font-family:var(--font-display); font-size:22px; margin-top:8px;">' + s.newAppointments + ' new request' + (s.newAppointments === 1 ? '' : 's') + '</div><p style="margin-top:6px;">' + s.totalAppointments + ' total booking requests on file.</p></div>' +
      '<div class="card reveal"><span class="eyebrow">Shop</span><div class="val" style="font-family:var(--font-display); font-size:22px; margin-top:8px;">' + money(s.shopRevenue) + ' in orders</div><p style="margin-top:6px;">' + DATA.orders.length + ' orders placed via the shop.</p></div>' +
      '<div class="card reveal"><span class="eyebrow">Pipeline</span><div class="val" style="font-family:var(--font-display); font-size:22px; margin-top:8px;">' + s.readyCases + ' ready for pickup</div><p style="margin-top:6px;">' + s.activeCases + ' cases still in production.</p></div>' +
      '<div class="card reveal"><span class="eyebrow">Inbox</span><div class="val" style="font-family:var(--font-display); font-size:22px; margin-top:8px;">' + s.openApplications + ' applications</div><p style="margin-top:6px;">' + s.newMessages + ' contact messages waiting.</p></div>' +
    '</div>';
}
