import { effectiveLang } from '../i18n.js';

const S = {
  en: {
    eyebrow: 'Patient stories', headline: 'The feeling<br>you take with you.',
    note: 'Illustrative reviews for this preview.<br>Not real patient testimonials.',
    quotes: [
      'I felt listened to, and had time to understand each step of my care.',
      'A calm space, a thoughtful conversation, and a plan that felt personal.',
      'It was the attention to the little details that stayed with me.'
    ],
    caption: i => 'Illustrative review ' + i + ' / 3',
    prev: 'Previous review', next: 'Next review'
  },
  ar: {
    eyebrow: 'قصص المرضى', headline: 'الشعور<br>الذي يبقى معك.',
    note: 'تقييمات توضيحية لهذا العرض.<br>ليست شهادات مرضى حقيقية.',
    quotes: [
      'شعرت بأنني مسموع، وأتيح لي الوقت لفهم كل خطوة من رعايتي.',
      'مساحة هادئة، وحديث متأنٍ، وخطة شعرت بأنها مصممة لي.',
      'الاهتمام بأدق التفاصيل هو ما بقي في ذهني.'
    ],
    caption: i => 'تقييم توضيحي ' + i + ' / 3',
    prev: 'التقييم السابق', next: 'التقييم التالي'
  }
};

export function reviewSection() {
  const t = S[effectiveLang()];
  return '<section class="patient-stories"><div class="stories-heading"><span class="eyebrow">' + t.eyebrow + '</span><h2 class="serif">' + t.headline + '</h2><p>' + t.note + '</p></div>' +
    '<div class="stories-content"><div class="stories-track" id="storiesTrack" tabindex="0" aria-label="Illustrative review examples">' +
    t.quotes.map((q, i) => '<figure class="story"><span class="story-mark" aria-hidden="true">&ldquo;</span><blockquote>' + q + '</blockquote><figcaption>' + t.caption(i + 1) + '</figcaption></figure>').join('') +
    '</div><div class="story-controls"><button type="button" class="icon-btn" data-review-step="-1" aria-label="' + t.prev + '" title="' + t.prev + '">&larr;</button><button type="button" class="icon-btn" data-review-step="1" aria-label="' + t.next + '" title="' + t.next + '">&rarr;</button></div></div></section>';
}
