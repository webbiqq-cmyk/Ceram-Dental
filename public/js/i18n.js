import { SVC } from './constants.js';

// Bilingual (English / Arabic) support for the public website only — the
// staff dashboards (Admin, Dentist Portal, Lab Studio) are internal tools
// and stay English/LTR regardless of the visitor's saved preference, so
// effectiveLang() always reports 'en' once body.workplace is set (see
// router.js). Each public page keeps its own `STRINGS = {en,ar}` object
// colocated with its render function (see pages/home.js etc.); this module
// is just the shared engine: language state, <html dir>, the static topbar
// nav text, and the service/treatment name translations shared by more
// than one page.
const LANG_KEY = 'ceram_lang';
let lang = 'en';
try { if (localStorage.getItem(LANG_KEY) === 'ar') lang = 'ar'; } catch { /* private mode etc. */ }

export function getLang() { return lang; }
// The language actually shown right now — forces 'en' inside the staff
// workspaces so Arabic never leaks into Admin/Portal/Studio layouts that
// were never built or tested for it.
export function effectiveLang() {
  return (typeof document !== 'undefined' && document.body.classList.contains('workplace')) ? 'en' : lang;
}
export function isRTL() { return effectiveLang() === 'ar'; }

const NAV_STRINGS = {
  en: { about: 'About', services: 'Services', shop: 'Shop', contact: 'Contact', careers: 'Careers', portal: 'Dentist Portal' },
  ar: { about: 'من نحن', services: 'الخدمات', shop: 'المتجر', contact: 'تواصل معنا', careers: 'وظائف', portal: 'بوابة الأطباء' }
};

// Updates everything that lives outside the JS-rendered #app content: the
// static topbar nav (index.html), <html lang/dir>, and the switcher's own
// label (always shows the language you'd switch TO).
export function applyDocumentDir() {
  const active = effectiveLang();
  document.documentElement.lang = active;
  document.documentElement.dir = active === 'ar' ? 'rtl' : 'ltr';
  const nav = NAV_STRINGS[active];
  document.querySelectorAll('[data-i18n-nav]').forEach(el => {
    const key = el.dataset.i18nNav;
    if (nav[key]) el.textContent = nav[key];
  });
  const switcher = document.getElementById('langSwitch');
  if (switcher) {
    switcher.textContent = active === 'ar' ? 'English' : 'العربية';
    switcher.lang = active === 'ar' ? 'en' : 'ar';
  }
}

export function setLang(next) {
  lang = next === 'ar' ? 'ar' : 'en';
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* private mode etc. */ }
  applyDocumentDir();
}

export function initI18n() {
  applyDocumentDir();
  document.getElementById('langSwitch')?.addEventListener('click', async () => {
    setLang(lang === 'ar' ? 'en' : 'ar');
    const { renderCurrent } = await import('./router.js');
    renderCurrent();
  });
}

// ---- Service / treatment names, shared by home.js, services.js and the
// public constants.js catalog (SERVICES / SERVICE_GROUPS / CLINICAL_SERVICES
// / GUIDES keep their English copy as the source of truth and their keys;
// this only supplies the Arabic side, looked up by the same key so nothing
// about the catalog's shape has to change). ----
const SVC_AR = {
  veneers: { label: 'الفينير', desc: 'فينير خزفي متعدد الطبقات، بدرجة لون وملمس سطحي مصممين خصيصًا لك.' },
  crowns: { label: 'التيجان', desc: 'تيجان من الزركونيا أو الإيماكس، مفروزة بدقة عالية لتناسب الحواف تمامًا.' },
  bridges: { label: 'الجسور', desc: 'جسور ثابتة متعددة الوحدات بدرجة لون ونقاط تماس متطابقة.' },
  implants: { label: 'الزراعة', desc: 'ترميمات مدعومة بالزرعات، وفق النظام والدعامة اللذين تفضلهما.' },
  surgical_guide: { label: 'الدليل الجراحي', desc: 'أدلة جراحية موجّهة كليًا أو جزئيًا، مصممة من المسح الرقمي الخاص بك.' },
  dsd: { label: 'التصميم الرقمي للابتسامة', desc: 'محاكاة كاملة للابتسامة ومعاينات تصميمية قبل أي تحضير للأسنان.' },
  aligners: { label: 'التقويم الشفاف', desc: 'علاج بالتقويم الشفاف الخفي، مخطط ومراجَع من قبل أخصائي تقويم الأسنان لدينا.' }
};
export function trSvc(key) {
  const en = SVC[key] || { label: key, desc: '', fee: 0 };
  return SVC_AR[key] ? { label: SVC_AR[key].label, desc: SVC_AR[key].desc, fee: en.fee } : en;
}

const GROUP_AR = {
  cosmetic: { label: 'طب الأسنان التجميلي', desc: 'عناية شخصية بمظهر ابتسامتك واصطفاف أسنانك.' },
  restorative: { label: 'طب الأسنان الترميمي', desc: 'ترميمات خزفية مخصصة للأسنان التالفة أو المفقودة.' },
  digital: { label: 'التقنية الرقمية وزراعة الأسنان', desc: 'تخطيط رقمي وأعمال موجّهة وترميمات مدعومة بالزرعات.' }
};
export function trGroup(g) { return GROUP_AR[g.key] || { label: g.label, desc: g.desc }; }

const CLINICAL_AR = {
  'Periodontics': { label: 'طب اللثة', desc: 'تقييم متخصص وعناية بلثتك والأنسجة الداعمة لها.' },
  'Endodontics': { label: 'علاج الجذور', desc: 'تقييم آلام الأسنان واحتياجات علاج قناة الجذر.' },
  'Oral Surgery': { label: 'جراحة الفم', desc: 'استشارة لعمليات الخلع وغيرها من احتياجات جراحة الأسنان.' }
};
export function trClinical(c) { return CLINICAL_AR[c.label] || { label: c.label, desc: c.desc }; }

const GUIDE_AR = {
  'Veneer Guide': { t: 'دليل الفينير', d: 'عمق التحضير، التقاط درجة اللون وزوايا التصوير لحالات الفينير.' },
  'Implant Guide': { t: 'دليل الزراعة', d: 'قائمة المكونات وطريقة التعامل مع جسم المسح لحالات الزراعة.' },
  'Scan Guide': { t: 'دليل المسح الرقمي', d: 'الحصول على مسح رقمي دقيق من المحاولة الأولى.' },
  'Photo Guide': { t: 'دليل التصوير', d: 'الصور المرجعية الخمس التي يتحقق منها فريق الجودة لدينا.' }
};
export function trGuide(g) { return GUIDE_AR[g.t] || g; }

const FINISH_AR = {
  'Natural cutback': 'قص طبيعي', 'Full contour': 'شكل متكامل', 'Micro-layered incisal': 'حافة قاطعة متعددة الطبقات الدقيقة',
  'High glaze': 'لمعان عالٍ', 'Matte glaze': 'لمعان غير لامع', 'Characterized/stained': 'مُميّز/مُصبّغ',
  'Natural texture': 'ملمس طبيعي', 'Smooth polish': 'صقل ناعم', 'Youthful (high texture)': 'شبابي (ملمس بارز)'
};
export function trFinish(text) { return FINISH_AR[text] || text; }

const CATEGORY_AR = { 'Patient retail': 'منتجات للمرضى', 'Chairside kit': 'مستلزمات العلاج' };
export function trCategory(text) { return CATEGORY_AR[text] || text; }

const PROTOCOL_AR = {
  photos: 'صور سريرية', scan: 'مسح رقمي / طبعة', retraction: 'صورة خيط الإبعاد اللثوي', margins: 'حواف واضحة (قرب اللثة)', contacts: 'نقاط تماس واضحة'
};
export function trProtocol(p) { return PROTOCOL_AR[p.key] || p.label; }
