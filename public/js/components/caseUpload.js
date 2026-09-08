// Signed direct-to-Cloudinary upload for case files (scans, photos, design
// files, QC photos) — same pattern as components/cloudinaryUpload.js
// (product/team images), pointed at the workflow's own sign endpoint
// (/api/orders/uploads/sign, reachable by any workflow role — the
// original endpoint is admin-only, wrong for a doctor or lab technician
// attaching a file) and recording the result against the order via
// ordersApi.recordFile so it shows up in that case's file list for
// everyone who opens it.
import { api } from '../state.js';
import { toast } from '../toast.js';
import { recordFile } from '../utils/ordersApi.js';

// Renders one upload zone. `onUploaded(file)` fires after the file is both
// on Cloudinary and recorded against the order, so the caller can just
// re-render its file list.
export function uploadZoneHtml(id, label, hint) {
  return '<div class="upload-zone" role="button" tabindex="0" aria-label="' + label + '" data-upload-zone="' + id + '">' +
    '<input type="file" accept="image/*,application/pdf,.stl,.obj,.ply" data-upload-input="' + id + '" style="display:none;">' +
    '<div class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14"/></svg></div>' +
    '<div class="t">' + label + '</div><div class="d" data-upload-status="' + id + '">' + (hint || 'Click to choose a file') + '</div>' +
  '</div>';
}

// role/orderId/stageType/category are fixed per zone at attach time;
// clicking the zone opens the hidden file input, and a change on it does
// the actual upload.
export function attachUploadZone(root, id, { role, orderId, stageType, category }) {
  const zone = (root || document).querySelector('[data-upload-zone="' + id + '"]');
  if (!zone) return;
  const input = zone.querySelector('[data-upload-input="' + id + '"]');
  const status = zone.querySelector('[data-upload-status="' + id + '"]');
  zone.addEventListener('click', e => { if(e.target!==input) input.click(); });
  zone.addEventListener('keydown', e => { if(e.key==='Enter' || e.key===' ') { e.preventDefault(); input.click(); } });
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    if(file.size>10*1024*1024){toast('Choose a file under 10 MB.');return;}
    status.textContent = 'Uploading…';
    try {
      const { signature, params, cloudName, apiKey } = await api('/api/orders/uploads/sign?asRole=' + role, { method: 'POST', body: JSON.stringify({ folder: 'cases', orderId, stageType, category }) });
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', apiKey);
      for(const [key,value] of Object.entries(params))form.append(key,String(value));
      form.append('signature', signature);

      const res = await fetch('https://api.cloudinary.com/v1_1/' + cloudName + '/auto/upload', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok || !json.secure_url) throw new Error((json.error && json.error.message) || 'Upload failed.');
      await recordFile(role, orderId, { stageType, category, url: json.secure_url, publicId: json.public_id, version:json.version, signature:json.signature });
      status.textContent = 'Uploaded ✓';
      toast('File attached to the case.');
      zone.dispatchEvent(new CustomEvent('case-file-uploaded', { bubbles: true }));
    } catch (err) {
      status.textContent = 'Click to choose a file';
      toast(err.message || 'Upload failed.');
    }
  });
}
