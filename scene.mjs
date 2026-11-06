/** Progressive scene motion. All portfolio content remains usable without this module. */
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const sceneProgress = (scrollY, height) => clamp(scrollY / Math.max(1, height), 0, 1);

/** A time-based ember path; wrapping avoids allocations during the render loop. */
export function particleAt(seed, time, width, height) {
  const span = height + 80;
  const wrap = ((seed.y * span - time * seed.speed * 55) % span + span) % span;
  return {
    x: seed.x * width + Math.sin(time * .35 + seed.phase) * 24,
    y: wrap - 40,
    alpha: clamp(.25 + Math.sin(time * .8 + seed.phase) * .18, .06, .5),
    size: seed.size,
  };
}

export function createMotionController({window: win, document: doc}) {
  const root = doc.documentElement;
  const button = doc.getElementById('motion-toggle');
  const canvas = doc.getElementById('embers');
  let context = null;
  try { context = canvas?.getContext('2d', {alpha: true}) ?? null; } catch { /* Text-first fallback. */ }
  const preference = win.matchMedia('(prefers-reduced-motion: reduce)');
  const layers = Array.from(doc.querySelectorAll('[data-depth]')).map(element => ({
    element, depth: Number(element.dataset.depth) || .25, center: 0,
  }));
  let width = win.innerWidth, height = win.innerHeight;
  let userPaused = false, frameId = null, destroyed = false;
  let elapsed = 0, lastTime = null, lastCanvasTime = -100;
  let pointerX = 0, pointerY = 0, smoothX = 0, smoothY = 0;
  let scrollY = win.scrollY || 0, scrollDirty = true;
  let particles = [];
  const cleanups = [];
  const isPaused = () => userPaused || preference.matches;
  const listen = (target, type, fn, options) => {
    target.addEventListener(type, fn, options);
    cleanups.push(() => target.removeEventListener(type, fn, options));
  };
  function clearParticles() {
    if (context) context.clearRect(0, 0, width, height);
  }
  function stop() {
    if (frameId !== null) win.cancelAnimationFrame(frameId);
    frameId = null;
    lastTime = null;
  }
  function schedule() {
    if (!destroyed && !isPaused() && !doc.hidden && frameId === null) {
      frameId = win.requestAnimationFrame(frame);
    }
  }
  function updateButton() {
    if (!button) return;
    button.hidden = false;
    button.setAttribute('aria-pressed', String(isPaused()));
    const label = preference.matches ? 'Reduced motion enabled by your device' :
      (isPaused() ? 'Resume scene animation' : 'Pause scene animation');
    button.setAttribute('aria-label', label);
    button.title = label;
    const symbol = button.querySelector('.motion-symbol');
    if (symbol) symbol.textContent = isPaused() ? '▶' : 'Ⅱ';
  }
  function syncMotion() {
    root.classList.toggle('motion-paused', isPaused() || doc.hidden);
    updateButton();
    if (isPaused() || doc.hidden) {
      stop();
      clearParticles();
      for (const {element} of layers) {
        element.style.setProperty('--depth-x', '0px');
        element.style.setProperty('--depth-y', '0px');
      }
    } else {
      scrollDirty = true;
      schedule();
    }
  }
  function updateScroll() {
    root.style.setProperty('--scroll-p', sceneProgress(scrollY, height).toFixed(4));
    const maxScroll = Math.max(1, (root.scrollHeight || height) - height);
    root.style.setProperty('--read-p', clamp(scrollY / maxScroll, 0, 1).toFixed(4));
    scrollDirty = false;
  }
  function resize() {
    width = win.innerWidth;
    height = win.innerHeight;
    if (context) {
      const dpr = Math.min(win.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({length: width < 760 ? 14 : 34}, (_, index) => ({
        x: ((index * .61803398875) % 1),
        y: ((index * .38196601125 + .2) % 1),
        speed: .22 + (index % 5) * .12,
        phase: index * 2.39996,
        size: .7 + (index % 4) * .45,
      }));
    }
    for (const layer of layers) {
      const bounds = layer.element.getBoundingClientRect();
      layer.center = bounds.top + scrollY + bounds.height / 2;
    }
    scrollDirty = true;
    updateScroll();
  }
  function frame(timestamp) {
    frameId = null;
    if (destroyed || isPaused() || doc.hidden) return;
    const delta = lastTime === null ? 16.7 : Math.min(timestamp - lastTime, 64);
    lastTime = timestamp;
    elapsed += delta / 1000;
    smoothX += (pointerX - smoothX) * .055;
    smoothY += (pointerY - smoothY) * .055;
    if (scrollDirty) updateScroll();
    for (const {element, depth, center} of layers) {
      // Each section has its own travel range; deep scroll cannot throw art offscreen.
      const localTravel = clamp((scrollY + height / 2 - center) / Math.max(height, 1), -1.5, 1.5);
      const x = smoothX * depth * (width < 760 ? 0 : 22);
      const y = localTravel * depth * (width < 760 ? 30 : 62) + smoothY * depth * 13;
      element.style.setProperty('--depth-x', `${x.toFixed(2)}px`);
      element.style.setProperty('--depth-y', `${y.toFixed(2)}px`);
    }
    if (context && timestamp - lastCanvasTime >= 32) {
      lastCanvasTime = timestamp;
      clearParticles();
      context.globalCompositeOperation = 'screen';
      for (const seed of particles) {
        const point = particleAt(seed, elapsed, width, height);
        context.globalAlpha = point.alpha;
        context.fillStyle = seed.size > 1.4 ? '#ffb66b' : '#ffe5a6';
        context.beginPath();
        context.ellipse(point.x, point.y, point.size * .5, point.size * 1.5, .4, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      context.globalCompositeOperation = 'source-over';
    }
    schedule();
  }
  function setPaused(value) { userPaused = Boolean(value); syncMotion(); }
  listen(win, 'scroll', () => {
    scrollY = win.scrollY || 0;
    scrollDirty = true;
    if (isPaused()) updateScroll();
  }, {passive: true});
  listen(win, 'resize', resize, {passive: true});
  listen(win, 'pointermove', event => {
    if (event.pointerType === 'touch' || width < 760 || isPaused()) return;
    pointerX = clamp((event.clientX / width - .5) * 2, -1, 1);
    pointerY = clamp((event.clientY / height - .5) * 2, -1, 1);
  }, {passive: true});
  listen(win, 'blur', () => { pointerX = 0; pointerY = 0; });
  listen(doc, 'visibilitychange', syncMotion);
  listen(preference, 'change', syncMotion);
  if (button) listen(button, 'click', () => setPaused(!isPaused()));
  resize();
  syncMotion();
  return {
    setPaused, isPaused,
    destroy() {
      destroyed = true;
      stop();
      clearParticles();
      cleanups.forEach(cleanup => cleanup());
    },
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  createMotionController({window, document});
}
