// Thin wrapper over the /api/orders backend (src/routes/orders.routes.js)
// for every lab-workflow page. Centralizes the one thing every call needs
// right now: `asRole` — see src/middleware/workflowRole.js for why a
// shared multi-role endpoint needs a dashboard to say which role it's
// acting as while login stays disabled. The moment real per-role login
// exists this parameter becomes unnecessary (a real cookie disambiguates
// on its own) and every call site here is the only place that changes.
import { api } from '../state.js';

function withRole(path, role, params) {
  const usp = new URLSearchParams(Object.assign({}, params));
  if (role) usp.set('asRole', role);
  const qs = usp.toString();
  return path + (qs ? (path.includes('?') ? '&' : '?') + qs : '');
}

export function listOrders(role) { return api(withRole('/api/orders', role)); }
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

export function listMessages(role, id) { return api(withRole('/api/orders/' + id + '/messages', role)); }
export function postMessage(role, id, body) { return api(withRole('/api/orders/' + id + '/messages', role), { method: 'POST', body: JSON.stringify({ body }) }); }
export function listFiles(role, id) { return api(withRole('/api/orders/' + id + '/files', role)); }
export function recordFile(role, id, body) { return api(withRole('/api/orders/' + id + '/files', role), { method: 'POST', body: JSON.stringify(body) }); }
