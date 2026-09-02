// Scroll-reveal animation for elements marked .reveal — fades/slides them in
// the first time they enter the viewport, once per element.
const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const revealObserver = (!prefersReduced && 'IntersectionObserver' in window) ? new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    revealObserver.unobserve(el);
    // paint the hidden state, then flip on the next frame so the transition always runs
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('visible')));
  });
}, { threshold: 0, rootMargin: '0px 0px 10% 0px' }) : null;

export function initReveal() {
  const els = document.querySelectorAll('#app .reveal');
  els.forEach((el, i) => {
    if (!el.style.getPropertyValue('--i')) el.style.setProperty('--i', i % 6);
    if (revealObserver) revealObserver.observe(el); else el.classList.add('visible');
  });
}
