// "Double check and view the work of every user" — a plain, chronological
// feed of exactly what each account has done (logins, case actions,
// invoices marked paid, settings changes...), not just their own word for it.
import { DATA } from '../../state.js';
import { esc, fmtDateTime } from '../../utils/format.js';

const ACTION_LABEL = {
  'login': 'Signed in', 'logout': 'Signed out',
  'case:advance': 'Advanced case', 'case:qc-accept': 'QC accepted case', 'case:qc-reject': 'QC rejected case',
  'case:approve': 'Approved mockup', 'case:reject': 'Requested case changes', 'case:pickup': 'Marked case picked up',
  'invoice:pay': 'Marked invoice paid', 'expense:add': 'Logged an expense',
  'product:create': 'Added a product', 'product:update': 'Updated a product', 'product:delete': 'Deleted a product',
  'team:add': 'Added a team member', 'settings:update': 'Updated business settings',
  'appointment:status': 'Updated an appointment', 'enquiry:stage': 'Updated an enquiry',
  'user:create': 'Created an account', 'user:update': 'Updated an account', 'user:reset-password': 'Reset a password',
  'user:delete': 'Deleted an account', 'session:revoke': 'Signed out a device',
  'export:invoices': 'Exported invoices', 'export:expenses': 'Exported expenses', 'export:appointments': 'Exported appointments',
  'export:cases': 'Exported cases', 'export:orders': 'Exported orders', 'export:report': 'Exported a business report'
};

export function adminActivity() {
  if (!DATA.activity.length) return '<div class="empty-note">No activity recorded yet.</div>';
  const rows = DATA.activity.map(a =>
    '<tr><td>' + fmtDateTime(a.at) + '</td><td>' + esc(a.name) + '<br><span style="color:var(--ink-soft); font-size:11.5px;">' + a.role + '</span></td>' +
      '<td>' + esc(ACTION_LABEL[a.action] || a.action) + '</td><td>' + esc(a.detail) + '</td></tr>'
  ).join('');
  return '<p style="color:var(--ink-soft); font-size:13.5px; margin-bottom:16px;">Most recent 100 actions across every account, newest first.</p>' +
    '<div class="table-wrap reveal"><table class="cases-table"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Detail</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}
