// The clinic-approved prescription catalogue — one definition, used by
// everyone.
//
// The four job-order sheets add roughly thirty clinical properties. Two
// ways to store that were wrong: thirty nullable columns on job_orders,
// or (what the code did before) flattening everything into the human
// `instructions` string, which makes a designer parse prose to find out
// whether a crown wants a deep fissure. Both lose the ability to render,
// validate or ever query the data.
//
// So: one JSONB column, with this file as the schema. Every option a
// dentist can choose is listed here, the server validates against it on
// submit, and the browser fetches the same catalogue to build the form
// (see GET /api/prescription-schema). There is no second copy to drift.
//
// Nothing here invents clinical meaning. Every option comes from the
// clinic sheets; where a sheet offers exactly one choice, exactly one
// choice appears.

// Shade is shared by every restorative treatment, so it is defined once.
const CLASSIC_SHADES = ['A1', 'A2', 'A3', 'A3.5', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4', 'D2', 'D3', 'D4'];
const ND_SHADES = ['ND1', 'ND2', 'ND3', 'ND4', 'ND5'];
const SHADES = [...CLASSIC_SHADES, ...ND_SHADES, 'Other'];

const MATERIALS_RESTORATIVE = [
  { value: 'emax', label: 'e.max', hint: 'Lithium disilicate' },
  { value: 'zirconia', label: 'Zirconia', hint: 'High strength' },
  { value: 'other', label: 'Other', hint: 'Custom specification' }
];

const FINISHING = [
  { value: 'glazing', label: 'Glazing' },
  { value: 'mechanical_polish', label: 'Mechanical polish' }
];
const SHADE_GRADIENT = [
  { value: 'one_shade', label: 'One shade' },
  { value: 'gradual_shade', label: 'Gradual shade' }
];
const PONTIC = [
  { value: 'ridge_lap', label: 'Ridge lap' },
  { value: 'modified_ridge_lap', label: 'Modified ridge lap' },
  { value: 'hygienic', label: 'Hygienic (sanitary)' },
  { value: 'ovate', label: 'Ovate' },
  { value: 'full_contour', label: 'Full contour' }
];
const EMERGENCE = [
  { value: 'natural', label: 'Natural', hint: 'Standard' },
  { value: 'concave', label: 'Concave', hint: 'Deep' },
  { value: 'convex', label: 'Convex', hint: 'High' }
];

// The ten smile designs from the veneer sheet. Names and identifiers are
// the clinic's; the preview artwork is a schematic drawn in SVG by the
// browser, because the sheet's photographs are not in the repository and
// inventing smile photography would be worse than a clean diagram.
const SMILE_DESIGNS = [
  { value: 'F1', label: 'Natural Essential', category: 'female' },
  { value: 'F2', label: 'Soft Elegance', category: 'female' },
  { value: 'F3', label: 'Balanced Harmony', category: 'female' },
  { value: 'F4', label: 'Refined Contour', category: 'female' },
  { value: 'F5', label: 'Glamorous Signature', category: 'female' },
  { value: 'M1', label: 'Natural Essential', category: 'male' },
  { value: 'M2', label: 'Soft Elegance', category: 'male' },
  { value: 'M3', label: 'Balanced Harmony', category: 'male' },
  { value: 'M4', label: 'Refined Contour', category: 'male' },
  { value: 'M5', label: 'Glamorous Signature', category: 'male' }
];

// A field is one prescription property. `when` makes it conditional on
// another answer, which is what keeps a dentist from facing every control
// for every case: pontic type only exists for a bridge, gingiva shade
// only where pink ceramic is involved.
const f = (key, label, type, extra = {}) => Object.assign({ key, label, type }, extra);

// The permanent dentition in FDI notation. A prescription records which
// units it covers so the lab reads them as data rather than parsing them
// back out of the instructions prose.
const FDI_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const TREATMENTS = {
  veneer: {
    label: 'Veneers', restoration: 'Veneer', mark: 'V', selection: 'teeth',
    jobType: { value: 'veneers' },
    required: ['material', 'shade'],
    sections: [
      { title: 'Material & layering', fields: [
        f('material', 'Veneer material', 'choice', { options: MATERIALS_RESTORATIVE, other: 'materialOther' }),
        f('layering', 'Layering technique', 'choice', { options: [
          { value: 'standard', label: 'Standard', hint: 'S — natural translucency for everyday aesthetics' },
          { value: 'mid_lucent', label: 'Mid Lucent', hint: 'SS — enhanced depth and lifelike character' },
          { value: 'ultra_glow', label: 'Ultra Glow', hint: 'SSS — maximum translucency and natural fluorescence' }
        ], art: 'layering' })
      ] },
      { title: 'Shade', fields: [
        f('shade', 'Initial shade reference', 'shade', { other: 'shadeOther' }),
        f('shadeGradient', 'Shade gradient', 'choice', { options: SHADE_GRADIENT, art: 'gradient' })
      ] },
      { title: 'Smile design', fields: [
        f('smileDesign', 'Smile design', 'smile', { options: SMILE_DESIGNS })
      ] },
      { title: 'Surface & tissue', fields: [
        f('surfaceTexture', 'Surface texture', 'choice', { options: [
          { value: 'smooth', label: 'Smooth', hint: 'High polish, glossy surface' },
          { value: 'natural', label: 'Natural', hint: 'Natural texture and light reflection' },
          { value: 'pro', label: 'Pro', hint: 'Enhanced texture for lifelike results' }
        ], art: 'texture' }),
        // The veneer sheet offers exactly one gingiva option. It is kept
        // as a single explicit choice rather than padded out with
        // alternatives the clinic has not approved.
        f('gingivaContour', 'Gingiva contour', 'choice', { options: [
          { value: 'maintain_existing', label: 'Maintain existing', hint: 'No alteration' }
        ], art: 'gingiva' })
      ] }
    ]
  },

  crown: {
    label: 'Crowns & fixed restorations', restoration: 'Crown', mark: 'C', selection: 'teeth',
    jobType: { value: 'crowns' },
    required: ['restorationSubtype', 'material', 'shade'],
    sections: [
      { title: 'Restoration type', fields: [
        f('restorationSubtype', 'Type of restoration', 'choice', { options: [
          { value: 'full_crown', label: 'Full crown' },
          { value: 'veneer_crown_360', label: 'Veneer-style crown', hint: '360°' },
          { value: 'inlay', label: 'Inlay' },
          { value: 'onlay', label: 'Onlay' },
          { value: 'overlay', label: 'Overlay' }
        ], art: 'restoration' })
      ] },
      { title: 'Material & shade', fields: [
        f('material', 'Material', 'choice', { options: MATERIALS_RESTORATIVE, other: 'materialOther' }),
        f('shade', 'Shade', 'shade', { other: 'shadeOther' })
      ] },
      { title: 'Technical details', fields: [
        // Occlusal *design* — the shape cut into the occlusal surface.
        // Deliberately not the same property as contact instructions.
        f('occlusalDesign', 'Occlusal design', 'choice', { options: [
          { value: 'standard', label: 'Standard' },
          { value: 'deep_fissure', label: 'Deep fissure' },
          { value: 'flat_table', label: 'Flat table' },
          { value: 'cuspal_reduction', label: 'Cuspal reduction' }
        ], art: 'occlusal', hint: 'For posterior units' }),
        f('contacts', 'Contacts', 'choice', { options: [
          { value: 'normal', label: 'Normal' }, { value: 'tight', label: 'Tight' },
          { value: 'open', label: 'Open' }, { value: 'specify', label: 'Specify' }
        ], other: 'contactsOther', art: 'contacts' }),
        f('finishing', 'Teeth finishing', 'choice', { options: FINISHING, art: 'finishing' }),
        f('emergenceProfile', 'Emergence profile', 'choice', {
          options: [...EMERGENCE, { value: 'custom', label: 'Custom', hint: 'Specify' }],
          other: 'emergenceProfileOther', art: 'emergence' })
      ] }
    ]
  },

  bridge: {
    label: 'Bridges', restoration: 'Bridge', mark: 'B', selection: 'teeth',
    jobType: { value: 'bridges' },
    required: ['material', 'shade', 'ponticType'],
    sections: [
      { title: 'Material & shade', fields: [
        f('material', 'Material', 'choice', { options: MATERIALS_RESTORATIVE, other: 'materialOther' }),
        f('shade', 'Shade', 'shade', { other: 'shadeOther' })
      ] },
      { title: 'Pontic & technical details', fields: [
        f('ponticType', 'Pontic type', 'choice', { options: PONTIC, art: 'pontic' }),
        f('occlusalDesign', 'Occlusal design', 'choice', { options: [
          { value: 'standard', label: 'Standard' }, { value: 'deep_fissure', label: 'Deep fissure' },
          { value: 'flat_table', label: 'Flat table' }, { value: 'cuspal_reduction', label: 'Cuspal reduction' }
        ], art: 'occlusal' }),
        f('contacts', 'Contacts', 'choice', { options: [
          { value: 'normal', label: 'Normal' }, { value: 'tight', label: 'Tight' },
          { value: 'open', label: 'Open' }, { value: 'specify', label: 'Specify' }
        ], other: 'contactsOther', art: 'contacts' }),
        f('finishing', 'Teeth finishing', 'choice', { options: FINISHING, art: 'finishing' }),
        f('emergenceProfile', 'Emergence profile', 'choice', {
          options: [...EMERGENCE, { value: 'custom', label: 'Custom', hint: 'Specify' }],
          other: 'emergenceProfileOther', art: 'emergence' })
      ] }
    ]
  },

  implant: {
    label: 'Implant restorations', restoration: 'Implant restoration', mark: 'I', selection: 'teeth',
    // Restoration type drives the job type, so "Full arch" is not
    // quietly filed as a bridge.
    jobType: { field: 'restorationType', value: 'implant_crown', map: {
      single_crown: 'implant_crown', bridge: 'implant_bridge', full_arch: 'implant_full_arch' } },
    required: ['fpClassification', 'restorationType', 'material'],
    sections: [
      // The sheet's "implant type / platform" is job_orders.implant_system,
      // a column the lab has always had and searches on. It keeps its own
      // input on the form rather than gaining a second, unindexed copy in
      // here.
      { title: 'Fixed prosthesis type', fields: [
        f('fpClassification', 'Clinical situation (FP)', 'choice', { options: [
          { value: 'fp1', label: 'FP1', hint: 'Teeth only' },
          { value: 'fp2', label: 'FP2', hint: 'Teeth with some gum coverage' },
          { value: 'fp3', label: 'FP3', hint: 'Teeth and lost gum tissue' }
        ], art: 'fp' })
      ] },
      { title: 'Restoration & abutment', fields: [
        f('restorationType', 'Restoration type', 'choice', { options: [
          { value: 'single_crown', label: 'Single crown' },
          { value: 'bridge', label: 'Bridge', hint: '2+ units' },
          { value: 'full_arch', label: 'Full arch', hint: 'Multiple units' }
        ], art: 'implantRestoration' }),
        f('abutmentType', 'Abutment type', 'choice', { options: [
          { value: 'customized', label: 'Customized abutment' },
          { value: 'screw_retained', label: 'Screw retained abutment' },
          { value: 'ti_base', label: 'Ti-Base', hint: 'Screw channel' }
        ], art: 'abutment' }),
        // Retention is a separate decision from abutment type — a
        // customised abutment can be cemented or screwed.
        f('retention', 'Cementation type', 'choice', { options: [
          { value: 'screw_retained', label: 'Screw retained' },
          { value: 'cement_retained', label: 'Cement retained' }
        ], art: 'retention' })
      ] },
      { title: 'Material & shade', fields: [
        f('material', 'Crown material', 'choice', { options: [
          { value: 'zirconia', label: 'Zirconia', hint: 'High strength' },
          { value: 'emax', label: 'e.max', hint: 'Esthetic' },
          { value: 'other', label: 'Other', hint: 'Custom specification' }
        ], other: 'materialOther' }),
        f('shade', 'Shade', 'shade', { other: 'shadeOther' }),
        f('finishing', 'Teeth finishing', 'choice', { options: FINISHING, art: 'finishing' }),
        f('shadeGradient', 'Shade gradient', 'choice', { options: SHADE_GRADIENT, art: 'gradient' })
      ] },
      { title: 'Gingiva & emergence', fields: [
        f('emergenceProfile', 'Emergence profile', 'choice', { options: EMERGENCE, art: 'emergence' }),
        // Pink ceramic is only prescribed where gum tissue is being
        // replaced, so the shade question follows FP2/FP3.
        f('gingivaShade', 'Gingiva shade', 'choice', {
          options: [
            { value: 'light_pink', label: 'Light pink' }, { value: 'pink', label: 'Pink' },
            { value: 'dark_pink', label: 'Dark pink' }, { value: 'reddish', label: 'Reddish' }
          ], art: 'gingivaShade',
          when: { field: 'fpClassification', in: ['fp2', 'fp3'] },
          hint: 'For pink tissue, where applicable' }),
        f('ponticType', 'Pontic type', 'choice', {
          options: PONTIC, art: 'pontic',
          when: { field: 'restorationType', in: ['bridge', 'full_arch'] } })
      ] }
    ]
  },

  ortho: {
    label: 'Orthodontic & appliances', restoration: 'Appliance', mark: 'O', selection: 'arch',
    jobType: { field: 'applianceType', value: 'ortho_work', map: {
      essix_retainer: 'essix_retainer', bleaching_tray: 'bleaching_tray', night_guard: 'night_guard' } },
    required: ['arch', 'applianceType', 'material'],
    sections: [
      { title: 'Arch & appliance', fields: [
        f('arch', 'Arch selection', 'choice', { options: [
          { value: 'upper', label: 'Upper arch' }, { value: 'lower', label: 'Lower arch' },
          { value: 'both', label: 'Both arches' }
        ], art: 'arch' }),
        f('applianceType', 'Appliance type', 'choice', { options: [
          { value: 'essix_retainer', label: 'Essix retainer' },
          { value: 'bleaching_tray', label: 'Bleaching tray' },
          { value: 'night_guard', label: 'Soft night guard' }
        ], art: 'appliance' })
      ] },
      { title: 'Material & design', fields: [
        f('material', 'Material', 'choice', { options: [
          { value: 'clear', label: 'Clear', hint: 'Standard' },
          { value: 'hard', label: 'Hard', hint: 'For bleaching tray' },
          { value: 'soft', label: 'Soft', hint: 'For night guard' }
        ] }),
        // The sheet shows trim line under Design Preference and repeats
        // two of the same values under Additional Options. Modelled once,
        // here, so a dentist cannot set two contradictory answers.
        f('trimLine', 'Trim line', 'choice', { options: [
          { value: 'standard', label: 'Standard trim line', hint: 'Full arch' },
          { value: 'scalloped', label: 'Scalloped trim line' },
          { value: 'extended', label: 'Extended coverage' }
        ], art: 'trim' }),
        f('additionalOptions', 'Additional options', 'multi', { options: [
          { value: 'cutouts', label: 'Cutouts / reliefs' }
        ], other: 'additionalOptionsOther' })
      ] },
      { title: 'Temporization after implant surgery', fields: [
        f('temporaryTooth', 'Include temporary tooth', 'toggle'),
        f('temporaryToothCount', 'How many', 'choice', {
          options: [{ value: 'single', label: 'Single tooth' }, { value: 'multiple', label: 'Multiple teeth' }],
          when: { field: 'temporaryTooth', in: [true] } }),
        f('temporaryToothNumbers', 'Tooth number(s)', 'text', {
          placeholder: 'e.g. 11, 21, 36', when: { field: 'temporaryTooth', in: [true] } }),
        f('temporaryToothShade', 'Temporary shade', 'shade', { when: { field: 'temporaryTooth', in: [true] } })
      ] },
      { title: 'Model & shipping', fields: [
        f('modelRequirement', 'Model requirements', 'choice', { options: [
          { value: 'digital_stl', label: 'Digital scan provided', hint: 'STL' },
          { value: 'physical_model', label: 'Physical model enclosed' },
          { value: 'to_be_advised', label: 'Neither', hint: 'To be advised' }
        ] }),
        f('shippingInstructions', 'Shipping instructions', 'text', { optional: true, placeholder: 'Optional' })
      ] }
    ]
  }
};

// Every field, flattened — the form renders by section, validation walks
// the flat list.
function fieldsOf(treatment) {
  return (TREATMENTS[treatment] ? TREATMENTS[treatment].sections : []).flatMap(s => s.fields);
}

/** Is this conditional field currently in play, given the answers so far? */
function isActive(field, values) {
  if (!field.when) return true;
  return field.when.in.includes(values[field.when.field]);
}

/**
 * Validate and normalise a submitted prescription.
 *
 * Returns only values this treatment actually defines, so a client cannot
 * store arbitrary keys in the JSONB column, and only values the clinic
 * approved, so it cannot store an invented option either. Conditional
 * fields that are not in play are dropped rather than kept as orphans —
 * switching a bridge back to a single crown must not leave a pontic type
 * behind for a technician to act on.
 */
function normalise(treatment, input) {
  const definition = TREATMENTS[treatment];
  if (!definition) throw Object.assign(new Error('Unknown treatment.'), { status: 400, expose: true });
  const raw = input && typeof input === 'object' ? input : {};
  const out = { treatment };
  const text = v => String(v == null ? '' : v).slice(0, 500).trim();

  for (const field of fieldsOf(treatment)) {
    if (!isActive(field, raw)) continue;
    const value = raw[field.key];
    if (value === undefined || value === null || value === '') continue;

    if (field.type === 'choice') {
      if (!field.options.some(o => o.value === value)) {
        throw Object.assign(new Error('Unknown option for ' + field.label + '.'), { status: 400, expose: true });
      }
      out[field.key] = value;
    } else if (field.type === 'shade') {
      if (!SHADES.includes(value)) throw Object.assign(new Error('Unknown shade.'), { status: 400, expose: true });
      out[field.key] = value;
    } else if (field.type === 'multi') {
      const list = (Array.isArray(value) ? value : []).filter(v => field.options.some(o => o.value === v));
      if (list.length) out[field.key] = list;
    } else if (field.type === 'toggle') {
      if (value === true) out[field.key] = true;
    } else {
      const t = text(value);
      if (t) out[field.key] = t;
    }
    // A free-text companion only survives when its parent asked for one.
    if (field.other && ['other', 'custom', 'specify', 'Other'].includes(out[field.key])) {
      const t = text(raw[field.other]);
      if (t) out[field.other] = t;
    }
  }
  const teeth = [...new Set((Array.isArray(raw.teeth) ? raw.teeth : []).map(Number).filter(n => FDI_TEETH.includes(n)))];
  if (teeth.length) out.teeth = teeth.sort((a, b) => a - b);
  // Clinical instructions get their own, longer cap — text() above is for
  // one-line "specify" companions, not the free-form notes box.
  const notes = String(raw.notes == null ? '' : raw.notes).trim().slice(0, 3000);
  if (notes) out.notes = notes;
  return out;
}

/** Which required fields are still missing — used for status, not to block. */
function missingRequired(treatment, values) {
  const definition = TREATMENTS[treatment];
  if (!definition) return [];
  return definition.required.filter(key => {
    const field = fieldsOf(treatment).find(f2 => f2.key === key);
    return (field ? isActive(field, values) : true) && !values[key];
  });
}

// The job type a prescription resolves to. Expressed as data, not a
// function, for one reason: the browser fetches this catalogue as JSON,
// and a function would not survive the trip — the client would need its
// own copy of the rule, which is exactly the duplication this file
// exists to prevent.
function jobTypeFor(treatment, values) {
  const rule = TREATMENTS[treatment] && TREATMENTS[treatment].jobType;
  if (!rule) return null;
  if (!rule.field) return rule.value;
  return rule.map[(values || {})[rule.field]] || rule.value;
}

/** The catalogue the browser builds its form from. */
function catalogue() {
  return { shades: SHADES, classicShades: CLASSIC_SHADES, ndShades: ND_SHADES, treatments: TREATMENTS };
}

module.exports = { TREATMENTS, SHADES, FDI_TEETH, CLASSIC_SHADES, ND_SHADES, fieldsOf, isActive, normalise, missingRequired, jobTypeFor, catalogue };
