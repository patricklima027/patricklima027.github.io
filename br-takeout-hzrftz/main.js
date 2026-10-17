/* BR TakeOut (L0002). Texto: so opacidade + deslize curto (<= 24px). Nunca mascara/clip-path/cortina em texto. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasLibs = !!(window.gsap && window.ScrollTrigger);
  var animate = hasLibs && !reduce;

  /* ---------- medidas: faixa de previa e barra fixa ---------- */
  function measure() {
    var bar = $(".pvbar");
    if (bar) doc.style.setProperty("--bar", bar.offsetHeight + "px");
    var pw = $(".phwrap");
    if (pw) doc.style.setProperty("--seam", pw.offsetHeight + "px");
    var dock = $("#dock");
    var mobile = matchMedia("(max-width: 899px)").matches;
    doc.style.setProperty("--dock", mobile && dock ? dock.offsetHeight + "px" : "0px");
  }

  /* ---------- titulos que cabem na largura (medindo) e respeitam a altura da tela ---------- */
  function fitAll() {
    var vw = window.innerWidth, vh = window.innerHeight, desk = vw >= 900;
    $$("[data-fit]").forEach(function (el) {
      var inner = $(".fit-in", el);
      if (!inner) return;
      var capVw = parseFloat((desk && el.dataset.vwd) || el.dataset.vw || "20") * vw / 100;
      var capVh = el.dataset.vh ? parseFloat(el.dataset.vh) * vh / 100 : Infinity;
      var capPx = parseFloat(el.dataset.px || "999");
      var max = Math.max(28, Math.min(capVw, capVh, capPx));
      var avail = el.clientWidth;
      if (!avail) return; // dentro de um bloco escondido: mede quando abrir
      el.style.fontSize = max + "px";
      var w = inner.getBoundingClientRect().width;
      var size = w > avail ? max * (avail / w) * 0.985 : max;
      el.style.fontSize = Math.floor(size * 10) / 10 + "px";
    });
    measure();
  }

  /* ---------- estado ao vivo no fuso de New York ---------- */
  var HOURS = { 0: null, 1: [11, 21], 2: [11, 21], 3: [11, 21], 4: [11, 21], 5: [11, 21], 6: [11, 17] };
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function ny() {
    try {
      var p = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
      var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
      return { d: DAYS.indexOf(o.weekday), m: parseInt(o.hour, 10) * 60 + parseInt(o.minute, 10) };
    } catch (e) { return null; }
  }
  function h12(h) { return (h % 12 || 12) + (h < 12 ? " AM" : " PM"); }
  function status() {
    var t = ny(), el = $("#status");
    if (!t) return;
    var today = HOURS[t.d];
    var next = function () { for (var i = 1; i <= 7; i++) { var d = (t.d + i) % 7; if (HOURS[d]) return { d: d, h: HOURS[d][0] }; } };
    var txt;
    if (today && t.m >= today[0] * 60 && t.m < today[1] * 60) txt = "Open now · until " + h12(today[1]);
    else if (today && t.m < today[0] * 60) txt = "Opens today at " + h12(today[0]);
    else { var n = next(); txt = "Closed · opens " + DAYS[n.d] + " " + h12(n.h); }
    if (el) el.textContent = txt;
    $$(".hours tr").forEach(function (tr) {
      var on = tr.dataset.days.split(",").indexOf(String(t.d)) > -1;
      tr.classList.toggle("today", on);
      if (on) tr.setAttribute("aria-current", "date"); else tr.removeAttribute("aria-current");
    });
  }

  /* ---------- menu em tela cheia (celular) ---------- */
  var btn = $("#menubtn"), sheet = $("#sheet");
  function setSheet(open) {
    if (!btn || !sheet) return;
    btn.setAttribute("aria-expanded", open);
    btn.firstElementChild.textContent = open ? "Close" : "Menu";
    if (open) { sheet.hidden = false; requestAnimationFrame(function () { sheet.classList.add("open"); }); }
    else { sheet.classList.remove("open"); setTimeout(function () { if (btn.getAttribute("aria-expanded") === "false") sheet.hidden = true; }, 320); }
    if (window.lenis) { open ? window.lenis.stop() : window.lenis.start(); }
  }
  if (btn) {
    btn.addEventListener("click", function () { setSheet(btn.getAttribute("aria-expanded") !== "true"); });
    $$("a", sheet).forEach(function (a) { a.addEventListener("click", function () { setSheet(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") setSheet(false); });
  }

  /* ---------- abas do cardapio ---------- */
  var tabs = $$('.tabs [role="tab"]');
  function showTab(t, focus) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute("aria-selected", on);
      x.tabIndex = on ? 0 : -1;
      var p = document.getElementById(x.getAttribute("aria-controls"));
      if (p) p.hidden = !on;
    });
    if (focus) t.focus();
    var p2 = document.getElementById(t.getAttribute("aria-controls"));
    if (p2 && animate) {
      var fig = $(".unwrap", p2), flap = fig && $(".flap", fig);
      if (flap) {
        gsap.killTweensOf(flap);
        if (matchMedia("(min-width: 768px)").matches) gsap.fromTo(flap, { rotateX: 0, opacity: 1, yPercent: 0 }, { rotateX: -90, duration: .7, ease: "power2.inOut" });
        else gsap.fromTo(flap, { yPercent: 0, opacity: 1, rotateX: 0 }, { yPercent: -35, opacity: 0, duration: .6, ease: "power2.out" });
      }
    }
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { showTab(t); t.scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "auto" : "smooth" }); });
    t.addEventListener("keydown", function (e) {
      var j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
      if (j === null) return;
      e.preventDefault(); showTab(tabs[(j + tabs.length) % tabs.length], true);
    });
  });

  /* ---------- as duas portas (Framingham / Milford) ---------- */
  $$("[data-door]").forEach(function (d) {
    var b = $(".door-btn", d), body = $(".door-body", d);
    b.addEventListener("click", function () {
      var open = b.getAttribute("aria-expanded") === "true";
      b.setAttribute("aria-expanded", !open);
      body.hidden = open;
      if (!open) fitAll();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });

  /* ---------- barra fixa e cabecalho ---------- */
  var dock = $("#dock"), hdr = $("#hdr"), hero = $("#top");
  function onScroll() {
    var y = window.scrollY || 0;
    if (hdr) hdr.classList.toggle("scrolled", y > 40);
    if (dock && hero) dock.classList.toggle("on", y > hero.offsetHeight * 0.55);
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- ancoras ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute("href") === "#") return;
    var tgt = document.querySelector(a.getAttribute("href"));
    if (!tgt) return;
    e.preventDefault();
    var off = -((parseFloat(getComputedStyle(doc).getPropertyValue("--bar")) || 0) + 56);
    if (window.lenis) window.lenis.scrollTo(tgt, { offset: off, duration: 1.2 });
    else tgt.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  });

  /* ---------- inicio ---------- */
  measure(); status(); onScroll();
  setInterval(status, 60000);
  window.addEventListener("resize", function () { measure(); fitAll(); });
  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  var loads = document.fonts ? Promise.all([
    document.fonts.load('500 100px "Boska"'), document.fonts.load('italic 400 100px "Boska"'),
    document.fonts.load('400 20px "Jost"'), document.fonts.load('400 30px "Ephesis"')
  ]).catch(function () {}) : Promise.resolve();
  var timeout = new Promise(function (r) { setTimeout(r, 1800); });

  Promise.race([Promise.all([fontsReady, loads]), timeout]).then(function () {
    measure(); fitAll();
    if (document.fonts) document.fonts.ready.then(function () { measure(); fitAll(); if (window.ScrollTrigger) ScrollTrigger.refresh(); });
    if (animate) motion(); else doc.classList.remove("js");
  });
  window.addEventListener("load", function () { measure(); fitAll(); if (window.ScrollTrigger) ScrollTrigger.refresh(); });

  /* =================== MOTION =================== */
  function motion() {
    gsap.registerPlugin(ScrollTrigger);
    /* para o QA: ?slow=0.2 desacelera a entrada para ver as letras quadro a quadro */
    var sl = /[?&]slow=([\d.]+)/.exec(location.search);
    if (sl) gsap.globalTimeline.timeScale(parseFloat(sl[1]));

    /* rolagem suave */
    if (window.Lenis) {
      var lenis = new Lenis({ duration: 1.05, smoothWheel: true });
      window.lenis = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    /* 1) topo: ja montado. Selo se desenha, foto assenta, texto sobe em fade + deslize curto */
    var ring = $("#seal-ring"), pen = $("#seal-pen");
    var tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    tl.fromTo($(".ph img"), { scale: 1.06 }, { scale: 1, duration: 1.8, ease: "power3.out" }, 0);
    if (ring) tl.fromTo(ring, { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 1.1, ease: "power1.inOut" }, 0);
    if (pen) tl.fromTo(pen, { attr: { width: 0 } }, { attr: { width: 420 }, duration: 1.0, ease: "power1.inOut" }, 0.15);
    $$(".hero .hi").forEach(function (el, i) {
      tl.fromTo(el, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.75, clearProps: "transform" }, 0.12 + i * 0.08);
    });
    gsap.to($("#seal"), { rotate: 14, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
    gsap.to($(".pattern"), { backgroundPositionY: function () { return hero.offsetHeight * 0.7; }, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });

    /* 2) revelar texto: fade + deslize, uma vez */
    ScrollTrigger.batch("[data-rv]", {
      start: "top 90%", once: true,
      onEnter: function (els) { gsap.fromTo(els, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.09, ease: "power2.out", overwrite: true, clearProps: "transform" }); }
    });

    /* 3) desembrulho: aba de papel por cima da FOTO (nunca de texto) */
    var mm = gsap.matchMedia();
    mm.add("(min-width: 768px)", function () {
      $$("[data-unwrap]").forEach(function (u) {
        var flap = $(".flap", u);
        if (!flap || u.dataset.unwrap === "tab") return;
        gsap.fromTo(flap, { rotateX: 0 }, { rotateX: -90, ease: "none", scrollTrigger: { trigger: u, start: "top 90%", end: "top 40%", scrub: 0.5 } });
      });
    });
    mm.add("(max-width: 767px)", function () {
      $$("[data-unwrap]").forEach(function (u) {
        var flap = $(".flap", u);
        if (!flap || u.dataset.unwrap === "tab") return;
        gsap.fromTo(flap, { yPercent: 0, opacity: 1 }, { yPercent: -35, opacity: 0, ease: "none", scrollTrigger: { trigger: u, start: "top 92%", end: "top 45%", scrub: 0.5 } });
      });
    });
    /* fotos das abas: abrem quando a secao chega */
    $$('[data-unwrap="tab"]').forEach(function (u, i) {
      var flap = $(".flap", u);
      if (!flap) return;
      var p = u.closest(".panel");
      if (i === 0) ScrollTrigger.create({ trigger: p, start: "top 85%", once: true, onEnter: function () {
        gsap.fromTo(flap, { rotateX: 0, yPercent: 0, opacity: 1 }, matchMedia("(min-width: 768px)").matches ? { rotateX: -90, duration: 0.9, ease: "power2.inOut" } : { yPercent: -35, opacity: 0, duration: 0.7 });
      } });
      else gsap.set(flap, { rotateX: -90, opacity: 0 });
    });

    /* aneis de contorno atras do mexidao e do pudim */
    $$(".ring").forEach(function (r) {
      gsap.fromTo(r, { scale: 0.92, rotate: -6 }, { scale: 1, rotate: 0, ease: "none", scrollTrigger: { trigger: r.parentElement, start: "top bottom", end: "bottom top", scrub: 0.6 } });
    });

    /* papel dos produtos: parallax leve */
    var prod = $(".prod");
    if (prod) gsap.fromTo(prod, { yPercent: -4 }, { yPercent: 4, ease: "none", scrollTrigger: { trigger: ".papersec", start: "top bottom", end: "bottom top", scrub: true } });

    /* 5) Saturday: o fundo da pagina vai do papel a berinjela por interpolacao (sem cortina) */
    var sat = $(".sat");
    if (sat) {
      var PAPER = "#F3EFE6", PLUM = "#270949", INK = "#1B0E2A", PRINT = "#6F3F7A", CARA = "#D5750C";
      gsap.set(sat, { "--sat-bg": PAPER, "--sat-ink": INK, "--sat-i": PRINT });
      var inT = gsap.timeline({ scrollTrigger: { trigger: sat, start: "top 85%", end: "top 25%", scrub: 0.4 } });
      inT.to(sat, { "--sat-bg": PLUM, ease: "none", duration: 1 }, 0)
         .set(sat, { "--sat-ink": PAPER, "--sat-i": CARA }, 0.55);
      var outT = gsap.timeline({ scrollTrigger: { trigger: sat, start: "bottom 70%", end: "bottom 15%", scrub: 0.4 } });
      outT.to(sat, { "--sat-bg": PAPER, ease: "none", duration: 1 }, 0)
          .set(sat, { "--sat-ink": INK, "--sat-i": PRINT }, 0.45);
    }

    /* 9) mapa: as ruas se desenham ao rolar */
    var map = $("[data-map]");
    if (map) {
      var paths = $$(".m-roads path:not(.m-water):not(.m-park)", map);
      var lens = paths.map(function (p) { try { return p.getTotalLength(); } catch (e) { return 0; } });
      paths.forEach(function (p, i) { if (lens[i]) { p.style.strokeDasharray = lens[i]; p.style.strokeDashoffset = lens[i]; } });
      if (paths.length) ScrollTrigger.create({ trigger: map, start: "top 85%", once: true, onEnter: function () {
        gsap.to(paths, { strokeDashoffset: 0, duration: 2.2, ease: "power1.inOut", stagger: { each: 0.004, from: "random" }, onComplete: function () { paths.forEach(function (p) { p.style.strokeDasharray = ""; p.style.strokeDashoffset = ""; }); } });
      } });
    }

    /* 10) rodape: as duas abas dobram por cima do selo e param semiabertas */
    var stage = $("#stage");
    if (stage) {
      var f = { start: "top 90%", end: "center 55%" };
      gsap.fromTo($(".fl-t"), { rotateX: -78 }, { rotateX: -18, ease: "none", scrollTrigger: { trigger: stage, start: f.start, end: f.end, scrub: 0.5 } });
      gsap.fromTo($(".fl-b"), { rotateX: 78 }, { rotateX: 18, ease: "none", scrollTrigger: { trigger: stage, start: f.start, end: f.end, scrub: 0.5 } });
      gsap.fromTo($(".stage-seal"), { rotate: -10 }, { rotate: 0, ease: "none", scrollTrigger: { trigger: stage, start: f.start, end: f.end, scrub: 0.5 } });
    }

    ScrollTrigger.refresh();
  }
})();
