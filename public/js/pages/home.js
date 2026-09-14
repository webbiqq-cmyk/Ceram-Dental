import { DATA } from '../state.js';
import { esc, money } from '../utils/format.js';
import { SERVICE_GROUPS, SVC } from '../constants.js';
import { footer } from '../components/footer.js';
import { reviewSection } from '../components/reviews.js';
import { brandLogoStack } from '../components/brand.js';
import { editorialImage } from '../components/editorialImage.js';
import { productMediaHtml } from '../utils/productMedia.js';
import { addToCart } from '../components/cart.js';
import { effectiveLang, trGroup, trSvc, trCategory } from '../i18n.js';

const S = {
  en: {
    loc: 'Specialist dental center &middot; New Zinj, Manama', title: 'Ceram Dental', tagline: 'The art of a considered smile.',
    welcome: 'Specialist dentistry and an in-house ceramics lab. Thoughtful care, from your first conversation to the finishing touches.',
    book: 'Book a consultation', explore: 'Explore treatments',
    statLab: 'In-house', statLabSub: 'CAD-CAM ceramics lab', statQc: '5-point', statQcSub: 'restoration quality check',
    statDoctors: n => n, statDoctorsSub: 'doctors and specialists', statHours: 'Sat-Thu', statHoursSub: '9:00 AM - 7:00 PM',
    sigEyebrow: 'The Ceram Difference', sigTitle: 'A boutique patient experience with lab-grade control.',
    sigBody: 'Most dental clinics separate the appointment from the restoration. Ceram keeps the planning, smile design, ceramic work and quality control close, so the final result can be adjusted with real clinical context.',
    sigCta: 'About Ceram Dental', arrow: ' →',
    svcEyebrow: 'Comprehensive care tailored to you', svcTitle: 'Services we offer', exploreServices: 'Explore services →',
    clinicalLink: 'Other Clinical Dental Procedures →',
    visitEyebrow: 'Your visit', visitTitle: 'Precise dentistry should still feel soft.',
    visitBody: 'From the first greeting to the final fit, the experience is designed to feel composed: private conversations, digital scans, transparent costs, and enough time for the doctor to explain the why behind each step.',
    steps: [
      ['01', 'Consultation & plan', 'We listen, examine and photograph, then map out the treatment and the cost with you before anything starts.'],
      ['02', 'Digital scan', 'A quick intraoral scan replaces the putty tray and gives the lab an exact model to work from.'],
      ['03', 'Made in our lab', 'Your restoration is designed, milled and layered upstairs — not shipped to a lab you never meet.'],
      ['04', 'Fitted & checked', 'We seat it, check the bite and the margins, and only finish once it looks and feels right.']
    ],
    teamEyebrow: 'Our doctors', teamTitle: 'Care led by specialists',
    teamBody: n => n + ' doctors and specialists across surgery, cosmetic care, orthodontics, periodontics and restorative dentistry.',
    meetDoctors: 'Meet the doctors →',
    faqEyebrow: 'FAQs', faqTitle: 'Before you book',
    faqs: [
      ['Do you make crowns and veneers in-house?', 'Yes. Ceram has its own CAD-CAM ceramics lab, so many restorations are designed, milled, layered and checked under the same roof as the clinic.'],
      ['Can I book a cosmetic consultation first?', 'Yes. Start with a consultation, photos and a digital plan before deciding on veneers, crowns, whitening, aligners or a larger smile design.'],
      ['Where is Ceram Dental located?', null],
      ['How long does a first consultation take?', 'Allow around 45–60 minutes. We review your goals, examine your smile, take digital records where useful and explain suitable next steps.'],
      ['Do you offer payment plans?', 'Treatment fees are explained before treatment starts. Ask our team about the payment options currently available for your plan.'],
      ['Do you treat nervous patients?', 'Yes. Tell us when booking so we can allow extra time, explain each step and keep the appointment comfortable and predictable.'],
      ['Can you repair or replace an old crown?', 'Often, yes. The doctor will assess the tooth, bite, gum health and existing restoration before recommending repair or replacement.'],
      ['Do you see children?', 'We welcome children for preventive visits, gentle check-ups and age-appropriate guidance.']
    ],
    locatedAnswer: (address, hours) => address + '. The clinic is open ' + hours + '.',
    shopEyebrow: 'Ceram Dental Shop', shopTitle: 'Take-home care &amp; chairside essentials',
    shopBody: 'Whitening kits, retainer cases and the products your dentist recommends — ready to collect at your next visit.',
    visitShop: 'Visit the shop →',
    favEyebrow: 'A little care between visits', favTitle: 'Shop favourites', viewShop: 'View the full shop →', add: 'Add',
    ctaEyebrow: 'Ceram Specialist Dental Center', ctaTitle: 'Ready for a smile plan that feels considered?',
    ctaBody: 'Book a consultation and our team will help you find the right treatment — no pressure, just a clear plan.',
    call: phone => 'Call ' + phone
  },
  ar: {
    loc: 'مركز تخصصي لطب الأسنان &middot; النزهة، المنامة', title: 'سيرام دنتال', tagline: 'فن الابتسامة المدروسة.',
    welcome: 'طب أسنان تخصصي ومختبر خزف داخلي. عناية متأنية، من أول حديث إلى اللمسات الأخيرة.',
    book: 'احجز استشارة', explore: 'اكتشف العلاجات',
    statLab: 'داخلي', statLabSub: 'مختبر خزف CAD-CAM', statQc: '5 نقاط', statQcSub: 'فحص جودة للترميم',
    statDoctors: n => n, statDoctorsSub: 'أطباء وأخصائيون', statHours: 'السبت-الخميس', statHoursSub: '9:00 ص - 7:00 م',
    sigEyebrow: 'ما يميز سيرام', sigTitle: 'تجربة مريض راقية مع دقة على مستوى المختبر.',
    sigBody: 'تفصل معظم عيادات الأسنان بين الموعد والترميم. تُبقي سيرام التخطيط وتصميم الابتسامة والعمل الخزفي وضبط الجودة قريبة من بعضها، بحيث يمكن تعديل النتيجة النهائية وفق السياق السريري الفعلي.',
    sigCta: 'عن سيرام دنتال', arrow: ' ←',
    svcEyebrow: 'عناية شاملة مصممة لك', svcTitle: 'الخدمات التي نقدمها', exploreServices: '← اكتشف الخدمات',
    clinicalLink: '← إجراءات سريرية أخرى لطب الأسنان',
    visitEyebrow: 'زيارتك', visitTitle: 'طب الأسنان الدقيق يجب أن يبقى لطيفًا.',
    visitBody: 'من الترحيب الأول إلى الملاءمة النهائية، صُممت التجربة لتبدو متزنة: أحاديث خاصة، مسح رقمي، تكاليف شفافة، ووقت كافٍ ليشرح الطبيب سبب كل خطوة.',
    steps: [
      ['01', 'الاستشارة والخطة', 'نستمع ونفحص ونصوّر، ثم نضع معك خطة العلاج والتكلفة قبل البدء بأي شيء.'],
      ['02', 'المسح الرقمي', 'مسح داخل الفم سريع يحل محل طبعة الفم التقليدية، ويمنح المختبر نموذجًا دقيقًا للعمل عليه.'],
      ['03', 'صُنع في مختبرنا', 'يُصمم ترميمك ويُفرز ويُطبّق في الطابق العلوي — لا يُرسل إلى مختبر لا تعرفه.'],
      ['04', 'التركيب والفحص', 'نُركّبه ونتحقق من الإطباق والحواف، ولا ننهي العمل إلا حين يبدو ويشعر بأنه صحيح.']
    ],
    teamEyebrow: 'أطباؤنا', teamTitle: 'عناية يقودها أخصائيون',
    teamBody: n => n + ' طبيبًا وأخصائيًا في الجراحة والعناية التجميلية والتقويم وطب اللثة والترميم.',
    meetDoctors: '← تعرّف على الأطباء',
    faqEyebrow: 'الأسئلة الشائعة', faqTitle: 'قبل أن تحجز',
    faqs: [
      ['هل تصنعون التيجان والفينير داخل العيادة؟', 'نعم. تمتلك سيرام مختبر خزف CAD-CAM خاصًا بها، لذا يُصمم الكثير من الترميمات ويُفرز ويُطبّق ويُفحص تحت سقف واحد مع العيادة.'],
      ['هل يمكنني حجز استشارة تجميلية أولًا؟', 'نعم. ابدأ باستشارة وصور وخطة رقمية قبل اتخاذ قرار بشأن الفينير أو التيجان أو التبييض أو التقويم الشفاف أو تصميم ابتسامة أشمل.'],
      ['أين يقع سيرام دنتال؟', null],
      ['كم تستغرق الاستشارة الأولى؟', 'خصص نحو 45–60 دقيقة. نراجع أهدافك ونفحص ابتسامتك ونأخذ سجلات رقمية عند الحاجة ونشرح الخطوات المناسبة التالية.'],
      ['هل تقدمون خطط دفع؟', 'تُشرح تكاليف العلاج قبل بدئه. اسأل فريقنا عن خيارات الدفع المتاحة حاليًا لخطتك.'],
      ['هل تتعاملون مع المرضى القلقين؟', 'نعم. أخبرنا عند الحجز حتى نخصص وقتًا إضافيًا ونشرح كل خطوة ونجعل الموعد مريحًا وقابلًا للتوقع.'],
      ['هل يمكنكم إصلاح أو استبدال تاج قديم؟', 'غالبًا، نعم. سيقيّم الطبيب السن والإطباق وصحة اللثة والترميم الحالي قبل التوصية بالإصلاح أو الاستبدال.'],
      ['هل تستقبلون الأطفال؟', 'نرحب بالأطفال للزيارات الوقائية والفحوصات اللطيفة والإرشاد المناسب لأعمارهم.']
    ],
    locatedAnswer: (address, hours) => address + '. العيادة مفتوحة ' + hours + '.',
    shopEyebrow: 'متجر سيرام دنتال', shopTitle: 'عناية منزلية ومستلزمات كرسي العلاج',
    shopBody: 'أطقم تبييض، وعلب حافظات، والمنتجات التي يوصي بها طبيبك — جاهزة لاستلامها في زيارتك القادمة.',
    visitShop: '← تسوق الآن',
    favEyebrow: 'عناية بسيطة بين الزيارات', favTitle: 'الأكثر طلبًا', viewShop: '← عرض المتجر بالكامل', add: 'أضف',
    ctaEyebrow: 'مركز سيرام التخصصي لطب الأسنان', ctaTitle: 'مستعد لخطة ابتسامة مدروسة؟',
    ctaBody: 'احجز استشارة وسيساعدك فريقنا في إيجاد العلاج المناسب — دون ضغط، فقط خطة واضحة.',
    call: phone => 'اتصل ' + phone
  }
};

function step(n, t, d) {
  return '<div class="step reveal"><span class="num">' + n + '</span><h3>' + t + '</h3><p>' + d + '</p></div>';
}

export function renderHome() {
  const t = S[effectiveLang()];
  const st = DATA.settings || {};
  const phone = st.phone || '+973 1713 1123';
  const address = st.address || (effectiveLang() === 'ar' ? 'طريق 35، النزهة، المنامة، البحرين' : 'Highway 35, New Zinj, Manama, Bahrain');
  const hours = st.hours || (effectiveLang() === 'ar' ? 'السبت-الخميس، 9:00 ص - 7:00 م' : 'Sat-Thu, 9:00 AM - 7:00 PM');
  const faqs = t.faqs.map(f => f[1] === null ? [f[0], t.locatedAnswer(address, hours)] : f);
  return (
    '<div class="page page-flush">' +
    '<section class="home-hero">' +
      '<div class="hero-copy reveal">' +
        '<span class="hero-loc">' + t.loc + '</span>' +
        brandLogoStack({ dark: true, id: 'hero', cls: 'hero-wordmark' }) +
        '<h1 class="serif">' + t.title + '</h1>' +
        '<p class="hero-tagline serif">' + t.tagline + '</p>' +
        '<p class="welcome">' + t.welcome + '</p>' +
        '<div class="cta-row">' +
          '<a class="btn btn-gold btn-lg" href="#/contact">' + t.book + '</a>' +
          '<a class="btn btn-onphoto btn-lg" href="#/services">' + t.explore + '</a>' +
        '</div>' +
      '</div>' +
      '<div class="hero-photo">' +
        editorialImage('home-hero', { hero: true }) +
      '</div>' +
    '</section>' +

    '<div class="u">' +

    '<div class="stat-strip reveal">' +
      '<div class="chipstat"><b>' + t.statLab + '</b><span>' + t.statLabSub + '</span></div>' +
      '<div class="chipstat"><b>' + t.statQc + '</b><span>' + t.statQcSub + '</span></div>' +
      '<div class="chipstat"><b>' + t.statDoctors(DATA.team.length) + '</b><span>' + t.statDoctorsSub + '</span></div>' +
      '<div class="chipstat"><b>' + t.statHours + '</b><span>' + t.statHoursSub + '</span></div>' +
    '</div>' +

    '<section class="section signature-section reveal">' +
      '<div class="signature-panel">' +
        '<span class="eyebrow-accent">' + t.sigEyebrow + '</span>' +
        '<h2 class="serif">' + t.sigTitle + '</h2>' +
        '<p>' + t.sigBody + '</p>' +
        '<a class="btn btn-ghost btn-sm signature-cta" href="#/about">' + t.sigCta + ' <span class="btn-arw">' + t.arrow + '</span></a>' +
      '</div>' +
      '<div class="signature-media">' +
        editorialImage('home-care') +
        editorialImage('home-lounge') +
      '</div>' +
    '</section>' +

    '<section class="section">' +
      '<div class="section-head luxe-head"><div><span class="eyebrow">' + t.svcEyebrow + '</span><h2 class="serif">' + t.svcTitle + '</h2></div>' +
        '<a class="btn btn-ghost btn-sm" href="#/services">' + t.exploreServices + '</a></div>' +
      '<div class="services-grid luxe-services">' + SERVICE_GROUPS.map((g, i) =>
        '<a href="#/services" class="svc-card reveal" style="--i:' + i + '">' +
          '<h3>' + esc(trGroup(g).label) + '</h3><p>' + esc(trGroup(g).desc) + '</p>' +
          '<ul class="service-category-list">' + g.services.map(key => '<li>' + esc(trSvc(key).label) + '</li>').join('') + '</ul>' +
          '<span class="svc-more">' + t.exploreServices + '</span></a>'
      ).join('') + '</div>' +
      '<a class="clinical-services-link" href="#/services">' + t.clinicalLink + '</a>' +
    '</section>' +

    '<section class="section experience-band">' +
      '<div class="experience-copy reveal">' +
        '<span class="eyebrow">' + t.visitEyebrow + '</span>' +
        '<h2 class="serif">' + t.visitTitle + '</h2>' +
        '<p>' + t.visitBody + '</p>' +
      '</div>' +
      '<div class="steps-grid">' + t.steps.map(([n, title, desc]) => step(n, title, desc)).join('') + '</div>' +
    '</section>' +

    '<section class="section team-teaser reveal">' +
      '<div class="team-teaser-media">' +
        DATA.team.slice(0, 5).map(d => (d.photo
          ? '<span class="tt-avatar"><img src="' + esc(d.photo) + '" alt="' + esc(d.name) + '" loading="lazy" decoding="async"></span>'
          : '<span class="tt-avatar tt-avatar-fallback">' + esc(d.initials || '') + '</span>')).join('') +
        (DATA.team.length > 5 ? '<span class="tt-avatar tt-avatar-more">+' + (DATA.team.length - 5) + '</span>' : '') +
      '</div>' +
      '<div class="team-teaser-copy">' +
        '<span class="eyebrow">' + t.teamEyebrow + '</span>' +
        '<h2 class="serif">' + t.teamTitle + '</h2>' +
        '<p>' + t.teamBody(DATA.team.length) + '</p>' +
      '</div>' +
      '<a class="btn btn-gold" href="#/about">' + t.meetDoctors + '</a>' +
    '</section>' +

    reviewSection() +

    '<section class="section faq-section reveal">' +
      '<div class="section-head luxe-head"><div><span class="eyebrow">' + t.faqEyebrow + '</span><h2 class="serif">' + t.faqTitle + '</h2></div></div>' +
      '<div class="faq-grid">' + faqs.map((f, i) =>
        '<details class="faq-card reveal" style="--i:' + i + '"' + (i === 0 ? ' open' : '') + '><summary>' + esc(f[0]) + '</summary><p>' + esc(f[1]) + '</p></details>'
      ).join('') + '</div>' +
    '</section>' +

    '<section class="section shop-strip reveal">' +
      '<div><span class="eyebrow">' + t.shopEyebrow + '</span><h3>' + t.shopTitle + '</h3>' +
        '<p>' + t.shopBody + '</p></div>' +
      '<a class="btn btn-ghost" href="#/shop">' + t.visitShop + '</a>' +
    '</section>' +

    '<section class="section home-shop-preview reveal"><div class="section-head luxe-head"><div><span class="eyebrow">' + t.favEyebrow + '</span><h2 class="serif">' + t.favTitle + '</h2></div><a class="btn btn-ghost btn-sm" href="#/shop">' + t.viewShop + '</a></div><div class="home-shop-grid">' +
      DATA.products.filter(p => p.active !== false).slice(0, 4).map(p => '<article class="home-shop-card">' + productMediaHtml(p) + '<span class="cat">' + esc(trCategory(p.category)) + '</span><h3>' + esc(p.name) + '</h3><div class="home-shop-row"><b>' + money(p.price) + '</b><button class="btn btn-primary btn-sm" data-add-product="' + esc(p.id) + '">' + t.add + '</button></div></article>').join('') +
    '</div></section>' +

    '<section class="section cta-banner reveal">' +
      '<span class="eyebrow-accent">' + t.ctaEyebrow + '</span>' +
      '<h2 class="serif">' + t.ctaTitle + '</h2>' +
      '<p>' + t.ctaBody + '</p>' +
      '<div class="cta-row"><a class="btn btn-white" href="#/contact">' + t.book + '</a><a class="btn btn-ghost" href="tel:+97317131123">' + t.call(esc(phone)) + '</a></div>' +
    '</section>' +

    '</div></div>' + footer()
  );
}
