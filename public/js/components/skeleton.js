// Loading placeholders shaped like the content they stand in for, so the
// page does not jump when real data arrives. Deliberately tiny: this is a
// shimmer and a shape, not a loading framework.
export function skeletonQueue(rows = 4) {
  return '<div class="skeleton-grid" aria-hidden="true">' + Array.from({ length: rows }, () =>
    '<div class="skeleton-row">' +
      '<div class="skeleton skeleton-line" style="width:38%"></div>' +
      '<div class="skeleton skeleton-line" style="width:64%"></div>' +
      '<div class="skeleton skeleton-line" style="width:26%"></div>' +
    '</div>').join('') + '</div>';
}

export function skeletonMetrics(count = 4) {
  return '<div class="stat-row" aria-hidden="true">' + Array.from({ length: count }, () =>
    '<div class="skeleton-row"><div class="skeleton skeleton-line" style="width:34%;height:24px"></div>' +
    '<div class="skeleton skeleton-line" style="width:60%"></div></div>').join('') + '</div>';
}

/**
 * Announces that something is loading without painting a spinner over
 * content that is already readable.
 */
export function loadingRegion(label, inner) {
  return '<div role="status" aria-live="polite"><span class="u-visually-hidden">' + label + '</span>' + inner + '</div>';
}

/**
 * Puts a button into a loading state and hands back a restore function.
 * Guards against double submission, which matters most on exactly the
 * actions people double-click: submit, approve, pass.
 */
export function buttonBusy(button, busyLabel) {
  if (!button || button.disabled) return () => {};
  const original = button.innerHTML;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  if (busyLabel) button.textContent = busyLabel;
  return () => {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.innerHTML = original;
  };
}
