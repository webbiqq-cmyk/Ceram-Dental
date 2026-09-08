const records = require('../db/records');
const { nextId } = require('../utils/ids');

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

// The client sends a canvas-downscaled avatar (~400px, JPEG), so it stays
// small enough to ride along in /api/state without bloating it.
const MAX_PHOTO = 92160; // ~90KB, under the 100kb JSON body ceiling
const str = (v, n) => String(v == null ? '' : v).slice(0, n).trim();
const years = v => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 && n <= 70 ? n : 0; };
const initialsFrom = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '—';
function creds(v) { return Array.isArray(v) ? v.map(c => str(c, 220)).filter(Boolean).slice(0, 16) : null; }
// Returns '' (clear), the string (ok), or undefined (rejected — bad shape/size).
function photo(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return '';
  if (s.length > MAX_PHOTO) return undefined;
  return (/^https?:\/\//i.test(s) || /^\/images\//.test(s) || /^data:image\/(png|jpe?g|webp);base64,/i.test(s)) ? s : undefined;
}

async function addTeamMember(fields = {}) {
  const name = str(fields.name, 120);
  if (!name) return null;
  const p = photo(fields.photo);
  const member = {
    id: nextId('team', 'STF-'), name,
    role: str(fields.role, 120), nameAr: str(fields.nameAr, 120), years: years(fields.years),
    initials: str(fields.initials, 3).toUpperCase() || initialsFrom(name),
    credentials: creds(fields.credentials) || [], photo: p === undefined ? '' : p
  };
  await records.insert('team', member);
  return member;
}

async function updateTeamMember(id, fields = {}) {
  return records.update('team', id, m => {
    if ('name' in fields) { const n = str(fields.name, 120); if (n) m.name = n; }
    if ('role' in fields) m.role = str(fields.role, 120);
    if ('nameAr' in fields) m.nameAr = str(fields.nameAr, 120);
    if ('years' in fields) m.years = years(fields.years);
    if ('initials' in fields) m.initials = str(fields.initials, 3).toUpperCase() || initialsFrom(m.name);
    if ('credentials' in fields) { const c = creds(fields.credentials); if (c) m.credentials = c; }
    if ('photo' in fields) { const p = photo(fields.photo); if (p === undefined) return null; m.photo = p; }
  });
}

async function removeTeamMember(id) { return records.remove('team', id); }

records.register('team', team);
async function list(options) { return records.list('team', options); }
module.exports = { list, team, addTeamMember, updateTeamMember, removeTeamMember };
