import { esc } from '../utils/format.js';
import { effectiveLang } from '../i18n.js';

export const EDITORIAL_IMAGES = {
  'home-hero': 'Sunlit dental treatment room with an amethyst chair',
  'home-care': 'Careful shade selection for a ceramic restoration',
  'home-lounge': 'A quiet and intimate patient lounge',
  'visit-arrival': 'Welcoming reception and patient arrival area',
  'services-hero': 'Private dental consultation room',
  'service-cosmetic': 'Translucent ceramic veneers and a shade guide',
  'service-restorative': 'Ceramic crowns and a dental arch model',
  'service-digital': 'Intraoral scanner and implant demonstration model',
  'about-hero': 'A light-filled clinic corridor and seating alcove',
  'about-craft': 'Hand-finishing a ceramic crown with a fine brush',
  'contact-consultation': 'A personal consultation space ready for a visit',
  'shop-care': 'Toothbrush, floss and retainer care essentials',
  'careers-studio': 'Dental laboratory workstations and precision equipment'
};

// Arabic alt text for the same illustrative stock photography — a
// screen-reader-only detail, but part of the same "fully bilingual" pass
// as the visible copy.
const EDITORIAL_IMAGES_AR = {
  'home-hero': 'غرفة علاج مضيئة بكرسي بنفسجي',
  'home-care': 'اختيار دقيق لدرجة لون ترميم خزفي',
  'home-lounge': 'صالة انتظار هادئة وخاصة للمرضى',
  'visit-arrival': 'منطقة استقبال ووصول ترحيبية للمرضى',
  'services-hero': 'غرفة استشارة خاصة لطب الأسنان',
  'service-cosmetic': 'فينير خزفي شفاف ودليل درجات الألوان',
  'service-restorative': 'تيجان خزفية ونموذج لقوس الأسنان',
  'service-digital': 'ماسح داخل الفم ونموذج توضيحي للزراعة',
  'about-hero': 'ممر عيادة مضاء بالنور الطبيعي مع ركن جلوس',
  'about-craft': 'تشطيب تاج خزفي يدويًا بفرشاة دقيقة',
  'contact-consultation': 'مساحة استشارة شخصية جاهزة لاستقبال زيارة',
  'shop-care': 'فرشاة أسنان وخيط طبي ومستلزمات العناية بالحافظة',
  'careers-studio': 'محطات عمل مختبر الأسنان ومعدات دقيقة'
};

export function editorialImage(name, { hero = false, wide = false, cls = '' } = {}) {
  const alt = effectiveLang() === 'ar' ? (EDITORIAL_IMAGES_AR[name] || EDITORIAL_IMAGES[name]) : EDITORIAL_IMAGES[name];
  if (!EDITORIAL_IMAGES[name]) throw new Error('Unknown editorial image: ' + name);
  const base = '/images/editorial/' + name;
  return '<img class="' + esc(cls) + '" src="' + base + '-1440.webp" ' +
    'srcset="' + base + '-600.webp 600w, ' + base + '-1440.webp 1440w" ' +
    'sizes="' + (hero ? '100vw' : wide ? '(max-width: 1160px) 100vw, 1104px' : '(max-width: 720px) calc(100vw - 44px), 550px') + '" ' +
    'width="1440" height="960" loading="' + (hero ? 'eager' : 'lazy') + '" ' +
    (hero ? 'fetchpriority="high" ' : '') + 'decoding="async" alt="' + (effectiveLang() === 'ar' ? 'صورة توضيحية: ' : 'Illustrative image: ') + esc(alt) + '">';
}
