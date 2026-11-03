// The narrator: each play button fetches its clip only when pressed. The switch in the bar turns the narrator
// off (and stops it) on every page; the choice is kept in this browser.
(() => {
  const KEY = 'shahanshah-narrator';
  const audio = new Audio();
  audio.preload = 'none';
  const buttons = [...document.querySelectorAll('button.narr')];
  const toggle = document.querySelector('button.narr-toggle');
  if (!buttons.length || !audio.canPlayType('audio/ogg; codecs=opus')) return;
  let off = false, current = null;
  try { off = localStorage.getItem(KEY) === 'off'; } catch (e) {}

  const label = (b, s) => { b.querySelector('.l').textContent = s; };
  const stop = () => {
    audio.pause();
    if (current) { current.classList.remove('on'); current.setAttribute('aria-pressed', 'false'); label(current, current.dataset.play); }
    current = null;
  };
  audio.addEventListener('ended', stop);
  audio.addEventListener('error', stop);

  for (const b of buttons) {
    b.hidden = false;
    b.addEventListener('click', () => {
      const again = current === b;
      stop();
      if (again || off) return;
      audio.src = b.dataset.src;
      current = b;
      b.classList.add('on');
      b.setAttribute('aria-pressed', 'true');
      label(b, b.dataset.stop);
      audio.play().catch(stop);
    });
  }

  const show = () => {
    toggle.setAttribute('aria-pressed', String(!off));
    label(toggle, off ? toggle.dataset.off : toggle.dataset.on);
    for (const b of buttons) b.disabled = off;
  };
  if (toggle) {
    toggle.hidden = false;
    show();
    toggle.addEventListener('click', () => {
      off = !off;
      try { localStorage.setItem(KEY, off ? 'off' : 'on'); } catch (e) {}
      if (off) stop();
      show();
    });
  }
})();
