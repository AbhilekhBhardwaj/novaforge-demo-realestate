(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Hero video: guarantee playback, respect reduced motion ---------- */
  const video = document.querySelector('[data-hero-video]');
  const toggle = document.querySelector('[data-vidtoggle]');
  const setPaused = (paused) => {
    toggle.classList.toggle('is-paused', paused);
    toggle.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
  };
  if (video) {
    video.muted = true; // iOS requires the property, not only the attribute
    const tryPlay = () => { const p = video.play(); if (p) p.catch(() => setPaused(true)); };
    // Sources attach right after first paint so text/fonts win the bandwidth race.
    // The CSS poster is the video's exact first frame, so the hand-off is invisible.
    const attach = () => {
      video.querySelectorAll('source[data-src]').forEach((s) => { s.src = s.dataset.src; s.removeAttribute('data-src'); });
      video.load();
      if (!reduce.matches) tryPlay();
    };
    if (reduce.matches) { video.removeAttribute('autoplay'); setPaused(true); }
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1200))]).then(() => requestAnimationFrame(attach));
    video.addEventListener('play', () => setPaused(false));
    video.addEventListener('pause', () => setPaused(true));
    let userPaused = reduce.matches;
    toggle.addEventListener('click', () => {
      userPaused = !video.paused;
      userPaused ? video.pause() : tryPlay();
    });
    // Pause offscreen to save battery; resume on return unless the user paused it
    new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) video.pause();
      else if (!userPaused && video.paused) tryPlay();
    }, { threshold: 0.05 }).observe(video);
  }

  /* ---------- Nav state + mobile call bar ---------- */
  const nav = document.querySelector('[data-nav]');
  const callbar = document.querySelector('.callbar');
  const hero = document.querySelector('.hero');

  /* ---------- Parallax (transform-only, rAF, 3 depths) ---------- */
  const layers = [...document.querySelectorAll('[data-speed]')].map((el) => ({
    el, speed: parseFloat(el.dataset.speed), host: el.parentElement,
  }));
  const heroMedia = document.querySelector('[data-hero-media]');
  const heroCopy = document.querySelector('[data-hero-copy]');
  let ticking = false;
  let vh = innerHeight;

  const frame = () => {
    ticking = false;
    // Read everything first, then write, so each frame costs at most one layout.
    const y = scrollY;
    const heroH = hero.offsetHeight;
    const k = innerWidth < 760 ? 0.6 : 1;
    const moves = reduce.matches ? [] : layers.map((l) => {
      const r = l.host.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return null;
      return (r.top + r.height / 2 - vh / 2) * l.speed * k;
    });

    nav.classList.toggle('is-solid', y > 40);
    if (callbar) callbar.classList.toggle('is-on', y > heroH * 0.7);
    if (reduce.matches) return;
    if (y < vh * 1.2) {
      heroMedia.style.transform = `translate3d(0,${(y * 0.35 * k).toFixed(1)}px,0) scale(${1 + y / vh * 0.06})`;
      heroCopy.style.transform = `translate3d(0,${(y * -0.12 * k).toFixed(1)}px,0)`;
      heroCopy.style.opacity = Math.max(0, 1 - y / (vh * 0.75)).toFixed(3);
    }
    moves.forEach((m, i) => { if (m !== null) layers[i].el.style.transform = `translate3d(0,${m.toFixed(1)}px,0)`; });
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', () => { vh = innerHeight; request(); });
  reduce.addEventListener?.('change', () => {
    if (reduce.matches) {
      [heroMedia, heroCopy, ...layers.map((l) => l.el)].forEach((el) => { el.style.transform = ''; });
      heroCopy.style.opacity = '';
    }
    request();
  });
  request(); // first pass on the next frame, after the browser's own initial layout

  /* ---------- Hours: today + open/closed (America/Chicago) ---------- */
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false,
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    const mins = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
    const open = day !== 0 && mins >= 540 && mins < 1080;
    let text;
    if (open) text = 'Open now until 6pm';
    else if (day !== 0 && mins < 540) text = 'Opens today at 9am';
    else if (day === 0) text = 'Closed today. Opens Monday at 9am';
    else if (day === 6) text = 'Opens Monday at 9am';
    else text = 'Opens tomorrow at 9am';
    document.querySelectorAll('[data-status]').forEach((el) => {
      el.textContent = text;
      el.classList.add(open ? 'is-open' : 'is-closed');
    });
    document.querySelector(`[data-hours] tr[data-day="${day}"]`)?.classList.add('is-today');
  } catch (_) { /* keep static fallback text */ }

  const yr = document.querySelector('[data-year]');
  if (yr) yr.textContent = new Date().getFullYear();
})();
