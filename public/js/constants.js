// Static reference data shared across pages — service catalog, lab stages,
// dropdown option lists, admin tab config. Nothing here reads or writes
// state; it's just the vocabulary the rest of the app renders from.

export const STAGES = [
  { key: 'reception', label: 'Reception' },
  { key: 'qc', label: 'Quality Control' },
  { key: 'designer', label: 'Design' },
  { key: 'doctor_approval', label: 'Doctor Approval' },
  { key: 'cadcam', label: 'CAD-CAM / Milling' },
  { key: 'layering', label: 'Layering & Finishing' },
  { key: 'qc_photo', label: 'QC & Photography' },
  { key: 'ready', label: 'Ready for Pickup' }
];
export const STAGE_INDEX = {};
STAGES.forEach((s, i) => { STAGE_INDEX[s.key] = i; });

export const SERVICES = [
  { key: 'veneers', label: 'Veneers', fee: 480, desc: 'Layered ceramic veneers, custom shade and surface texture.', icon: 'M4 21 12 3l8 18Z' },
  { key: 'crowns', label: 'Crowns', fee: 90, desc: 'Zirconia or E-max crowns milled to precise margins.', icon: 'M4 10a8 8 0 0 1 16 0v4a8 8 0 0 1-16 0Z' },
  { key: 'bridges', label: 'Bridges', fee: 320, desc: 'Multi-unit fixed bridges with matched shade and contacts.', icon: 'M3 17h18M6 17V9l3-3h6l3 3v8' },
  { key: 'implants', label: 'Implants', fee: 200, desc: 'Implant-supported restorations, your system and abutment.', icon: 'M12 3v10m0 0-3 8h6l-3-8Z' },
  { key: 'surgical_guide', label: 'Surgical Guide', fee: 150, desc: 'Pilot or fully-guided surgical guides from your scan.', icon: 'M4 4h16v16H4Zm4 4h8v8H8Z' },
  { key: 'dsd', label: 'Digital Smile Design', fee: 60, desc: 'Full smile mockups and design previews before any prep.', icon: 'M4 13c2-5 14-5 16 0M9 17h6' },
  { key: 'aligners', label: 'Clear Aligners', fee: 220, desc: 'Invisible aligner treatment planned and reviewed by our orthodontist.', icon: 'M5 9a7 7 0 0 1 14 0v3a7 7 0 0 1-14 0Zm0 3h14' }
];
export const SVC = {};
SERVICES.forEach(s => { SVC[s.key] = s; });

export const PROTOCOL = [
  { key: 'photos', label: 'Clinical Photos' },
  { key: 'scan', label: 'Digital Scan / Impression' },
  { key: 'retraction', label: 'Retraction Cord Photo' },
  { key: 'margins', label: 'Clear Margins (near gums)' },
  { key: 'contacts', label: 'Clear Contacts' }
];

export const GUIDES = [
  { t: 'Veneer Guide', d: 'Prep depth, shade capture and photo angles for veneer cases.' },
  { t: 'Implant Guide', d: 'Component checklist and scan-body handling for implant cases.' },
  { t: 'Scan Guide', d: 'Getting a clean digital impression on the first try.' },
  { t: 'Photo Guide', d: 'The five reference shots our QC desk checks on arrival.' }
];

export const LAYERING_STYLES = ['Natural cutback', 'Full contour', 'Micro-layered incisal'];
export const GLAZE_TYPES = ['High glaze', 'Matte glaze', 'Characterized/stained'];
export const SURFACE_TEXTURES = ['Natural texture', 'Smooth polish', 'Youthful (high texture)'];
export const SHADES = ['A1', 'A2', 'A3', 'A3.5', 'B1', 'B2', 'C2', 'D3'];
export const RESTORATION_TYPES = ['Layered E.max', 'Monolithic E.max', 'Pressed E.max', 'Layered zirconia', 'Monolithic zirconia', 'PFM', 'Full-cast gold'];
export const FABRICATION = ['Milled', 'Pressed'];
export const INCISAL_DESIGNS = ['Natural cutback', 'Full contour', 'Micro-layered incisal', 'Mamelon detail', 'Incisal halo'];
export const RESTORATION_SERVICES = { veneers: 1, crowns: 1, bridges: 1, implants: 1 };

export const TOOTH_PATH = 'M12 21c-1.6-3-2-6.4-2-9.2C10 8.5 8.7 6 6.5 6 4 6 3 8.3 3 10.5c0 5 2.6 9 4.6 10.3.7.5 1.6-.1 1.8-1l.6-3c.2-1 1.8-1 2 0l.6 3c.2.9 1.1 1.5 1.8 1 2-1.3 4.6-5.3 4.6-10.3C21 8.3 20 6 17.5 6 15.3 6 14 8.5 14 11.8c0 2.8-.4 6.2-2 9.2Z';

export const ADMIN_TABS = [
  ['overview', 'Overview'], ['enquiries', 'Enquiries'], ['appointments', 'Appointments'], ['invoices', 'Invoices'], ['expenses', 'Expenses'],
  ['products', 'Products'], ['orders', 'Shop Orders'], ['team', 'Team'], ['applications', 'Careers'], ['messages', 'Messages'], ['settings', 'Settings'],
  ['accounts', 'Accounts & Access'], ['activity', 'Activity Log'], ['export', 'Export Data']
];

export const ENQUIRY_STAGES = [
  { key: 'new', label: 'New' }, { key: 'contacted', label: 'Contacted' },
  { key: 'booked', label: 'Consultation booked' }, { key: 'closed', label: 'Closed' }
];

export const ENQUIRY_CHANNELS = ['Instagram DM', 'WhatsApp', 'Website form', 'Phone call', 'Walk-in'];

export const PRODUCT_CATEGORIES = ['Chairside kit', 'Patient retail'];
