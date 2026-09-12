import { DATA } from '../state.js';
import { doctorCard } from '../components/doctor.js';
import { footer } from '../components/footer.js';
import { editorialImage } from '../components/editorialImage.js';

const MOCK_TEAM = [
  { id:'mock-ahmed', name:'Dr. Ahmed Yousri', nameAr:'د. احمد يسري', role:'Oral Surgery & Implantology', years:22, initials:'AY', photo:'/images/team/ahmed-yousri.jpg', credentials:['MD, Oral Surgery & Dental Implants','BSc, Oral & Dental Surgery','Member, International Congress of Oral Implantologists'] },
  { id:'mock-abdulaziz', name:'Dr. Abdulaziz Adel', nameAr:'د. عبدالعزيز عادل', role:'Implant & Cosmetic Dentistry', years:12, initials:'AA', photo:'/images/team/abdulaziz-adel.jpg', credentials:['MGDS RCSEd Fellowship','Diploma in Implant Dentistry','Advanced Laser Dentistry Certificate'] },
  { id:'mock-madhavi', name:'Dr. Madhavi Alamanda', nameAr:'د. مادفي ألاماندا', role:'Specialist Periodontist', years:18, initials:'MA', photo:'/images/team/madhavi-alamanda.jpg', credentials:['BDS, MDS — Periodontology','Gum health and gummy-smile correction','Advanced periodontal surgery'] },
  { id:'mock-chandrime', name:'Dr. Chandrime A. Sreekumar', nameAr:'د. تشاندريم أ. سريكومار', role:'Specialist Orthodontist', years:10, initials:'CS', photo:'/images/team/chandrime-sreekumar.jpg', credentials:['MDS — Orthodontics','Clear aligners and fixed braces','Adult and interceptive orthodontics'] }
];

export function renderAbout() {
  const team = DATA.team.length ? DATA.team : MOCK_TEAM;
  return '<div class="page page-flush editorial-page about-page">' +
    '<header class="editorial-hero about-hero">' + editorialImage('about-hero', { hero: true }) +
    '<div class="u editorial-hero-copy"><span class="eyebrow">The people behind your care</span><h1 class="serif">Ceram Dental</h1><p>Specialist minds. Thoughtful hands.<br>One shared standard of care.</p><a class="btn btn-white" href="#/contact">Meet us in person &rarr;</a></div></header>' +
    '<div class="u"><section class="about-manifesto reveal">' +
      '<header class="am-lead"><span class="eyebrow">Our philosophy</span><h2 class="serif">Precision with a personal touch.</h2>' +
        '<p>A dental clinic and ceramics studio under one roof. Ceram brings consultation, digital planning and careful finishing together in New Zinj, so every decision stays connected to the person in the chair.</p></header>' +
      '<div class="am-grid">' +
        '<div class="am-block"><span class="eyebrow">About the clinic</span><h3 class="serif">A calmer way to care for your smile.</h3>' +
          '<p>Our rooms are designed for unhurried conversations, clear explanations and precise work. From preventive visits and children\'s dentistry to implants, orthodontics and cosmetic restorations, the team builds a plan around your health, goals and timing.</p></div>' +
        // Reserved space — add more about the clinic here (history, the building, accreditations, community work).
        '<div class="am-block am-placeholder"><span class="eyebrow">More about Ceram</span>' +
          '<p>Room to add the clinic\'s story, the space itself, accreditations and the people behind the practice.</p></div>' +
      '</div>' +
      '<div class="clinic-facts"><span><b>01</b>Doctor-led planning</span><span><b>02</b>In-house ceramic studio</span><span><b>03</b>Digital scans and records</span></div>' +
    '</section>' +
    '<section class="team-section"><div class="team-heading"><div><span class="eyebrow">Meet the clinicians</span><h2 class="serif">Different specialties, a shared commitment.</h2></div><div><p>' + team.length + ' doctors and specialists across surgery, cosmetic care, orthodontics, periodontics and restorative dentistry.</p></div></div>' +
    '<div class="doctor-grid">' + team.map((d, i) => doctorCard(d, i)).join('') + '</div>' +
    '</section>' +
    '<section class="about-craft"><figure>' + editorialImage('about-craft') + '</figure><div><span class="eyebrow">The in-house studio</span><h2 class="serif">Where science<br>meets a careful hand.</h2><p>From digital design to ceramic finishing, the lab is part of the conversation. Shape, shade and fit are considered alongside the clinical plan.</p><a class="text-link" href="#/services">Explore our approach &rarr;</a><div class="craft-values"><span>Digital planning</span><span>Careful finishing</span><span>Clinical review</span></div></div></section>' +
    '<section class="editorial-booking about-close"><span class="eyebrow">Get to know us</span><h2 class="serif">Your first visit is the beginning.</h2>' +
      '<p>Come in for a conversation and a proper look. You\'ll leave with a clear picture of what your smile needs and how we\'d approach it &mdash; no pressure either way.</p>' +
      '<div class="about-close-actions"><a class="btn btn-primary" href="#/contact">Arrange a consultation &rarr;</a><a class="text-link" href="#/services">Explore treatments &rarr;</a></div>' +
    '</section></div></div>' + footer();
}

// No page-specific wiring needed now that the doctor search is removed;
// kept as a no-op export so handlers.js's per-route dispatch stays simple.
export function attachAboutHandlers() {}
