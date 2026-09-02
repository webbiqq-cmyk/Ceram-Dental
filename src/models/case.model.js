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

const cases = [
  mkCase('CD-104', 'Dr. R. Haddad — Bright Smile Clinic', 'Patient #4471', 'veneers', 'reception', 'Malvin', 'A2', 1),
  mkCase('CD-103', 'Dr. L. Farouk — City Dental', 'Patient #2290', 'crowns', 'qc', 'Rana', 'B1', 2),
  mkCase('CD-101', 'Dr. N. Saleh — OrthoPlus', 'Patient #1187', 'bridges', 'designer', 'Malvin', 'A3', 3),
  mkCase('CD-098', 'Dr. R. Haddad — Bright Smile Clinic', 'Patient #4392', 'dsd', 'doctor_approval', 'Omar', 'A1', 4),
  mkCase('CD-096', 'Dr. A. Nasser — Pearl Dental', 'Patient #3350', 'implants', 'cadcam', 'Malvin', 'A3.5', 5),
  mkCase('CD-093', 'Dr. L. Farouk — City Dental', 'Patient #2201', 'surgical_guide', 'layering', 'Rana', '—', 6),
  mkCase('CD-090', 'Dr. N. Saleh — OrthoPlus', 'Patient #1090', 'veneers', 'qc_photo', 'Malvin', 'B2', 7),
  mkCase('CD-085', 'Dr. A. Nasser — Pearl Dental', 'Patient #3299', 'crowns', 'ready', 'Omar', 'C2', 9)
];
cases.find(c => c.id === 'CD-098').revisions = 1;
cases.find(c => c.id === 'CD-098').history = [
  { stage: 'reception', at: daysAgo(4) },
  { stage: 'qc', at: daysAgo(3.7) },
  { stage: 'designer', at: daysAgo(3.3) },
  { stage: 'doctor_approval', at: daysAgo(2.8), note: 'Sent for initial approval' },
  { stage: 'designer', at: daysAgo(2.2), note: 'Modification requested — incisal length' },
  { stage: 'doctor_approval', at: daysAgo(1.1), note: 'Re-submitted after revision' }
];

invoiceModel.seedFromCases(cases);

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

function createCase({ clinic, patient, service, shade, instructions, protocol, design }) {
  const id = nextId('case', 'CD-');
  const c = {
    id, clinic: clinic || 'Walk-in submission', patient: patient || 'Unassigned',
    service, tech: '—', shade: shade || '—', stage: 'reception',
    design: normDesign(design),
    createdAt: new Date(), protocol: Object.assign({ photos: false, scan: false, retraction: false, margins: false, contacts: false }, protocol),
    instructions: instructions || '', revisions: 0, pickedUp: false,
    history: [{ stage: 'reception', at: new Date(), note: 'Submitted via website' }]
  };
  cases.unshift(c);
  invoiceModel.createInvoiceForCase(c);
  return c;
}

function actOnCase(id, act) {
  const c = cases.find(x => x.id === id);
  if (!c) return null;
  const idx = STAGES.indexOf(c.stage);
  const push = (stage, note) => c.history.push({ stage, at: new Date(), note });

  if (act === 'advance') { const next = STAGES[Math.min(idx + 1, STAGES.length - 1)]; c.stage = next; push(next); }
  else if (act === 'qc-accept') { c.stage = 'designer'; push('designer', 'QC accepted'); }
  else if (act === 'qc-reject') { c.stage = 'reception'; push('reception', 'Returned by QC — incomplete protocol items'); }
  else if (act === 'approve') { c.stage = 'cadcam'; push('cadcam', 'Mockup approved by doctor'); }
  else if (act === 'reject') {
    c.revisions += 1; c.stage = 'designer';
    push('designer', c.revisions > 1 ? 'Modification requested — additional charges apply' : 'Modification requested');
  } else if (act === 'pickup') { c.pickedUp = true; }
  else return null;

  return c;
}

module.exports = { STAGES, cases, createCase, actOnCase };
