// Minimal inline icon set for workspace chrome (sidebar nav, metric cards,
// empty states). Same convention as the upload icon in caseUpload.js —
// stroke-based, currentColor, no icon font/dependency — so every icon here
// inherits its color from CSS and costs nothing to load. Each path may
// contain multiple SVG subpaths (M ... M ...); that's valid in one <path>.
const PATHS = {
  grid: 'M4 5h6v6H4Zm10 0h6v6h-6ZM4 15h6v6H4Zm10 0h6v6h-6Z',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 8v5l3 2',
  alert: 'M12 3 2 20h20Zm0 6.5V14m0 3.6v.1',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2Zm3 5h6M9 12h6M9 16h4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  plus: 'M12 5v14M5 12h14',
  message: 'M4 5h16v11H8l-4 4Z',
  calendar: 'M4 5h16v16H4Zm0 5h16M8 3v4M16 3v4',
  wallet: 'M3 7h15a3 3 0 0 1 3 3v7a2 2 0 0 1-2 2H3Zm0 0V5a2 2 0 0 1 2-2h11M16 13h.01',
  box: 'M3 8 12 3l9 5-9 5-9-5Zm0 0v9l9 5m0-9v9m0-9 9-5v9l-9 5',
  clipboard: 'M9 4h6v3H9ZM6 6h12v15H6Zm3 6h6m-6 4h6',
  users: 'M8 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2 20c.5-3.5 3-5.5 6-5.5s5.5 2 6 5.5M14 20c.4-2.6 2-4.4 4-5',
  briefcase: 'M4 8h16v11H4Zm4 0V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-12 5h16',
  mail: 'M4 6h16v12H4Zm0 0 8 7 8-7',
  sliders: 'M4 6h9m3 0h4M4 12h4m3 0h9M4 18h13m3 0h1M9 4v4M15 10v4M9 16v4',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z',
  activity: 'M3 12h4l2 8 4-16 2 8h6',
  download: 'M12 3v13m0 0-4-4m4 4 4-4M4 21h16',
  check: 'M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0Zm4 0 2.5 2.5L16 9',
  inbox: 'M4 4h16v16H4Zm0 9h5l2 3h2l2-3h5',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5v5l3 2',
  phone: 'M4.5 4h3.2l1.3 4-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2 4 1.3v3.2c0 1.1-.9 2-2 2-8 0-14.5-6.5-14.5-14.5a2 2 0 0 1 2-2Z'
};
export function icon(name, cls) {
  return '<svg class="ws-icon' + (cls ? ' ' + cls : '') + '" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (PATHS[name] || PATHS.grid) + '"/></svg>';
}
