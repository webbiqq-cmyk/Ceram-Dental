export function reviewSection() {
  const quotes = [
    'I felt listened to, and had time to understand each step of my care.',
    'A calm space, a thoughtful conversation, and a plan that felt personal.',
    'It was the attention to the little details that stayed with me.'
  ];
  return '<section class="patient-stories"><div class="stories-heading"><span class="eyebrow">Patient stories</span><h2 class="serif">The feeling<br>you take with you.</h2><p>Illustrative reviews for this preview.<br>Not real patient testimonials.</p></div>' +
    '<div class="stories-content"><div class="stories-track" id="storiesTrack" tabindex="0" aria-label="Illustrative review examples">' +
    quotes.map((q, i) => '<figure class="story"><span class="story-mark" aria-hidden="true">&ldquo;</span><blockquote>' + q + '</blockquote><figcaption>Illustrative review ' + (i + 1) + ' / 3</figcaption></figure>').join('') +
    '</div><div class="story-controls"><button type="button" class="icon-btn" data-review-step="-1" aria-label="Previous review" title="Previous review">&larr;</button><button type="button" class="icon-btn" data-review-step="1" aria-label="Next review" title="Next review">&rarr;</button></div></div></section>';
}
