// Admin shell — sidebar + tab dispatch. Each tab's own render/handlers live
// in pages/admin/<tab>.js; this file just picks the right one. Gated
// behind an admin session — see components/authGate.js.
import { DATA, UI } from '../state.js';
import { ADMIN_TABS } from '../constants.js';
import { renderCurrent } from '../router.js';
import { renderLoginGate, attachAuthGateHandlers, logout } from '../components/authGate.js';
import { adminOverview } from './admin/overview.js';
import { adminEnquiries, attachEnquiriesHandlers } from './admin/enquiries.js';
import { adminAppointments, attachAppointmentsHandlers } from './admin/appointments.js';
import { adminInvoices, attachInvoicesHandlers } from './admin/invoices.js';
import { adminExpenses, attachExpensesHandlers } from './admin/expenses.js';
import { adminProducts, attachProductsHandlers } from './admin/products.js';
import { adminOrders } from './admin/orders.js';
import { adminTeam, attachTeamHandlers } from './admin/team.js';
import { adminApplications } from './admin/applications.js';
import { adminMessages } from './admin/messages.js';
import { adminSettings, attachSettingsHandlers } from './admin/settings.js';

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
  settings: adminSettings
};

const TAB_HANDLERS = {
  enquiries: attachEnquiriesHandlers,
  appointments: attachAppointmentsHandlers,
  invoices: attachInvoicesHandlers,
  expenses: attachExpensesHandlers,
  products: attachProductsHandlers,
  team: attachTeamHandlers,
  settings: attachSettingsHandlers
};

function isSignedIn() { return !!(DATA.auth && DATA.auth.admin); }

export function renderAdmin() {
  if (!isSignedIn()) {
    return renderLoginGate({ role: 'admin', title: 'Accounts & Admin', subtitle: 'Sign in with the admin account to manage billing, expenses, team and settings.' });
  }
  const tab = UI.adminTab;
  const badges = { enquiries: DATA.summary.newEnquiries, appointments: DATA.summary.newAppointments, applications: DATA.applications.length, messages: DATA.messages.length };
  const render = TAB_BODY[tab] || adminOverview;
  const body = render();
  return '<div class="page"><div class="u">' +
    '<div class="page-head reveal"><span class="eyebrow-accent">Accounts &amp; Admin</span><h1 style="font-size:1.9rem;">Run the business, not just the pipeline.</h1>' +
      '<button class="btn btn-ghost btn-sm" id="adminLogoutBtn" style="margin-top:14px;">Sign out</button></div>' +
    '<div class="admin-shell">' +
      '<nav class="admin-sidebar">' + ADMIN_TABS.map(t => {
        const count = badges[t[0]];
        return '<button class="admin-nav-item' + (tab === t[0] ? ' active' : '') + '" data-admin-tab="' + t[0] + '">' + t[1] +
          (count ? '<span class="badge">' + count + '</span>' : '') + '</button>';
      }).join('') + '</nav>' +
      '<div class="admin-main">' + body + '</div>' +
    '</div>' +
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
