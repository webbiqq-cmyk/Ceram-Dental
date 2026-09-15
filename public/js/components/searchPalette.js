// Global search — one keystroke to any case the signed-in role can open.
//
// The scope is the server's: this sends a term and renders what comes
// back. It cannot widen what a role may see, because it never asks for
// more than "search", and the endpoint decides the rest from the session.
//
// Everything here is about it feeling instant: the input is never blocked
// on the network, requests are debounced, and a slow response that
// arrives after a newer one is discarded rather than painted.
import { api, currentPortalRole, DATA } from '../state.js';
import { esc } from '../utils/format.js';
import { jobTypeLabel } from '../utils/workflow.js';

let panel = null;
let requestToken = 0;
let debounce = null;
let selected = 0;
let hits = [];

const ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

function placeholderFor(role) {
  return role === 'dentist'
    ? 'Search your cases by number or patient reference…'
    : role === 'admin' || role === 'lab'
      ? 'Search cases, patients or clinics…'
      : 'Search cases by number, patient or clinic…';
}

function hitRow(hit, index) {
  const selectedAttr = ' role="option" data-hit="' + index + '" aria-selected="' + (index === selected) + '"';
  if (hit.kind === 'case') {
    return '<button type="button" class="search-hit"' + selectedAttr + '>' +
      '<span class="search-hit-id">' + esc(hit.order_number) + '</span>' +
      '<span class="search-hit-main"><span class="t">' + esc(hit.patient_ref || 'No reference') + '</span>' +
      '<span class="s">' + esc(jobTypeLabel(hit.job_type)) + ' · ' + esc(hit.headline) +
      (hit.dentist_name ? ' · ' + esc(hit.dentist_name) : '') + '</span></span></button>';
  }
  return '<button type="button" class="search-hit"' + selectedAttr + '>' +
    '<span class="search-hit-main"><span class="t">' + esc(hit.name) + '</span>' +
    '<span class="s">' + hit.active_cases + ' active case' + (hit.active_cases === 1 ? '' : 's') + '</span></span></button>';
}

// Results are grouped, and each group is built from its own slice of the
// hit list. The index passed to hitRow is the position in `hits`, not in
// the group, so keyboard selection stays a single flat sequence across
// both groups.
function paint(state, message) {
  const results = panel.querySelector('.search-results');
  if (state !== 'results') {
    results.innerHTML = '<p class="search-state">' + esc(message) + '</p>';
    return;
  }
  const groups = [
    ['Cases', hits.map((hit, index) => [hit, index]).filter(([hit]) => hit.kind === 'case')],
    ['Clinics', hits.map((hit, index) => [hit, index]).filter(([hit]) => hit.kind === 'dentist')]
  ];
  results.innerHTML = groups
    .filter(([, rows]) => rows.length)
    .map(([label, rows]) => '<p class="search-group">' + label + '</p>' + rows.map(([hit, index]) => hitRow(hit, index)).join(''))
    .join('');
  bindRows();
}

function bindRows() {
  panel.querySelectorAll('[data-hit]').forEach(row => {
    row.addEventListener('click', () => open(Number(row.dataset.hit)));
    row.addEventListener('mousemove', () => { selected = Number(row.dataset.hit); highlight(); });
  });
}

function highlight() {
  panel.querySelectorAll('[data-hit]').forEach(row => {
    const isSelected = Number(row.dataset.hit) === selected;
    row.setAttribute('aria-selected', String(isSelected));
    if (isSelected) row.scrollIntoView({ block: 'nearest' });
  });
}

async function open(index) {
  const hit = hits[index];
  if (!hit) return;
  close();
  if (hit.kind === 'case') {
    const { showCaseCenter } = await import('./caseCenter.js');
    showCaseCenter(currentPortalRole() || 'lab', hit.id);
  }
  // A clinic result is a signpost, not a page of its own: administration
  // already lists cases per doctor, so searching a doctor's name and
  // pressing Enter puts that name into the case list rather than opening
  // a profile screen this product does not have.
}

async function run(term) {
  const token = ++requestToken;
  if (term.trim().length < 2) { hits = []; paint('empty', 'Type at least two characters.'); return; }
  paint('empty', 'Searching…');
  try {
    const role = currentPortalRole();
    const result = await api('/api/search?asRole=' + encodeURIComponent(role) + '&q=' + encodeURIComponent(term));
    // A slower earlier request must never overwrite a newer answer.
    if (token !== requestToken || !panel) return;
    hits = [
      ...result.cases.map(c => Object.assign({ kind: 'case' }, c)),
      ...result.dentists.map(d => Object.assign({ kind: 'dentist' }, d))
    ];
    selected = 0;
    if (!hits.length) { paint('empty', 'Nothing matches “' + term.trim() + '”.'); return; }
    paint('results');
  } catch (error) {
    if (token !== requestToken || !panel) return;
    hits = [];
    paint('empty', error.status === 401 ? 'Your session has expired — sign in again to search.' : 'Search is unavailable right now.');
  }
}

export function openSearch() {
  if (panel) return;
  const role = currentPortalRole();
  if (!role || !DATA.auth[role]) return;

  panel = document.createElement('dialog');
  panel.className = 'search-overlay';
  panel.setAttribute('aria-label', 'Search');
  panel.innerHTML =
    '<div class="search-panel">' +
      '<div class="search-input-row">' + ICON +
        '<input type="search" role="combobox" aria-expanded="true" aria-controls="searchResults" aria-autocomplete="list" ' +
        'autocomplete="off" spellcheck="false" placeholder="' + esc(placeholderFor(role)) + '" aria-label="Search">' +
      '</div>' +
      '<div class="search-results" id="searchResults" role="listbox" aria-label="Search results">' +
        '<p class="search-state">Type at least two characters.</p></div>' +
      '<div class="search-foot"><span><kbd>↑</kbd><kbd>↓</kbd> to move</span><span><kbd>Enter</kbd> to open</span><span><kbd>Esc</kbd> to close</span></div>' +
    '</div>';
  document.body.append(panel);

  const input = panel.querySelector('input');
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    // Long enough that a typed word is one request, short enough that the
    // results feel like they are keeping up.
    debounce = setTimeout(() => run(input.value), 180);
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!hits.length) return;
      selected = (selected + (event.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length;
      highlight();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      open(selected);
    }
  });
  // Clicking the dimmed area outside the panel closes it, the way every
  // command palette behaves.
  panel.addEventListener('click', event => { if (event.target === panel) panel.close(); });
  panel.addEventListener('close', () => { panel?.remove(); panel = null; clearTimeout(debounce); hits = []; }, { once: true });
  panel.showModal();
  input.focus();
}

export function close() { panel?.close(); }

/** Wired once at startup — the shortcut works from anywhere in a workspace. */
export function initSearch() {
  document.getElementById('wsSearchTrigger')?.addEventListener('click', openSearch);
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      panel ? close() : openSearch();
    }
  });
}

/** The trigger belongs only where search is meaningful: signed-in workspaces. */
export function updateSearchTrigger() {
  const trigger = document.getElementById('wsSearchTrigger');
  if (!trigger) return;
  const role = currentPortalRole();
  trigger.hidden = !(role && DATA.auth[role] && document.body.classList.contains('workplace'));
}
