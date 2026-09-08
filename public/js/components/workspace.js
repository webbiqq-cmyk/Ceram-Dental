import { DATA, UI } from '../state.js';
import { renderCurrent } from '../router.js';
import { ADMIN_TABS } from '../constants.js';

const STAFF = [['receptionist','reception','Reception'],['designer','designer','Design'],['technician','technician','Production'],['qc','qc','Quality inspection']];

// One shell for every signed-in surface — dentist portal, the lab roles, and
// Administration. Administration keeps its own nav and page; it just shares
// the layout so the whole back office reads as one system.
function shell(brandHref, brandLabel, navLabel, links, content) {
  return '<div class="workspace-shell"><aside class="workspace-sidebar">' +
    '<a class="workspace-brand" href="#/' + brandHref + '"><span class="workspace-monogram">C</span><span>CERAM<small>' + brandLabel + '</small></span></a>' +
    '<p class="workspace-nav-label">' + navLabel + '</p>' +
    '<nav aria-label="Workspace navigation">' + links + '</nav>' +
    '<div class="workspace-support"><strong>Made for careful work.</strong><p>Every case, from first details to final delivery.</p><a href="#/">Back to Ceram</a></div>' +
    '</aside><div class="workspace-content" id="workspaceContent" tabindex="-1">' + content + '</div></div>';
}

export function workspaceShell(route, html) {
  const nav = (href,label,active) => '<a href="#/' + href + '"' + (active ? ' aria-current="page"' : '') + '>' + label + '</a>';

  if (route === 'admin') {
    if (!(DATA.auth && DATA.auth.admin)) return '<div class="workspace-content administration-content" id="workspaceContent" tabindex="-1">' + html + '</div>';
    const s = DATA.summary || {};
    const badges = { enquiries: s.newEnquiries, appointments: s.newAppointments, applications: (DATA.applications || []).length, messages: (DATA.messages || []).length };
    const links = ADMIN_TABS.map(([key,label]) => '<button type="button" data-admin-tab="' + key + '"' + (UI.adminTab === key ? ' aria-current="page"' : '') + '>' +
      '<span>' + label + '</span>' + (badges[key] ? '<span class="ws-badge">' + badges[key] + '</span>' : '') + '</button>').join('');
    return shell('admin', 'Administration', 'Administration', links, html);
  }

  const dentist = ['portal','new-order'].includes(route);
  let links = '';
  if (dentist) {
    links = ['overview','orders','rejected','billing','profile'].map((tab,i) => '<button type="button" data-workspace-tab="' + tab + '"' + (route === 'portal' && UI.portalTab === tab ? ' aria-current="page"' : '') + '>' + ['Overview','Case history','Needs attention','Billing','My profile'][i] + '</button>').join('');
    links += nav('new-order','+ New case',route === 'new-order');
  } else {
    links = nav('studio','Lab overview',route === 'studio');
    links += STAFF.filter(([role,path]) => DATA.auth[role] || path === route).map(([,path,label]) => nav(path,label,path===route)).join('');
  }
  return shell(dentist ? 'portal' : 'studio', dentist ? 'Dentist portal' : 'Lab workspace', 'Your workspace', links, html);
}

export function attachWorkspaceHandlers() {
  document.querySelectorAll('[data-workspace-tab]').forEach(button => button.addEventListener('click', () => {
    UI.portalTab = button.dataset.workspaceTab; UI.dataPage = 1; UI.portalFilter='all';
    if (location.hash === '#/portal') renderCurrent(); else location.hash = '#/portal';
  }));
}
