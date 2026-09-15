import { DATA, api, loadState } from '../../state.js';
import { esc } from '../../utils/format.js';
import { toast } from '../../toast.js';
import { renderCurrent } from '../../router.js';

export function adminSettings() {
  const s = DATA.settings || {};
  return '<div class="settings-grid reveal">' +
    '<div class="card"><span class="eyebrow" style="margin-bottom:16px;">Business information</span>' +
    '<form id="settingsForm" class="form-grid">' +
      '<div class="field full"><label>Clinic name</label><input id="st-name" value="' + esc(s.clinicName) + '"></div>' +
      '<div class="field"><label>Phone &amp; WhatsApp</label><input id="st-phone" value="' + esc(s.phone) + '"></div>' +
      '<div class="field"><label>Direct WhatsApp</label><input id="st-whatsapp" value="' + esc(s.whatsapp || '') + '"></div>' +
      '<div class="field"><label>Email</label><input id="st-email" value="' + esc(s.email) + '"></div>' +
      '<div class="field"><label>Emergency contact</label><input id="st-emergency" value="' + esc(s.emergencyPhone || '') + '"></div>' +
      '<div class="field full"><label>Address</label><input id="st-address" value="' + esc(s.address) + '"></div>' +
      '<div class="field full"><label>Hours</label><input id="st-hours" value="' + esc(s.hours) + '"></div>' +
      '<div class="field"><label>Booking URL</label><input id="st-booking" value="' + esc(s.bookingUrl || '') + '" placeholder="https://…"></div>' +
      '<div class="field"><label>Instagram</label><input id="st-instagram" value="' + esc(s.instagram || '') + '" placeholder="@ceramdental"></div>' +
      '<div class="field"><label>Invoice prefix</label><input id="st-invoice-prefix" value="' + esc(s.invoicePrefix || 'CER') + '"></div>' +
      '<div class="field"><label>VAT / registration no.</label><input id="st-vat" value="' + esc(s.vatNumber || '') + '"></div>' +
      '<div class="field full"><label>Payment terms</label><input id="st-payment-terms" value="' + esc(s.paymentTerms || '') + '"></div>' +
      '<div class="field"><label>Appointment buffer (minutes)</label><input id="st-buffer" type="number" min="0" max="180" value="' + esc(s.appointmentBuffer || '15') + '"></div>' +
      '<div class="field"><label>Reminder lead time (hours)</label><input id="st-reminder" type="number" min="1" max="168" value="' + esc(s.reminderWindow || '24') + '"></div>' +
      '<div class="field"><label>Currency</label><select id="st-currency"><option value="BHD"' + ((s.defaultCurrency || 'BHD') === 'BHD' ? ' selected' : '') + '>BHD</option><option value="USD"' + (s.defaultCurrency === 'USD' ? ' selected' : '') + '>USD</option><option value="SAR"' + (s.defaultCurrency === 'SAR' ? ' selected' : '') + '>SAR</option></select></div>' +
      '<div class="field full"><button class="btn btn-primary" type="submit">Save changes</button></div>' +
    '</form></div>' +
    '<aside class="card settings-panel"><span class="eyebrow">Portal controls</span>' +
      '<div class="setting-check"><b>Public contact source</b><span>Website contact messages now enter Enquiries automatically as Website form leads.</span></div>' +
      '<div class="setting-check"><b>Finance defaults</b><span>Invoice prefix, payment terms and currency stay here for consistent admin work.</span></div>' +
      '<div class="setting-check"><b>Scheduling defaults</b><span>Appointment buffer and reminder timing give the portal operational rules without code changes.</span></div>' +
    '</aside></div>';
}

export function attachSettingsHandlers() {
  const sf = document.getElementById('settingsForm');
  if (sf) sf.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api('/api/settings', { method: 'POST', body: JSON.stringify({
        clinicName: document.getElementById('st-name').value,
        phone: document.getElementById('st-phone').value,
        whatsapp: document.getElementById('st-whatsapp').value,
        email: document.getElementById('st-email').value,
        emergencyPhone: document.getElementById('st-emergency').value,
        address: document.getElementById('st-address').value,
        hours: document.getElementById('st-hours').value,
        bookingUrl: document.getElementById('st-booking').value,
        instagram: document.getElementById('st-instagram').value,
        invoicePrefix: document.getElementById('st-invoice-prefix').value,
        vatNumber: document.getElementById('st-vat').value,
        paymentTerms: document.getElementById('st-payment-terms').value,
        appointmentBuffer: document.getElementById('st-buffer').value,
        reminderWindow: document.getElementById('st-reminder').value,
        defaultCurrency: document.getElementById('st-currency').value
      }) });
      await loadState(); renderCurrent(); toast('Settings saved');
    } catch (err) { toast(err.message); }
  });
}
