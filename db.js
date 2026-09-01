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
  dsd: 60,
  aligners: 220
};

let seq = { case: 105, invoice: 105, order: 41, application: 12, message: 30, expense: 9, appointment: 21, team: 5, enquiry: 48 };
function nextId(kind, prefix) { return prefix + (seq[kind]++); }

function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }

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
    paidAt: paid ? daysAgo(i % 6) : null
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
  { id: 'shade-guide', name: 'VITA Classical Shade Guide', category: 'Chairside kit', price: 28, sku: 'CK-SHADE-01', stock: 14, active: true,
    desc: 'A1–D4 reference tabs for accurate shade calls before you scan.',
    specs: [{ label: 'Tabs', value: '16 shades, A1–D4' }, { label: 'Standard', value: 'VITA Classical' }, { label: 'Sterilisation', value: 'Autoclavable to 134°C' }] },
  { id: 'retraction-kit', name: 'Retraction Cord Kit', category: 'Chairside kit', price: 19, sku: 'CK-CORD-02', stock: 22, active: true,
    desc: 'Assorted-gauge cord for the margin photos our protocol asks for.',
    specs: [{ label: 'Gauges', value: '#000, #00, #0, #1' }, { label: 'Material', value: 'Knitted, non-impregnated' }, { label: 'Length', value: '4 × 244 cm' }] },
  { id: 'impression-trays', name: 'Digital Impression Tray Set', category: 'Chairside kit', price: 34, sku: 'CK-TRAY-03', stock: 9, active: true,
    desc: 'Sized trays to steady a scan on difficult arches.',
    specs: [{ label: 'Sizes', value: 'S / M / L, upper & lower' }, { label: 'Reusable', value: 'Yes — autoclavable' }] },
  { id: 'temp-kit', name: 'Temporary Crown & Bridge Kit', category: 'Chairside kit', price: 42, sku: 'CK-TEMP-04', stock: 6, active: true,
    desc: 'Interim coverage while a case is in production.',
    specs: [{ label: 'Shade', value: 'A2 bis-acryl' }, { label: 'Yield', value: '~40 units per cartridge' }, { label: 'Set time', value: '2:30 min' }] },
  { id: 'whitening-kit', name: 'Take-Home Whitening Kit', category: 'Patient retail', price: 25, sku: 'PR-WHT-01', stock: 30, active: true,
    desc: 'Dentist-recommended kit to finish whitening comfortably at home.',
    specs: [{ label: 'Gel', value: '16% carbamide peroxide' }, { label: 'Syringes', value: '4 × 3 ml' }, { label: 'Trays', value: 'Thermoform, upper & lower' }] },
  { id: 'retainer-case', name: 'Ceram Care Retainer Case', category: 'Patient retail', price: 6, sku: 'PR-CASE-02', stock: 48, active: true,
    desc: 'A proper home for retainers and night guards between visits.',
    specs: [{ label: 'Material', value: 'Vented ABS shell' }, { label: 'Colours', value: 'Plum, bone, charcoal' }] },
  { id: 'sonic-toothbrush', name: 'Ceram Care Sonic Toothbrush', category: 'Patient retail', price: 32, sku: 'PR-BRSH-03', stock: 17, active: true,
    desc: 'Gentle on veneers and crowns — the brush we recommend after treatment.',
    specs: [{ label: 'Speed', value: '31,000 strokes/min' }, { label: 'Battery', value: '30 days per charge' }, { label: 'Modes', value: 'Clean, Sensitive, Polish' }] },
  { id: 'bite-paste', name: 'Bite Registration Paste', category: 'Chairside kit', price: 22, sku: 'CK-BITE-05', stock: 11, active: true,
    desc: 'Fast-set paste for an accurate bite record with every impression.',
    specs: [{ label: 'Base', value: 'A-silicone' }, { label: 'Set time', value: '45 s intra-oral' }, { label: 'Shore hardness', value: 'D 32' }] }
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

const team = [
  {
    id: 'doc-ahmed-yousri', name: 'Dr. Ahmed Yousri', nameAr: 'د. احمد يسري',
    role: 'Oral Surgery & Implantology', initials: 'AY', years: 22,
    photo: '/images/team/ahmed-yousri.jpg',
    credentials: [
      'MD, Oral Surgery & Dental Implants (2011)',
      'BSc, Oral & Dental Surgery (2004)',
      'Member, International Congress of Oral Implantologists (ICOI)',
      'Member, Egyptian Society of Dental Implants'
    ]
  },
  {
    id: 'doc-abdulaziz-adel', name: 'Dr. Abdulaziz Adel', nameAr: 'د. عبدالعزيز عادل',
    role: 'Implant & Cosmetic Dentistry', initials: 'AA', years: 12,
    photo: '/images/team/abdulaziz-adel.jpg',
    credentials: [
      'Fellowship, Royal College of Surgeons of Edinburgh (MGDS RCSEd)',
      'Professional Diploma in Implant Dentistry — American Academy of Implant Dentistry',
      'Professional Certificate in Implant Dentistry — Saint Joseph University, Beirut',
      'Diploma in Cosmetic Dentistry — Oxford Academy',
      'Dental Specialty Certificate — Ministry of Health (SDRP)',
      'Advanced Laser Dentistry Certificate'
    ]
  },
  {
    id: 'doc-madhavi-alamanda', name: 'Dr. Madhavi Alamanda', nameAr: 'د. مادفي ألاماندا',
    role: 'Specialist Periodontist', initials: 'MA', years: 18,
    photo: '/images/team/madhavi-alamanda.jpg',
    credentials: [
      'BDS, MDS — Periodontology',
      'Cosmetic gum treatment & gummy-smile correction',
      'Surgical management of advanced gum disease'
    ]
  },
  {
    id: 'doc-hari-sankar', name: 'Dr. Hari Sankar', nameAr: 'د. هاري سنكر',
    role: 'Specialist Endodontist', initials: 'HS', years: 15,
    photo: '/images/team/hari-sankar.jpg',
    credentials: [
      'MDS — Dr. NTR University of Health Sciences',
      'BDS — Tamil Nadu Dr. M.G.R. Medical University',
      'Root canal treatment & microsurgical endodontics'
    ]
  },
  {
    id: 'doc-chandrime-sreekumar', name: 'Dr. Chandrime A. Sreekumar', nameAr: 'د. تشاندريم أ. سريكومار',
    role: 'Specialist Orthodontist', initials: 'CS', years: 10,
    photo: '/images/team/chandrime-sreekumar.jpg',
    credentials: [
      'Specialist in fixed braces, clear aligners & functional appliances',
      'Interceptive and adult orthodontics'
    ]
  },
  {
    id: 'doc-zainab-almahdi', name: 'Dr. Zainab Al-Mahdi', nameAr: 'د. زينب المهدي',
    role: 'Cosmetic, Endodontics & Prosthodontics', initials: 'ZM', years: 9,
    photo: '/images/team/zainab-almahdi.jpg',
    credentials: [
      'Bachelor of Oral & Dental Medicine & Surgery — Egypt University of Science & Technology',
      'Certified in International Dental Implantology — Saint Joseph University',
      'Internationally accredited in laser dentistry',
      'Cosmetic dentistry, root canal treatment & prosthodontics'
    ]
  },
  {
    id: 'doc-basma-radhi', name: 'Dr. Basma Radhi', nameAr: 'د. بسمة رضي',
    role: 'Cosmetic & Pediatric Dentistry', initials: 'BR', years: 8,
    photo: '/images/team/basma-radhi.jpg',
    credentials: [
      'Bachelor of Oral & Dental Surgery — Misr University of Science & Technology',
      'Certifications in cosmetic dentistry, porcelain veneers & prosthetics',
      'Internationally accredited in laser dentistry',
      'Pediatric dentistry'
    ]
  },
  {
    id: 'doc-abdullah-qurban', name: 'Dr. Abdullah Qurban', nameAr: 'د. عبدالله قربان',
    role: 'Cosmetic & Restorative Dentistry', initials: 'AQ', years: 7,
    photo: '/images/team/abdullah-qurban.jpg',
    credentials: [
      'Bachelor of Medicine & Surgery in Oral & Dental Medicine — RAK University, UAE',
      'Certifications in cosmetic dentistry & dental prosthetics',
      'Internationally accredited in laser dentistry',
      'Cosmetic & restorative fillings'
    ]
  }
];

// New-patient enquiries — most arrive as Instagram DMs. Simple acceptance
// pipeline: new → contacted → booked → closed.
const ENQUIRY_STAGES = ['new', 'contacted', 'booked', 'closed'];
const enquiries = [
  { id: nextId('enquiry', 'ENQ-'), name: 'Layla Hasan', handle: '@layla.hsn', channel: 'Instagram DM', service: 'veneers', stage: 'new', message: 'Saw your veneer before/after reel — how much for 8 uppers and how long does it take?', createdAt: daysAgo(0.2) },
  { id: nextId('enquiry', 'ENQ-'), name: 'Mohammed Ali', handle: '+973 3820 5567', channel: 'WhatsApp', service: 'implants', stage: 'new', message: 'Lost a molar, want to ask about an implant. Do you take BUPA?', createdAt: daysAgo(0.6) },
  { id: nextId('enquiry', 'ENQ-'), name: 'Sara Kamal', handle: '@sara_k', channel: 'Instagram DM', service: 'dsd', stage: 'contacted', message: 'Interested in a smile design preview before deciding.', createdAt: daysAgo(1.4) },
  { id: nextId('enquiry', 'ENQ-'), name: 'Fahad Noor', handle: '@fahad.noor', channel: 'Instagram DM', service: 'aligners', stage: 'contacted', message: 'Clear aligners — crowded lower teeth. Free consultation?', createdAt: daysAgo(2.1) },
  { id: nextId('enquiry', 'ENQ-'), name: 'Huda Salman', handle: 'huda.salman@gmail.com', channel: 'Website form', service: 'crowns', stage: 'booked', message: 'Need two crowns replaced, booked for Sunday 5pm.', createdAt: daysAgo(3) },
  { id: nextId('enquiry', 'ENQ-'), name: 'Ali Mansoor', handle: '@ali.mnsr', channel: 'Instagram DM', service: '', stage: 'closed', message: 'Just asking about whitening prices.', createdAt: daysAgo(5) }
];

function setEnquiryStage(id, stage) {
  const e = enquiries.find(x => x.id === id);
  if (!e || !ENQUIRY_STAGES.includes(stage)) return null;
  e.stage = stage;
  return e;
}

const appointments = [
  { id: nextId('appointment', 'APT-'), name: 'Fatima Al-Sayed', phone: '+973 3900 1122', service: 'veneers', preferredDate: daysAgo(-3), status: 'new', note: 'Interested in a full smile makeover.', createdAt: daysAgo(1) },
  { id: nextId('appointment', 'APT-'), name: 'Yousif Marzooq', phone: '+973 3611 4477', service: 'implants', preferredDate: daysAgo(-5), status: 'confirmed', note: '', createdAt: daysAgo(2) },
  { id: nextId('appointment', 'APT-'), name: 'Noor Abdulla', phone: '+973 3344 9021', service: 'dsd', preferredDate: daysAgo(-1), status: 'new', note: 'Saw the Instagram page, wants a preview first.', createdAt: daysAgo(0.4) }
];

let settings = {
  clinicName: 'Ceram Dental',
  phone: '+973 1713 1123',
  email: 'hello@ceram-dental.com',
  address: 'Highway 35, New Zinj, Manama, Bahrain',
  hours: 'Sat–Thu, 9:00 AM – 7:00 PM'
};

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

function addAppointment({ name, phone, service, preferredDate, note }) {
  const apt = {
    id: nextId('appointment', 'APT-'), name, phone: phone || '', service: service || '',
    preferredDate: preferredDate ? new Date(preferredDate) : null, note: note || '',
    status: 'new', createdAt: new Date()
  };
  appointments.unshift(apt);
  return apt;
}

function setAppointmentStatus(id, status) {
  const apt = appointments.find(a => a.id === id);
  if (!apt) return null;
  apt.status = status;
  return apt;
}

function addTeamMember({ name, role }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '—';
  const member = { id: nextId('team', 'STF-'), name, role: role || '', initials, nameAr: '', years: 0, credentials: [], photo: '' };
  team.push(member);
  return member;
}

function updateSettings(patch) {
  settings = Object.assign({}, settings, patch);
  return settings;
}

/* ------------------------------- Products ------------------------------- */
function slugify(s) {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}
function normCategory(c) {
  return c === 'Patient retail' ? 'Patient retail' : 'Chairside kit';
}
function cleanSpecs(specs) {
  if (!Array.isArray(specs)) return [];
  return specs
    .map(s => ({ label: String((s && s.label) || '').trim(), value: String((s && s.value) || '').trim() }))
    .filter(s => s.label)
    .slice(0, 40);
}
function normStock(v) {
  if (v === '' || v == null) return null;
  const n = Math.floor(Number(v));
  return isFinite(n) && n >= 0 ? n : null;
}
function normPrice(v) {
  const n = Number(v);
  return isFinite(n) && n >= 0 ? Math.round(n * 1000) / 1000 : null;
}

function normImage(v) {
  const s = String(v || '').trim();
  return /^(https?:\/\/|\/|data:image\/)/.test(s) ? s.slice(0, 600) : '';
}

function addProduct({ name, category, price, desc, sku, stock, specs, active, image }) {
  name = String(name || '').trim();
  const priceNum = normPrice(price);
  if (!name || priceNum == null) return null;
  let base = slugify(name) || 'product';
  let id = base, n = 2;
  while (products.some(p => p.id === id)) id = base + '-' + (n++);
  const p = {
    id, name, category: normCategory(category), price: priceNum,
    desc: String(desc || '').trim(), sku: String(sku || '').trim(),
    stock: normStock(stock), active: active === false ? false : true,
    image: normImage(image), specs: cleanSpecs(specs)
  };
  products.unshift(p);
  return p;
}

function updateProduct(id, patch) {
  const p = products.find(x => x.id === id);
  if (!p) return null;
  if (patch.name != null && String(patch.name).trim()) p.name = String(patch.name).trim();
  if (patch.category != null) p.category = normCategory(patch.category);
  if (patch.price != null) { const pr = normPrice(patch.price); if (pr != null) p.price = pr; }
  if (patch.desc != null) p.desc = String(patch.desc).trim();
  if (patch.sku != null) p.sku = String(patch.sku).trim();
  if (patch.stock !== undefined) p.stock = normStock(patch.stock);
  if (patch.active !== undefined) p.active = !!patch.active;
  if (patch.image !== undefined) p.image = normImage(patch.image);
  if (patch.specs !== undefined) p.specs = cleanSpecs(patch.specs);
  return p;
}

function deleteProduct(id) {
  const i = products.findIndex(x => x.id === id);
  if (i === -1) return null;
  products.splice(i, 1);
  return true;
}

function revenueTrend(days) {
  days = days || 7;
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i);
    buckets.push({ key: d.toDateString(), label: d.toLocaleDateString(undefined, { weekday: 'short' }), total: 0 });
  }
  invoices.filter(inv => inv.status === 'paid' && inv.paidAt).forEach(inv => {
    const key = new Date(inv.paidAt).toDateString();
    const b = buckets.find(x => x.key === key);
    if (b) b.total += inv.amount;
  });
  return buckets.map(b => ({ label: b.label, total: b.total }));
}

function summary() {
  const revenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.filter(i => i.status === 'overdue').length;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const activeCases = cases.filter(c => c.stage !== 'ready').length;
  const readyCases = cases.filter(c => c.stage === 'ready').length;
  const shopRevenue = orders.reduce((s, o) => s + o.total, 0);
  const newAppointments = appointments.filter(a => a.status === 'new').length;
  const newEnquiries = enquiries.filter(e => e.stage === 'new').length;
  return {
    revenue, outstanding, overdue, totalExpenses,
    net: Math.round((revenue + shopRevenue - totalExpenses) * 100) / 100,
    activeCases, readyCases, shopRevenue,
    openApplications: applications.length, newMessages: messages.length,
    newAppointments, totalAppointments: appointments.length,
    newEnquiries, totalEnquiries: enquiries.length,
    trend: revenueTrend(7)
  };
}

module.exports = {
  STAGES, SERVICE_FEES, ENQUIRY_STAGES,
  cases, invoices, expenses, products, jobs, applications, messages, orders, team, appointments, enquiries,
  get settings() { return settings; },
  createCase, actOnCase, payInvoice, addExpense, checkout, addApplication, addMessage, summary,
  addAppointment, setAppointmentStatus, addTeamMember, updateSettings, setEnquiryStage,
  addProduct, updateProduct, deleteProduct
};
