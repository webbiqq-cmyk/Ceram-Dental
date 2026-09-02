import { DATA, api, loadState } from '../../state.js';
import { esc } from '../../utils/format.js';
import { toast } from '../../toast.js';
import { renderCurrent } from '../../router.js';

export function adminSettings() {
  const s = DATA.settings || {};
  return '<div class="card reveal"><span class="eyebrow" style="margin-bottom:16px;">Business information</span>' +
    '<form id="settingsForm" class="form-grid">' +
      '<div class="field full"><label>Clinic name</label><input id="st-name" value="' + esc(s.clinicName) + '"></div>' +
      '<div class="field"><label>Phone &amp; WhatsApp</label><input id="st-phone" value="' + esc(s.phone) + '"></div>' +
      '<div class="field"><label>Email</label><input id="st-email" value="' + esc(s.email) + '"></div>' +
      '<div class="field full"><label>Address</label><input id="st-address" value="' + esc(s.address) + '"></div>' +
      '<div class="field full"><label>Hours</label><input id="st-hours" value="' + esc(s.hours) + '"></div>' +
      '<div class="field full"><button class="btn btn-primary" type="submit">Save changes</button></div>' +
    '</form></div>';
}

export function attachSettingsHandlers() {
  const sf = document.getElementById('settingsForm');
  if (sf) sf.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api('/api/settings', { method: 'POST', body: JSON.stringify({
        clinicName: document.getElementById('st-name').value,
        phone: document.getElementById('st-phone').value,
        email: document.getElementById('st-email').value,
        address: document.getElementById('st-address').value,
        hours: document.getElementById('st-hours').value
      }) });
      await loadState(); renderCurrent(); toast('Settings saved');
    } catch (err) { toast(err.message); }
  });
}
