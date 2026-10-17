/* Soulful Sazón · v2 · GSAP 3.13.0 + ScrollTrigger + Lenis 1.3.4 (versões fixas no index).
   Sem movimento (prefers-reduced-motion) ou sem GSAP: a página fica parada e completa. */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var root = document.documentElement;
  var rm = root.classList.contains('rm');
  var IG = 'https://www.instagram.com/soulfulsazon/';

  /* ---------- agenda (fuso America/New_York; ?now=AAAAMMDDHHMM serve só para testar) ---------- */
  function etNow() {
    var q = new URLSearchParams(location.search).get('now');
    if (q && /^\d{12}$/.test(q)) return +q;
    var p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    var g = function (t) { return p.filter(function (x) { return x.type === t; })[0].value; };
    return +(g('year') + g('month') + g('day') + g('hour') + g('minute'));
  }
  var sched = { allDone: false };
  function schedule() {
    var now = etNow(), allDone = true, next = null, nextToday = false;
    $$('.tk').forEach(function (tk) {
      var s = +tk.dataset.start, e = +tk.dataset.end;
      var done = now >= e;
      var today = !done && (now >= s || String(s).slice(0, 8) === String(now).slice(0, 8));
      tk.classList.toggle('done', done);
      $('.stamp', tk).hidden = !today;
      $('.over', tk).hidden = !done;
      var which = tk.id === 'tk-fri' ? 'fri' : 'sun';
      $('.pin-' + which).classList.toggle('done', done);
      $('#stop-' + which).classList.toggle('done', done);
      if (!done) { allDone = false; if (!next) { next = tk; nextToday = today; } }
    });
    var slip = $('#slip');
    if (allDone) {
      slip.href = IG;
      slip.innerHTML = '<em>new week, new stops</em><span>Our schedule is pinned on Instagram.</span>';
      $('#nw-h').textContent = 'New week, new stops.';
      $('#pick-lead').textContent = 'The trailer moves around Orlando.';
    } else {
      slip.innerHTML = '<em>' + (nextToday ? 'today' : 'next stop') + '</em><span></span>';
      $('span', slip).textContent = next.dataset.slip.replace(/ · ([^·]*)$/, '\n$1');
    }
    $('.tix').classList.toggle('over', allDone);
    $('#orl').classList.toggle('over', allDone);
    sched = { allDone: allDone, next: next, now: now };
  }
  schedule();

  /* ---------- trailer no mapa ---------- */
  var route = $('#route'), routeM = $('#route-m'), trl = $('#trl');
  var rlen = route.getTotalLength();
  function placeTrailer(p) {
    var pt = route.getPointAtLength(p * rlen);
    trl.style.left = (pt.x / 800 * 100) + '%';
    trl.style.top = (pt.y / 1032 * 100) + '%';
    routeM.style.strokeDashoffset = 1 - p;
    $('#tk-fri').classList.toggle('lit', p < 0.08 && !$('#tk-fri').classList.contains('done'));
    $('#tk-sun').classList.toggle('lit', p > 0.92);
  }
  function trailerStatic() {
    if (sched.allDone) { routeM.style.strokeDashoffset = 0; return; }
    trl.hidden = false;
    placeTrailer(sched.next && sched.next.id === 'tk-sun' ? 1 : 0);
    $$('.tk').forEach(function (t) { t.classList.remove('lit'); });
  }

  /* ---------- combos (a lista vem do HTML; os rolos são só visual) ---------- */
  var OPT = {};
  $$('.opts').forEach(function (ul) {
    OPT[ul.dataset.cat] = $$('li', ul).map(function (li) { return { n: li.textContent.trim(), k: li.classList.contains('b') ? 'b' : 's' }; });
  });
  var find = function (cat, n) { return OPT[cat].filter(function (o) { return o.n === n; })[0]; };
  var PH = [
    { c: ['Pernil', 'Arroz con gandules', 'Mac & cheese', 'Collard greens'], type: 'c', cap: "Pernil, mac & cheese, collards. That's a combo." },
    { c: ['Carne frita', 'Rice & red beans', 'Mac & cheese', 'Tostones'], type: 'f', el: '#shot-carne', cap: 'Carne frita.' },
    { c: ['Chicharrón de pollo', 'Rice & red beans', 'Mac & cheese', 'Collard greens'], type: 'f', el: '#shot-chic' }
  ];
  function mk(arr) { return { meat: find('meat', arr[0]), rice: find('rice', arr[1]), sides: [find('side', arr[2]), find('side', arr[3])] }; }
  var key = function (c) { return [c.meat.n, c.rice.n].concat(c.sides.map(function (s) { return s.n; }).sort()).join('|'); };
  function photoFor(c) {
    for (var i = 0; i < PH.length; i++) if (key(mk(PH[i].c)) === key(c)) return PH[i];
    return null;
  }
  var combo = mk(PH[0].c);
  var spinCount = 0;
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function nextCombo() {
    spinCount++;
    if (spinCount === 1) return mk(PH[1].c);
    if (spinCount === 2) return mk(PH[2].c);
    var c;
    do {
      var sd = OPT.side.slice(); var a = pick(sd); sd.splice(sd.indexOf(a), 1);
      c = { meat: pick(OPT.meat), rice: pick(OPT.rice), sides: [a, pick(sd)] };
    } while (key(c) === key(combo));
    var ph = photoFor(c);
    if (ph) c = mk(ph.c);
    return c;
  }
  function sentence(c) {
    var t = [c.meat.n, c.rice.n, c.sides[0].n, c.sides[1].n].join(', ').toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1) + '.';
  }

  var box = $('.box'), spinBtn = $('.spin'), cap = $('#cap'), noph = $('#nophoto');
  var labBig = $('#c-big'), labL = $('#c-left'), labR = $('#c-right');
  var shotC = $$('.shot-c'), shotF = $$('.shot-f');

  function fitLab(el) {
    var fr = $('.box-frame');
    el.style.fontSize = '';
    var w = fr.clientWidth;
    if (!w || !el.clientWidth) return;
    var cq = parseFloat(getComputedStyle(el).fontSize) / (w / 100);
    for (var i = 0; i < 24; i++) {
      if (el.scrollWidth <= el.clientWidth + 0.5 && el.scrollHeight <= el.clientHeight + 0.5) break;
      cq *= 0.93;
      el.style.fontSize = cq + 'cqw';
    }
  }
  function fitLabels() { [labBig, labL, labR].forEach(fitLab); }
  function fillLabels() {
    labBig.dataset.k = combo.meat.k;
    labBig.innerHTML = '<span></span><small></small>';
    $('span', labBig).textContent = combo.meat.n;
    $('small', labBig).textContent = 'on ' + combo.rice.n.toLowerCase();
    [[labL, combo.sides[0]], [labR, combo.sides[1]]].forEach(function (p) { p[0].textContent = p[1].n; p[0].dataset.k = p[1].k; });
    fitLabels();
  }

  /* --- versão parada: botão troca o combo sem animação --- */
  function showStatic() {
    var ph = photoFor(combo);
    box.classList.toggle('drawn', !ph);
    fillLabels();
    shotC.forEach(function (i) { i.style.display = 'none'; });
    shotF.forEach(function (i) { i.style.display = 'none'; });
    if (ph) {
      if (ph.type === 'c') $('.shot-c[data-c=big]').style.display = 'block';
      else $(ph.el).style.display = 'block';
      cap.textContent = ph.cap || sentence(combo);
    }
    cap.hidden = !ph; noph.hidden = !!ph;
  }
  function initStaticSpin() {
    spinBtn.hidden = false;
    spinBtn.addEventListener('click', function () { combo = nextCombo(); showStatic(); });
  }

  if (rm) { window.__sazonReady = true; trailerStatic(); initStaticSpin(); return; }
  if (!root.classList.contains('js')) { trailerStatic(); return; } /* motion chegou tarde: fica a versão estática completa */
  if (!window.gsap || !window.ScrollTrigger) { root.classList.remove('js'); trailerStatic(); return; }
  window.__sazonReady = true;
  gsap.registerPlugin(ScrollTrigger);
  try { ScrollTrigger.config({ ignoreMobileResize: true }); } catch (e) {}

  /* ---------- Lenis (só computador com mouse) ---------- */
  var lenis = null;
  if (window.Lenis && matchMedia('(min-width:900px) and (pointer:fine)').matches) {
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        var el = id.length > 1 && $(id);
        if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -56 }); }
      });
    });
  }

  /* ---------- M1-M5: a tenda sobe e o choque ---------- */
  gsap.set('.hide0', { opacity: 1 });
  var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.fromTo('.tent', { yPercent: -100 }, { yPercent: 0, duration: 0.45, ease: 'back.out(1.4)' }, 0)
    .fromTo('.tent-name', { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }, 0.1)
    .fromTo('.hero-photo img', { scale: 1.18 }, { scale: 1.1, duration: 1.2 }, 0.1)
    .fromTo('.wb', { xPercent: -110, '--wd': 150 }, { xPercent: 0, '--wd': 112, duration: 0.7, ease: 'power4.out' }, 0.2)
    .fromTo('.ws', { xPercent: 110, '--wd': 50 }, { xPercent: 0, '--wd': 88, duration: 0.65, ease: 'power4.out' }, 0.35)
    .to('.lock', { x: 4, duration: 0.03, yoyo: true, repeat: 3, ease: 'none' }, 1.0)
    .fromTo('.meets', { scale: 1.6, rotation: -9, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.35, ease: 'back.out(2)' }, 1.0)
    .fromTo('.meets', { boxShadow: '0 0 0 4px #F4ECE3, 0 0 0 4px rgba(0,0,0,.2)' }, { boxShadow: '0 0 0 4px #F4ECE3, 0 6px 0 4px rgba(0,0,0,.2)', duration: 0.12, ease: 'steps(2)' }, 1.0)
    .fromTo('.slip', { y: -4, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, 1.1)
    .fromTo('.kick', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, 1.15);

  var mm = gsap.matchMedia();
  mm.add('(min-width:900px)', function () { heroScroll(4); mapTrail('#pickup .pick-grid', 'top 55%', 'bottom 85%'); });
  mm.add('(max-width:899px)', function () { heroScroll(2); mapTrail('#mapbox', 'top 78%', 'bottom 28%'); });
  function heroScroll(dx) {
    var st = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.wb', { x: dx + 'vw', ease: 'none', scrollTrigger: st });
    gsap.to('.ws', { x: '-' + (dx * 1.6) + 'vw', ease: 'none', scrollTrigger: st });
    gsap.to('.hero-photo img', { yPercent: 4, ease: 'none', scrollTrigger: st });
  }
  /* M9: o trailer anda pela rota, de sexta para domingo */
  function mapTrail(trigger, start, end) {
    if (sched.allDone) { routeM.style.strokeDashoffset = 0; return; }
    trl.hidden = false;
    placeTrailer(0);
    ScrollTrigger.create({ trigger: trigger, start: start, end: end, scrub: 0.6, onUpdate: function (s) { placeTrailer(s.progress); } });
    return function () { trl.hidden = true; };
  }

  /* ---------- M6: placas penduradas ---------- */
  $$('.hang').forEach(function (h) {
    var t = gsap.timeline({ paused: true });
    t.fromTo(h, { yPercent: -120, autoAlpha: 0, rotation: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out' })
      .to(h, { rotation: 5, duration: 0.2, ease: 'sine.inOut' })
      .to(h, { rotation: -3, duration: 0.3, ease: 'sine.inOut' })
      .to(h, { rotation: 1.5, duration: 0.28, ease: 'sine.inOut' })
      .to(h, { rotation: -0.7, duration: 0.24, ease: 'sine.inOut' })
      .to(h, { rotation: 0, duration: 0.2, ease: 'sine.inOut' });
    ScrollTrigger.create({ trigger: h, start: 'top 88%', once: true, onEnter: function () { t.play(); } });
  });

  /* ---------- M11: fotos-adesivo ---------- */
  $$('.row .sticker, .line-photo .sticker, .kitchen .sticker').forEach(function (el) {
    var r = parseFloat(el.style.getPropertyValue('--r')) || 0;
    var t = gsap.fromTo(el, { scale: 1.12, rotation: -r, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.6)', paused: true });
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () { t.play(); } });
  });

  /* lagos do mapa */
  gsap.from('#orl .lakes path', { opacity: 0, duration: 0.5, stagger: 0.08, ease: 'power1.out', scrollTrigger: { trigger: '#mapbox', start: 'top 85%', once: true } });

  /* M10: Chapter 1 abre com a rolagem; foto do casal com parallax */
  gsap.fromTo('.chap', { '--wd': 50 }, { '--wd': 140, ease: 'none', scrollTrigger: { trigger: '.chap', start: 'top 92%', end: 'top 38%', scrub: true } });
  gsap.fromTo('.owners img', { yPercent: -6, scale: 1.12 }, { yPercent: 6, scale: 1.12, ease: 'none', scrollTrigger: { trigger: '.owners', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* ---------- fontes prontas: telefone (encaixe + rolo de números) e rolos de palavras ---------- */
  var reelEl = $('.reel'), reels = {}, rhPx = 44, curCat = null;
  ['meat', 'rice', 'side'].forEach(function (cat) {
    var list = document.createElement('div'); list.className = 'reel-list';
    for (var r = 0; r < 4; r++) OPT[cat].forEach(function (o) {
      var d = document.createElement('div'); d.className = 'rw ' + o.k; d.textContent = o.n; list.appendChild(d);
    });
    reelEl.appendChild(list);
    reels[cat] = { el: list, rows: $$('.rw', list), L: OPT[cat].length, on: -1 };
  });
  function fitReel() {
    var W = reelEl.clientWidth - 8;
    if (!W) return;
    var cs = getComputedStyle(reelEl);
    rhPx = parseFloat(cs.getPropertyValue('--rh')) || 44;
    var fs0 = parseFloat(cs.getPropertyValue('--rfs')) || 38;
    var probe = document.createElement('div');
    probe.className = 'rw'; probe.style.cssText = 'position:absolute;visibility:hidden;height:auto;width:auto;display:inline-block;left:0;top:0';
    reelEl.appendChild(probe);
    var cache = {};
    function width(txt, wd, fs) { probe.textContent = txt; probe.style.fontSize = fs + 'px'; probe.style.setProperty('--wd', wd); return probe.getBoundingClientRect().width; }
    Object.keys(reels).forEach(function (cat) {
      reels[cat].rows.forEach(function (row) {
        var n = row.textContent;
        if (!cache[n]) {
          var fs = fs0, wd = 150;
          if (width(n, 50, fs0) > W * 0.97) { fs = fs0 * W * 0.97 / width(n, 50, fs0); wd = 50; }
          else {
            var lo = 50, hi = 150;
            if (width(n, 150, fs0) <= W * 0.97) wd = 150;
            else { for (var i = 0; i < 9; i++) { var mid = (lo + hi) / 2; if (width(n, mid, fs0) > W * 0.97) hi = mid; else lo = mid; } wd = lo; }
          }
          cache[n] = { fs: fs, wd: wd };
        }
        row.style.fontSize = cache[n].fs + 'px';
        row.style.setProperty('--wd', cache[n].wd);
      });
    });
    reelEl.removeChild(probe);
  }
  function phoneFit() {
    var a = $('.phone'), t = $('.phone-t');
    var cs = getComputedStyle(a);
    var fs = parseFloat(cs.fontSize);
    var w = t.getBoundingClientRect().width;
    var avail = $('.order').clientWidth - 2 * parseFloat(getComputedStyle($('.order')).paddingLeft);
    var next = fs * avail * 0.96 / w;
    a.style.setProperty('--phone-fs', Math.min(next, 190) + 'px');
  }
  /* telefone: o número real entra com fade + deslize (sem máscara e sem trocar dígitos) */
  function phoneIn() {
    gsap.from('.phone-t', { opacity: 0, y: 16, duration: 0.6, ease: 'power3.out', scrollTrigger: { trigger: '.phone', start: 'top 90%', once: true } });
  }
  var machineReady = false;
  function afterFonts() {
    phoneFit();
    if (!machineReady) { machineReady = true; phoneIn(); }
    fitReel();
    fitLabels();
    ScrollTrigger.refresh();
    renderScrub(lastP);
  }
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { phoneFit(); fitReel(); fitLabels(); }, 150); });
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(afterFonts);

  /* ---------- M7: a máquina de montar ---------- */
  var ST = [
    { cat: 'meat', opt: function () { return combo.meat; }, step: 0, a: 0.04, b: 0.24 },
    { cat: 'rice', opt: function () { return combo.rice; }, step: 1, a: 0.27, b: 0.41 },
    { cat: 'side', opt: function () { return combo.sides[0]; }, step: 2, a: 0.44, b: 0.58 },
    { cat: 'side', opt: function () { return combo.sides[1]; }, step: 2, a: 0.61, b: 0.75 }
  ];
  var RV = [[0.78, 0.85], [0.84, 0.91], [0.90, 0.97]]; // left, right, big
  var steps = $$('.step'), stamped = [false, false, false, false], spinning = false, lastP = 0;
  var tilt = { 0: -1.5, 2: 1.2, 3: -1 };
  spinBtn.hidden = false;
  fillLabels();

  function stagePos(i, t) {
    var s = ST[i], L = OPT[s.cat].length, o = s.opt();
    var idx = OPT[s.cat].map(function (x) { return x.n; }).indexOf(o.n);
    var fin = 2 * L + idx, tr = Math.min(L + 3, fin);
    return fin - tr * Math.pow(1 - t, 3);
  }
  function reelRender(cat, pos) {
    var R = reels[cat];
    if (curCat !== cat) {
      if (curCat) { reels[curCat].el.classList.remove('cur'); if (reels[curCat].on >= 0) reels[curCat].rows[reels[curCat].on].classList.remove('on'); reels[curCat].on = -1; }
      R.el.classList.add('cur'); curCat = cat;
    }
    R.el.style.transform = 'translateY(' + ((1 - pos) * rhPx) + 'px)';
    var on = Math.round(pos);
    if (R.on !== on) { if (R.on >= 0 && R.rows[R.on]) R.rows[R.on].classList.remove('on'); if (R.rows[on]) R.rows[on].classList.add('on'); R.on = on; }
  }
  function setSteps(now, done) {
    steps.forEach(function (el, i) { el.classList.toggle('now', i === now); el.classList.toggle('done', !!done[i]); });
    var sn = $('.stepnow'), cur = steps[Math.max(0, now)];
    if (sn && cur) sn.textContent = $('.sn', cur).textContent + ' ' + $('.st', cur).textContent;
  }
  function applyStamps(flags) {
    flags.forEach(function (f, i) {
      if (f === stamped[i]) return;
      stamped[i] = f;
      if (i === 1) { $('small', labBig).style.opacity = f ? 1 : 0; return; }
      var el = i === 0 ? labBig : i === 2 ? labL : labR;
      if (f) gsap.fromTo(el, { opacity: 0, scale: 1.3, rotation: tilt[i] + (Math.random() * 8 - 4) }, { opacity: 1, scale: 1, rotation: tilt[i], duration: 0.22, ease: 'power3.out', overwrite: true });
      else gsap.set(el, { opacity: 0, scale: 1, rotation: 0 });
    });
  }
  var cmap = { left: 0, right: 1, big: 2 };
  function applyReveal(q) {
    var ph = photoFor(combo);
    var any = q[0] > 0 || q[1] > 0 || q[2] > 0;
    var rects = { left: [8.4, 6.8, 40.3, 38], right: [51.3, 6.8, 40.3, 38], big: [8.4, 47.4, 83.2, 48.2] };
    shotC.forEach(function (im) {
      var show = ph && ph.type === 'c' && any;
      im.style.visibility = show ? 'visible' : 'hidden';
      im.style.display = 'block';
      if (!show) return;
      var c = im.dataset.c, r = rects[c], v = q[cmap[c]];
      im.style.clipPath = 'inset(' + (r[1] + r[3] * (1 - v)) + '% ' + (100 - r[0] - r[2]) + '% ' + (100 - r[1] - r[3]) + '% ' + r[0] + '% round 4%)';
    });
    shotF.forEach(function (im) {
      var show = ph && ph.type === 'f' && ('#' + im.id) === ph.el && any;
      im.style.display = 'block';
      im.style.visibility = show ? 'visible' : 'hidden';
      im.style.opacity = show ? q[2] : 0;
    });
    var done = q[2];
    var wrap = $('.capwrap');
    if (ph) {
      cap.textContent = ph.cap || sentence(combo);
      cap.hidden = false; noph.hidden = true;
      wrap.style.opacity = done;
    } else {
      cap.hidden = true; noph.hidden = false;
      wrap.style.opacity = clamp((q[2] + (spinning ? 0 : 0)), 0, 1);
    }
  }
  function renderScrub(P) {
    lastP = P;
    if (spinning || !machineReady) return;
    var cur = 0;
    ST.forEach(function (s, i) { if (P >= s.a) cur = i; });
    var s = ST[cur], t = clamp((P - s.a) / (s.b - s.a), 0, 1);
    reelRender(s.cat, stagePos(cur, t));
    var flags = ST.map(function (x) { return P >= x.b; });
    setSteps(s.step, [flags[0], flags[1], flags[3]]);
    applyStamps(flags);
    var q = RV.map(function (r) { return clamp((P - r[0]) / (r[1] - r[0]), 0, 1); });
    if (!photoFor(combo)) q = [0, 0, clamp((P - 0.9) / 0.07, 0, 1)];
    applyReveal(q);
    spinBtn.classList.toggle('on', P >= 0.8);
  }
  var hdrH = function () { return innerWidth >= 900 ? 56 : 48; };
  ScrollTrigger.create({
    trigger: '.build-pin', pin: true, anticipatePin: 1, invalidateOnRefresh: true,
    start: function () { return 'top ' + hdrH() + 'px'; },
    end: function () { return '+=' + Math.round(innerHeight * (innerWidth >= 900 ? 2.6 : 2.8)); },
    onUpdate: function (s) { renderScrub(s.progress); },
    onRefresh: function (s) { renderScrub(s.progress); }
  });

  /* "Spin it again": mesma máquina, sem rolagem */
  function spin() {
    if (spinning) return;
    spinning = true;
    spinBtn.classList.remove('on');
    combo = nextCombo();
    fillLabels();
    stamped = [false, false, false, false];
    gsap.set([labBig, labL, labR], { opacity: 0, scale: 1, rotation: 0 });
    $('small', labBig).style.opacity = 0;
    applyReveal([0, 0, 0]);
    $('.capwrap').style.opacity = 0;
    setSteps(-1, [0, 0, 0]);
    var flags = [false, false, false, false];
    var stl = gsap.timeline({ onComplete: function () { spinning = false; spinBtn.classList.add('on'); } });
    ST.forEach(function (s, i) {
      var o = { t: 0 };
      stl.call(function () { reelRender(s.cat, stagePos(i, 0)); setSteps(s.step, [flags[0], flags[1], flags[3]]); })
        .to(o, { t: 1, duration: i === 0 ? 1.3 : 0.95, ease: 'none', onUpdate: function () { reelRender(s.cat, stagePos(i, o.t)); } })
        .call(function () { flags[i] = true; applyStamps(flags); setSteps(s.step, [flags[0], flags[1], flags[3]]); }, null, '>');
    });
    var ph = photoFor(combo), rv = { a: 0 };
    if (ph) {
      stl.to(rv, { a: 1, duration: 1, ease: 'power2.inOut', onUpdate: function () {
        applyReveal([clamp(rv.a * 3, 0, 1), clamp(rv.a * 3 - 1, 0, 1), clamp(rv.a * 3 - 2, 0, 1)]);
      } }, '+=0.25');
    } else {
      stl.call(function () { applyReveal([0, 0, 1]); }, null, '+=0.25');
    }
  }
  spinBtn.addEventListener('click', spin);
})();
