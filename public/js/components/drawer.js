// Case detail drawer — shared by the Dentist Portal and Lab Studio, since
// both open the same case record, just with different available actions.
import { DATA, api, loadState } from '../state.js';
import { esc, money, fmtDateTime, labelFor, svcLabel } from '../utils/format.js';
import { shadeCombo } from '../utils/design.js';
import { PROTOCOL } from '../constants.js';
import { toast } from '../toast.js';
// Circular with router.js (router.js calls closeDrawer() on every navigation;
// this module calls renderCurrent() after a case action) — safe because both
// sides only touch the imported binding inside function bodies, never at
// module-evaluation time.
import { renderCurrent, repaintCurrent } from '../router.js';
import { predictCaseAfterAction } from '../utils/caseActions.js';
import { newIdempotencyKey } from '../utils/idempotency.js';

export function pillHtml(c) { return '<span class="pill st-' + c.stage + '"><span class="dot"></span>' + labelFor(c.stage) + '</span>'; }

function kv(k, v) { return '<div class="kv"><span class="k">' + k + '</span><span class="v">' + esc(v) + '</span></div>'; }

export function injectDrawerShell() {
  const div = document.createElement('div');
  div.innerHTML = '<div class="backdrop" id="backdrop"></div><div class="drawer" id="drawer"><div class="drawer-head"><div><div class="cid" id="dw-cid"></div><h3 id="dw-title"></h3></div><button class="drawer-close" id="dw-close">✕</button></div><div class="drawer-body" id="dw-body"></div><div class="drawer-actions" id="dw-actions"></div></div>';
  document.body.appendChild(div);
  document.getElementById('backdrop').addEventListener('click', closeDrawer);
  document.getElementById('dw-close').addEventListener('click', closeDrawer);
}

export function openDrawer(id, from) {
  const c = DATA.cases.find(x => x.id === id);
  if (!c) return;
  UI_setDrawer({ id, from });
  let back = document.getElementById('backdrop'), dr = document.getElementById('drawer');
  if (!back) { injectDrawerShell(); back = document.getElementById('backdrop'); dr = document.getElementById('drawer'); }

  document.getElementById('dw-cid').textContent = c.id;
  document.getElementById('dw-title').textContent = c.clinic;
  const protoHtml = PROTOCOL.map(p => '<span class="' + (c.protocol[p.key] ? 'yes' : '') + '">' + (c.protocol[p.key] ? '✓ ' : '') + p.label + '</span>').join('');
  const histHtml = c.history.slice().reverse().map(h =>
    '<div class="tl-item"><div class="dot"></div><div><div class="tt">' + labelFor(h.stage) + '</div><div class="ts">' + fmtDateTime(h.at) + '</div>' + (h.note ? '<div class="note">' + esc(h.note) + '</div>' : '') + '</div></div>'
  ).join('');
  const inv = DATA.invoices.find(i => i.caseId === c.id);

  const d = c.design;
  const designHtml = d ? (
    '<div class="drawer-sec"><h4>Restoration design</h4>' +
      kv('Restoration type', d.material + (d.fabrication ? ' · ' + d.fabrication : '')) +
      kv('Incisal design', d.incisal || '—') +
      kv('Layering style', d.layering || '—') +
      kv('Glaze', d.glaze || '—') +
      kv('Surface structure', d.surface || '—') +
      kv('Shade combination', shadeCombo(d.shade)) +
    '</div>'
  ) : '';

  document.getElementById('dw-body').innerHTML =
    '<div class="drawer-sec"><h4>Case</h4>' +
      kv('Service', svcLabel(c.service)) + kv('Patient', c.patient) + kv('Shade', c.shade) + kv('Assigned tech', c.tech) + kv('Current stage', labelFor(c.stage)) +
      (inv ? kv('Invoice', inv.id + ' · ' + money(inv.amount) + ' · ' + inv.status) : '') +
    '</div>' +
    designHtml +
    '<div class="drawer-sec"><h4>Protocol of acceptance</h4><div class="proto-mini">' + protoHtml + '</div></div>' +
    '<div class="drawer-sec"><h4>Timeline</h4><div class="timeline">' + histHtml + '</div></div>';
  document.getElementById('dw-actions').innerHTML = actionsFor(c, from);
  back.classList.add('open'); dr.classList.add('open');
}

// Set apart from openDrawer so router.js can clear it without importing the
// whole drawer-render path (avoids a load-order surprise on first paint).
let currentDrawer = null;
function UI_setDrawer(v) { currentDrawer = v; }
export function getDrawerState() { return currentDrawer; }

export function closeDrawer() {
  const back = document.getElementById('backdrop'), dr = document.getElementById('drawer');
  if (back) back.classList.remove('open');
  if (dr) dr.classList.remove('open');
  currentDrawer = null;
}

function actionsFor(c, from) {
  if (c.stage === 'ready') {
    if (c.pickedUp) return '<span class="pill st-ready"><span class="dot"></span>Picked up</span>';
    return '<button class="btn btn-primary btn-sm" data-act="pickup" data-id="' + c.id + '">Mark picked up</button>';
  }
  if (c.stage === 'doctor_approval') {
    if (from === 'mycases') return '<button class="btn btn-primary btn-sm" data-act="approve" data-id="' + c.id + '">Approve mockup</button><button class="btn btn-danger-ghost btn-sm" data-act="reject" data-id="' + c.id + '">Request modification</button>';
    return '<span class="pill st-doctor_approval"><span class="dot"></span>Waiting on doctor — no lab action</span>';
  }
  if (from === 'mycases') return '<span style="font-size:12.5px; color:var(--ink-soft);">In progress at the lab — no action needed from you right now.</span>';
  if (c.stage === 'qc') return '<button class="btn btn-primary btn-sm" data-act="qc-accept" data-id="' + c.id + '">Accept → Design</button><button class="btn btn-danger-ghost btn-sm" data-act="qc-reject" data-id="' + c.id + '">Reject → Reception</button>';
  const map = { reception: 'Send to QC', designer: 'Send mockup to doctor', cadcam: 'Complete milling → Layering', layering: 'Send to QC & Photography', qc_photo: 'Approve → Ready for pickup' };
  if (!map[c.stage]) return '';
  return '<button class="btn btn-primary btn-sm" data-act="advance" data-id="' + c.id + '">' + map[c.stage] + '</button>';
}

export async function handleCaseAction(act, id) {
  const idx = DATA.cases.findIndex(x => x.id === id);
  const previous = idx !== -1 ? DATA.cases[idx] : null;
  const optimistic = previous ? predictCaseAfterAction(previous, act) : null;

  if (optimistic) {
    // Show the move immediately — a lab tech advancing several cases in a
    // row shouldn't wait on a round trip to see each one land. Reconciled
    // with the server's real response (or rolled back) below.
    DATA.cases[idx] = optimistic;
    await repaintCurrent();
    const d = getDrawerState();
    if (d && d.id === id) openDrawer(id, d.from);
  }

  try {
    const key = newIdempotencyKey();
    await api('/api/cases/' + id + '/action', { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify({ act }) });
    await loadState();
    renderCurrent();
    const d2 = getDrawerState();
    if (d2 && d2.id === id) openDrawer(id, d2.from); else closeDrawer();
  } catch (e) {
    if (optimistic) {
      // The move didn't actually happen — put the case back the way it was.
      DATA.cases[idx] = previous;
      await repaintCurrent();
      const d3 = getDrawerState();
      if (d3 && d3.id === id) openDrawer(id, d3.from);
    }
    toast(e.message);
  }
}
