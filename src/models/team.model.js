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

function addTeamMember({ name, role }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '—';
  const member = { id: nextId('team', 'STF-'), name, role: role || '', initials, nameAr: '', years: 0, credentials: [], photo: '' };
  team.push(member);
  return member;
}

module.exports = { team, addTeamMember };
