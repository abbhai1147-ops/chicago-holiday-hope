/* ==========================================================================
   Chicago Holiday Hope — Full cinematic scroll experience
   Requires: gsap + ScrollTrigger
   Respects prefers-reduced-motion · mobile-aware
   ========================================================================== */
(function () {
  'use strict';

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  document.documentElement.classList.add('js-cinematic');
  gsap.registerPlugin(ScrollTrigger);

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia('(max-width: 820px)').matches;
  var canPin = !isMobile && !reduced;

  /* ---------- Top scroll progress ---------- */
  var fill = document.getElementById('scrollProgressFill');
  if (fill) {
    gsap.to(fill, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: document.documentElement,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.25
      }
    });
  }

  /* ---------- Chapter side nav active state ---------- */
  var chapterLinks = gsap.utils.toArray('.chapter-dot');
  var chapterMap = [
    { id: 'top', el: document.getElementById('top') },
    { id: 'why', el: document.getElementById('why') },
    { id: 'goal', el: document.getElementById('goal') },
    { id: 'provides', el: document.getElementById('provides') },
    { id: 'faces', el: document.getElementById('faces') },
    { id: 'impact', el: document.getElementById('impact') },
    { id: 'how', el: document.getElementById('how') },
    { id: 'faq', el: document.getElementById('faq') }
  ].filter(function (c) { return c.el; });

  function setActiveChapter(id) {
    chapterLinks.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-chapter') === id);
    });
  }

  chapterMap.forEach(function (c) {
    ScrollTrigger.create({
      trigger: c.el,
      start: 'top 45%',
      end: 'bottom 45%',
      onEnter: function () { setActiveChapter(c.id); },
      onEnterBack: function () { setActiveChapter(c.id); }
    });
  });

  if (reduced) return;

  /* ---------- Hero: cinematic exit ---------- */
  var hero = document.querySelector('.hero');
  var heroBg = document.querySelector('.hero-bg');
  var heroInner = document.querySelector('.hero-inner');
  if (hero && heroBg) {
    gsap.to(heroBg, {
      yPercent: 22,
      scale: 1.08,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });
  }
  if (hero && heroInner) {
    gsap.to(heroInner, {
      yPercent: 18,
      opacity: 0,
      filter: 'blur(6px)',
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  /* ---------- Pull quote scale-in ---------- */
  var pull = document.querySelector('.pull blockquote');
  if (pull) {
    gsap.from(pull, {
      opacity: 0,
      y: 40,
      scale: 0.96,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.pull', start: 'top 75%', once: true }
    });
  }

  /* ---------- PINNED CINEMATIC CHAPTER ---------- */
  var cineChapter = document.getElementById('cineNeed');
  if (cineChapter && canPin) {
    var slides = gsap.utils.toArray('.cine-slide');
    var dots = gsap.utils.toArray('.cine-dot');
    var pin = cineChapter.querySelector('.cine-pin');

    // Stack slides
    gsap.set(slides, { autoAlpha: 0, y: 30 });
    gsap.set(slides[0], { autoAlpha: 1, y: 0 });

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: cineChapter,
        start: 'top top',
        end: function () { return '+=' + (window.innerHeight * (slides.length + 0.4)); },
        pin: pin,
        scrub: 0.6,
        anticipatePin: 1
      }
    });

    slides.forEach(function (slide, i) {
      if (i === 0) return;
      var prev = slides[i - 1];
      tl.to(prev, { autoAlpha: 0, y: -40, duration: 0.45, ease: 'power2.inOut' }, i);
      tl.fromTo(slide, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power2.out' }, i + 0.15);
      tl.add(function () {
        dots.forEach(function (d, di) { d.classList.toggle('is-active', di === i); });
      }, i + 0.2);
    });

    // Keep first dot active at start
    ScrollTrigger.create({
      trigger: cineChapter,
      start: 'top top',
      onEnter: function () { dots.forEach(function (d, di) { d.classList.toggle('is-active', di === 0); }); }
    });
  } else if (cineChapter) {
    // Mobile / reduced: simple sequential reveals
    gsap.utils.toArray('.cine-slide').forEach(function (slide) {
      gsap.from(slide, {
        opacity: 0,
        y: 28,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: { trigger: slide, start: 'top 85%', once: true }
      });
    });
  }

  /* ---------- Horizontal gift strip (desktop) ---------- */
  var hWrap = document.getElementById('hscrollGifts');
  var hTrack = hWrap && hWrap.querySelector('.hscroll-track');
  if (hWrap && hTrack && canPin) {
    document.documentElement.classList.add('has-hscroll');
    var getScroll = function () {
      return Math.max(0, hTrack.scrollWidth - window.innerWidth + 80);
    };
    gsap.to(hTrack, {
      x: function () { return -getScroll(); },
      ease: 'none',
      scrollTrigger: {
        trigger: hWrap,
        start: 'top 20%',
        end: function () { return '+=' + getScroll(); },
        pin: true,
        scrub: 0.55,
        invalidateOnRefresh: true,
        anticipatePin: 1
      }
    });
  }

  /* ---------- Generic section reveals ---------- */
  gsap.utils.toArray('.section, .pull').forEach(function (section) {
    if (section.classList.contains('cine-chapter') || section.id === 'provides') return;
    var kids = section.querySelectorAll(
      'h2, .lead, .reveal, .card, .story-copy > *, .story-figure, .how-figure, .steps li, .gallery-item, .money-breakdown, .impact-stat, .sponsor-card, .faq-list details'
    );
    if (!kids.length) return;
    gsap.from(kids, {
      opacity: 0,
      y: 36,
      duration: 0.8,
      stagger: 0.07,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: section,
        start: 'top 78%',
        toggleActions: 'play none none none'
      }
    });
  });

  /* ---------- Progress section dramatic entrance ---------- */
  var progress = document.querySelector('.progress');
  if (progress) {
    gsap.from('.progress h2, .progress-amount, .bar, .pct, .countdown, .progress .donate, .impact-stats', {
      opacity: 0,
      y: 28,
      duration: 0.85,
      stagger: 0.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: progress, start: 'top 70%', once: true }
    });
  }

  /* ---------- Impact stat count-up feel ---------- */
  gsap.utils.toArray('.impact-num').forEach(function (el) {
    gsap.from(el, {
      opacity: 0,
      y: 16,
      duration: 0.6,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true }
    });
  });

  /* ---------- Money bars ---------- */
  gsap.utils.toArray('.money-fill').forEach(function (bar) {
    var w = getComputedStyle(bar).getPropertyValue('--w') || '0%';
    gsap.fromTo(bar, { width: '0%' }, {
      width: w,
      duration: 1.25,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: bar.closest('.money-breakdown') || bar,
        start: 'top 85%',
        once: true
      }
    });
  });

  /* ---------- Gallery cinematic ---------- */
  var galleryItems = document.querySelectorAll('.gallery-item');
  if (galleryItems.length) {
    gsap.from(galleryItems, {
      opacity: 0,
      y: 60,
      scale: 0.94,
      duration: 1,
      stagger: 0.14,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.gallery-grid', start: 'top 78%', once: true }
    });
  }

  /* ---------- Soft parallax on figures ---------- */
  if (!isMobile) {
    gsap.utils.toArray('.story-figure, .how-figure').forEach(function (fig) {
      gsap.to(fig, {
        yPercent: -8,
        ease: 'none',
        scrollTrigger: {
          trigger: fig,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });
    });
  }

  /* ---------- Closing CTA ---------- */
  var cta = document.querySelector('.cta');
  if (cta) {
    gsap.from(cta.querySelectorAll('h2, .cta-lede, .donate, .share'), {
      opacity: 0,
      y: 34,
      duration: 0.95,
      stagger: 0.12,
      ease: 'power2.out',
      scrollTrigger: { trigger: cta, start: 'top 75%', once: true }
    });
  }

  /* ---------- Refresh on resize (horizontal pin) ---------- */
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      ScrollTrigger.refresh();
    }, 250);
  });

})();
