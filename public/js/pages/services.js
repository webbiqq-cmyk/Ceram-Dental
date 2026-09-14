import { money, esc } from '../utils/format.js';
import { SERVICE_GROUPS, CLINICAL_SERVICES, SVC, PROTOCOL, GUIDES, LAYERING_STYLES, GLAZE_TYPES, SURFACE_TEXTURES } from '../constants.js';
import { footer } from '../components/footer.js';
import { editorialImage } from '../components/editorialImage.js';
import { effectiveLang, trSvc, trGroup, trClinical, trGuide, trFinish, trProtocol } from '../i18n.js';

const S = {
  en: {
    eyebrow: 'Care, considered', title: 'Dentistry.<br>With intention.',
    lede: 'From the smallest detail to a complete smile plan.<br>Discover the care that feels right for you.', book: 'Book a consultation &rarr;',
    clinicalCare: 'Clinical care',
    introEyebrow: 'A considered approach', introTitle: 'Your smile is personal.<br>Your care should be, too.',
    introBody: 'We bring specialist dentistry and an in-house ceramics lab together, so your treatment can be planned with the whole picture in mind.',
    collectionEyebrow: 'The care collection', captions: ['A natural expression of you.', 'Care in every contour.', 'A clearer view of what comes next.'],
    finishes: 'Ceramic finishes', from: fee => 'From ' + money(fee), discuss: 'Discuss this treatment &rarr;',
    clinicalEyebrow: '04 / Specialist care', clinicalTitle: 'Other Clinical<br>Dental Procedures',
    clinicalBody: 'Care for the foundations of a healthy smile. Your doctor will discuss treatment and fees following an assessment.',
    clinicalNote: 'This list grows as our specialist team expands.', meetSpecialists: 'Meet your specialists &rarr;',
    referralEyebrow: 'For referring dentists', referralTitle: 'Good work begins<br>with a clear brief.',
    referralBody: 'Send us a case from your own practice, or manage your in-house cases here — one portal for both.',
    signUp: 'Sign up to send cases', alreadyReg: 'Already registered? Open Dentist Portal &rarr;',
    nextChapter: 'Your next chapter', letUsStart: 'Let us start with a conversation.'
  },
  ar: {
    eyebrow: 'عناية مدروسة', title: 'طب أسنان.<br>بنيّة واضحة.',
    lede: 'من أدق التفاصيل إلى خطة ابتسامة كاملة.<br>اكتشف العناية التي تناسبك.', book: '← احجز استشارة',
    clinicalCare: 'العناية السريرية',
    introEyebrow: 'نهج مدروس', introTitle: 'ابتسامتك أمر شخصي.<br>وعنايتك يجب أن تكون كذلك أيضًا.',
    introBody: 'نجمع بين طب الأسنان التخصصي ومختبر الخزف الداخلي، بحيث يمكن التخطيط لعلاجك مع مراعاة الصورة الكاملة.',
    collectionEyebrow: 'مجموعة العناية', captions: ['تعبير طبيعي عنك.', 'عناية في كل تفصيل.', 'رؤية أوضح لما هو قادم.'],
    finishes: 'التشطيبات الخزفية', from: fee => 'ابتداءً من ' + money(fee), discuss: '← ناقش هذا العلاج',
    clinicalEyebrow: '٠٤ / عناية تخصصية', clinicalTitle: 'إجراءات سريرية<br>أخرى لطب الأسنان',
    clinicalBody: 'عناية بأساسيات الابتسامة الصحية. سيناقش طبيبك العلاج والتكلفة بعد التقييم.',
    clinicalNote: 'تنمو هذه القائمة مع توسّع فريقنا التخصصي.', meetSpecialists: '← تعرّف على أخصائيينا',
    referralEyebrow: 'للأطباء المُحيلين', referralTitle: 'العمل الجيد يبدأ<br>بموجز واضح.',
    referralBody: 'أرسل لنا حالة من عيادتك الخاصة، أو أدر حالاتك الداخلية من هنا — بوابة واحدة لكليهما.',
    signUp: 'سجّل لإرسال الحالات', alreadyReg: '← مسجّل بالفعل؟ افتح بوابة الأطباء',
    nextChapter: 'فصلك القادم', letUsStart: 'لنبدأ بحديث.'
  }
};

function treatment(t, key, i) {
  const s = trSvc(key);
  const finishes = key === 'veneers' ? '<div class="treatment-finishes"><h4>' + t.finishes + '</h4><p>' +
    LAYERING_STYLES.concat(GLAZE_TYPES, SURFACE_TEXTURES).map(f => esc(trFinish(f))).join(' &middot; ') + '</p></div>' : '';
  return '<details class="treatment" data-service="' + key + '"' + (i === 0 ? ' open' : '') + '>' +
    '<summary><span class="treatment-number">0' + (i + 1) + '</span><h3>' + esc(s.label) + '</h3><span class="treatment-toggle" aria-hidden="true"></span></summary>' +
    '<div class="treatment-body"><p>' + esc(s.desc) + '</p>' + finishes +
    '<div class="treatment-action"><span>' + t.from(SVC[key].fee) + '</span><a href="#/contact" class="text-link">' + t.discuss + '</a></div></div></details>';
}

export function renderServices() {
  const t = S[effectiveLang()];
  return '<div class="page page-flush editorial-page services-page">' +
    '<header class="editorial-hero">' + editorialImage('services-hero', { hero: true }) +
    '<div class="u editorial-hero-copy"><span class="eyebrow">' + t.eyebrow + '</span><h1 class="serif">' + t.title + '</h1>' +
    '<p>' + t.lede + '</p><a class="btn btn-white" href="#/contact">' + t.book + '</a></div></header>' +
    '<div class="u"><nav class="chapter-nav" aria-label="Treatment categories">' +
    SERVICE_GROUPS.map((g, i) => '<button type="button" data-jump="service-' + g.key + '"><span>0' + (i + 1) + '</span>' + esc(trGroup(g).label) + '</button>').join('') +
    '<button type="button" data-jump="clinical-services"><span>04</span>' + t.clinicalCare + '</button></nav>' +
    '<div class="editorial-intro reveal"><span class="eyebrow">' + t.introEyebrow + '</span><h2 class="serif">' + t.introTitle + '</h2><p>' + t.introBody + '</p></div>' +
    SERVICE_GROUPS.map((g, i) => '<section class="treatment-chapter' + (i % 2 ? ' chapter-flipped' : '') + '" id="service-' + g.key + '" aria-labelledby="heading-' + g.key + '">' +
      '<div class="chapter-heading reveal"><span class="chapter-number">0' + (i + 1) + '</span><div><span class="eyebrow">' + t.collectionEyebrow + '</span><h2 id="heading-' + g.key + '" class="serif">' + esc(trGroup(g).label) + '</h2><p>' + esc(trGroup(g).desc) + '</p></div></div>' +
      '<div class="chapter-content"><figure class="chapter-image reveal">' + editorialImage('service-' + g.key) + '<figcaption>' + t.captions[i] + '</figcaption></figure>' +
      '<div class="treatment-list reveal">' + g.services.map((key, i) => treatment(t, key, i)).join('') + '</div></div></section>').join('') +
    '<section class="clinical-chapter" id="clinical-services"><div><span class="eyebrow">' + t.clinicalEyebrow + '</span><h2 class="serif">' + t.clinicalTitle + '</h2><p>' + t.clinicalBody + '</p><p class="clinical-note">' + t.clinicalNote + '</p><a class="text-link" href="#/about">' + t.meetSpecialists + '</a></div>' +
    '<div class="clinical-list">' + CLINICAL_SERVICES.map((c, i) => '<article class="clinical-row reveal"><span class="clinical-index">0' + (i + 1) + '</span><div><h3>' + esc(trClinical(c).label) + '</h3><p>' + esc(trClinical(c).desc) + '</p></div></article>').join('') + '</div></section>' +
    '<section class="referral-section"><div><span class="eyebrow">' + t.referralEyebrow + '</span><h2 class="serif">' + t.referralTitle + '</h2><p>' + t.referralBody + '</p>' +
      '<div class="referral-actions"><button class="btn btn-primary" data-open-dentist-signup>' + t.signUp + '</button><a class="text-link" href="#/portal">' + t.alreadyReg + '</a></div>' +
    '</div><div>' +
    GUIDES.map(g => '<details class="guide-detail"><summary>' + esc(trGuide(g).t) + '</summary><p>' + esc(trGuide(g).d) + '</p><ul>' + PROTOCOL.map(p => '<li>' + esc(trProtocol(p)) + '</li>').join('') + '</ul></details>').join('') +
    '</div></section><section class="editorial-booking"><span class="eyebrow">' + t.nextChapter + '</span><h2 class="serif">' + t.letUsStart + '</h2><a class="btn btn-primary" href="#/contact">' + t.book + '</a></section></div></div>' + footer();
}

export function attachServicesHandlers() {
  document.querySelectorAll('[data-jump]').forEach(button => button.addEventListener('click', () => {
    const section = document.getElementById(button.dataset.jump);
    if (!section) return;
    section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    section.setAttribute('tabindex', '-1');
    section.focus({ preventScroll: true });
  }));
}
