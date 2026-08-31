// In-memory data store for the demo. No database — arrays that live for the
// life of the process. Seeded with sample cases, invoices and expenses so
// every dashboard has something to show on first load.

const STAGES = ['reception', 'qc', 'designer', 'doctor_approval', 'cadcam', 'layering', 'qc_photo', 'ready'];

const SERVICE_FEES = {
  veneers: 480,
  crowns: 90,
  bridges: 320,
  implants: 200,
  surgical_guide: 150,
  dsd: 60
};

let seq = { case: 105, invoice: 105, order: 41, application: 12, message: 30, expense: 9 };
function nextId(kind, prefix) { return prefix + (seq[kind]++); }

function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }

function mkCase(id, clinic, patient, service, stage, tech, shade, ageDays) {
  const idx = STAGES.indexOf(stage);
  const history = [];
  for (let i = 0; i <= idx; i++) history.push({ stage: STAGES[i], at: daysAgo(Math.max(ageDays - i * 1.3, 0)) });
  return {
    id, clinic, patient, service, stage, tech, shade,
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

const invoices = cases.map((c, i) => {
  const amount = SERVICE_FEES[c.service] || 100;
  const paid = c.stage === 'ready' || i % 3 === 0;
  return {
    id: nextId('invoice', 'INV-'),
    caseId: c.id,
    clinic: c.clinic,
    service: c.service,
    amount,
    status: paid ? 'paid' : (i === 1 ? 'overdue' : 'unpaid'),
    issuedAt: c.createdAt,
    paidAt: paid ? daysAgo(0.5) : null
  };
});

const expenses = [
  { id: nextId('expense', 'EXP-'), category: 'Materials', description: 'Zirconia & ceramic blocks — weekly restock', amount: 420, date: daysAgo(6) },
  { id: nextId('expense', 'EXP-'), category: 'Equipment', description: 'CAD-CAM mill maintenance', amount: 95, date: daysAgo(11) },
  { id: nextId('expense', 'EXP-'), category: 'Payroll', description: 'Lab staff salaries (this week)', amount: 980, date: daysAgo(3) },
  { id: nextId('expense', 'EXP-'), category: 'Facilities', description: 'Unit rent — New Zinj', amount: 650, date: daysAgo(14) },
  { id: nextId('expense', 'EXP-'), category: 'Facilities', description: 'Utilities & internet', amount: 85, date: daysAgo(9) }
];

const products = [
  { id: 'shade-guide', name: 'VITA Classical Shade Guide', category: 'Chairside kit', price: 28, desc: 'A1–D4 reference tabs for accurate shade calls before you scan.' },
  { id: 'retraction-kit', name: 'Retraction Cord Kit', category: 'Chairside kit', price: 19, desc: 'Assorted-gauge cord for the margin photos our protocol asks for.' },
  { id: 'impression-trays', name: 'Digital Impression Tray Set', category: 'Chairside kit', price: 34, desc: 'Sized trays to steady a scan on difficult arches.' },
  { id: 'temp-kit', name: 'Temporary Crown & Bridge Kit', category: 'Chairside kit', price: 42, desc: 'Interim coverage while a case is in production.' },
  { id: 'whitening-kit', name: 'Take-Home Whitening Kit', category: 'Patient retail', price: 25, desc: 'Branded kit to send home with patients after seating.' },
  { id: 'retainer-case', name: 'Ceram Care Retainer Case', category: 'Patient retail', price: 6, desc: 'Branded case for retainers and night guards.' }
];

const jobs = [
  { id: 'tech-cadcam', title: 'Senior Dental Technician — CAD-CAM', type: 'Full-time', desc: 'Own milling and fit for crowns, bridges and implant restorations.' },
  { id: 'ceramist', title: 'Ceramist / Layering Specialist', type: 'Full-time', desc: 'Layering, glazing and shade matching on veneer and anterior cases.' },
  { id: 'qc-officer', title: 'Quality Control Officer', type: 'Full-time', desc: 'Run incoming-case protocol checks and outgoing QC before pickup.' },
  { id: 'reception', title: 'Front Desk & Case Coordinator', type: 'Full-time', desc: 'First point of contact for clinics — intake, scheduling, pickups.' },
  { id: 'case-manager', title: 'Case Manager, Client Success', type: 'Full-time', desc: 'Keep clinics updated case-by-case and manage the approval loop.' }
];

const applications = [];
const messages = [];
const orders = [];

function createCase({ clinic, patient, service, shade, instructions, protocol }) {
  const id = nextId('case', 'CD-');
  const c = {
    id, clinic: clinic || 'Walk-in submission', patient: patient || 'Unassigned',
    service, tech: '—', shade: shade || '—', stage: 'reception',
    createdAt: new Date(), protocol: Object.assign({ photos: false, scan: false, retraction: false, margins: false, contacts: false }, protocol),
    instructions: instructions || '', revisions: 0, pickedUp: false,
    history: [{ stage: 'reception', at: new Date(), note: 'Submitted via website' }]
  };
  cases.unshift(c);
  invoices.unshift({
    id: nextId('invoice', 'INV-'), caseId: id, clinic: c.clinic, service,
    amount: SERVICE_FEES[service] || 100, status: 'unpaid', issuedAt: new Date(), paidAt: null
  });
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

function payInvoice(id) {
  const inv = invoices.find(x => x.id === id);
  if (!inv) return null;
  inv.status = 'paid';
  inv.paidAt = new Date();
  return inv;
}

function addExpense({ category, description, amount }) {
  const exp = { id: nextId('expense', 'EXP-'), category, description: description || '', amount: Number(amount), date: new Date() };
  expenses.unshift(exp);
  return exp;
}

function checkout(items, customer) {
  let total = 0;
  const lines = [];
  for (const it of items) {
    const p = products.find(x => x.id === it.id);
    if (!p) continue;
    const qty = Math.max(1, Number(it.qty) || 1);
    total += p.price * qty;
    lines.push({ id: p.id, name: p.name, price: p.price, qty });
  }
  if (!lines.length) return null;
  const order = {
    id: nextId('order', 'ORD-'), items: lines, total: Math.round(total * 100) / 100,
    customer, status: 'confirmed', createdAt: new Date()
  };
  orders.unshift(order);
  return order;
}

function addApplication({ jobId, name, email, phone, note }) {
  const job = jobs.find(j => j.id === jobId);
  const app = { id: nextId('application', 'APP-'), jobId, jobTitle: job ? job.title : jobId, name, email, phone: phone || '', note: note || '', createdAt: new Date() };
  applications.unshift(app);
  return app;
}

function addMessage({ name, email, message }) {
  const msg = { id: nextId('message', 'MSG-'), name, email, message, createdAt: new Date() };
  messages.unshift(msg);
  return msg;
}

function summary() {
  const revenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.filter(i => i.status === 'overdue').length;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const activeCases = cases.filter(c => c.stage !== 'ready').length;
  const readyCases = cases.filter(c => c.stage === 'ready').length;
  const shopRevenue = orders.reduce((s, o) => s + o.total, 0);
  return {
    revenue, outstanding, overdue, totalExpenses,
    net: Math.round((revenue + shopRevenue - totalExpenses) * 100) / 100,
    activeCases, readyCases, shopRevenue,
    openApplications: applications.length, newMessages: messages.length
  };
}

module.exports = {
  STAGES, SERVICE_FEES,
  cases, invoices, expenses, products, jobs, applications, messages, orders,
  createCase, actOnCase, payInvoice, addExpense, checkout, addApplication, addMessage, summary
};
