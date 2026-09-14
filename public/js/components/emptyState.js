// Shared polished empty state — icon + one line of explanation + an
// optional action — used wherever a list/card can legitimately be empty
// (no active cases, no activity yet, no invoices...). Replaces the plain
// ".empty-note" text-only placeholder for the spots that deserve it.
import { icon } from './icons.js';

export function emptyState({ iconName, title, text, actionHtml }) {
  return '<div class="empty-state"><div class="empty-state-icon">' + icon(iconName || 'inbox') + '</div>' +
    '<p class="empty-state-title">' + title + '</p>' +
    (text ? '<p class="empty-state-text">' + text + '</p>' : '') +
    (actionHtml || '') + '</div>';
}
