// Autoplay: the Encyclopedia read aloud. On an article, the button reads each paragraph in turn (its narrator clip,
// or a few seconds' look where it is not voiced yet), scrolling to it, then opens the next article (main's
// data-next) and carries on there, to the end of the Encyclopedia. On the index it starts from the first article.
// A bar at the bottom pauses, skips to the next article, goes full screen or stops. The run is kept for this tab only.
// While a paragraph is read, its painting drifts in a slow pan and zoom, as in a documentary. Full screen shows
// only that: the painting filling the screen and the words being read in a box below it; there the next article
// is fetched into the page, so the screen stays full. Paintings cross-fade, the words fade, and a small timeline
// beside them marks the years the article (or the paragraph, where it names one) is about.
(() => {
  const BASE = new URL('.', (document.currentScript || {}).src || location.href).href; // the site's root
  const KEY = 'shahanshah-autoplay';
  const btn = document.querySelector('button.autoplay');
  if (!btn) return;
  const store = v => { try { v ? sessionStorage.setItem(KEY, v) : sessionStorage.removeItem(KEY); } catch (e) {} };
  const stored = () => { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } };
  btn.hidden = false;
  let main = document.querySelector('main.article');
  if (!main) {
    const first = document.querySelector('[data-first]');
    btn.addEventListener('click', () => { store('on'); location.href = first.dataset.first; });
    return;
  }

  let steps = [];
  const collect = () => { steps = [...main.querySelectorAll('button.narr.mini, span.vslot')]; };
  collect();
  const audio = new Audio();
  const opus = audio.canPlayType('audio/ogg; codecs=opus') !== '';
  // Safari without Ogg Opus plays each clip's AAC copy: a paragraph's beside its .ogg, a narrator clip's in its
  // language's voice repo under narrator/ (the site has no room for them).
  const aac = !opus && audio.canPlayType('audio/mp4; codecs="mp4a.40.2"') !== '';
  const clip = u => !aac ? u : u.replace(/^(?:\.\.\/)*audio\/([^/]+)\/([^/]+)\.ogg$/, (m, loc, key) =>
    `https://audio.reformatgames.com/shahanshah-voice-${loc.toLowerCase().replace('_', '-')}/narrator/${key}.ogg`).replace(/\.ogg$/, '.m4a');
  const silent = () => { try { return localStorage.getItem('shahanshah-narrator') === 'off'; } catch (e) { return false; } };
  let at = -1, timer = 0, left = 0, since = 0, running = false, paused = false, reading = null;
  let pic = null, drift = 0, cinema = false;
  // The pans: where the zoom is anchored, and the way it drifts (percent of the picture).
  const PANS = [['30% 40%', 3, 1.5], ['70% 35%', -3, 1.5], ['50% 70%', 0, -3], ['40% 50%', 2.5, 0], ['60% 55%', -2.5, -1.5]];

  const icon = d => `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${d}"/></svg>`;
  const FULL = 'M2 2h5v2H4v3H2zM9 2h5v5h-2V4H9zM2 9h2v3h3v2H2zM12 9h2v5H9v-2h3z';
  const bar = document.createElement('div');
  bar.className = 'ap-bar';
  bar.hidden = true;
  bar.innerHTML = `<button type="button" class="ap-pause">${icon('M4 3h3v10H4zM9 3h3v10H9z')}<span>${btn.dataset.pause}</span></button>`
    + `<button type="button" class="ap-next">${icon('M3 3v10l7-5zM11 3h2v10h-2z')}<span>${btn.dataset.next}</span></button>`
    + `<button type="button" class="ap-full">${icon(FULL)}<span>${btn.dataset.full || 'Full screen'}</span></button>`
    + `<button type="button" class="ap-stop">${icon('M4 4h8v8H4z')}<span>${btn.dataset.stop}</span></button>`;
  document.body.appendChild(bar);
  const pauseBtn = bar.querySelector('.ap-pause');

  // Full screen: the painting above, the words below.
  const film = document.createElement('div');
  film.className = 'cinema';
  film.hidden = true;
  film.innerHTML = '<div class="art"><img alt="" class="on"><img alt=""></div>'
    + '<div class="words"><div class="text"><p class="where"></p><p class="said"></p></div>'
    + '<div class="when" dir="ltr"><div class="axis"><span class="span"></span><span class="dot"></span></div>'
    + '<p class="year"></p><p class="ends"><span></span><span></span></p></div><p class="credit" dir="ltr"></p></div>';
  document.body.appendChild(film);
  const layers = [...film.querySelectorAll('.art img')];
  let front = 0;
  const where = film.querySelector('.where'), said = film.querySelector('.said');
  // The words fade out, change, and fade back in.
  let wordsTimer = 0;
  const setWords = (place, words) => {
    clearTimeout(wordsTimer);
    film.querySelector('.text').classList.add('fade');
    wordsTimer = setTimeout(() => {
      where.textContent = place;
      said.textContent = words;
      film.querySelector('.text').classList.remove('fade');
    }, 350);
  };

  // The timeline: the years 560 to 470 BCE, the article's span lit, a dot on the paragraph's year where it names one.
  const FA = '۰۱۲۳۴۵۶۷۸۹';
  const digits = n => btn.dataset.digits === 'fa' ? String(n).replace(/\d/g, d => FA[d]) : String(n);
  const yearLabel = (a, b) => (btn.dataset.year || '{y} BCE').replace('{y}', b && b !== a ? `${digits(a)}–${digits(b)}` : digits(a));
  const BCE_TOKEN = (btn.dataset.year || '{y} BCE').replace('{y}', '').trim();
  const yearsIn = text => {
    const t = text.replace(/[۰-۹]/g, d => FA.indexOf(d));
    if (!BCE_TOKEN || !t.includes(BCE_TOKEN)) return [];
    return [...t.matchAll(/(?<!\d)([4-7]\d\d)(?!\d)/g)].map(m => +m[1]);
  };
  const timeline = p => {
    const when = film.querySelector('.when');
    // An article that names no years of its own sits in the game's era, Cyrus to Mycale.
    const own = (main.dataset.span || '').split(',').filter(Boolean).map(Number);
    const span = own.length ? own : [559, 479];
    const named = p ? yearsIn(p.textContent) : [];
    const ys = named.length ? named : span;
    when.hidden = !ys.length;
    if (!ys.length) return;
    const old = Math.max(560, ...ys, ...span) + 5, late = Math.min(470, ...ys, ...span) - 5;
    const x = y => ((old - y) / (old - late) * 100).toFixed(2) + '%';
    const s = when.querySelector('.span'), d = when.querySelector('.dot');
    if (span.length) { s.style.left = x(Math.max(...span)); s.style.width = `calc(${x(Math.min(...span))} - ${x(Math.max(...span))} + 4px)`; s.hidden = false; }
    else s.hidden = true;
    const a = Math.max(...ys), b = Math.min(...ys);
    d.style.left = x((a + b) / 2);
    when.querySelector('.year').textContent = yearLabel(a, b);
    const ends = when.querySelectorAll('.ends span');
    ends[0].textContent = yearLabel(old - 5);
    ends[1].textContent = yearLabel(late + 5);
  };
  let idle = 0;
  const wake = () => {
    film.classList.remove('idle');
    clearTimeout(idle);
    idle = setTimeout(() => film.classList.add('idle'), 2500);
  };
  film.addEventListener('mousemove', wake);
  film.addEventListener('touchstart', wake, { passive: true });

  const para = el => el.closest('p') || el.parentElement;
  const dwell = p => Math.min(9000, Math.max(3000, 2000 + (p ? p.textContent.length : 0) * 25));
  const wait = ms => { left = ms; since = Date.now(); clearTimeout(timer); timer = setTimeout(step, ms); };
  const title = () => {
    const h = main.querySelector('h1');
    return h ? h.textContent.trim() : document.title;
  };
  const show = el => {
    if (reading) reading.classList.remove('reading');
    reading = para(el);
    reading.classList.add('reading');
    if (sounds) soundscape();
    if (cinema) {
      setWords(title(), reading.textContent.trim());
      timeline(reading);
    } else frame(reading);
  };
  // The painting the paragraph belongs to: its section's, or for the article's own lines the head's.
  const painting = p => {
    const sec = p.closest('section.sec');
    return (sec && sec.querySelector('figure img')) || main.querySelector('header.hero img, .lead-art img');
  };
  // What moves: the page's painting, or in full screen its copy, which cross-fades in over the last one (still
  // drifting) once it has loaded.
  const canvas = img => {
    if (!cinema) return img;
    const src = img.currentSrc || img.src;
    if (layers[front].dataset.src === src) return layers[front];
    const out = layers[front];
    front = 1 - front;
    const inn = layers[front];
    inn.dataset.src = src;
    inn.style.transition = 'none';
    inn.style.transform = 'scale(1)';
    inn.src = src;
    const swap = () => { inn.classList.add('on'); out.classList.remove('on'); };
    (inn.decode ? inn.decode() : Promise.resolve()).then(swap, swap);
    if (moving === out) { moving = null; pic = null; }
    return inn;
  };
  let moving = null;
  // Drifts `img` for `ms`: a fresh pan for a new painting, a little further for the one already moving.
  // Drifts `img` for `ms` at one steady rate: a fresh pan for a new painting; for the one already moving (the
  // next paragraph under the same painting, an "In the game" line) the same pan carries on unbroken.
  const RATE = 0.009; // zoom added a second
  // Where a painting's pan closes in: on its main faces where the build found them (data-focus, from
  // tools/encyclopedia/focal.py), drifting them a little toward the middle; else one of the PANS.
  const aim = img => {
    const f = (img.dataset.focus || '').split(',').map(Number);
    if (f.length !== 2 || f.some(isNaN)) return PANS[drift % PANS.length];
    return [`${(f[0] * 100).toFixed(1)}% ${(f[1] * 100).toFixed(1)}%`, (0.5 - f[0]) * 6, (0.45 - f[1]) * 6];
  };
  const kenBurns = (img, ms) => {
    if (!img) return;
    crowdOf(img);
    const el = canvas(img);
    if (moving && moving !== el && !layers.includes(moving)) settle(moving);
    if (pic !== img || moving !== el) {
      if (pic !== img) drift++;
      pic = img;
      el.style.transition = 'none';
      el.style.transform = 'scale(1)';
      el.style.transformOrigin = aim(img)[0];
      void el.offsetWidth;
    }
    const [, x, y] = aim(img);
    const now = getComputedStyle(el).transform;
    const z0 = now.startsWith('matrix(') ? parseFloat(now.slice(7)) : 1;
    el.style.transition = 'none';
    el.style.transform = now === 'none' ? 'scale(1)' : now;
    void el.offsetWidth;
    const run = Math.max(1000, ms) + 1500; // overlaps the next paragraph's start, so the drift never halts
    const z = Math.min(1.45, z0 + RATE * run / 1000), k = (z - 1) / 0.18;
    el.style.transition = `transform ${run}ms linear`;
    el.style.transform = `scale(${z.toFixed(4)}) translate(${(x * k).toFixed(3)}%, ${(y * k).toFixed(3)}%)`;
    moving = el;
  };
  const freeze = () => {
    if (!moving) return;
    moving.style.transform = getComputedStyle(moving).transform;
    moving.style.transition = 'none';
  };
  const settle = el => {
    el.style.transition = 'transform 1.2s ease-out';
    el.style.transform = '';
    if (el === moving) { moving = null; pic = null; }
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
    bar.querySelector('.ap-full').classList.toggle('hot', cinema);
  };
  // The soundscape (sound/sounds.json, build.py's Soundscape), well under the narrator: a music bed by the
  // article's region (data-music; a battle's own music for a fight) and a bed by what it is about (data-sound: the
  // town's murmur, the wind, or now and then a sound of battle). Each fades in and out as the article changes.
  const EXT = opus ? '.ogg' : '.m4a';
  // The music files sit near -21 LUFS and the town and wind beds near -13, so the beds play far lower.
  const VOL = { music: 0.12, bed: 0.03, town: 0.02, battle: 0.12, shot: 0.1, scene: 0.06, cue: 0.08 };
  const CROWD = 6; // faces a painting shows (data-faces) for the town's murmur to play under it
  let crowd = false;
  let sounds = null;
  const loading = fetch(BASE + 'sound/sounds.json').then(r => r.json()).then(d => { sounds = d; }).catch(() => {});
  const beds = {}; // channel -> {audio, src}
  // Levels go through Web Audio gain: Safari on iPhone and iPad ignores an audio element's volume and plays every
  // bed at full loudness, louder than the narrator. Without Web Audio the element's own volume is used.
  let actx = null;
  const context = () => {
    if (!actx && (window.AudioContext || window.webkitAudioContext)) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
    }
    if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
    return actx;
  };
  const leveled = (src, v) => {
    const a = new Audio();
    // Another site's audio (the soundtrack) reaches Web Audio only when fetched with CORS.
    if (/^https?:/.test(src) && !src.startsWith(location.origin)) a.crossOrigin = 'anonymous';
    a.src = src;
    const c = context();
    if (c) {
      try {
        a.gain = c.createGain();
        a.gain.gain.value = v;
        c.createMediaElementSource(a).connect(a.gain).connect(c.destination);
      } catch (e) { a.gain = null; a.volume = v; }
    } else a.volume = v;
    return a;
  };
  const level = a => (a.gain ? a.gain.gain.value : a.volume);
  const setLevel = (a, v) => { if (a.gain) a.gain.gain.value = v; else a.volume = v; };
  const fadeTo = (a, to, ms, done) => {
    clearInterval(a.fading);
    const from = level(a), t0 = Date.now();
    a.fading = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / ms);
      setLevel(a, from + (to - from) * k);
      if (k >= 1) { clearInterval(a.fading); if (done) done(); }
    }, 50);
  };
  const channel = (name, src, vol) => {
    const cur = beds[name];
    if (cur && cur.src === src) { if (cur.audio.paused && running && !paused) cur.audio.play().catch(() => {}); return; }
    if (cur) { const a = cur.audio; fadeTo(a, 0, 1500, () => a.pause()); delete beds[name]; }
    if (!src) return;
    const a = leveled((/^https?:/.test(src) ? src : BASE + src) + EXT, 0);
    a.loop = name !== 'music';
    if (name === 'music') {
      a.addEventListener('ended', () => { track = (track + 1) % playlist.length; resumeAt = 0; music(); });
      a.addEventListener('loadedmetadata', () => { if (resumeAt) { a.currentTime = resumeAt; resumeAt = 0; } });
    }
    beds[name] = { audio: a, src };
    if (name === 'music') a.addEventListener('timeupdate', credit);
    if (running && !paused) a.play().then(() => fadeTo(a, vol, 2500)).catch(() => {});
  };
  let shotTimer = 0;
  const shots = () => {
    clearTimeout(shotTimer);
    if (!running || paused || !sounds || !fighting()) return;
    shotTimer = setTimeout(() => {
      const s = leveled(BASE + sounds.shots[Math.floor(Math.random() * sounds.shots.length)] + EXT,
        VOL.shot * (0.5 + Math.random() * 0.5));
      s.play().catch(() => {});
      shots();
    }, 5000 + Math.random() * 9000);
  };
  const soundscape = () => {
    if (!sounds) { loading.then(() => { if (sounds && running) soundscape(); }); return; }
    music();
    const town = main.dataset.sound === 'town';
    scene();
    if (fighting()) channel('bed', sounds.beds.battle || '', VOL.battle);
    else channel('bed', town && !crowd ? '' : sounds.beds[main.dataset.sound] || '', town ? VOL.town : VOL.bed);
    shots();
  };
  // What the paragraph shows, heard under it (data-cue, from its English: build.py's CUES): its first loop all
  // through (rain, fire, water, a feast, wind), and now and then one of its other sounds (thunder, animals,
  // building, stone, birds, a scribe, a collapse, a horn).
  let cueTimer = 0;
  const scene = () => {
    clearTimeout(cueTimer);
    const el = steps[at];
    const cues = (el && el.dataset.cue || '').split(',').filter(c => sounds.fx && sounds.fx[c]);
    const loop = cues.find(c => sounds.fx[c].loop);
    channel('scene', loop ? sounds.fx[loop].src : '', VOL.scene);
    const once = cues.filter(c => !sounds.fx[c].loop);
    if (!once.length || paused) return;
    const play = () => {
      if (!running || paused || steps[at] !== el) return;
      const c = once[Math.floor(Math.random() * once.length)];
      leveled(BASE + sounds.fx[c].src + EXT, VOL.cue * (0.6 + Math.random() * 0.4)).play().catch(() => {});
      cueTimer = setTimeout(play, 6000 + Math.random() * 6000);
    };
    cueTimer = setTimeout(play, 1200 + Math.random() * 1500);
  };
  // A battle: the whole article (data-sound="battle"), or the section being read tells of fighting (data-fight).
  const fighting = () => main.dataset.sound === 'battle'
    || !!(reading && reading.closest('section.sec[data-fight]'));
  // The town's murmur only under a painting of a crowd.
  const crowdOf = img => {
    const now = !!img && +(img.dataset.faces || 0) >= CROWD;
    if (now !== crowd) { crowd = now; if (running && sounds) soundscape(); }
  };
  const hush = on => {
    for (const [name, b] of Object.entries(beds)) {
      const vol = name === 'music' ? VOL.music : name === 'scene' ? VOL.scene
        : b.src.includes('/town') ? VOL.town : b.src.includes('/battle') ? VOL.battle : VOL.bed;
      if (on) b.audio.pause();
      else b.audio.play().then(() => { if (level(b.audio) < 0.01) fadeTo(b.audio, vol, 2500); }).catch(() => {});
    }
    if (on) { clearTimeout(shotTimer); clearTimeout(cueTimer); } else { shots(); if (sounds) scene(); }
  };
  const silence = () => {
    channel('music', '', 0); channel('bed', '', 0); channel('scene', '', 0);
    clearTimeout(shotTimer); clearTimeout(cueTimer);
  };
  // The game's whole soundtrack, from the title's theme on, one track after another (the shahanshah-music repo,
  // tools/website/music_playlist.py). Where it had got to is kept for this tab, so the next page carries on.
  const MUSIC_BASE = 'https://audio.reformatgames.com/shahanshah-music/';
  const SAVE = 'shahanshah-music';
  let playlist = null, track = 0, resumeAt = 0, saved = 0;
  const listing = fetch(MUSIC_BASE + 'playlist.json').then(r => r.json()).then(d => { playlist = d; }).catch(() => {});
  try {
    const was = JSON.parse(sessionStorage.getItem(SAVE) || 'null');
    if (was) { track = was.i || 0; resumeAt = was.t || 0; }
  } catch (e) {}
  function music() {
    if (!playlist) { listing.then(() => { if (playlist && running) music(); }); return; }
    channel('music', MUSIC_BASE + playlist[track % playlist.length].src, VOL.music);
  }
  // The track's credit, as its licence asks, under full screen's words; and where the music is, kept.
  function credit() {
    const b = beds.music;
    if (!b || !playlist) return;
    if (Date.now() - saved > 4000) {
      saved = Date.now();
      try { sessionStorage.setItem(SAVE, JSON.stringify({ i: track, t: b.audio.currentTime })); } catch (e) {}
    }
    const line = '♪ ' + playlist[track % playlist.length].credit;
    const el = film.querySelector('.credit');
    if (el.textContent !== line) { el.textContent = line; bar.title = line; }
  }

  const blocked = () => { paused = true; left = 0; label(); }; // the browser wants a click before it speaks

  function step() {
    clearTimeout(timer);
    audio.pause();
    at++;
    if (at >= steps.length) return nextArticle();
    const el = steps[at];
    show(el);
    if (el.tagName === 'BUTTON' && (opus || aac) && !silent()) {
      audio.src = clip(el.dataset.src);
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

  // Full screen keeps the screen: the next article is fetched and put in this page's place.
  async function swapTo(url) {
    try {
      const html = await (await fetch(url)).text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const next = doc.querySelector('main.article');
      if (!next) throw new Error('no article');
      main.replaceWith(next);
      main = next;
      soundscape();
      document.title = doc.title;
      history.replaceState(null, '', url);
      collect();
      at = -1;
      reading = null;
      if (moving) settle(moving);
      setWords(title(), '');
      timeline(null);
      const head = main.querySelector('header.hero img, .lead-art img');
      if (head) kenBurns(head, 1800);
      if (!paused) wait(1800);
    } catch (e) { store('on'); location.href = url; }
  }

  function nextArticle() {
    clearTimeout(timer);
    audio.pause();
    if (!main.dataset.next) return stop();
    if (cinema) swapTo(new URL(main.dataset.next, location.href).href);
    else { store(cinema ? 'film' : 'on'); location.href = main.dataset.next; }
  }
  function stop() {
    running = paused = false;
    clearTimeout(timer);
    audio.pause();
    store(null);
    bar.hidden = true;
    silence();
    setCinema(false);
    if (reading) reading.classList.remove('reading');
    if (moving) settle(moving);
  }
  function pause() {
    if (!running) return;
    paused = !paused;
    hush(paused);
    if (paused) {
      clearTimeout(timer);
      if (!audio.paused) audio.pause(); else left = Math.max(0, left - (Date.now() - since));
      freeze();
    } else if (at < 0) step();
    else if (audio.src && audio.paused && !audio.ended && steps[at] && steps[at].tagName === 'BUTTON' && !silent()) audio.play().catch(blocked);
    else if (left > 0) { wait(left); if (pic) kenBurns(pic, left); }
    else step();
    label();
  }
  function setCinema(on) {
    if (on === cinema) return;
    cinema = on;
    film.hidden = !on;
    document.documentElement.classList.toggle('cinema-on', on);
    if (on) {
      const root = document.documentElement; // the whole page, so the bar stays on screen too
      if (root.requestFullscreen && !document.fullscreenElement) root.requestFullscreen().catch(() => {});
      wake();
      where.textContent = title();
      said.textContent = reading ? reading.textContent.trim() : '';
      timeline(reading);
    } else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (moving) settle(moving);
    if (running && reading && !paused) kenBurns(painting(reading), audio.paused ? left : ((audio.duration || 20) - audio.currentTime) * 1000);
    else if (on) { const head = main.querySelector('header.hero img, .lead-art img'); if (head) canvas(head); }
    if (stored()) store(on ? 'film' : 'on');
    label();
  }
  function start(fromLoad) {
    running = true;
    paused = false;
    if (!stored()) store('on');
    bar.hidden = false;
    label();
    soundscape();
    at = -1;
    if (!fromLoad) return step();
    window.scrollTo({ top: 0 });
    wait(1800); // the article's painting and title first
  }

  btn.addEventListener('click', () => { context(); if (running) stop(); else start(false); });
  pauseBtn.addEventListener('click', () => { context(); pause(); });
  bar.querySelector('.ap-next').addEventListener('click', nextArticle);
  bar.querySelector('.ap-stop').addEventListener('click', stop);
  bar.querySelector('.ap-full').addEventListener('click', () => setCinema(!cinema));
  // Leaving the browser's full screen (Esc) leaves the film too.
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && cinema) setCinema(false); });
  // A paragraph's own play button takes over: autoplay waits until resumed.
  document.addEventListener('click', e => {
    if (running && !paused && e.target.closest && e.target.closest('main button.narr')) pause();
  }, true);
  document.addEventListener('keydown', e => {
    if (!running || e.key !== 'Escape' || document.querySelector('.lightbox:not([hidden])')) return;
    if (cinema) setCinema(false); else stop();
  });
  const was = stored();
  if (was) { start(true); if (was === 'film') setCinema(true); }
})();
