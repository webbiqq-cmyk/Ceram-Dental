// Renderers for the `view` object the server attaches to every order
// (see src/services/caseView.js). Nothing here decides what a case means —
// it only draws what the server already decided, so a status change needs
// one edit on the server rather than a hunt through six dashboards.
//
// Every function tolerates a missing view: an order fetched by an older
// cached page, or a legacy record, still renders as something sensible
// instead of throwing halfway through building a queue.
import { esc } from './format.js';
import { icon } from '../components/icons.js';

export function durationShort(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return minutes + 'm';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h ' + (minutes % 60) + 'm';
  const days = Math.floor(hours / 24);
  return days + 'd ' + (hours % 24) + 'h';
}

export function headline(order) {
  const view = order && order.view;
  return view ? view.headline : String((order && order.status) || '').replace(/_/g, ' ');
}

/** The status chip. Tone comes from the case's own flags, not from a per-status lookup. */
export function statusChip(order) {
  const view = order && order.view;
  if (!view) return '<span class="case-chip"><span class="dot"></span>' + esc(headline(order)) + '</span>';
  const tone = view.is_blocked ? 'danger' : view.needs_attention ? 'warning' : view.is_closed ? 'success' : view.waiting_on === 'dentist' ? 'info' : 'progress';
  return '<span class="case-chip case-chip-' + tone + '"><span class="dot"></span>' + esc(view.headline) + '</span>';
}

export function priorityBadge(view) {
  if (!view || view.priority === 'normal' || !view.priority) return '';
  // Restrained on purpose: a label, not a siren. Urgent has to keep
  // meaning something, which it stops doing the moment the screen shouts.
  return '<span class="case-badge case-badge-' + (view.priority === 'urgent' ? 'danger' : 'warning') + '">' +
    (view.priority === 'urgent' ? 'Urgent' : 'Priority') + '</span>';
}

export function dueBadge(view) {
  const due = view && view.due;
  if (!due) return '';
  const date = new Date(due.date + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const text = {
    overdue: 'Overdue by ' + Math.abs(due.days_remaining) + ' day' + (Math.abs(due.days_remaining) === 1 ? '' : 's'),
    due_today: 'Due today',
    met: 'Target ' + date,
    on_track: due.days_remaining + ' day' + (due.days_remaining === 1 ? '' : 's') + ' left'
  }[due.state];
  const tone = due.state === 'overdue' ? 'danger' : due.state === 'due_today' ? 'warning' : 'muted';
  return '<span class="case-badge case-badge-' + tone + '" title="Target completion ' + esc(date) + '">' + esc(text) + '</span>';
}

export function flagChips(view, { limit = 3, exclude = [] } = {}) {
  if (!view || !view.flags.length) return '';
  // Priority/urgency already have their own badge next to the case
  // number — repeating them here would double every urgent row. Callers
  // that also render the headline pass `exclude` for the flags that
  // headline already states, so a case doesn't announce the same fact
  // twice in the same row of badges.
  const skip = new Set(['urgent', 'priority', ...exclude]);
  const flags = view.flags.filter(f => !skip.has(f.key)).slice(0, limit);
  if (!flags.length) return '';
  return '<span class="case-flags">' + flags.map(f =>
    '<span class="case-badge case-badge-' + f.tone + '">' + esc(f.label) + '</span>').join('') + '</span>';
}

/**
 * The progress rail. One group for a normal case, two labelled groups for
 * a veneer, because a veneer really is two passes through the lab and
 * flattening them into one nine-step rail makes both halves unreadable.
 */
export function journeyHtml(view) {
  if (!view || !view.journey) return '';
  return '<div class="case-journey' + (view.journey.length > 1 ? ' case-journey-split' : '') + '">' +
    view.journey.map(group =>
      '<div class="case-journey-group">' +
        (group.label ? '<span class="case-journey-label">' + esc(group.label) + '</span>' : '') +
        '<ol class="case-journey-steps">' + group.steps.map(step =>
          '<li class="jstep is-' + step.state + '"' + (step.state === 'current' ? ' aria-current="step"' : '') + '>' +
            '<span class="jstep-mark" aria-hidden="true">' + (step.state === 'done' ? '✓' : '') + '</span>' +
            '<span class="jstep-label">' + esc(step.label) + '</span>' +
            // Status is never carried by colour alone — every step states
            // its own state in text for screen readers.
            '<span class="u-visually-hidden">' + (step.state === 'done' ? 'completed' : step.state === 'current' ? 'in progress' : 'not started') + '</span>' +
          '</li>').join('') + '</ol>' +
      '</div>').join('') +
  '</div>';
}

/**
 * The single most important thing on any case screen: what happens next,
 * and who has to do it. `myRole` decides whether this reads as an
 * instruction ("Review the demo") or as a status ("Design is preparing
 * your demo") — the same fact, addressed to the right person.
 */
export function nextActionHtml(order, myRole) {
  const view = order && order.view;
  if (!view || view.is_closed) return '';
  const mine = isMine(view, myRole);
  const who = view.owner_name ? view.owner_name + ' · ' + view.owner_label : view.owner_label || 'Unassigned';
  return '<div class="next-action' + (mine ? ' is-mine' : '') + '">' +
    '<div class="next-action-mark">' + icon(mine ? 'alert' : 'clock') + '</div>' +
    '<div class="next-action-body">' +
      '<span class="next-action-eyebrow">' + (mine ? 'Your next step' : 'Next step') + '</span>' +
      '<p class="next-action-text">' + esc(view.next_action) + '</p>' +
      '<p class="next-action-meta">' + esc(mine ? 'Waiting on you' : who) +
        (view.time_in_stage_ms ? ' · ' + esc(durationShort(view.time_in_stage_ms)) + ' in ' + esc(view.stage_label.toLowerCase()) : '') + '</p>' +
    '</div>' +
  '</div>';
}

/** Does the next action belong to the person looking at the screen? */
export function isMine(view, myRole) {
  if (!view || !view.next_actor_role) return false;
  // The lab manager and an administrator stand in for every station, so a
  // case waiting on any lab role is waiting on them too — but a case
  // genuinely out at a clinic is not theirs to action.
  if (['lab', 'admin'].includes(myRole)) return view.next_actor_role !== 'dentist';
  return view.next_actor_role === myRole;
}

export function ownerHtml(view) {
  if (!view || !view.owner_role) return '';
  return '<div class="case-owner">' +
    '<span class="case-owner-eyebrow">Current owner</span>' +
    '<strong>' + esc(view.owner_name || 'Unassigned') + '</strong>' +
    '<span class="case-owner-role">' + esc(view.owner_label) + '</span>' +
    (view.time_in_stage_ms ? '<span class="case-owner-time">' + esc(durationShort(view.time_in_stage_ms)) + ' in this stage</span>' : '') +
  '</div>';
}
