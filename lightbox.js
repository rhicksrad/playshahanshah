// Any painting opens full screen on a click: Esc, a click or the close button shuts it, and the arrow keys
// step through the page's paintings, as a swipe does on a phone. The card thumbnails stay links to their pages.
(() => {
  const pics = [...document.querySelectorAll('img')].filter(i => !i.closest('a.card') && !i.closest('nav'));
  if (!pics.length) return;
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = '<img alt=""><p class="cap"></p><button type="button" class="x" aria-label="Close">×</button>';
  document.body.appendChild(box);
  const big = box.querySelector('img'), cap = box.querySelector('.cap');
  let at = -1;

  const caption = i => {
    const f = i.closest('figure');
    const fc = f && f.querySelector('figcaption');
    return (fc && fc.textContent.trim()) || i.alt || '';
  };
  const show = n => {
    at = (n + pics.length) % pics.length;
    const i = pics[at];
    big.src = i.currentSrc || i.src;
    big.alt = i.alt;
    cap.textContent = caption(i);
    box.hidden = false;
    document.documentElement.classList.add('lb-open');
  };
  const close = () => {
    box.hidden = true;
    big.removeAttribute('src');
    document.documentElement.classList.remove('lb-open');
  };

  pics.forEach((i, n) => {
    i.classList.add('zoomable');
    (i.closest('a') || i).addEventListener('click', e => { e.preventDefault(); show(n); });
  });
  box.addEventListener('click', close);
  // A finger swipes between the paintings; a tap still closes.
  let x0 = null, y0 = 0, swiped = false;
  box.addEventListener('touchstart', e => { if (e.touches.length === 1) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; swiped = false; } }, { passive: true });
  box.addEventListener('touchend', e => {
    if (x0 === null) return;
    const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
    x0 = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    swiped = true;
    show(at + ((dx < 0) === (document.dir !== 'rtl') ? 1 : -1));
  });
  box.addEventListener('click', e => { if (swiped) { swiped = false; e.stopImmediatePropagation(); } }, true);
  document.addEventListener('keydown', e => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') show(at + (document.dir === 'rtl' ? -1 : 1));
    else if (e.key === 'ArrowLeft') show(at + (document.dir === 'rtl' ? 1 : -1));
  });
})();
