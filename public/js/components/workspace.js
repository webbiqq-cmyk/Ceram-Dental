import { DATA, UI } from '../state.js';
import { renderCurrent } from '../router.js';
import { ADMIN_TABS } from '../constants.js';
import { logout } from './authGate.js';
import { icon } from './icons.js';

const STAFF = [['receptionist','reception','Reception','inbox'],['designer','designer','Design','sliders'],['technician','technician','Production','box'],['qc','qc','Quality inspection','check']];
const ADMIN_ICONS = {overview:'grid',enquiries:'message',appointments:'calendar',invoices:'receipt',expenses:'wallet',products:'box',orders:'clipboard',team:'users',dentists:'user',applications:'briefcase',messages:'mail',settings:'sliders',accounts:'shield',activity:'activity',export:'download'};
const DENTIST_ICONS = {overview:'grid',orders:'history',rejected:'alert',drafts:'clipboard',billing:'receipt',profile:'user'};

// One shell for every signed-in surface — dentist portal, the lab roles, and
// Administration. Administration keeps its own nav and page; it just shares
// the layout so the whole back office reads as one system.
const bare = (html, cls) => '<div class="workspace-content' + (cls ? ' ' + cls : '') + '" id="workspaceContent" tabindex="-1">' + html + '</div>';

// Sign out lives beside the brand, not in scrolling page content, on
// purpose — workspace-brand-row (unlike workspace-support, which is
// display:none on a phone) stays visible at every width, so it's the one
// place this button doesn't disappear once a tab's content runs long
// enough to scroll (Accounts & Access, in particular) or on mobile.
function shell(brandHref, brandLabel, navLabel, links, content, extra, signOutRole) {
  return '<div class="workspace-shell workspace-' + brandHref + '"><aside class="workspace-sidebar">' +
    '<div class="workspace-brand-row">' +
      '<a class="workspace-brand" href="#/' + brandHref + '"><img class="workspace-monogram" src="/images/ceram-emblem.png" width="42" height="46" alt="Ceram" decoding="async"><span>CERAM<small>' + brandLabel + '</small></span></a>' +
      '<a class="ws-home-btn" href="#/" title="Back to the Ceram website"><span aria-hidden="true">&larr;</span> Website</a>' +
      (signOutRole ? '<button type="button" class="ws-home-btn" data-workspace-signout="' + signOutRole + '">Sign out</button>' : '') +
    '</div>' +
    '<p class="workspace-nav-label">' + navLabel + '</p>' +
    '<button type="button" class="workspace-menu-toggle" aria-expanded="false" aria-controls="workspaceNav">' + icon('grid') + ' Workspace menu <span aria-hidden="true">⌄</span></button>' +
    '<nav id="workspaceNav" aria-label="Workspace navigation">' + links + '</nav>' +
    '<div class="workspace-support">' + (extra || '<strong>Made for careful work.</strong><p>Every case, from first details to final delivery.</p>') + '</div>' +
    '</aside><div class="workspace-content" id="workspaceContent" tabindex="-1">' + content + '</div></div>';
}

export function workspaceShell(route, html) {
  const nav = (href,label,active,iconName) => '<a href="#/' + href + '"' + (active ? ' aria-current="page"' : '') + '>' + (iconName ? icon(iconName) : '') + '<span>' + label + '</span></a>';

  if (route === 'admin') {
    if (!(DATA.auth && DATA.auth.admin)) return bare(html, 'administration-content');
    const s = DATA.summary || {};
    const badges = { enquiries: s.newEnquiries, appointments: s.newAppointments, applications: (DATA.applications || []).length, messages: (DATA.messages || []).filter(m => !m.read).length };
    const groups = {overview:'Workspace',invoices:'Finance & commerce',team:'People & communication',settings:'Management'};
    const links = ADMIN_TABS.map(([key,label]) => (groups[key] ? '<span class="ws-nav-group">' + groups[key] + '</span>' : '') + '<button type="button" data-admin-tab="' + key + '"' + (UI.adminTab === key ? ' aria-current="page"' : '') + '>' +
      '<span class="ws-nav-label">' + icon(ADMIN_ICONS[key] || 'grid') + '<span class="ws-nav-text">' + label + '</span></span>' + (badges[key] ? '<span class="ws-badge">' + badges[key] + '</span>' : '') + '</button>').join('');
    return shell('admin', 'Administration', 'Administration', links, html, undefined, 'admin');
  }

  const dentist = ['portal','new-order'].includes(route);
  if (dentist) {
    // Drafts get their own nav entry rather than living only behind the
    // overview strip: with a single draft there was otherwise no route to
    // it at all once the strip's "See all" (which needs two) was gone.
    const tabs = ['overview','orders','rejected','drafts','billing','profile'];
    const labels = ['Overview','Case history','Needs attention','Drafts','Billing','My profile'];
    let links = tabs.map((tab,i) => '<button type="button" data-workspace-tab="' + tab + '"' + (route === 'portal' && UI.portalTab === tab ? ' aria-current="page"' : '') + '>' +
      '<span class="ws-nav-label">' + icon(DENTIST_ICONS[tab]) + '<span class="ws-nav-text">' + labels[i] + '</span></span>' +
      (tab === 'drafts' && UI.draftCount ? '<span class="ws-badge">' + UI.draftCount + '</span>' : '') + '</button>').join('');
    links += nav('new-order','New case',route === 'new-order','plus');
    return shell('portal', 'Dentist portal', 'Your workspace', links, html, undefined, 'dentist');
  }

  // Lab Studio: the role picker / sign-in screen runs without a sidebar.
  if (route === 'studio' && !UI.labRole) return bare(html);
  const station = STAFF.find(([,path]) => path === UI.labRole);
  const manager = UI.labRole === 'manager';
  let links = manager
    ? nav('studio','Lab overview',route === 'studio','grid') + STAFF.map(([,path,label,ic]) => nav(path,label,path===route,ic)).join('')
    : (station ? nav(station[1], station[2], true, station[3]) : '');
  const brandLabel = manager ? 'Lab workspace' : (station ? station[2] : 'Lab workspace');
  const support = '<p class="ws-support-role">Signed in &middot; ' + brandLabel + '<span>Testing mode</span></p>' +
    '<button type="button" class="ws-switch" data-lab-signout>Switch role</button>';
  return shell('studio', brandLabel, 'Your workspace', links, html, support);
}

export function attachWorkspaceHandlers() {
  document.querySelector('.workspace-menu-toggle')?.addEventListener('click', e => {
    const button = e.currentTarget;
    button.setAttribute('aria-expanded', String(button.getAttribute('aria-expanded') !== 'true'));
  });
  document.querySelectorAll('[data-workspace-tab]').forEach(button => button.addEventListener('click', () => {
    UI.portalTab = button.dataset.workspaceTab; UI.dataPage = 1; UI.portalFilter='all';
    if (location.hash === '#/portal') renderCurrent(); else location.hash = '#/portal';
  }));
  document.querySelector('[data-lab-signout]')?.addEventListener('click', () => {
    UI.labRole = ''; UI.labRolePick = ''; UI.studioLegacy = false;
    if (location.hash === '#/studio') renderCurrent(); else location.hash = '#/studio';
  });
  document.querySelector('[data-workspace-signout]')?.addEventListener('click', e => logout(e.currentTarget.dataset.workspaceSignout));
}
