import { DATA } from '../../state.js';
import { money, esc } from '../../utils/format.js';
import { icon } from '../../components/icons.js';
import { labOverview } from '../../utils/ordersApi.js';
import { todayStrip, pipelineHtml, attentionHtml, workloadHtml, analyticsHtml } from '../../components/labOps.js';
import { showCaseCenter } from '../../components/caseCenter.js';
import { attachCaseQueue } from '../../components/caseQueue.js';

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

// Administration is deliberately exception-first: the operational read
// comes before the financial one, because the cases that are going wrong
// today are what an administrator can still do something about. Revenue
// is a consequence of the board, and it sits directly underneath it.
export async function adminOverview() {
  const s = DATA.summary;
  let lab = null;
  try { lab = await labOverview('admin'); } catch { /* the finance view still stands without it */ }

  const inbox = [];
  if (s.overdue) inbox.push('Outstanding balance is overdue — follow up on invoices.');
  if (s.newAppointments) inbox.push(s.newAppointments + ' new appointment request' + (s.newAppointments === 1 ? '' : 's') + ' to confirm.');
  if (s.newMessages) inbox.push(s.newMessages + ' contact message' + (s.newMessages === 1 ? '' : 's') + ' waiting for a reply.');
  if (s.openApplications) inbox.push(s.openApplications + ' careers application' + (s.openApplications === 1 ? '' : 's') + ' to review.');

  return '<div class="workspace-quick-actions" aria-label="Administration shortcuts">' +
      '<button type="button" data-admin-tab="invoices">' + icon('receipt') + ' Manage invoices <span aria-hidden="true">↗</span></button>' +
      '<button type="button" data-admin-tab="orders">' + icon('clipboard') + ' Find a case <span aria-hidden="true">↗</span></button>' +
      '<button type="button" data-admin-tab="appointments">' + icon('calendar') + ' Appointments <span aria-hidden="true">↗</span></button>' +
      '<button type="button" data-admin-tab="expenses">' + icon('wallet') + ' Add an expense <span aria-hidden="true">↗</span></button>' +
    '</div>' +

    (lab ? '<div class="section-head reveal"><h2>The lab today</h2></div>' + todayStrip(lab.today) : '') +
    (lab ? '<div class="lab-ops-grid reveal">' + attentionHtml(lab.attention) + workloadHtml(lab.workload) + '</div>' : '') +
    (lab ? '<div class="section-head reveal"><h2>Pipeline</h2><span class="workspace-context">Open a stage to work it</span></div>' + pipelineHtml(lab.stations) : '') +

    '<div class="section-head reveal"><h2>Business</h2></div>' +
    '<div class="admin-hero reveal">' +
      '<div class="admin-hero-primary"><span class="eyebrow-accent">Revenue, last 7 days</span><div class="admin-hero-figure">' + money(s.revenue) + '</div>' +
        '<p class="lede">Net ' + money(s.net) + (s.net >= 0 ? ' after ' + money(s.totalExpenses) + ' in expenses this week.' : ' — expenses outpaced revenue this week.') + '</p>' +
        '<div style="margin-top:10px;">' + sparkline(s.trend) + '</div></div>' +
      '<div class="admin-hero-side">' +
        metric(money(s.outstanding), 'Outstanding', 'wallet', s.overdue ? 'Overdue — follow up' : '', s.overdue ? 'danger' : '') +
        metric(money(s.totalExpenses), 'Expenses (this week)', 'receipt', '') +
        metric(money(s.shopRevenue), 'Shop orders', 'box', DATA.orders.length + ' placed') +
      '</div>' +
    '</div>' +

    (lab ? analyticsHtml(lab.turnaround, lab.quality, lab.treatments) : '') +

    (inbox.length ?
      '<section class="card reveal"><h3>' + icon('mail') + ' Inbox</h3>' +
        '<ul class="workspace-list" style="margin-top:8px;">' + inbox.map(a => '<li>' + esc(a) + '</li>').join('') + '</ul></section>'
      : '');
}

export function attachOverviewHandlers() {
  attachCaseQueue('admin', id => showCaseCenter('admin', id));
}
