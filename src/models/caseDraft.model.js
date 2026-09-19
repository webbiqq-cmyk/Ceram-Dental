// Saved-but-not-submitted cases.
//
// A draft is deliberately NOT a job_orders row. The New Case wizard can
// produce several orders from one form (one per service group), so what a
// dentist is part-way through is a *form*, not a case — and giving it a
// job_orders row would mean inventing a status the workflow has to learn
// to ignore in every queue, every count and every notification. One
// forgotten filter and an unfinished case appears on the lab floor.
//
// So drafts live in the generic record store (app_records on Postgres, the
// same Map in memory), owner-scoped by the index that store already has.
// Nothing in the workflow can see them, because they are not in it.
const records = require('../db/records');
const { nextId } = require('../utils/ids');

records.register('caseDrafts');

const COLLECTION = 'caseDrafts';
// A wizard form is ~32 teeth plus four config objects — a few KB. The cap
// is generous enough to never bite a real form and small enough that a
// malformed or hostile client cannot fill the store.
const MAX_BYTES = 64 * 1024;

function assertPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw Object.assign(new Error('A draft needs its case details.'), { status: 400, expose: true });
  }
  if (Buffer.byteLength(JSON.stringify(payload)) > MAX_BYTES) {
    throw Object.assign(new Error('This draft is too large to save.'), { status: 400, expose: true });
  }
}

// What the dentist's dashboard shows without opening the draft. Derived
// here rather than trusted from the client, so a draft always describes
// itself honestly in a list.
function summarise(payload) {
  const teeth = Array.isArray(payload.teeth) ? payload.teeth : [];
  // An arch-based treatment (an orthodontic appliance) carries no teeth at
  // all — see extras in the New Case wizard — so it would otherwise
  // vanish from a draft's own summary.
  const extras = Array.isArray(payload.extras) ? payload.extras.filter(e => typeof e === 'string').slice(0, 10) : [];
  const services = [...new Set(teeth.filter(t => t && t.service && t.service !== 'none').map(t => t.service).concat(extras))];
  return {
    patientRef: String(payload.patientRef || '').slice(0, 120),
    services,
    units: teeth.filter(t => t && t.service && t.service !== 'none').length,
    targetDate: typeof payload.targetDate === 'string' ? payload.targetDate.slice(0, 10) : ''
  };
}

async function listFor(ownerId) {
  const rows = await records.list(COLLECTION, { limit: 50, ownerId });
  return rows.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

async function getFor(id, ownerId) {
  const row = await records.get(COLLECTION, id);
  // Not-found rather than forbidden: another dentist's draft should not be
  // distinguishable from one that never existed.
  return row && row.ownerId === ownerId ? row : null;
}

async function create(ownerId, payload, meta = {}) {
  assertPayload(payload);
  const now = new Date();
  return records.insert(COLLECTION, {
    id: nextId('caseDraft', 'DRF-'),
    ownerId, payload, summary: summarise(payload),
    origin: meta.origin || 'new',
    originOrderNumber: meta.originOrderNumber || '',
    createdAt: now, updatedAt: now
  });
}

async function save(id, ownerId, payload) {
  assertPayload(payload);
  return records.update(COLLECTION, id, row => {
    if (row.ownerId !== ownerId) return null;
    row.payload = payload;
    row.summary = summarise(payload);
    row.updatedAt = new Date();
  });
}

async function remove(id, ownerId) {
  const row = await getFor(id, ownerId);
  if (!row) return false;
  return records.remove(COLLECTION, id);
}

module.exports = { listFor, getFor, create, save, remove, summarise };
