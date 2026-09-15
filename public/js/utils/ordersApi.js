// Thin wrapper over the /api/orders backend (src/routes/orders.routes.js)
// for every lab-workflow page. Centralizes the one thing every call needs
// right now: `asRole` — see src/middleware/workflowRole.js for why a
// shared multi-role endpoint needs a dashboard to say which role it's
// acting as while login stays disabled. The moment real per-role login
// exists this parameter becomes unnecessary (a real cookie disambiguates
// on its own) and every call site here is the only place that changes.
import { api, UI } from '../state.js';

function withRole(path, role, params) {
  const usp = new URLSearchParams(Object.assign({}, params));
  if (role) usp.set('asRole', role);
  const qs = usp.toString();
  return path + (qs ? (path.includes('?') ? '&' : '?') + qs : '');
}

export async function listOrders(role) { const result=await api(withRole('/api/orders',role,{page:UI.dataPage || 1}));UI.workflowHasMore=!!result.hasMore;return result; }
export function getOrder(role, id) { return api(withRole('/api/orders/' + id, role)); }
export function listStaff(role, staffRole) { return api(withRole('/api/staff', role, { role: staffRole })); }

export function createOrder(body) { return api('/api/orders?asRole=dentist', { method: 'POST', body: JSON.stringify(body) }); }

export function receptionReview(id, body) { return api(withRole('/api/orders/' + id + '/reception-review', 'receptionist'), { method: 'POST', body: JSON.stringify(body) }); }
export function designDone(id, technicianId) { return api(withRole('/api/orders/' + id + '/design-done', 'designer'), { method: 'POST', body: JSON.stringify({ technicianId }) }); }
export function productionDone(id, qcId) { return api(withRole('/api/orders/' + id + '/production-done', 'technician'), { method: 'POST', body: JSON.stringify({ qcId }) }); }
export function qcDecision(id, body) { return api(withRole('/api/orders/' + id + '/qc-decision', 'qc'), { method: 'POST', body: JSON.stringify(body) }); }
export function doctorDecision(id, body) { return api(withRole('/api/orders/' + id + '/doctor-decision', 'dentist'), { method: 'POST', body: JSON.stringify(body) }); }
export function confirmCompletion(id) { return api(withRole('/api/orders/' + id + '/confirm-completion', 'receptionist'), { method: 'POST', body: '{}' }); }
export function markDelivered(id) { return api(withRole('/api/orders/' + id + '/mark-delivered', 'receptionist'), { method: 'POST', body: '{}' }); }
export function markCompleted(id) { return api(withRole('/api/orders/' + id + '/mark-completed', 'receptionist'), { method: 'POST', body: '{}' }); }

export function setScheduling(role, id, body) { return api(withRole('/api/orders/' + id + '/scheduling', role), { method: 'POST', body: JSON.stringify(body) }); }
export function blockCase(role, id, body) { return api(withRole('/api/orders/' + id + '/block', role), { method: 'POST', body: JSON.stringify(body) }); }
export function resumeCase(role, id, body) { return api(withRole('/api/orders/' + id + '/resume', role), { method: 'POST', body: JSON.stringify(body || {}) }); }
export function listApprovals(role, id) { return api(withRole('/api/orders/' + id + '/approvals', role)); }
// The lab-wide operational read. Dentists have no route to this by design.
export function labOverview(role) { return api(withRole('/api/lab/overview', role)); }

export function listMessages(role, id) { return api(withRole('/api/orders/' + id + '/messages', role)); }
// `internal: true` posts a note the clinic can never see — the server
// refuses it outright from a dentist and excludes it from their reads.
export function postMessage(role, id, body, internal) { return api(withRole('/api/orders/' + id + '/messages', role), { method: 'POST', body: JSON.stringify({ body, internal: internal === true }) }); }
export function listFiles(role, id) { return api(withRole('/api/orders/' + id + '/files', role)); }
export function recordFile(role, id, body) { return api(withRole('/api/orders/' + id + '/files', role), { method: 'POST', body: JSON.stringify(body) }); }
