import { DATA } from '../state.js';
import { esc } from '../utils/format.js';
import { editorialImage } from './editorialImage.js';

export function visitSection() {
  const s = DATA.settings || {};
  const address = s.address || 'New Zinj, Manama, Bahrain';
  const phone = s.phone || '+973 1713 1123';
  const map = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Ceram Dental ' + address);
  return '<section class="visit-story"><figure class="visit-image reveal">' + editorialImage('visit-arrival') + '</figure>' +
    '<div class="visit-details reveal"><span class="eyebrow">Find us in Bahrain</span><h2 class="serif">A little time<br>for your smile.</h2><p class="visit-location">' + esc(address) + '</p>' +
    '<dl><div><dt>Opening hours</dt><dd>' + esc(s.hours || 'Sat-Thu, 9:00 AM - 7:00 PM') + '</dd></div><div><dt>Let us arrange your visit</dt><dd><a href="tel:' + esc(phone.replace(/[^+0-9]/g, '')) + '">' + esc(phone) + '</a></dd></div></dl>' +
    '<div class="visit-actions"><a class="btn btn-primary" href="#/contact">Book a consultation</a><a class="text-link" href="' + esc(map) + '" target="_blank" rel="noopener">Get directions &nearr;</a></div></div></section>';
}
