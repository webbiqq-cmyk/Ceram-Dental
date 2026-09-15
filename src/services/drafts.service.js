// Drafts and case duplication.
//
// The two features share one idea: a dentist should be able to start a
// case without finishing it, and should never have to retype what the lab
// already knows. Both produce the same thing — a draft, which is a saved
// wizard form and not a job order, so nothing here can put work on the
// lab floor. Only an explicit Submit does that, through the existing
// createOrder path, unchanged.
const drafts = require('../models/caseDraft.model');
const repo = require('../db/jobOrders.store');
const { WorkflowError } = require('../utils/errors');

async function list(dentistId) { return drafts.listFor(dentistId); }

async function get(id, dentistId) {
  const draft = await drafts.getFor(id, dentistId);
  if (!draft) throw Object.assign(new Error('Draft not found.'), { status: 404, expose: true });
  return draft;
}

async function create(dentistId, payload) { return drafts.create(dentistId, payload); }

async function save(id, dentistId, payload) {
  const saved = await drafts.save(id, dentistId, payload);
  if (!saved) throw Object.assign(new Error('Draft not found.'), { status: 404, expose: true });
  return saved;
}

async function remove(id, dentistId) {
  if (!await drafts.remove(id, dentistId)) throw Object.assign(new Error('Draft not found.'), { status: 404, expose: true });
}

// What survives a duplication, and — far more importantly — what does not.
//
// Everything patient-specific is deliberately dropped: the reference, the
// scans, the photographs, the shade taken from that patient's mouth. What
// carries over is the clinic's standing preference — which treatment,
// which material, how they like it finished — because that is what a
// dentist would otherwise retype for the twentieth time.
//
// Nothing mutable is shared with the original: this builds a fresh form
// object, so the new case gets its own id, timeline, files, approvals and
// history the moment it is submitted.
const CARRIED = ['jobType', 'deliveryMethod'];

async function duplicate(orderId, dentistId) {
  const order = await repo.getOrder(orderId);
  // Same rule as everywhere else: another clinic's case is not found,
  // rather than forbidden.
  if (!order || order.dentist_user_id !== dentistId) {
    throw Object.assign(new Error('Case not found.'), { status: 404, expose: true });
  }

  const payload = {
    // Blank on purpose. A duplicated case is a different patient until
    // the dentist says otherwise, and pre-filling the previous reference
    // is exactly how the wrong name reaches a lab.
    patientRef: '',
    caseKind: 'New case',
    deliveryMethod: order.delivery_method || 'pickup',
    // Not copied: a date agreed for a previous case says nothing about
    // when this one is needed.
    targetDate: '',
    duplicatedFrom: order.order_number,
    // Instructions are the clinic's standing preference often enough to
    // be worth carrying, but they are shown for review, never submitted
    // unread — the wizard requires the dentist to walk the steps again.
    carriedInstructions: order.instructions || '',
    carriedJobType: order.job_type,
    carriedShadePreference: order.shade || ''
  };

  return drafts.create(dentistId, payload, { origin: 'duplicate', originOrderNumber: order.order_number });
}

module.exports = { list, get, create, save, remove, duplicate, CARRIED, WorkflowError };
