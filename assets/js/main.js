/* ==========================================================================
   Chicago Holiday Hope — page behavior
   ========================================================================== */
(function () {
  'use strict';

  /* ===================== ORGANIZER SETTINGS =====================
     PASTE YOUR GOFUNDME LINK HERE (every Donate button uses it):       */
  const DONATE_URL = 'https://gofund.me/6c51f3d70';
  // UPDATE THIS NUMBER as donations come in (dollars raised so far):
  const RAISED = 0;
  const GOAL = 80000;
  /* ============================================================== */

  // Point every donate button at the configured URL.
  document.querySelectorAll('.donate').forEach((a) => {
    a.href = DONATE_URL;
    a.target = '_blank';
    a.rel = 'noopener';
  });

  /* ---------- Progress bar + count-up ---------- */
  const raisedEl = document.getElementById('raised');
  const pctEl = document.getElementById('pct');
  const barEl = document.getElementById('bar');
  const fillEl = document.getElementById('fill');
  const pct = Math.min(100, (RAISED / GOAL) * 100);

  function fmt(n) { return '$' + n.toLocaleString('en-US'); }

  function paintProgress() {
    fillEl.style.width = Math.max(pct, RAISED > 0 ? 2 : 0) + '%';
    barEl.setAttribute('aria-valuenow', Math.round(pct));
    const t0 = performance.now();
    const dur = 1400;
    function tick(now) {
      const t = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      raisedEl.textContent = fmt(Math.round(RAISED * eased));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    pctEl.textContent = RAISED > 0
      ? Math.round(pct) + '% of the way there. Thank you!'
      : '0% of the way there. Be one of the first to give.';
  }

  if (fillEl) {
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { paintProgress(); io.disconnect(); }
        });
      }, { threshold: 0.4 });
      io.observe(fillEl.closest('.progress'));
    } else {
      paintProgress();
    }
  }

  /* ---------- Impact tier selector ---------- */
  const tiers = document.querySelectorAll('#tiersGrid .tier');
  const tierCta = document.getElementById('tierCta');
  let selectedTier = null;

  function setTierCta(amount) {
    if (!tierCta) return;
    if (amount) {
      tierCta.textContent = 'Give ' + fmt(parseInt(amount, 10));
      // Prefer amount param when donors click a specific tier
      tierCta.href = DONATE_URL + (DONATE_URL.includes('?') ? '&' : '?') + 'amount=' + amount;
    } else {
      tierCta.textContent = 'Choose Your Gift';
      tierCta.href = DONATE_URL;
    }
  }

  tiers.forEach((btn) => {
    btn.addEventListener('click', () => {
      const amount = btn.dataset.amount;
      if (selectedTier === btn) {
        btn.setAttribute('aria-pressed', 'false');
        selectedTier = null;
        setTierCta(null);
      } else {
        tiers.forEach((b) => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        selectedTier = btn;
        setTierCta(amount);
      }
    });
  });

  // Pre-select a suggested gift — successful campaigns default to a strong tier
  // (donors tend to give at or above the amount that's already highlighted).
  const suggested = document.querySelector('#tiersGrid .tier[data-amount="250"]');
  if (suggested && tierCta) {
    suggested.setAttribute('aria-pressed', 'true');
    selectedTier = suggested;
    setTierCta('250');
  }

  /* ---------- Mobile nav ---------- */
  const navToggle = document.getElementById('navToggle');
  const siteNav = document.getElementById('siteNav');

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const open = siteNav.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    siteNav.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        siteNav.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Scroll-aware header + sticky donate ---------- */
  const header = document.getElementById('siteHeader');
  const stickyDonate = document.getElementById('stickyDonate');
  let lastY = window.scrollY;
  let stickyVisible = false;

  function updateSticky(y) {
    if (!stickyDonate) return;
    // Show after user scrolls past the hero (roughly one viewport)
    const shouldShow = y > Math.min(window.innerHeight * 0.7, 520);
    if (shouldShow === stickyVisible) return;
    stickyVisible = shouldShow;
    if (shouldShow) {
      stickyDonate.hidden = false;
      // force reflow so transition runs
      void stickyDonate.offsetWidth;
      stickyDonate.classList.add('is-visible');
      document.body.classList.add('has-sticky-donate');
    } else {
      stickyDonate.classList.remove('is-visible');
      document.body.classList.remove('has-sticky-donate');
      setTimeout(() => {
        if (!stickyVisible) stickyDonate.hidden = true;
      }, 340);
    }
  }

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (header) {
      if (y > 120 && y > lastY) header.classList.add('header-hidden');
      else header.classList.remove('header-hidden');
    }
    updateSticky(y);
    lastY = y;
  }, { passive: true });
  updateSticky(window.scrollY);

  /* ---------- Snowfall ---------- */
  const canvas = document.getElementById('snow');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (canvas && !reduced) {
    const ctx = canvas.getContext('2d');
    let flakes = [];
    let w, h, raf;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.parentElement.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(150, Math.round(w / 9));
      flakes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.8 + Math.random() * 2.4,
        speed: 0.35 + Math.random() * 0.85,
        drift: Math.random() * Math.PI * 2,
        driftSpeed: 0.002 + Math.random() * 0.006,
        o: 0.22 + Math.random() * 0.38
      }));
    }

    function step() {
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.speed;
        f.drift += f.driftSpeed;
        const dx = Math.sin(f.drift) * 0.6;
        if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; }
        ctx.beginPath();
        ctx.arc(f.x + dx, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + f.o + ')';
        ctx.fill();
      }
      raf = requestAnimationFrame(step);
    }

    resize();
    window.addEventListener('resize', () => { cancelAnimationFrame(raf); resize(); raf = requestAnimationFrame(step); });
    raf = requestAnimationFrame(step);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(step);
    });
  }

  /* ---------- Giving deadline countdown ---------- */
  const countdownTimer = document.getElementById('countdownTimer');
  const countdownLabel = document.getElementById('countdownLabel');
  const THANKSGIVING = new Date('2026-11-26T00:00:00-06:00');
  const CHRISTMAS = new Date('2026-12-25T00:00:00-06:00');
  const pad = (n) => String(n).padStart(2, '0');

  function updateCountdown() {
    if (!countdownTimer) return;
    const now = new Date();
    let target = THANKSGIVING;
    let label = 'Thanksgiving is in';
    if (now >= CHRISTMAS) {
      countdownTimer.textContent = 'Merry Christmas, Chicago';
      return;
    }
    if (now >= THANKSGIVING) { target = CHRISTMAS; label = 'Christmas is in'; }
    if (countdownLabel) countdownLabel.textContent = label;
    const ms = target - now;
    const days = Math.floor(ms / 86400000);
    const hrs = Math.floor(ms / 3600000) % 24;
    const min = Math.floor(ms / 60000) % 60;
    const sec = Math.floor(ms / 1000) % 60;
    countdownTimer.textContent = days + ' days ' + pad(hrs) + ':' + pad(min) + ':' + pad(sec);
  }

  if (countdownTimer) {
    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  /* ---------- Social share ---------- */
  const shareUrl = encodeURIComponent(window.location.href);
  const shareText = encodeURIComponent('No child should wake up to an empty holiday. Help bring turkeys, coats & gifts to Chicago families:');

  const setHref = (id, url) => {
    const el = document.getElementById(id);
    if (el) el.href = url;
  };
  setHref('shareFb', 'https://www.facebook.com/sharer/sharer.php?u=' + shareUrl);
  setHref('shareX', 'https://twitter.com/intent/tweet?text=' + shareText + '&url=' + shareUrl);
  setHref('shareWa', 'https://wa.me/?text=' + shareText + '%20' + shareUrl);

  const copyBtn = document.getElementById('shareCopy');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const url = window.location.href;
      let ok = false;
      try {
        await navigator.clipboard.writeText(url);
        ok = true;
      } catch (e) {
        try {
          const tmp = document.createElement('textarea');
          tmp.value = url;
          tmp.style.position = 'fixed';
          tmp.style.opacity = '0';
          document.body.appendChild(tmp);
          tmp.select();
          ok = document.execCommand('copy');
          tmp.remove();
        } catch (e2) {}
      }
      const note = document.getElementById('shareCopied');
      if (ok && note) {
        note.hidden = false;
        setTimeout(() => { note.hidden = true; }, 3000);
      }
    });
  }
})();
