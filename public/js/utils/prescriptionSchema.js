// The browser's handle on the clinic-approved prescription catalogue.
//
// The catalogue itself lives on the server (src/services/prescription.js)
// and is fetched once from GET /api/prescription-schema. Nothing about a
// clinical option — its label, its hint, whether it is required, when it
// applies — is written down a second time here: this file only knows how
// to *read* the catalogue. That is the whole point. If the clinic changes
// an option, it changes in one file and both the form and the validator
// follow.
//
// The helpers below (isActive / missingRequired / jobTypeFor) are
// deliberately the same rules the server applies in normalise(). They run
// here so the form can hide an irrelevant question and show completeness
// as you type; the server still re-applies all of them on submit, so this
// is convenience, never the guard.
import { api } from '../state.js';

let cache = null;
let inFlight = null;

/**
 * Fetches the catalogue once per page load; every later call is free.
 *
 * The endpoint is shared by every workflow role (see orders.routes.js),
 * but while real per-role login stays off, the request has to say which
 * role it is acting as (see middleware/workflowRole.js) — so callers pass
 * their own role rather than this defaulting to one dashboard's.
 */
export async function ensureSchema(role = 'dentist') {
  if (cache) return cache;
  if (!inFlight) {
    inFlight = api('/api/prescription-schema?asRole=' + encodeURIComponent(role))
      .then(result => { cache = { shades: result.shades, classicShades: result.classicShades, ndShades: result.ndShades, treatments: result.treatments }; return cache; })
      .finally(() => { inFlight = null; });
  }
  return inFlight;
}

/** The catalogue if it is already loaded, otherwise null. */
export function loadedSchema() { return cache; }

export function treatmentKeys(schema) { return schema ? Object.keys(schema.treatments) : []; }
export function treatment(schema, key) { return (schema && schema.treatments[key]) || null; }

/** Every field of a treatment, flattened out of its sections. */
export function fieldsOf(schema, key) {
  const t = treatment(schema, key);
  return t ? t.sections.flatMap(s => s.fields) : [];
}

/** Is a conditional field in play, given the answers so far? */
export function isActive(field, values) {
  if (!field.when) return true;
  return field.when.in.includes(values[field.when.field]);
}

/** Required answers still outstanding — drives status, never blocks typing. */
export function missingRequired(schema, key, values = {}) {
  const t = treatment(schema, key);
  if (!t) return [];
  const fields = fieldsOf(schema, key);
  return t.required.filter(name => {
    const field = fields.find(f => f.key === name);
    return (field ? isActive(field, values) : true) && !values[name];
  });
}

/** Same declarative rule the server reads — see prescription.js jobTypeFor. */
export function jobTypeFor(schema, key, values = {}) {
  const t = treatment(schema, key);
  if (!t) return null;
  const rule = t.jobType;
  if (!rule.field) return rule.value;
  return rule.map[values[rule.field]] || rule.value;
}

/** The human label for one stored answer, for read-only rendering. */
export function labelFor(field, value) {
  if (field.type === 'toggle') return value ? 'Yes' : 'No';
  if (field.type === 'shade') return String(value);
  if (field.type === 'multi') {
    const list = Array.isArray(value) ? value : [];
    return list.map(v => (field.options.find(o => o.value === v) || { label: v }).label).join(', ');
  }
  if (!field.options) return String(value);
  const option = field.options.find(o => o.value === value);
  if (!option) return String(value);
  return field.type === 'smile' ? option.value + ' — ' + option.label : option.label;
}

/**
 * Drops anything the catalogue does not recognise.
 *
 * Two things feed stored answers back in: a saved draft and a duplicated
 * case, both of which can predate an option the clinic has since
 * withdrawn (or, on the first release, predate the catalogue entirely).
 * Sending one of those to the server gets the whole case rejected with
 * "Unknown option", which is a confusing way to lose a submission. So the
 * form drops the stale answer quietly and shows the question unanswered,
 * which is the truth.
 */
export function sanitise(schema, key, values = {}) {
  const t = treatment(schema, key);
  if (!t) return {};
  const out = {};
  for (const field of fieldsOf(schema, key)) {
    const value = values[field.key];
    if (value === undefined || value === null || value === '') continue;
    if (field.type === 'choice' || field.type === 'smile') {
      if (field.options.some(o => o.value === value)) out[field.key] = value;
    } else if (field.type === 'shade') {
      if (schema.shades.includes(value)) out[field.key] = value;
    } else if (field.type === 'multi') {
      const list = (Array.isArray(value) ? value : []).filter(v => field.options.some(o => o.value === v));
      if (list.length) out[field.key] = list;
    } else if (field.type === 'toggle') {
      if (value === true) out[field.key] = true;
    } else {
      out[field.key] = String(value).slice(0, 500);
    }
    if (field.other && values[field.other]) out[field.other] = String(values[field.other]).slice(0, 500);
  }
  if (values.notes) out.notes = String(values.notes).slice(0, 3000);
  return out;
}

/** True where a free-text companion should be shown for this answer. */
export function wantsOther(field, values) {
  return !!field.other && ['other', 'custom', 'specify', 'Other'].includes(values[field.key]);
}
