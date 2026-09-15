// Global search.
//
// One rule governs everything here: search never widens what a role can
// already reach. It is a faster route to a case somebody is entitled to
// open, never a way to discover one they are not — so the scope comes
// from the authenticated role, the store applies it in the query, and no
// request parameter can change it.
const repo = require('../db/jobOrders.store');
const caseView = require('./caseView');

// Which result groups each role gets. A dentist searching finds their own
// cases and nothing else — no staff directory, no other clinics. Lab
// roles find cases. Only administration searches people, because only
// administration has a reason to.
const GROUPS = {
  dentist: ['cases'],
  receptionist: ['cases'], designer: ['cases'], technician: ['cases'], qc: ['cases'],
  lab: ['cases', 'dentists'],
  admin: ['cases', 'dentists']
};

async function search(role, userId, term, { limit = 8 } = {}) {
  const groups = GROUPS[role] || [];
  const q = String(term || '').trim();
  // Two characters is the floor. A single letter matches most of the
  // table and answers nothing.
  if (q.length < 2 || !groups.length) return { query: q, cases: [], dentists: [] };

  const [orders, dentists] = await Promise.all([
    groups.includes('cases') ? repo.searchOrders(role, userId, q, limit) : [],
    groups.includes('dentists') ? repo.searchDentists(q, 5) : []
  ]);

  return {
    query: q,
    // Results carry the same derived view every queue renders from, so a
    // search hit shows the same status wording as the case itself.
    cases: caseView.withViews(orders, { audience: role === 'dentist' ? 'dentist' : 'lab' }).map(o => ({
      id: o.id, order_number: o.order_number, job_type: o.job_type, patient_ref: o.patient_ref,
      dentist_name: role === 'dentist' ? null : o.dentist_name,
      headline: o.view.headline, stage_label: o.view.stage_label,
      priority: o.view.priority, needs_attention: o.view.needs_attention
    })),
    dentists: dentists.map(d => ({ id: d.id, name: d.name, active_cases: d.active_cases }))
  };
}

module.exports = { search, GROUPS };
