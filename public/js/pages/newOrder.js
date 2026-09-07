// Doctor-facing job order intake — the real Phase 3 form, wired to the
// actual workflow backend (src/routes/orders.routes.js), replacing the
// mock data every one of the four new lab dashboards previously read
// from utils/workflow.js. Grouped sections instead of one long list,
// per the design brief; implant fields only appear for the two implant
// job types instead of being shown (and required) for everything.
import { UI } from '../state.js';
import { esc } from '../utils/format.js';
import { JOB_TYPES, jobTypeLabel } from '../utils/workflow.js';
import { createOrder } from '../utils/ordersApi.js';
import { uploadZoneHtml, attachUploadZone } from '../components/caseUpload.js';
import { toast } from '../toast.js';
import { renderCurrent } from '../router.js';
import { footer } from '../components/footer.js';

const IMPLANT_TYPES = ['implant_crown', 'implant_bridge'];

function freshForm() {
  return {
    patientRef: '', jobType: '', shade: '', instructions: '',
    scanBody: '', implantSystem: '', abutmentSize: '', abutmentAvailability: '',
    deliveryMethod: 'pickup', createdOrder: null
  };
}

function section(n, title, body) {
  return '<div class="form-section"><div class="form-section-head"><span class="n">' + n + '</span><h4>' + esc(title) + '</h4></div>' + body + '</div>';
}

export function renderNewOrder() {
  if (!UI.newOrderForm) UI.newOrderForm = freshForm();
  const f = UI.newOrderForm;

  if (f.createdOrder) {
    const o = f.createdOrder;
    return '<div class="page"><div class="u">' +
      '<div class="page-head reveal"><span class="eyebrow-accent">Dentist portal</span><h1 style="font-size:1.9rem;">Job order sent to reception.</h1></div>' +
      '<div class="wizard reveal"><div class="wiz-body">' +
        '<div class="confirm"><div class="check-mark">✓</div><h3>' + esc(o.order_number) + '</h3>' +
          '<p style="color:var(--ink-soft); max-width:44ch; margin:0 auto 26px;">' + esc(jobTypeLabel(o.job_type)) + ' for ' + esc(o.patient_ref) + '. Reception will review it shortly.</p>' +
        '</div>' +
        '<div class="form-section-head" style="margin-top:6px;"><h4>Attach scans / photos (optional)</h4></div>' +
        uploadZoneHtml('no-scan', 'Digital scan', 'STL, or a photo of the impression') +
        '<div style="height:10px;"></div>' + uploadZoneHtml('no-photo', 'Clinical photo', 'Intraoral or shade photo') +
      '</div><div class="wiz-foot"><button class="btn btn-ghost" id="newOrderAgain">Create another</button><a class="btn btn-primary" href="#/portal">Back to my cases →</a></div></div>' +
    '</div></div>' + footer();
  }

  const isImplant = IMPLANT_TYPES.includes(f.jobType);
  const jobTypeGrid = '<div class="svc-pick-grid" style="grid-template-columns:repeat(3,1fr);">' + JOB_TYPES.map(j =>
    '<button type="button" class="svc-pick' + (f.jobType === j.key ? ' selected' : '') + '" data-pick-jobtype="' + j.key + '"><div class="t">' + j.label + '</div></button>'
  ).join('') + '</div>';

  const body =
    section(1, 'Case details', '<div class="field-grid">' +
      '<div class="field full"><label>Patient reference</label><input id="no-patient" placeholder="e.g. Patient #4521" value="' + esc(f.patientRef) + '" required></div>' +
    '</div>') +
    section(2, 'Job type', jobTypeGrid) +
    section(3, 'Material / shade', '<div class="field-grid">' +
      '<div class="field full"><label>Shade</label><input id="no-shade" placeholder="e.g. A2" value="' + esc(f.shade) + '"></div>' +
    '</div>') +
    (isImplant ? section(4, 'Implant details', '<div class="field-grid">' +
      '<div class="field"><label>Scan body</label><input id="no-scanbody" value="' + esc(f.scanBody) + '" placeholder="e.g. Straumann BLX" required></div>' +
      '<div class="field"><label>Implant system</label><input id="no-implantsystem" value="' + esc(f.implantSystem) + '" placeholder="e.g. Straumann" required></div>' +
      '<div class="field"><label>Abutment size</label><input id="no-abutmentsize" value="' + esc(f.abutmentSize) + '" placeholder="e.g. RC, 3.5mm" required></div>' +
      '<div class="field"><label>Abutment availability</label><input id="no-abutmentavail" value="' + esc(f.abutmentAvailability) + '" placeholder="On hand / needs ordering"></div>' +
    '</div>') : '') +
    section(isImplant ? 5 : 4, 'Special instructions', '<div class="field-grid">' +
      '<div class="field full"><textarea id="no-instructions" placeholder="Anything the design team should know…">' + esc(f.instructions) + '</textarea></div>' +
    '</div>') +
    section(isImplant ? 6 : 5, 'Delivery / pickup preference', '<div class="svc-pick-grid" style="grid-template-columns:1fr 1fr;">' +
      '<button type="button" class="svc-pick' + (f.deliveryMethod === 'pickup' ? ' selected' : '') + '" data-pick-delivery="pickup"><div class="t">In-house pickup</div><div class="d">Collect from the clinic</div></button>' +
      '<button type="button" class="svc-pick' + (f.deliveryMethod === 'delivery' ? ' selected' : '') + '" data-pick-delivery="delivery"><div class="t">Delivery</div><div class="d">Sent to your clinic</div></button>' +
    '</div>');

  return '<div class="page"><div class="u">' +
    '<div class="page-head reveal" style="margin-bottom:26px;"><span class="eyebrow-accent">Dentist portal</span><h1 style="font-size:1.9rem;">Create a job order</h1>' +
      '<p class="lede">Fill in what the lab needs — grouped so nothing gets missed.</p></div>' +
    '<form class="wizard reveal" id="newOrderForm"><div class="wiz-body">' + body + '</div>' +
      '<div class="wiz-foot"><a class="btn btn-ghost" href="#/portal">Cancel</a><button class="btn btn-gold" type="submit">Submit job order</button></div>' +
    '</form>' +
  '</div></div>' + footer();
}

function readForm() {
  const f = UI.newOrderForm;
  f.patientRef = document.getElementById('no-patient').value;
  f.shade = document.getElementById('no-shade').value;
  f.instructions = document.getElementById('no-instructions').value;
  const scanBodyEl = document.getElementById('no-scanbody');
  if (scanBodyEl) {
    f.scanBody = scanBodyEl.value;
    f.implantSystem = document.getElementById('no-implantsystem').value;
    f.abutmentSize = document.getElementById('no-abutmentsize').value;
    f.abutmentAvailability = document.getElementById('no-abutmentavail').value;
  }
}

export function attachNewOrderHandlers() {
  const f = UI.newOrderForm;
  if (f.createdOrder) {
    attachUploadZone(document, 'no-scan', { role: 'dentist', orderId: f.createdOrder.id, stageType: f.createdOrder.stage_type, category: 'scan' });
    attachUploadZone(document, 'no-photo', { role: 'dentist', orderId: f.createdOrder.id, stageType: f.createdOrder.stage_type, category: 'photo' });
    const again = document.getElementById('newOrderAgain');
    if (again) again.addEventListener('click', () => { UI.newOrderForm = freshForm(); renderCurrent(); });
    return;
  }

  document.querySelectorAll('[data-pick-jobtype]').forEach(b => b.addEventListener('click', () => {
    readForm(); f.jobType = b.dataset.pickJobtype; renderCurrent();
  }));
  document.querySelectorAll('[data-pick-delivery]').forEach(b => b.addEventListener('click', () => {
    readForm(); f.deliveryMethod = b.dataset.pickDelivery; renderCurrent();
  }));

  const form = document.getElementById('newOrderForm');
  if (form) form.addEventListener('submit', async e => {
    e.preventDefault();
    readForm();
    if (!f.jobType) { toast('Choose a job type.'); return; }
    try {
      const res = await createOrder({
        patientRef: f.patientRef, jobType: f.jobType, shade: f.shade, instructions: f.instructions,
        scanBody: f.scanBody, implantSystem: f.implantSystem, abutmentSize: f.abutmentSize, abutmentAvailability: f.abutmentAvailability,
        deliveryMethod: f.deliveryMethod
      });
      f.createdOrder = res.order;
      toast(res.order.order_number + ' sent to reception.');
      renderCurrent();
    } catch (err) { toast(err.message); }
  });
}
