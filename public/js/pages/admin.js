// Admin shell — sidebar + tab dispatch. Each tab's own render/handlers live
// in pages/admin/<tab>.js; this file just picks the right one. Gated
// behind an admin session — see components/authGate.js.
import { DATA, UI } from '../state.js';
import { esc } from '../utils/format.js';
import { ADMIN_TABS } from '../constants.js';
import { renderCurrent } from '../router.js';
import { renderLoginGate, attachAuthGateHandlers, logout } from '../components/authGate.js';
import { adminOverview } from './admin/overview.js';
import { adminEnquiries, attachEnquiriesHandlers } from './admin/enquiries.js';
import { adminAppointments, attachAppointmentsHandlers } from './admin/appointments.js';
import { adminInvoices, attachInvoicesHandlers } from './admin/invoices.js';
import { adminExpenses, attachExpensesHandlers } from './admin/expenses.js';
import { adminProducts, attachProductsHandlers } from './admin/products.js';
import { adminOrders, attachOrderHandlers } from './admin/orders.js';
import { adminTeam, attachTeamHandlers } from './admin/team.js';
import { adminApplications } from './admin/applications.js';
import { adminMessages } from './admin/messages.js';
import { adminSettings, attachSettingsHandlers } from './admin/settings.js';
import { adminAccounts, attachAccountsHandlers } from './admin/accounts.js';
import { adminActivity } from './admin/activity.js';
import { adminExport, attachExportHandlers } from './admin/export.js';

const TAB_BODY = {
  overview: adminOverview,
  enquiries: adminEnquiries,
  appointments: adminAppointments,
  invoices: adminInvoices,
  expenses: adminExpenses,
  products: adminProducts,
  orders: adminOrders,
  team: adminTeam,
  applications: adminApplications,
  messages: adminMessages,
  settings: adminSettings,
  accounts: adminAccounts,
  activity: adminActivity,
  export: adminExport
};

const TAB_HANDLERS = {
  orders: attachOrderHandlers,
  enquiries: attachEnquiriesHandlers,
  appointments: attachAppointmentsHandlers,
  invoices: attachInvoicesHandlers,
  expenses: attachExpensesHandlers,
  products: attachProductsHandlers,
  team: attachTeamHandlers,
  settings: attachSettingsHandlers,
  accounts: attachAccountsHandlers,
  export: attachExportHandlers
};

function isSignedIn() { return !!(DATA.auth && DATA.auth.admin); }

export async function renderAdmin() {
  if (!isSignedIn()) {
    return renderLoginGate({ role: 'admin', title: 'Administration', subtitle: 'Sign in with the admin account to manage billing, expenses, team and settings. No admin account yet? The first sign-in here creates it.' });
  }
  const tab = UI.adminTab;
  const render = TAB_BODY[tab] || adminOverview;
  const title = (ADMIN_TABS.find(t => t[0] === tab) || ['', 'Overview'])[1];
  const body = await render();
  const me = DATA.me && DATA.me.admin;
  const eyebrow = tab === 'overview' ? 'Welcome, ' + esc(me?.name || 'Administrator') : 'Administration';
  return '<div class="page"><div class="u">' +
    '<div class="page-head reveal"><div><span class="eyebrow-accent">' + eyebrow + '</span><h1>' + title + '</h1></div>' +
      '<button class="btn btn-ghost btn-sm" id="adminLogoutBtn">Sign out</button></div>' +
    body +
  '</div></div>';
}

export function attachAdminHandlers() {
  if (!isSignedIn()) { attachAuthGateHandlers(); return; }
  document.querySelectorAll('[data-admin-tab]').forEach(b => b.addEventListener('click', () => { UI.adminTab = b.dataset.adminTab; renderCurrent(); }));
  const attach = TAB_HANDLERS[UI.adminTab];
  if (attach) attach();
  const logoutBtn = document.getElementById('adminLogoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => logout('admin'));
}
