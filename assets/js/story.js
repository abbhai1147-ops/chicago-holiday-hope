/* ==========================================================================
   Chicago Holiday Hope — Story Mode (cinematic overlay, narrated)
   Press "Play Our Story": a ~43s narrated film with music.
   Autoplays once on a visitor's first landing (muted until they opt in).
   ========================================================================== */
(function () {
  'use strict';

  var overlay = document.getElementById('storyOverlay');
  var playBtn = document.getElementById('playStory');
  if (!overlay || !playBtn || typeof gsap === 'undefined') return;

  var skipBtn = document.getElementById('storySkip');
  var closeEndBtn = document.getElementById('storyCloseEnd');
  var replayBtn = document.getElementById('storyReplay');
  var progressFill = document.getElementById('storyProgress');
  var amountEl = document.getElementById('storyAmount');
  var barFill = document.getElementById('storyBarFill');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tl = null;
  var snowRaf = null;
  var soundOff = false; // true while autoplaying without audio permission
  var currentAudio = null;
  var storyHint = document.getElementById('storyHint');

  /* Scene start times (seconds) on the narration-driven timeline */
  var SCENE_STARTS = [0, 4.5, 17.1, 20.6, 27.6, 31.6, 38.1];

  function currentScene() {
    if (!tl) return 0;
    var t = tl.time();
    var s = 0;
    for (var i = 0; i < SCENE_STARTS.length; i++) {
      if (t >= SCENE_STARTS[i]) s = i + 1;
    }
    return s;
  }

  /* First user gesture anywhere turns on narration + music mid-story */
  function enableAudioUnlock() {
    function unlock() {
      if (overlay.hidden) return;
      if (!soundOff) { cleanup(); return; }
      soundOff = false;
      if (storyHint) storyHint.hidden = true;
      if (window.Music) {
        Music.canPlay();
        Music.start();
      }
      var s = currentScene();
      if (s > 0) playNarration(s);
      cleanup();
    }
    function cleanup() {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown', unlock);
    }
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
  }

  /* Narration clip durations in seconds (scene 1..7) */
  var N = [3.5, 11.7, 2.6, 6.1, 3.1, 5.6, 4.5];

  /* ---------- Snow canvas ---------- */
  var canvas = document.getElementById('storySnow');
  var ctx = canvas.getContext('2d');
  var snowFlakes = [];

  function snowResize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = overlay.clientWidth;
    var h = overlay.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var count = Math.min(140, Math.round(w / 10));
    snowFlakes = [];
    for (var i = 0; i < count; i++) {
      snowFlakes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.8 + Math.random() * 2.6,
        speed: 0.5 + Math.random() * 1.2,
        drift: Math.random() * Math.PI * 2,
        driftSpeed: 0.004 + Math.random() * 0.008,
        o: 0.25 + Math.random() * 0.45
      });
    }
  }

  function snowStep() {
    var w = overlay.clientWidth;
    var h = overlay.clientHeight;
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < snowFlakes.length; i++) {
      var f = snowFlakes[i];
      f.y += f.speed;
      f.drift += f.driftSpeed;
      if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; }
      ctx.beginPath();
      ctx.arc(f.x + Math.sin(f.drift) * 0.8, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + f.o + ')';
      ctx.fill();
    }
    snowRaf = requestAnimationFrame(snowStep);
  }

  function startSnow() {
    if (reduced) return;
    snowResize();
    window.addEventListener('resize', snowResize);
    snowRaf = requestAnimationFrame(snowStep);
  }

  function stopSnow() {
    cancelAnimationFrame(snowRaf);
    window.removeEventListener('resize', snowResize);
  }

  /* ---------- Narration ---------- */
  function fmt(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

  function stopNarration() {
    if (currentAudio) {
      try { currentAudio.pause(); } catch (e) {}
      currentAudio = null;
    }
    if (window.Music) Music.duck(false);
  }

  function playNarration(i) {
    if (soundOff || reduced) return;
    stopNarration();
    var a = new Audio('assets/audio/narration-' + i + '.mp3');
    currentAudio = a;
    var p = a.play();
    if (p && p.catch) p.catch(function () {});
    if (window.Music) Music.duck(true);
    a.addEventListener('ended', function () {
      if (currentAudio === a && window.Music) Music.duck(false);
    });
  }

  /* ---------- Timeline ---------- */
  function resetScenes() {
    var scenes = overlay.querySelectorAll('.story-scene');
    scenes.forEach(function (s) {
      gsap.set(s, { opacity: 0, visibility: 'hidden' });
      gsap.set(s.querySelectorAll('.story-beat, .story-title, .story-kicker'), { opacity: 0, y: 0 });
    });
    gsap.set(overlay.querySelectorAll('.story-media img'), { scale: 1, x: 0 });
    gsap.set('.story-gift', { opacity: 0, y: 60, scale: 0.5, rotate: -8 });
    gsap.set('.story-gifts-beat', { opacity: 0 });
    gsap.set('.story-finale .story-title', { opacity: 0, scale: 0.92 });
    gsap.set('.story-finale .btn', { opacity: 0, scale: 0.6 });
    gsap.set('.story-end-actions', { opacity: 0 });
    gsap.set('.story-amount', { opacity: 0, scale: 0.85 });
    gsap.set('.story-goal .story-beat', { opacity: 0 });
    gsap.set('.story-bar-fill', { width: '0%' });
    amountEl.textContent = fmt(0);
    progressFill.style.width = '0%';
  }

  function buildTimeline() {
    var counter = { v: 0 };
    var FADE = 0.45; // fast cut

    tl = gsap.timeline({
      onUpdate: function () {
        progressFill.style.width = (tl.progress() * 100) + '%';
      },
      onComplete: function () {
        gsap.set('.story-end-actions', { opacity: 1 });
      }
    });

    /* ===== Scene 1: skyline (0s) — narration 0.7–4.2 ===== */
    tl.set('[data-scene="1"]', { visibility: 'visible' });
    tl.to('[data-scene="1"]', { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0);
    tl.call(playNarration, [1], 0.7);
    tl.fromTo('[data-scene="1"] .story-media img',
      { scale: 1.22 }, { scale: 1.04, duration: 5.4, ease: 'none' }, 0);
    tl.fromTo('[data-scene="1"] .story-kicker',
      { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.3);
    tl.fromTo('[data-scene="1"] .story-title',
      { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.9);

    /* ===== Scene 2: the math (4.5s) — narration 5.0–16.7 ===== */
    tl.set('[data-scene="2"]', { visibility: 'visible' }, 4.5);
    tl.to('[data-scene="2"]', { opacity: 1, duration: FADE }, 4.5);
    tl.to('[data-scene="1"]', { opacity: 0, duration: FADE }, 4.5);
    tl.set('[data-scene="1"]', { visibility: 'hidden' }, 5.0);
    tl.call(playNarration, [2], 5.0);
    tl.fromTo('[data-scene="2"] .story-beat:nth-child(1)',
      { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 5.2);
    tl.fromTo('[data-scene="2"] .story-beat:nth-child(2)',
      { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 10.6);

    /* ===== Scene 3: family table (17.1s) — narration 17.6–20.2 ===== */
    tl.set('[data-scene="3"]', { visibility: 'visible' }, 17.1);
    tl.to('[data-scene="3"]', { opacity: 1, duration: FADE }, 17.1);
    tl.to('[data-scene="2"]', { opacity: 0, duration: FADE }, 17.1);
    tl.set('[data-scene="2"]', { visibility: 'hidden' }, 17.6);
    tl.call(playNarration, [3], 17.6);
    tl.fromTo('[data-scene="3"] .story-media img',
      { scale: 1.06, x: -26 }, { scale: 1.14, x: 26, duration: 4.4, ease: 'none' }, 17.1);
    tl.fromTo('[data-scene="3"] .story-caption .story-beat',
      { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 17.8);

    /* ===== Scene 4: the four gifts (20.6s) — narration 21.1–27.2 ===== */
    tl.set('[data-scene="4"]', { visibility: 'visible' }, 20.6);
    tl.to('[data-scene="4"]', { opacity: 1, duration: FADE }, 20.6);
    tl.to('[data-scene="3"]', { opacity: 0, duration: FADE }, 20.6);
    tl.set('[data-scene="3"]', { visibility: 'hidden' }, 21.1);
    tl.call(playNarration, [4], 21.1);
    tl.to('.story-gift', {
      opacity: 1, y: 0, scale: 1, rotate: 0,
      duration: 0.85, ease: 'back.out(1.7)', stagger: 0.22
    }, 20.9);
    tl.fromTo('.story-gifts-beat',
      { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 21.5);

    /* ===== Scene 5: distribution (27.6s) — narration 28.1–31.2 ===== */
    tl.set('[data-scene="5"]', { visibility: 'visible' }, 27.6);
    tl.to('[data-scene="5"]', { opacity: 1, duration: FADE }, 27.6);
    tl.to('[data-scene="4"]', { opacity: 0, duration: FADE }, 27.6);
    tl.set('[data-scene="4"]', { visibility: 'hidden' }, 28.1);
    tl.call(playNarration, [5], 28.1);
    tl.fromTo('[data-scene="5"] .story-media img',
      { scale: 1.18 }, { scale: 1.02, duration: 4.4, ease: 'none' }, 27.6);
    tl.fromTo('[data-scene="5"] .story-caption .story-beat',
      { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 28.3);

    /* ===== Scene 6: the goal (31.6s) — narration 32.1–37.7 ===== */
    tl.set('[data-scene="6"]', { visibility: 'visible' }, 31.6);
    tl.to('[data-scene="6"]', { opacity: 1, duration: FADE }, 31.6);
    tl.to('[data-scene="5"]', { opacity: 0, duration: FADE }, 31.6);
    tl.set('[data-scene="5"]', { visibility: 'hidden' }, 32.1);
    tl.call(playNarration, [6], 32.1);
    tl.to('.story-amount', { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.5)' }, 31.9);
    tl.to('.story-goal .story-beat', { opacity: 1, duration: 0.6 }, 32.3);
    tl.to(counter, {
      v: 80000, duration: 3.6, ease: 'power2.out',
      onUpdate: function () { amountEl.textContent = fmt(counter.v); }
    }, 32.6);
    tl.to('.story-bar-fill', { width: '100%', duration: 3.6, ease: 'power2.out' }, 32.6);

    /* ===== Scene 7: finale (38.1s) — narration 38.6–43.1 ===== */
    tl.set('[data-scene="7"]', { visibility: 'visible' }, 38.1);
    tl.to('[data-scene="7"]', { opacity: 1, duration: 0.5 }, 38.1);
    tl.to('[data-scene="6"]', { opacity: 0, duration: FADE }, 38.1);
    tl.set('[data-scene="6"]', { visibility: 'hidden' }, 38.6);
    tl.call(playNarration, [7], 38.6);
    tl.to('.story-finale .story-title', { opacity: 1, scale: 1, duration: 0.9, ease: 'power3.out' }, 38.4);
    tl.to('.story-finale .btn', { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(2.2)' }, 39.9);
    tl.to('.story-end-actions', { opacity: 1, duration: 0.7 }, 41.6);
  }

  /* ---------- Open / close ---------- */
  function showStaticFinale() {
    overlay.querySelectorAll('.story-scene').forEach(function (s) {
      s.style.visibility = 'hidden';
      s.style.opacity = 0;
    });
    var finale = overlay.querySelector('[data-scene="7"]');
    finale.style.visibility = 'visible';
    finale.style.opacity = 1;
    overlay.querySelectorAll('.story-finale .story-title, .story-finale .btn, .story-end-actions').forEach(function (el) {
      el.style.opacity = 1;
      el.style.transform = 'none';
    });
    progressFill.style.width = '100%';
  }

  function open(autoplay) {
    overlay.hidden = false;
    document.body.classList.add('story-playing');
    resetScenes();
    startSnow();

    soundOff = false;
    if (window.Music) {
      if (autoplay) {
        // No user gesture yet — browsers block audio until the visitor interacts.
        // The story runs silent, then narration + music start on the first tap/click/key.
        soundOff = true;
        if (storyHint) storyHint.hidden = false;
        enableAudioUnlock();
      } else {
        if (storyHint) storyHint.hidden = true;
        Music.canPlay();
        Music.start();
      }
    }

    if (reduced) {
      tl = null;
      showStaticFinale();
    } else {
      buildTimeline();
    }
  }

  function close() {
    if (tl) { tl.kill(); tl = null; }
    stopNarration();
    stopSnow();
    overlay.hidden = true;
    if (storyHint) storyHint.hidden = true;
    document.body.classList.remove('story-playing');
    if (window.Music && !Music.userEnabled) Music.stop();
    playBtn.focus();
  }

  playBtn.addEventListener('click', function () { open(false); });
  skipBtn.addEventListener('click', close);
  closeEndBtn.addEventListener('click', close);

  replayBtn.addEventListener('click', function () {
    if (reduced || !tl) return;
    tl.kill();
    resetScenes();
    buildTimeline(); // auto-plays from 0, narration restarts
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.hidden) close();
  });

  document.addEventListener('visibilitychange', function () {
    if (overlay.hidden || !tl) return;
    if (document.hidden) {
      tl.pause();
      if (currentAudio) currentAudio.pause();
    } else {
      tl.resume();
      if (currentAudio && !soundOff) currentAudio.play().catch(function () {});
    }
  });

  /* ---------- First-visit autoplay ---------- */
  function readFlag() {
    try {
      var m = document.cookie.match(/(?:^|; )chh_story_seen=([^;]*)/);
      return !!(m && m[1] === '1');
    } catch (e) { return false; }
  }
  function writeFlag() {
    try { document.cookie = 'chh_story_seen=1;max-age=31536000;path=/;SameSite=Lax'; } catch (e) {}
  }

  var seen = readFlag();

  function autoStart() {
    if (seen || reduced || navigator.webdriver) return;
    writeFlag();
    setTimeout(function () { if (overlay.hidden) open(true); }, 1800);
  }

  if (document.readyState === 'complete') autoStart();
  else window.addEventListener('load', autoStart);
})();
