// Signed direct-to-Cloudinary upload — only rendered when the server
// reports Cloudinary is actually configured (DATA.cloudinaryConfigured),
// so nothing shows up broken while the client's Cloudinary credentials
// are still pending (see README/status report). The file itself never
// passes through our server: we only fetch a short-lived signature, then
// POST straight to Cloudinary from the browser.
import { api } from '../state.js';
import { toast } from '../toast.js';

export function uploadWidgetHtml(inputId) {
  return '<div class="field full"><label>Upload image</label>' +
    '<input type="file" accept="image/*" data-upload-target="' + inputId + '">' +
    '<div class="upload-progress" data-upload-status="' + inputId + '" style="font-size:12px; color:var(--ink-soft); margin-top:4px;"></div></div>';
}

export function attachUploadHandlers(root, folder) {
  (root || document).querySelectorAll('[data-upload-target]').forEach(input => {
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      const targetId = input.dataset.uploadTarget;
      const statusEl = document.querySelector('[data-upload-status="' + targetId + '"]');
      const targetInput = document.getElementById(targetId);
      if (statusEl) statusEl.textContent = 'Uploading…';
      try {
        const { signature, timestamp, cloudName, apiKey, folder: signedFolder } = await api('/api/admin/uploads/sign', { method: 'POST', body: JSON.stringify({ folder }) });
        const form = new FormData();
        form.append('file', file);
        form.append('api_key', apiKey);
        form.append('timestamp', timestamp);
        form.append('signature', signature);
        form.append('folder', signedFolder);
        const res = await fetch('https://api.cloudinary.com/v1_1/' + cloudName + '/image/upload', { method: 'POST', body: form });
        const json = await res.json();
        if (!res.ok || !json.secure_url) throw new Error(json.error && json.error.message || 'Upload failed.');
        if (targetInput) targetInput.value = json.secure_url;
        if (statusEl) statusEl.textContent = 'Uploaded.';
        toast('Image uploaded');
      } catch (err) {
        if (statusEl) statusEl.textContent = '';
        toast(err.message || 'Upload failed.');
      }
    });
  });
}
