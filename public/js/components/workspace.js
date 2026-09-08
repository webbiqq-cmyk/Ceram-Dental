import { DATA, UI } from '../state.js';
import { renderCurrent } from '../router.js';

const STAFF = [['receptionist','reception','Reception'],['designer','designer','Design'],['technician','technician','Production'],['qc','qc','Quality inspection']];
export function workspaceShell(route, html) {
  if (route === 'admin') return '<div class="workspace-content administration-content" id="workspaceContent" tabindex="-1">' + html + '</div>';
  const dentist = ['portal','new-order'].includes(route);
  const nav = (href,label,active) => '<a href="#/' + href + '"' + (active ? ' aria-current="page"' : '') + '>' + label + '</a>';
  let links = '';
  if (dentist) {
    links = ['overview','orders','rejected','billing','profile'].map((tab,i) => '<button type="button" data-workspace-tab="' + tab + '"' + (route === 'portal' && UI.portalTab === tab ? ' aria-current="page"' : '') + '>' + ['Overview','Case history','Needs attention','Billing','My profile'][i] + '</button>').join('');
    links += nav('new-order','+ New case',route === 'new-order');
  } else {
    links = nav('studio','Lab overview',route === 'studio');
    links += STAFF.filter(([role,path]) => DATA.auth[role] || path === route).map(([,path,label]) => nav(path,label,path===route)).join('');
  }
  return '<div class="workspace-shell"><aside class="workspace-sidebar"><a class="workspace-brand" href="#/' + (dentist ? 'portal' : 'studio') + '"><span class="workspace-monogram">C</span><span>CERAM<small>' + (dentist ? 'Dentist portal' : 'Lab workspace') + '</small></span></a><p class="workspace-nav-label">Your workspace</p><nav aria-label="Workspace navigation">' + links + '</nav><div class="workspace-support"><strong>Made for careful work.</strong><p>Every case, from first details to final delivery.</p>' + nav('','Back to Ceram',false) + '</div></aside><div class="workspace-content" id="workspaceContent" tabindex="-1">' + html + '</div></div>';
}
export function attachWorkspaceHandlers() {
  document.querySelectorAll('[data-workspace-tab]').forEach(button => button.addEventListener('click', () => {
    UI.portalTab = button.dataset.workspaceTab; UI.dataPage = 1; UI.portalFilter='all';
    if (location.hash === '#/portal') renderCurrent(); else location.hash = '#/portal';
  }));
}
