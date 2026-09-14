// Screen-sized pages retain the original DOM, form values and event handlers.
let dispose;
let savedKey = '', savedTop = 0;
export function attachWorkspaceViewport(key) {
  dispose?.();
  const content = document.querySelector('.workspace-content');
  if (!content) return;
  const frame = document.createElement('div');
  frame.className = 'workspace-frame';
  content.before(frame);
  frame.append(content);
  const nav = document.createElement('nav');
  nav.className = 'workspace-screen-pages';
  nav.setAttribute('aria-label', 'Workspace screens');
  nav.innerHTML = '<button type="button" class="btn btn-ghost" data-screen="-1">← Previous screen</button><span aria-live="polite"></span><button type="button" class="btn btn-ghost" data-screen="1">Next screen →</button>';
  frame.append(nav);
  const buttons = nav.querySelectorAll('button');
  const label = nav.querySelector('span');
  let pending = 0;
  const step = () => Math.max(1, content.clientHeight - 40);
  const update = () => {
    pending = 0;
    const max = Math.max(0, content.scrollHeight - content.clientHeight);
    buttons[0].disabled = content.scrollTop < 1;
    buttons[1].disabled = content.scrollTop >= max - 1;
    label.textContent = max > 1 ? 'Screen ' + (Math.ceil(content.scrollTop / step()) + 1) + ' of ' + (Math.ceil(max / step()) + 1) : 'All content in view';
    savedKey = key; savedTop = content.scrollTop;
  };
  const schedule = () => { if (!pending) pending = requestAnimationFrame(update); };
  const resize = () => {
    const shell = document.querySelector('.workspace-shell') || frame;
    document.body.style.setProperty('--workspace-height', Math.max(160, window.innerHeight - shell.getBoundingClientRect().top) + 'px');
    schedule();
  };
  buttons.forEach(button => button.addEventListener('click', () => {
    content.scrollTop += Number(button.dataset.screen) * step();
    update();
  }));
  content.addEventListener('scroll', schedule);
  const observer = new ResizeObserver(resize);
  observer.observe(content);
  if (content.firstElementChild) observer.observe(content.firstElementChild);
  const mutations = new MutationObserver(schedule);
  mutations.observe(content, {childList:true, subtree:true, attributes:true});
  window.addEventListener('resize', resize);
  resize();
  content.scrollTop = savedKey === key ? savedTop : 0;
  update();
  dispose = () => {
    observer.disconnect(); mutations.disconnect();
    window.removeEventListener('resize', resize);
    content.removeEventListener('scroll', schedule);
    cancelAnimationFrame(pending);
  };
}
