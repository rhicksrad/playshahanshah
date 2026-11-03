// Autoplay: the Encyclopedia read aloud. On an article, the button reads each paragraph in turn (its narrator clip,
// or a few seconds' look where it is not voiced yet), scrolling to it, then opens the next article (main's
// data-next) and carries on there, to the end of the Encyclopedia. On the index it starts from the first article.
// A bar at the bottom pauses, skips to the next article or stops. The run is kept for this tab only.
// While a paragraph is read, its painting drifts in a slow pan and zoom, as in a documentary.
(() => {
  const KEY = 'shahanshah-autoplay';
  const btn = document.querySelector('button.autoplay');
  if (!btn) return;
  const store = v => { try { v ? sessionStorage.setItem(KEY, v) : sessionStorage.removeItem(KEY); } catch (e) {} };
  const stored = () => { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } };
  btn.hidden = false;
  const main = document.querySelector('main.article');
  if (!main) {
    const first = document.querySelector('[data-first]');
    btn.addEventListener('click', () => { store('on'); location.href = first.dataset.first; });
    return;
  }

  const steps = [...main.querySelectorAll('button.narr.mini, span.vslot')];
  const audio = new Audio();
  const opus = audio.canPlayType('audio/ogg; codecs=opus') !== '';
  const silent = () => { try { return localStorage.getItem('shahanshah-narrator') === 'off'; } catch (e) { return false; } };
  let at = -1, timer = 0, left = 0, since = 0, running = false, paused = false, reading = null;
  let pic = null, drift = 0, driftEnd = 0;
  // The pans: where the zoom is anchored, and the way it drifts (percent of the picture).
  const PANS = [['30% 40%', 3, 1.5], ['70% 35%', -3, 1.5], ['50% 70%', 0, -3], ['40% 50%', 2.5, 0], ['60% 55%', -2.5, -1.5]];

  const icon = d => `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${d}"/></svg>`;
  const bar = document.createElement('div');
  bar.className = 'ap-bar';
  bar.hidden = true;
  bar.innerHTML = `<button type="button" class="ap-pause">${icon('M4 3h3v10H4zM9 3h3v10H9z')}<span>${btn.dataset.pause}</span></button>`
    + `<button type="button" class="ap-next">${icon('M3 3v10l7-5zM11 3h2v10h-2z')}<span>${btn.dataset.next}</span></button>`
    + `<button type="button" class="ap-stop">${icon('M4 4h8v8H4z')}<span>${btn.dataset.stop}</span></button>`;
  document.body.appendChild(bar);
  const pauseBtn = bar.querySelector('.ap-pause');

  const para = el => el.closest('p') || el.parentElement;
  const dwell = p => Math.min(9000, Math.max(3000, 2000 + (p ? p.textContent.length : 0) * 25));
  const wait = ms => { left = ms; since = Date.now(); clearTimeout(timer); timer = setTimeout(step, ms); };
  const show = el => {
    if (reading) reading.classList.remove('reading');
    reading = para(el);
    reading.classList.add('reading');
    frame(reading);
  };
  // The painting the paragraph belongs to: its section's, or for the article's own lines the head's.
  const painting = p => {
    const sec = p.closest('section.sec');
    return sec ? sec.querySelector('figure img') : main.querySelector('header.hero img, .lead-art img');
  };
  // Drifts `img` for `ms`: a fresh pan for a new painting, a little further for the one already moving.
  const kenBurns = (img, ms) => {
    if (!img) return;
    if (pic && pic !== img) settle(pic);
    const again = pic === img;
    if (!again) { pic = img; drift++; img.style.transformOrigin = PANS[drift % PANS.length][0]; }
    const [, x, y] = PANS[drift % PANS.length];
    const now = getComputedStyle(img).transform;
    img.style.transition = 'none';
    img.style.transform = now === 'none' ? 'scale(1)' : now;
    void img.offsetWidth;
    const z = again ? 1.3 : 1.18, k = again ? 1.6 : 1;
    img.style.transition = `transform ${Math.max(1000, ms)}ms linear`;
    img.style.transform = `scale(${z}) translate(${x * k}%, ${y * k}%)`;
    driftEnd = Date.now() + ms;
  };
  const freeze = () => {
    if (!pic) return;
    pic.style.transform = getComputedStyle(pic).transform;
    pic.style.transition = 'none';
  };
  const settle = img => {
    img.style.transition = 'transform 1.2s ease-out';
    img.style.transform = '';
    if (img === pic) pic = null;
  };
  // Keeps the painting in frame: the paragraph's section (or, for the lead, the article's head) sits at the top
  // under the nav, unless the paragraph would then run below the bar; then it scrolls just enough to show it.
  const frame = p => {
    const anchor = p.closest('section.sec') || main.querySelector('header.hero, header.topic-head') || p;
    const nav = document.querySelector('nav.top');
    const navH = nav && getComputedStyle(nav).position !== 'static' ? nav.offsetHeight : 0;
    const room = window.innerHeight - (bar.hidden ? 0 : bar.offsetHeight + 32);
    const y = window.scrollY;
    let top = anchor.getBoundingClientRect().top + y - navH - 12;
    const bottom = p.getBoundingClientRect().bottom + y + 12;
    if (bottom - top > room) top = bottom - room;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };
  const label = () => {
    pauseBtn.querySelector('span').textContent = paused ? btn.dataset.resume : btn.dataset.pause;
    pauseBtn.querySelector('path').setAttribute('d', paused ? 'M4 3v10l9-5z' : 'M4 3h3v10H4zM9 3h3v10H9z');
    pauseBtn.classList.toggle('hot', paused);
  };
  const blocked = () => { paused = true; left = 0; label(); }; // the browser wants a click before it speaks

  function step() {
    clearTimeout(timer);
    audio.pause();
    at++;
    if (at >= steps.length) return nextArticle();
    const el = steps[at];
    show(el);
    if (el.tagName === 'BUTTON' && opus && !silent()) {
      audio.src = el.dataset.src;
      audio.play().catch(blocked);
    } else {
      wait(dwell(reading));
      kenBurns(painting(reading), left);
    }
  }
  audio.addEventListener('playing', () => {
    if (running && reading) kenBurns(painting(reading), ((audio.duration || 20) - audio.currentTime) * 1000 + 600);
  });
  audio.addEventListener('ended', () => wait(600));
  audio.addEventListener('error', () => { if (running) wait(dwell(reading)); });

  function nextArticle() {
    clearTimeout(timer);
    audio.pause();
    if (main.dataset.next) { store('on'); location.href = main.dataset.next; } else stop();
  }
  function stop() {
    running = paused = false;
    clearTimeout(timer);
    audio.pause();
    store(null);
    bar.hidden = true;
    if (reading) reading.classList.remove('reading');
    if (pic) settle(pic);
  }
  function pause() {
    if (!running) return;
    paused = !paused;
    if (paused) {
      clearTimeout(timer);
      if (!audio.paused) audio.pause(); else left = Math.max(0, left - (Date.now() - since));
      freeze();
    } else if (at < 0) step();
    else if (audio.src && audio.paused && !audio.ended && steps[at].tagName === 'BUTTON' && !silent()) audio.play().catch(blocked);
    else if (left > 0) { wait(left); if (pic) kenBurns(pic, left); }
    else step();
    label();
  }
  function start(fromLoad) {
    running = true;
    paused = false;
    store('on');
    bar.hidden = false;
    label();
    at = -1;
    if (!fromLoad) return step();
    window.scrollTo({ top: 0 });
    wait(1800); // the article's painting and title first
  }

  btn.addEventListener('click', () => { if (running) stop(); else start(false); });
  pauseBtn.addEventListener('click', pause);
  bar.querySelector('.ap-next').addEventListener('click', nextArticle);
  bar.querySelector('.ap-stop').addEventListener('click', stop);
  // A paragraph's own play button takes over: autoplay waits until resumed.
  for (const b of document.querySelectorAll('button.narr')) b.addEventListener('click', () => { if (running && !paused) pause(); }, true);
  document.addEventListener('keydown', e => { if (running && e.key === 'Escape' && !document.querySelector('.lightbox:not([hidden])')) stop(); });
  if (stored() === 'on') start(true);
})();
