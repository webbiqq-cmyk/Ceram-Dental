const records = require('../db/records');
const { nextId } = require('../utils/ids');
const { daysAgo } = require('../utils/dates');
const invoiceModel = require('./invoice.model');

const STAGES = ['reception', 'qc', 'designer', 'doctor_approval', 'cadcam', 'layering', 'qc_photo', 'ready'];
const RESTORATION_SERVICES = ['veneers', 'crowns', 'bridges', 'implants'];

function seedDesign(service, shade) {
  if (!RESTORATION_SERVICES.includes(service)) return null;
  const zirconia = service === 'crowns' || service === 'bridges';
  return {
    material: zirconia ? 'Layered zirconia' : 'Layered E.max',
    fabrication: zirconia ? 'Milled' : 'Pressed',
    incisal: service === 'veneers' ? 'Micro-layered incisal' : 'Natural cutback',
    layering: service === 'veneers' ? 'Micro-layered incisal' : 'Natural cutback',
    glaze: 'High glaze',
    surface: 'Natural texture',
    shade: { cervical: '', body: shade && shade !== '—' ? shade : 'A2', incisal: '' }
  };
}

function mkCase(id, clinic, patient, service, stage, tech, shade, ageDays) {
  const idx = STAGES.indexOf(stage);
  const history = [];
  for (let i = 0; i <= idx; i++) history.push({ stage: STAGES[i], at: daysAgo(Math.max(ageDays - i * 1.3, 0)) });
  return {
    id, clinic, patient, service, stage, tech, shade,
    design: seedDesign(service, shade),
    createdAt: daysAgo(ageDays),
    protocol: { photos: true, scan: true, retraction: true, margins: true, contacts: true },
    history, revisions: 0, pickedUp: stage === 'ready' ? false : false
  };
}

// Starts empty — cases are created through the app (website submissions and
// the dentist portal). mkCase/seedDesign above are kept only for tests.
const cases = [];

function s(v, max) { return String(v == null ? '' : v).slice(0, max || 60); }
function normDesign(d) {
  if (!d || typeof d !== 'object') return null;
  const sh = d.shade || {};
  return {
    material: s(d.material, 60), fabrication: s(d.fabrication, 40), incisal: s(d.incisal, 60),
    layering: s(d.layering, 60), glaze: s(d.glaze, 60), surface: s(d.surface, 60),
    shade: { cervical: s(sh.cervical, 12), body: s(sh.body, 12), incisal: s(sh.incisal, 12) }
  };
}

async function createCase({ clinic, patient, service, shade, instructions, protocol, design, ownerId }) {
  return records.transaction(async () => {
  const id = nextId('case', 'CD-');
  const c = {
    id, ownerId: ownerId || null, clinic: clinic || 'Walk-in submission', patient: patient || 'Unassigned',
    service, tech: '—', shade: shade || '—', stage: 'reception',
    design: normDesign(design),
    createdAt: new Date(), protocol: Object.assign({ photos: false, scan: false, retraction: false, margins: false, contacts: false }, protocol),
    instructions: instructions || '', revisions: 0, pickedUp: false,
    history: [{ stage: 'reception', at: new Date(), note: 'Submitted via website' }]
  };
  await records.insert('cases', c);
  await invoiceModel.createInvoiceForCase(c);
  return c;
  });
}

async function actOnCase(id, act) {
  return records.update('cases', id, c => {
  const permitted = { advance: ['reception','designer','cadcam','layering','qc_photo'], 'qc-accept':['qc'], 'qc-reject':['qc'], approve:['doctor_approval'], reject:['doctor_approval'], pickup:['ready'] };
  if (!permitted[act]?.includes(c.stage) || (act === 'pickup' && c.pickedUp)) return null;
  const idx = STAGES.indexOf(c.stage);
  const push = (stage, note) => c.history.push({ stage, at: new Date(), note });

  if (act === 'advance') { const next = c.stage === 'designer' && c.service !== 'veneers' ? 'cadcam' : STAGES[Math.min(idx + 1, STAGES.length - 1)]; c.stage = next; push(next); }
  else if (act === 'qc-accept') { c.stage = 'designer'; push('designer', 'QC accepted'); }
  else if (act === 'qc-reject') { c.stage = 'reception'; push('reception', 'Returned by QC — incomplete protocol items'); }
  else if (act === 'approve') { c.stage = 'cadcam'; push('cadcam', 'Mockup approved by doctor'); }
  else if (act === 'reject') {
    c.revisions += 1; c.stage = 'designer';
    push('designer', c.revisions > 1 ? 'Modification requested — additional charges apply' : 'Modification requested');
  } else if (act === 'pickup') { c.pickedUp = true; }
  else return null;

  return c;
  });
}

records.register('cases', cases);
async function list(options) { return records.list('cases', options); }
module.exports = { list, STAGES, cases, createCase, actOnCase };
