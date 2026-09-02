import { DATA, api, loadState } from '../../state.js';
import { esc, svcLabel, chanSlug } from '../../utils/format.js';
import { ENQUIRY_STAGES } from '../../constants.js';
import { toast } from '../../toast.js';
import { renderCurrent } from '../../router.js';

export function adminEnquiries() {
  if (!DATA.enquiries.length) return '<div class="empty-note">No enquiries yet.</div>';
  const keys = ENQUIRY_STAGES.map(s => s.key);
  const byStage = {};
  ENQUIRY_STAGES.forEach(s => { byStage[s.key] = DATA.enquiries.filter(e => e.stage === s.key); });
  const igCount = DATA.enquiries.filter(e => e.channel === 'Instagram DM').length;

  const strip = '<div class="stat-strip reveal" style="margin:0 0 20px;">' +
    '<div class="chipstat"><b>' + byStage.new.length + '</b><span>New / unread</span></div>' +
    '<div class="chipstat"><b>' + byStage.contacted.length + '</b><span>In conversation</span></div>' +
    '<div class="chipstat"><b>' + byStage.booked.length + '</b><span>Consultations booked</span></div>' +
    '<div class="chipstat"><b>' + igCount + '</b><span>From Instagram</span></div>' +
  '</div>';

  const lanes = ENQUIRY_STAGES.map(s => {
    const cards = byStage[s.key].map(e => {
      const idx = keys.indexOf(e.stage);
      const next = ENQUIRY_STAGES[idx + 1];
      return '<div class="enq-card">' +
        '<div class="enq-top"><span class="enq-name">' + esc(e.name) + '</span>' +
          '<span class="enq-chan chan-' + chanSlug(e.channel) + '">' + esc(e.channel) + '</span></div>' +
        '<div class="enq-handle">' + esc(e.handle) + (e.service ? ' &middot; ' + esc(svcLabel(e.service)) : '') + '</div>' +
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

  return '<p style="color:var(--ink-soft); font-size:13.5px; margin-bottom:16px;">New-patient enquiries from Instagram DMs, WhatsApp and the website &mdash; one acceptance flow from first message to booked consultation.</p>' +
    strip + '<div class="lab-pipeline reveal">' + lanes + '</div>';
}

export function attachEnquiriesHandlers() {
  document.querySelectorAll('[data-enq-stage]').forEach(b => b.addEventListener('click', async () => {
    try {
      await api('/api/enquiries/' + b.dataset.enqId + '/stage', { method: 'POST', body: JSON.stringify({ stage: b.dataset.enqStage }) });
      await loadState(); renderCurrent(); toast('Enquiry updated');
    } catch (e) { toast(e.message); }
  }));
}
