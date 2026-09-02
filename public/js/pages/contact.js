import { DATA, api } from '../state.js';
import { esc, field } from '../utils/format.js';
import { SERVICES } from '../constants.js';
import { footer, socialIcons } from '../components/footer.js';
import { toast } from '../toast.js';

function infoRow(path, label, valueHtml) {
  return '<div class="info-row"><span class="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="' + path + '"/></svg></span><div><span class="eyebrow" style="margin-bottom:2px;">' + label + '</span>' + valueHtml + '</div></div>';
}

export function renderContact() {
  const s = DATA.settings || {};
  return (
    '<div class="page"><div class="u">' +
    '<div class="page-head reveal"><span class="eyebrow-accent">Contact</span><h1>Book a consultation.</h1>' +
      '<p class="lede">Tell us what you need and a preferred day — we\'ll call to confirm a time. For anything urgent, phone or WhatsApp us directly.</p></div>' +
    '<div class="section grid-2">' +
      '<div class="card reveal info-card">' +
        infoRow('M2.5 6.5A2 2 0 0 1 4.5 4.5h1.7a1 1 0 0 1 .95.69l1 3a1 1 0 0 1-.27 1.04L6.6 10.5a11 11 0 0 0 5 5l1.27-1.28a1 1 0 0 1 1.04-.27l3 1a1 1 0 0 1 .69.95v1.7a2 2 0 0 1-2 2A15.5 15.5 0 0 1 2.5 6.5Z', 'Phone &amp; WhatsApp', '<a href="tel:' + esc(s.phone) + '">' + esc(s.phone) + '</a>') +
        infoRow('M3 6h18v12H3Zm0 0 9 7 9-7', 'Email', '<a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a>') +
        infoRow('M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'Address', esc(s.address)) +
        infoRow('M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'Hours', esc(s.hours)) +
        '<div><span class="eyebrow" style="margin-bottom:10px;">Follow along</span><div class="social-row">' + socialIcons() + '</div></div>' +
      '</div>' +
      '<div class="card reveal">' +
        '<span class="eyebrow" style="margin-bottom:14px;">Book a consultation</span>' +
        '<form id="bookingForm" class="form-grid">' +
          field('full', 'text', 'bk-name', 'Name', true) +
          field('', 'tel', 'bk-phone', 'Phone', true) +
          '<div class="field"><label>Email (optional)</label><input type="email" id="bk-email"></div>' +
          '<div class="field"><label>Interested in</label><select id="bk-service">' + SERVICES.map(sv => '<option value="' + sv.key + '">' + sv.label + '</option>').join('') + '<option value="">Not sure yet</option></select></div>' +
          '<div class="field"><label>Preferred date</label><input type="date" id="bk-date"></div>' +
          '<div class="field full"><label>Anything we should know?</label><textarea id="bk-note" placeholder="Optional"></textarea></div>' +
          '<div class="field full"><button class="btn btn-primary btn-block" type="submit">Request appointment</button></div>' +
        '</form>' +
      '</div>' +
    '</div>' +
    '</div></div>' + footer()
  );
}

export function attachContactHandlers() {
  const bf = document.getElementById('bookingForm');
  if (bf) bf.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api('/api/appointments', { method: 'POST', body: JSON.stringify({
        name: document.getElementById('bk-name').value,
        phone: document.getElementById('bk-phone').value,
        email: document.getElementById('bk-email').value,
        service: document.getElementById('bk-service').value,
        preferredDate: document.getElementById('bk-date').value,
        note: document.getElementById('bk-note').value
      }) });
      toast('Request sent — we\'ll call to confirm.');
      bf.reset();
    } catch (err) { toast(err.message); }
  });
}
