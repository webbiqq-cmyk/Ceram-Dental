import { DATA } from '../state.js';
import { doctorCard } from '../components/doctor.js';
import { footer } from '../components/footer.js';
import { editorialImage } from '../components/editorialImage.js';
import { effectiveLang } from '../i18n.js';

const MOCK_TEAM = [
  { id:'mock-ahmed', name:'Dr. Ahmed Yousri', nameAr:'د. احمد يسري', role:'Oral Surgery & Implantology', years:22, initials:'AY', photo:'/images/team/ahmed-yousri.jpg', credentials:['MD, Oral Surgery & Dental Implants','BSc, Oral & Dental Surgery','Member, International Congress of Oral Implantologists'] },
  { id:'mock-abdulaziz', name:'Dr. Abdulaziz Adel', nameAr:'د. عبدالعزيز عادل', role:'Implant & Cosmetic Dentistry', years:12, initials:'AA', photo:'/images/team/abdulaziz-adel.jpg', credentials:['MGDS RCSEd Fellowship','Diploma in Implant Dentistry','Advanced Laser Dentistry Certificate'] },
  { id:'mock-madhavi', name:'Dr. Madhavi Alamanda', nameAr:'د. مادفي ألاماندا', role:'Specialist Periodontist', years:18, initials:'MA', photo:'/images/team/madhavi-alamanda.jpg', credentials:['BDS, MDS — Periodontology','Gum health and gummy-smile correction','Advanced periodontal surgery'] },
  { id:'mock-chandrime', name:'Dr. Chandrime A. Sreekumar', nameAr:'د. تشاندريم أ. سريكومار', role:'Specialist Orthodontist', years:10, initials:'CS', photo:'/images/team/chandrime-sreekumar.jpg', credentials:['MDS — Orthodontics','Clear aligners and fixed braces','Adult and interceptive orthodontics'] }
];

const S = {
  en: {
    eyebrow: 'The people behind your care', title: 'Ceram Dental',
    tagline: 'Specialist minds. Thoughtful hands.<br>One shared standard of care.', meetUs: 'Meet us in person &rarr;',
    philosophyEyebrow: 'Our philosophy', philosophyTitle: 'Precision with a personal touch.',
    philosophyBody: 'A dental clinic and ceramics studio under one roof. Ceram brings consultation, digital planning and careful finishing together in New Zinj, so every decision stays connected to the person in the chair.',
    clinicEyebrow: 'About the clinic', clinicTitle: 'A calmer way to care for your smile.',
    clinicBody: 'Our rooms are designed for unhurried conversations, clear explanations and precise work. From preventive visits and children’s dentistry to implants, orthodontics and cosmetic restorations, the team builds a plan around your health, goals and timing.',
    moreEyebrow: 'More about Ceram', moreBody: 'Room to add the clinic’s story, the space itself, accreditations and the people behind the practice.',
    fact1: 'Doctor-led planning', fact2: 'In-house ceramic studio', fact3: 'Digital scans and records',
    teamEyebrow: 'Meet the clinicians', teamTitle: 'Different specialties, a shared commitment.',
    teamCount: n => n + ' doctors and specialists across surgery, cosmetic care, orthodontics, periodontics and restorative dentistry.',
    studioEyebrow: 'The in-house studio', studioTitle: 'Where science<br>meets a careful hand.',
    studioBody: 'From digital design to ceramic finishing, the lab is part of the conversation. Shape, shade and fit are considered alongside the clinical plan.',
    exploreApproach: 'Explore our approach &rarr;', v1: 'Digital planning', v2: 'Careful finishing', v3: 'Clinical review',
    closeEyebrow: 'Get to know us', closeTitle: 'Your first visit is the beginning.',
    closeBody: 'Come in for a conversation and a proper look. You’ll leave with a clear picture of what your smile needs and how we’d approach it &mdash; no pressure either way.',
    arrange: 'Arrange a consultation &rarr;', exploreTreatments: 'Explore treatments &rarr;'
  },
  ar: {
    eyebrow: 'الأشخاص وراء عنايتك', title: 'سيرام دنتال',
    tagline: 'عقول متخصصة. أيدٍ متأنية.<br>معيار عناية واحد يجمعنا.', meetUs: '← قابلنا شخصيًا',
    philosophyEyebrow: 'فلسفتنا', philosophyTitle: 'دقة بلمسة شخصية.',
    philosophyBody: 'عيادة أسنان واستوديو خزف تحت سقف واحد. تجمع سيرام بين الاستشارة والتخطيط الرقمي والتشطيب الدقيق في النزهة، بحيث يبقى كل قرار مرتبطًا بالشخص الجالس على الكرسي.',
    clinicEyebrow: 'عن العيادة', clinicTitle: 'طريقة أكثر هدوءًا للعناية بابتسامتك.',
    clinicBody: 'صُممت غرفنا لأحاديث هادئة وشروحات واضحة وعمل دقيق. من الزيارات الوقائية وطب أسنان الأطفال إلى الزراعة والتقويم والترميمات التجميلية، يبني الفريق خطة تراعي صحتك وأهدافك وتوقيتك.',
    moreEyebrow: 'المزيد عن سيرام', moreBody: 'مساحة لإضافة قصة العيادة، والمكان نفسه، والاعتمادات، والأشخاص القائمين على الممارسة.',
    fact1: 'تخطيط يقوده الأطباء', fact2: 'استوديو خزف داخلي', fact3: 'مسح رقمي وسجلات إلكترونية',
    teamEyebrow: 'تعرّف على الأطباء', teamTitle: 'تخصصات مختلفة، والتزام مشترك.',
    teamCount: n => n + ' طبيبًا وأخصائيًا في الجراحة والعناية التجميلية والتقويم وطب اللثة والترميم.',
    studioEyebrow: 'الاستوديو الداخلي', studioTitle: 'حيث يلتقي العلم<br>بيد متأنية.',
    studioBody: 'من التصميم الرقمي إلى تشطيب الخزف، المختبر جزء من الحوار. يُراعى الشكل ودرجة اللون والملاءمة جنبًا إلى جنب مع الخطة السريرية.',
    exploreApproach: '← اكتشف نهجنا', v1: 'تخطيط رقمي', v2: 'تشطيب دقيق', v3: 'مراجعة سريرية',
    closeEyebrow: 'تعرّف علينا', closeTitle: 'زيارتك الأولى هي البداية.',
    closeBody: 'تفضل بزيارتنا لحديث ومعاينة حقيقية. ستغادر برؤية واضحة لما تحتاجه ابتسامتك وكيف سنتعامل معها — دون أي ضغط.',
    arrange: '← رتّب استشارة', exploreTreatments: '← اكتشف العلاجات'
  }
};

export function renderAbout() {
  const t = S[effectiveLang()];
  const team = DATA.team.length ? DATA.team : MOCK_TEAM;
  return '<div class="page page-flush editorial-page about-page">' +
    '<header class="editorial-hero about-hero">' + editorialImage('about-hero', { hero: true }) +
    '<div class="u editorial-hero-copy"><span class="eyebrow">' + t.eyebrow + '</span><h1 class="serif">' + t.title + '</h1><p>' + t.tagline + '</p><a class="btn btn-white" href="#/contact">' + t.meetUs + '</a></div></header>' +
    '<div class="u"><section class="about-manifesto reveal">' +
      '<header class="am-lead"><span class="eyebrow">' + t.philosophyEyebrow + '</span><h2 class="serif">' + t.philosophyTitle + '</h2>' +
        '<p>' + t.philosophyBody + '</p></header>' +
      '<div class="am-grid">' +
        '<div class="am-block"><span class="eyebrow">' + t.clinicEyebrow + '</span><h3 class="serif">' + t.clinicTitle + '</h3>' +
          '<p>' + t.clinicBody + '</p></div>' +
        // Reserved space — add more about the clinic here (history, the building, accreditations, community work).
        '<div class="am-block am-placeholder"><span class="eyebrow">' + t.moreEyebrow + '</span>' +
          '<p>' + t.moreBody + '</p></div>' +
      '</div>' +
      '<div class="clinic-facts"><span><b>01</b>' + t.fact1 + '</span><span><b>02</b>' + t.fact2 + '</span><span><b>03</b>' + t.fact3 + '</span></div>' +
    '</section>' +
    '<section class="team-section"><div class="team-heading"><div><span class="eyebrow">' + t.teamEyebrow + '</span><h2 class="serif">' + t.teamTitle + '</h2></div><div><p>' + t.teamCount(team.length) + '</p></div></div>' +
    '<div class="doctor-grid">' + team.map((d, i) => doctorCard(d, i)).join('') + '</div>' +
    '</section>' +
    '<section class="about-craft"><figure>' + editorialImage('about-craft') + '</figure><div><span class="eyebrow">' + t.studioEyebrow + '</span><h2 class="serif">' + t.studioTitle + '</h2><p>' + t.studioBody + '</p><a class="text-link" href="#/services">' + t.exploreApproach + '</a><div class="craft-values"><span>' + t.v1 + '</span><span>' + t.v2 + '</span><span>' + t.v3 + '</span></div></div></section>' +
    '<section class="editorial-booking about-close"><span class="eyebrow">' + t.closeEyebrow + '</span><h2 class="serif">' + t.closeTitle + '</h2>' +
      '<p>' + t.closeBody + '</p>' +
      '<div class="about-close-actions"><a class="btn btn-primary" href="#/contact">' + t.arrange + '</a><a class="text-link" href="#/services">' + t.exploreTreatments + '</a></div>' +
    '</section></div></div>' + footer();
}

// No page-specific wiring needed now that the doctor search is removed;
// kept as a no-op export so handlers.js's per-route dispatch stays simple.
export function attachAboutHandlers() {}
