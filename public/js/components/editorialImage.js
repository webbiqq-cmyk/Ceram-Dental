import { esc } from '../utils/format.js';

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

export function editorialImage(name, { hero = false, wide = false, cls = '' } = {}) {
  const alt = EDITORIAL_IMAGES[name];
  if (!alt) throw new Error('Unknown editorial image: ' + name);
  const base = '/images/editorial/' + name;
  return '<img class="' + esc(cls) + '" src="' + base + '-1440.webp" ' +
    'srcset="' + base + '-600.webp 600w, ' + base + '-1440.webp 1440w" ' +
    'sizes="' + (hero ? '100vw' : wide ? '(max-width: 1160px) 100vw, 1104px' : '(max-width: 720px) calc(100vw - 44px), 550px') + '" ' +
    'width="1440" height="960" loading="' + (hero ? 'eager' : 'lazy') + '" ' +
    (hero ? 'fetchpriority="high" ' : '') + 'decoding="async" alt="Illustrative image: ' + esc(alt) + '">';
}
