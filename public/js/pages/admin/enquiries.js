import { DATA, api, loadState } from '../../state.js';
import { esc, svcLabel, chanSlug, val, fmtDate } from '../../utils/format.js';
import { ENQUIRY_STAGES, ENQUIRY_CHANNELS, SERVICES } from '../../constants.js';
import { toast } from '../../toast.js';
import { renderCurrent } from '../../router.js';

function channelOptions() { return ENQUIRY_CHANNELS.map(c => '<option>' + c + '</option>').join(''); }
function serviceOptions() {
  return '<option value="">Not specified yet</option>' + SERVICES.map(s => '<option value="' + s.key + '">' + s.label + '</option>').join('');
}

// A lead that arrived somewhere this app can't see directly — an Instagram
// DM, a WhatsApp message, a phone call — has no other way in without this:
// there's no public enquiry form, on purpose (enquiries are informal,
// pre-appointment contact, not a structured intake). Staff log it here so
// it enters the same new → contacted → booked → closed pipeline as
// everything else.
function addForm() {
  return '<details class="card reveal product-add-panel" style="margin-bottom:20px;"><summary><span><b>Log an off-site enquiry</b><small>Use this for calls, walk-ins, DMs and WhatsApp</small></span></summary>' +
    '<form id="enquiryAddForm" class="form-grid">' +
      '<div class="field"><label>Name</label><input id="nq-name" required></div>' +
      '<div class="field"><label>Contact / handle</label><input id="nq-handle" placeholder="@handle, phone, or email"></div>' +
      '<div class="field"><label>Channel</label><select id="nq-channel">' + channelOptions() + '</select></div>' +
      '<div class="field"><label>Interested in</label><select id="nq-service">' + serviceOptions() + '</select></div>' +
      '<div class="field full"><label>What they asked</label><textarea id="nq-message" placeholder="Quick summary of the message"></textarea></div>' +
      '<div class="field full"><button class="btn btn-primary" type="submit">Log enquiry</button></div>' +
    '</form></details>';
}

export function adminEnquiries() {
  const keys = ENQUIRY_STAGES.map(s => s.key);
  const byStage = {};
  ENQUIRY_STAGES.forEach(s => { byStage[s.key] = DATA.enquiries.filter(e => e.stage === s.key); });
  const websiteCount = DATA.enquiries.filter(e => e.channel === 'Website form' || e.source === 'Website form').length;

  const intro = '<p style="color:var(--ink-soft); font-size:13.5px; margin-bottom:16px;">Website contact messages are picked up automatically; staff can still add calls, walk-ins, DMs and WhatsApp leads when they happen outside the site.</p>';

  if (!DATA.enquiries.length) return intro + addForm() + '<div class="empty-note">No enquiries yet — log the first one above.</div>';

  const strip = '<div class="stat-strip reveal" style="margin:0 0 20px;">' +
    '<div class="chipstat"><b>' + byStage.new.length + '</b><span>New / unread</span></div>' +
    '<div class="chipstat"><b>' + byStage.contacted.length + '</b><span>In conversation</span></div>' +
    '<div class="chipstat"><b>' + byStage.booked.length + '</b><span>Consultations booked</span></div>' +
    '<div class="chipstat"><b>' + websiteCount + '</b><span>From website</span></div>' +
  '</div>';

  const lanes = ENQUIRY_STAGES.map(s => {
    const cards = byStage[s.key].map(e => {
      const idx = keys.indexOf(e.stage);
      const next = ENQUIRY_STAGES[idx + 1];
      return '<div class="enq-card">' +
        '<div class="enq-top"><span class="enq-name">' + esc(e.name) + '</span>' +
          '<span class="enq-chan chan-' + chanSlug(e.channel) + '">' + esc(e.channel) + '</span></div>' +
        '<div class="enq-handle">' + esc(e.handle || 'No contact') + (e.service ? ' &middot; ' + esc(svcLabel(e.service)) : '') + '</div>' +
        '<div class="enq-history">' + esc(e.source || e.channel || 'Manual') + ' · ' + fmtDate(e.createdAt) + (Array.isArray(e.history) && e.history.length > 1 ? ' · ' + e.history.length + ' updates' : '') + '</div>' +
        '<p class="enq-msg">' + esc(e.message) + '</p>' +
        '<div class="enq-actions">' +
          (next ? '<button class="btn btn-primary btn-sm" data-enq-stage="' + next.key + '" data-enq-id="' + e.id + '">' + next.label + ' &rarr;</button>' : '') +
          (e.stage !== 'closed'
            ? '<button class="btn btn-ghost btn-sm" data-enq-stage="closed" data-enq-id="' + e.id + '">Close</button>'
            : '<button class="btn btn-ghost btn-sm" data-enq-stage="new" data-enq-id="' + e.id + '">Reopen</button>') +
        '</div></div>';
    }).join('') || '<div class="lane-cards lane-empty">Nothing here.</div>';
    return '<section class="lane' + (byStage[s.key].length ? '' : ' is-empty') + '">' +
      '<div class="lane-head"><span class="dot" style="background:var(--violet)"></span><h3>' + s.label + '</h3>' +
      '<span class="cnt">' + byStage[s.key].length + '</span></div>' +
      '<div class="lane-cards">' + cards + '</div></section>';
  }).join('');

  return intro + addForm() + strip + '<div class="lab-pipeline reveal">' + lanes + '</div>';
}

export function attachEnquiriesHandlers() {
  const form = document.getElementById('enquiryAddForm');
  if (form) form.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api('/api/enquiries', { method: 'POST', body: JSON.stringify({
        name: val('nq-name'), handle: val('nq-handle'), channel: val('nq-channel'),
        service: val('nq-service'), message: val('nq-message')
      }) });
      await loadState(); renderCurrent(); toast('Enquiry logged');
    } catch (err) { toast(err.message); }
  });
  document.querySelectorAll('[data-enq-stage]').forEach(b => b.addEventListener('click', async () => {
    try {
      await api('/api/enquiries/' + b.dataset.enqId + '/stage', { method: 'POST', body: JSON.stringify({ stage: b.dataset.enqStage }) });
      await loadState(); renderCurrent(); toast('Enquiry updated');
    } catch (e) { toast(e.message); }
  }));
}
