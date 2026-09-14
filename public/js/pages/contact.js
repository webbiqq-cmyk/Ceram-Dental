import { DATA, api } from '../state.js';
import { esc, field } from '../utils/format.js';
import { SERVICES } from '../constants.js';
import { footer, socialIcons } from '../components/footer.js';
import { toast } from '../toast.js';
import { editorialImage } from '../components/editorialImage.js';
import { effectiveLang, trSvc } from '../i18n.js';

const S = {
  en: {
    eyebrow: 'Contact', title: 'Book a consultation.',
    lede: 'Tell us what you need and a preferred day — we’ll call to confirm a time. For anything urgent, phone or WhatsApp us directly.',
    phone: 'Phone &amp; WhatsApp', email: 'Email', address: 'Address', hours: 'Hours', follow: 'Follow along',
    bookHeading: 'Book a consultation', name: 'Name', phoneField: 'Phone', emailOptional: 'Email (optional)',
    interestedIn: 'Interested in', notSure: 'Not sure yet', preferredDate: 'Preferred date',
    anything: 'Anything we should know?', anythingPh: 'Optional', requestBtn: 'Request appointment',
    sentToast: 'Request sent — we’ll call to confirm.',
    quickPrompt: 'Prefer to just send a message? &rarr;', quickMessage: 'Message', quickMessagePh: 'What can we help with?',
    sendMessage: 'Send message', sentMessage: 'Message sent — we’ll get back to you soon.'
  },
  ar: {
    eyebrow: 'تواصل معنا', title: 'احجز استشارة.',
    lede: 'أخبرنا باحتياجك واليوم المفضل لديك — سنتصل لتأكيد الموعد. لأي أمر عاجل، تواصل معنا هاتفيًا أو عبر واتساب مباشرة.',
    phone: 'الهاتف وواتساب', email: 'البريد الإلكتروني', address: 'العنوان', hours: 'ساعات العمل', follow: 'تابعنا',
    bookHeading: 'احجز استشارة', name: 'الاسم', phoneField: 'الهاتف', emailOptional: 'البريد الإلكتروني (اختياري)',
    interestedIn: 'أهتم بـ', notSure: 'لست متأكدًا بعد', preferredDate: 'التاريخ المفضل',
    anything: 'هل هناك ما تود إخبارنا به؟', anythingPh: 'اختياري', requestBtn: 'طلب موعد',
    sentToast: 'تم إرسال الطلب — سنتصل لتأكيد الموعد.',
    quickPrompt: 'تفضل إرسال رسالة فقط؟ ←', quickMessage: 'الرسالة', quickMessagePh: 'كيف يمكننا المساعدة؟',
    sendMessage: 'إرسال الرسالة', sentMessage: 'تم إرسال الرسالة — سنعاود التواصل معك قريبًا.'
  }
};

function infoRow(path, label, valueHtml) {
  return '<div class="info-row"><span class="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="' + path + '"/></svg></span><div><span class="eyebrow" style="margin-bottom:2px;">' + label + '</span>' + valueHtml + '</div></div>';
}

export function renderContact() {
  const t = S[effectiveLang()];
  const s = DATA.settings || {};
  return (
    '<div class="page"><div class="u">' +
    '<div class="page-head reveal"><span class="eyebrow-accent">' + t.eyebrow + '</span><h1 class="serif">' + t.title + '</h1>' +
      '<p class="lede">' + t.lede + '</p></div>' +
    editorialImage('contact-consultation', { wide: true, cls: 'contact-scene' }) +
    '<div class="section grid-2">' +
      '<div class="card reveal info-card">' +
        infoRow('M2.5 6.5A2 2 0 0 1 4.5 4.5h1.7a1 1 0 0 1 .95.69l1 3a1 1 0 0 1-.27 1.04L6.6 10.5a11 11 0 0 0 5 5l1.27-1.28a1 1 0 0 1 1.04-.27l3 1a1 1 0 0 1 .69.95v1.7a2 2 0 0 1-2 2A15.5 15.5 0 0 1 2.5 6.5Z', t.phone, '<a href="tel:' + esc(s.phone) + '">' + esc(s.phone) + '</a>') +
        infoRow('M3 6h18v12H3Zm0 0 9 7 9-7', t.email, '<a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a>') +
        infoRow('M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', t.address, esc(s.address)) +
        infoRow('M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', t.hours, esc(s.hours)) +
        '<div><span class="eyebrow" style="margin-bottom:10px;">' + t.follow + '</span><div class="social-row">' + socialIcons() + '</div></div>' +
        '<details class="contact-quick-msg"><summary>' + t.quickPrompt + '</summary>' +
          '<form id="quickMessageForm" class="form-grid" style="margin-top:14px;">' +
            field('', 'text', 'qm-name', t.name, true) +
            field('', 'email', 'qm-email', t.email, true) +
            '<div class="field full"><label>' + t.quickMessage + '</label><textarea id="qm-message" required placeholder="' + t.quickMessagePh + '"></textarea></div>' +
            '<div class="field full"><button class="btn btn-ghost btn-block" type="submit">' + t.sendMessage + '</button></div>' +
          '</form>' +
        '</details>' +
      '</div>' +
      '<div class="card reveal">' +
        '<span class="eyebrow" style="margin-bottom:14px;">' + t.bookHeading + '</span>' +
        '<form id="bookingForm" class="form-grid">' +
          field('full', 'text', 'bk-name', t.name, true) +
          field('', 'tel', 'bk-phone', t.phoneField, true) +
          '<div class="field"><label>' + t.emailOptional + '</label><input type="email" id="bk-email"></div>' +
          '<div class="field"><label>' + t.interestedIn + '</label><select id="bk-service">' + SERVICES.map(sv => '<option value="' + sv.key + '">' + esc(trSvc(sv.key).label) + '</option>').join('') + '<option value="">' + t.notSure + '</option></select></div>' +
          '<div class="field"><label>' + t.preferredDate + '</label><input type="date" id="bk-date"></div>' +
          '<div class="field full"><label>' + t.anything + '</label><textarea id="bk-note" placeholder="' + t.anythingPh + '"></textarea></div>' +
          '<div class="field full"><button class="btn btn-primary btn-block" type="submit">' + t.requestBtn + '</button></div>' +
        '</form>' +
      '</div>' +
    '</div>' +
    '</div></div>' + footer()
  );
}

export function attachContactHandlers() {
  const t = S[effectiveLang()];
  const bf = document.getElementById('bookingForm');
  if (bf) bf.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api('/api/appointments', { method: 'POST', body: JSON.stringify({
        name: document.getElementById('bk-name').value,
        phone: document.getElementById('bk-phone').value,
        email: document.getElementById('bk-email').value,
        service: document.getElementById('bk-service').value,
        preferredDate: document.getElementById('bk-date').value,
        note: document.getElementById('bk-note').value
      }) });
      toast(t.sentToast);
      bf.reset();
    } catch (err) { toast(err.message); }
  });
  const qf = document.getElementById('quickMessageForm');
  if (qf) qf.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api('/api/contact', { method: 'POST', body: JSON.stringify({
        name: document.getElementById('qm-name').value,
        email: document.getElementById('qm-email').value,
        message: document.getElementById('qm-message').value
      }) });
      toast(t.sentMessage);
      qf.reset();
    } catch (err) { toast(err.message); }
  });
}
