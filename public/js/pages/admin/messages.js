// Website inquiries — messages sent through the public contact form
// (POST /api/contact, see contact.routes.js). Each one is read/unread so
// staff can see at a glance what's new, and opens in place for the full
// text, a one-click email reply, and a delete action.
import { DATA, api } from '../../state.js';
import { esc, fmtDate, fmtDateTime } from '../../utils/format.js';
import { toast } from '../../toast.js';
import { emptyState } from '../../components/emptyState.js';

export function adminMessages() {
  if (!DATA.messages.length) return emptyState({ iconName: 'mail', title: 'No messages yet', text: 'Messages sent through the website contact form will appear here, newest first.' });

  const unread = DATA.messages.filter(m => !m.read).length;
  const strip = '<div class="stat-strip reveal" style="margin:0 0 18px;">' +
    '<div class="chipstat"><b>' + DATA.messages.length + '</b><span>Total</span></div>' +
    '<div class="chipstat"><b id="unreadMsgCount">' + unread + '</b><span>Unread</span></div>' +
  '</div>';
  const toolbar = '<div class="workspace-toolbar reveal"><input type="search" id="messageSearch" placeholder="Search by name, email or message…" autocomplete="off"></div>';

  const rows = [...DATA.messages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(m => {
    const hay = (m.name + ' ' + m.email + ' ' + m.message).toLowerCase();
    return '<details class="card reveal msg-card' + (m.read ? '' : ' is-unread') + '" data-msg-id="' + esc(m.id) + '" data-msg-search="' + esc(hay) + '">' +
      '<summary class="msg-summary">' +
        '<span class="msg-dot" aria-hidden="true" title="Unread"></span>' +
        '<span class="msg-summary-main"><b>' + esc(m.name) + '</b><span class="msg-summary-preview">' + esc(m.message) + '</span></span>' +
        '<time>' + fmtDate(m.createdAt) + '</time>' +
      '</summary>' +
      '<div class="msg-body">' +
        '<p class="msg-full">' + esc(m.message) + '</p>' +
        '<div class="msg-meta">' + esc(m.email) + ' · ' + fmtDateTime(m.createdAt) + '</div>' +
        '<div class="msg-actions">' +
          '<a class="btn btn-ghost btn-sm" href="mailto:' + esc(m.email) + '?subject=' + encodeURIComponent('Re: your message to Ceram Dental') + '">Reply by email</a>' +
          '<button type="button" class="btn btn-danger-ghost btn-sm" data-del-message="' + esc(m.id) + '">Delete</button>' +
        '</div>' +
      '</div>' +
    '</details>';
  }).join('');

  return strip + toolbar + '<div class="msg-list">' + rows + '</div><p class="empty-note" id="messageNoMatch" hidden>No messages match that search.</p>';
}

export function attachMessagesHandlers() {
  // Opening a message marks it read in place — no full re-render, so the
  // card the admin just opened doesn't immediately collapse again.
  document.querySelectorAll('.msg-card').forEach(card => {
    card.addEventListener('toggle', async () => {
      if (!card.open || !card.classList.contains('is-unread')) return;
      card.classList.remove('is-unread');
      const counter = document.getElementById('unreadMsgCount');
      if (counter) counter.textContent = Math.max(0, Number(counter.textContent) - 1);
      const id = card.dataset.msgId;
      const local = DATA.messages.find(m => m.id === id);
      if (local) local.read = true;
      try { await api('/api/messages/' + encodeURIComponent(id) + '/read', { method: 'POST', body: '{}' }); }
      catch { /* status still flips locally; next full refresh reconciles either way */ }
    });
  });
  document.querySelectorAll('[data-del-message]').forEach(b => {
    b.addEventListener('click', async e => {
      e.preventDefault();
      if (!window.confirm('Delete this message? This can\'t be undone.')) return;
      const id = b.dataset.delMessage;
      try {
        await api('/api/messages/' + encodeURIComponent(id) + '/delete', { method: 'POST' });
        const idx = DATA.messages.findIndex(m => m.id === id);
        if (idx !== -1) DATA.messages.splice(idx, 1);
        document.querySelector('[data-msg-id="' + CSS.escape(id) + '"]')?.remove();
        toast('Message deleted');
      } catch (err) { toast(err.message); }
    });
  });
  document.getElementById('messageSearch')?.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase(); let shown = 0;
    document.querySelectorAll('[data-msg-search]').forEach(card => { card.hidden = !card.dataset.msgSearch.includes(q); if (!card.hidden) shown++; });
    const noMatch = document.getElementById('messageNoMatch');
    if (noMatch) noMatch.hidden = shown > 0;
  });
}
