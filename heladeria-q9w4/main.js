(function () {
  'use strict';
  var d = document, root = d.documentElement, W = window;
  var reduce = !!(W.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (W.__rv) clearTimeout(W.__rv);
  if (reduce) root.classList.add('reduce');

  var q = function (s, c) { return [].slice.call((c || d).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  var draft = q('.draft')[0], top = d.getElementById('top'), phA = q('.top__ph--a')[0], bar = d.getElementById('bar');
  function measure() {
    var h = draft && draft.offsetParent !== null ? draft.offsetHeight : 0;
    root.style.setProperty('--draft-h', h + 'px');
    if (phA) root.style.setProperty('--a-w', Math.round(phA.getBoundingClientRect().width) + 'px');
    fitB();
  }
  function fitB() {
    if (!top) return;
    top.classList.remove('top--nob');
    var b = q('.top__ph--b')[0];
    if (!b || W.getComputedStyle(b).display === 'none') return;
    var rb = b.getBoundingClientRect(), hit = false;
    [q('.arc__fill')[0], q('.top__lead')[0], q('.top__cta')[0]].forEach(function (e) {
      if (!e) return;
      var r = e.getBoundingClientRect();
      if (r.right + 14 > rb.left && r.left - 14 < rb.right && r.bottom + 14 > rb.top && r.top - 14 < rb.bottom) hit = true;
    });
    if (hit) top.classList.add('top--nob');
  }
  measure();
  W.addEventListener('resize', function () { measure(); tick(); }, { passive: true });
  W.addEventListener('load', measure);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(measure);

  function show(el) { el.classList.add('in'); }
  var items = q('.rv, .ph, .fio');
  if (reduce || !('IntersectionObserver' in W)) {
    items.forEach(show);
  } else {
    var io = new IntersectionObserver(function (list) {
      list.forEach(function (e) {
        if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -2% 0px', threshold: 0.01 });
    items.forEach(function (el) { io.observe(el); });
    W.requestAnimationFrame(function () { W.requestAnimationFrame(function () { q('.top .rv').forEach(show); }); });
  }

  var tex = q('.tray--tex');
  var ticking = false;
  function frame() {
    ticking = false;
    var y = W.pageYOffset || root.scrollTop || 0, vh = W.innerHeight || 800;
    if (bar) bar.classList.toggle('is-scrolled', y > 60);
    if (reduce) return;
    if (top && W.innerWidth >= 1100) {
      var th = top.offsetHeight || vh, p = clamp(y / th, 0, 1);
      root.style.setProperty('--pa', (p * th * 0.04).toFixed(1) + 'px');
      root.style.setProperty('--pb', (-p * th * 0.12).toFixed(1) + 'px');
    } else {
      root.style.removeProperty('--pa'); root.style.removeProperty('--pb');
    }
    for (var i = 0; i < tex.length; i++) {
      var r = tex[i].getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) continue;
      var prog = ((vh / 2) - (r.top + r.height / 2)) / (vh + r.height);   // -0.5 .. 0.5
      tex[i].style.setProperty('--ty', (prog * 12).toFixed(2) + '%');
    }
  }
  function tick() { if (!ticking) { ticking = true; W.requestAnimationFrame(frame); } }
  W.addEventListener('scroll', tick, { passive: true });
  frame();
})();
