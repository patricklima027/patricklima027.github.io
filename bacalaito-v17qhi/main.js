(function () {
  "use strict";
  var doc = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = false;
  try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var I = window.BAC_I18N;
  var lang = "es";
  var lenis = null;
  var stTrigger = null;

  /* ---------- idioma ---------- */
  var MAP = {};
  if (I) I.D.forEach(function (p) { MAP[p[0]] = p[1]; });
  var reg = [];
  function tr(k) { return lang === "en" && MAP[k] !== undefined ? MAP[k] : k; }
  function walk(el) {
    var tag = el.tagName;
    if (/^(SCRIPT|STYLE|SVG|NOSCRIPT|PATH|IMG)$/i.test(tag) && tag.toUpperCase() !== "IMG") return;
    if (el.hasAttribute && el.hasAttribute("data-nok")) return;
    ["aria-label", "alt"].forEach(function (a) {
      var v = el.getAttribute && el.getAttribute(a);
      if (v && MAP[v] !== undefined) reg.push({ n: el, a: a, k: v });
    });
    if (/^IMG$/i.test(tag)) return;
    var key = el.innerHTML.trim();
    if (MAP[key] !== undefined) { reg.push({ n: el, k: key }); return; }
    Array.prototype.forEach.call(el.childNodes, function (c) {
      if (c.nodeType === 3) {
        var tx = c.data.trim();
        if (tx && MAP[tx] !== undefined) reg.push({ n: c, t: 1, k: tx });
      } else if (c.nodeType === 1) walk(c);
    });
  }
  function setLang(l, save) {
    lang = l;
    doc.lang = l;
    reg.forEach(function (r) {
      var v = tr(r.k);
      if (r.a) r.n.setAttribute(r.a, v);
      else if (r.t) { r.n.data = r.n.data.replace(r.n.data.trim(), v); }
      else if (r.n.innerHTML !== v) r.n.innerHTML = v;
    });
    var ix = l === "en" ? 1 : 0;
    if (I) {
      document.title = I.META.title[ix];
      var md = $('meta[name="description"]'); if (md) md.setAttribute("content", I.META.desc[ix]);
    }
    $$(".lang button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.lang === l ? "true" : "false"); });
    if (save) { try { localStorage.setItem("bac-lang", l); } catch (e) {} }
    status(); splitStatement(); fitAll();
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }
  function initLang() {
    var l = "es";
    var q = /[?&]lang=(en|es)/.exec(location.search);
    try { l = q ? q[1] : (localStorage.getItem("bac-lang") || "es"); } catch (e) { l = q ? q[1] : "es"; }
    if (l !== "en") l = "es";
    if (I) walk(document.body);
    $$(".lang button").forEach(function (b) {
      b.addEventListener("click", function () { setLang(b.dataset.lang, true); });
    });
    lang = l;
    return l;
  }

  /* ---------- horarios ---------- */
  var DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  var UN = {
    barceloneta: { tz: "America/Puerto_Rico", open: function () { return 540; } },
    bayamon: { tz: "America/Puerto_Rico", open: function (d) { return d === 0 ? 660 : 480; } },
    kissimmee: { tz: "America/New_York", open: function (d) { return d === 0 ? 480 : 420; }, close: 1200 }
  };
  function nowIn(tz) {
    var o = {};
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" })
        .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
      return { d: DOW[o.weekday], m: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
    } catch (e) { return null; }
  }
  function fmtT(m) {
    var h = Math.floor(m / 60), ap = h >= 12 ? "PM" : "AM", h12 = h % 12 || 12, mm = m % 60;
    return h12 + ":" + (mm < 10 ? "0" : "") + mm + " " + ap;
  }
  function T(key, t) { return (I.T[lang][key] || "").replace("{t}", t); }
  var DOT = '<span class="dot" aria-hidden="true"></span>';
  function line(id, hero) {
    var u = UN[id], n = nowIn(u.tz);
    if (!n) return null;
    var op = u.open(n.d);
    if (u.close) {
      if (n.m < op) return T("opensToday", fmtT(op));
      if (n.m < u.close) return DOT + T("openNow", fmtT(u.close));
      return T("closedTomorrow", fmtT(u.open((n.d + 1) % 7)));
    }
    /* Puerto Rico: sin hora de cierre confirmada, nunca "abierto ahora" ni "cerrado" */
    if (n.m < op) return T("opensToday", fmtT(op));
    return hero ? T("todayFrom", fmtT(op)) : null;
  }
  function status() {
    if (!I) return;
    $$("[data-st]").forEach(function (el) {
      var s = line(el.dataset.st, true);
      if (s) el.innerHTML = s;
    });
    $$("[data-ps]").forEach(function (el) {
      var s = line(el.dataset.ps, false);
      if (s) { el.innerHTML = s; el.hidden = false; } else el.hidden = true;
    });
  }

  /* ---------- ajuste a la anchura ---------- */
  function fit(box, inner, avail, max) {
    if (!box || !inner) return;
    box.style.fontSize = "100px";
    var w = inner.getBoundingClientRect().width;
    if (!w || !avail) return;
    var px = Math.floor(100 * avail / w * 0.985);
    if (max) px = Math.min(px, max);
    box.style.fontSize = px + "px";
  }
  function fitAll() {
    var vw = doc.clientWidth;
    var mega = $("#mega");
    if (mega) { mega.style.fontSize = "100px"; fit(mega, $("#megaIn"), mega.clientWidth, 340); }
    var g = $("#giant"); if (g) fit(g, $("#giantIn"), vw * 0.94);
    var f = $("#footGiant"); if (f) fit(f, $("#footIn"), f.clientWidth);
    var ln = $("#ldName");
    if (ln && doc.classList.contains("ld")) {
      var cs = getComputedStyle(ln.parentNode);
      var av = ln.parentNode.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var maxByH = Math.max(36, innerHeight * 0.16);
      fit(ln, $("#ldIn"), av, maxByH);
    }
    var ps = $("#previewStrip");
    if (ps) doc.style.setProperty("--strip", ps.offsetHeight + "px");
  }

  /* ---------- pestañas ---------- */
  var panels = $(".panels");
  var tabs = $$(".tab");
  var current = "kissimmee";
  function selectUnit(u, focus) {
    if (!UN[u]) return;
    current = u;
    tabs.forEach(function (t) {
      var on = t.dataset.unit === u;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    $$(".panel").forEach(function (p) { p.classList.toggle("on", p.id === u); });
  }
  function initTabs() {
    if (!panels || !tabs.length) return;
    panels.classList.add("tabs-on");
    doc.classList.add("tabs-on");
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () {
        selectUnit(t.dataset.unit);
        try { history.replaceState(null, "", "#" + t.dataset.unit); } catch (e) {}
      });
      t.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var n = tabs[(i + d + tabs.length) % tabs.length];
        selectUnit(n.dataset.unit, true);
      });
    });
    var h = location.hash.replace("#", "");
    selectUnit(UN[h] ? h : "kissimmee");
    window.addEventListener("hashchange", function () {
      var k = location.hash.replace("#", "");
      if (UN[k]) selectUnit(k);
    });
  }

  /* ---------- anclas ---------- */
  function scrollToEl(el) {
    if (lenis) lenis.scrollTo(el, { offset: 0 });
    else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }
  function initAnchors() {
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var h = a.getAttribute("href");
        var go = a.dataset.go;
        if (go) {
          e.preventDefault();
          selectUnit(go);
          try { history.replaceState(null, "", "#" + go); } catch (x) {}
          scrollToEl($("#ubicaciones"));
          return;
        }
        if (h === "#top") { e.preventDefault(); if (lenis) lenis.scrollTo(0); else window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); return; }
        var t = h.length > 1 ? $(h) : null;
        if (t) { e.preventDefault(); scrollToEl(t); }
      });
    });
  }

  /* ---------- dock móvil ---------- */
  function initDock() {
    var dock = $("#dock"), hero = $("#hero");
    if (!dock || !hero) return;
    function sync() {
      var cta = $(".cta"), low = cta && cta.getBoundingClientRect().bottom > innerHeight + 30;
      dock.classList.toggle("show", hero.getBoundingClientRect().bottom <= innerHeight * 0.6 || !!low);
    }
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
  }

  /* ---------- frase grande ---------- */
  function splitStatement() {
    var el = $("#stText");
    if (!el) return;
    if (stTrigger) { stTrigger.kill(); stTrigger = null; }
    $$(".w", el).forEach(function (w) {
      var txt = w.textContent;
      w.innerHTML = "";
      txt.split(/\s+/).filter(Boolean).forEach(function (word, i, arr) {
        var s = document.createElement("span");
        s.className = "wd";
        s.textContent = word + (i < arr.length - 1 ? " " : "");
        w.appendChild(s);
      });
    });
    if (doc.classList.contains("js") && window.gsap && window.ScrollTrigger) {
      var words = $$(".wd", el);
      gsap.set(words, { opacity: 0.18 });
      var tw = gsap.to(words, { opacity: 1, stagger: 0.12, ease: "none", scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 55%", scrub: true } });
      stTrigger = tw.scrollTrigger;
    }
  }

  /* ---------- cinta que corre ---------- */
  function initMarquee() {
    var track = $("#marqTrack");
    if (!track || reduce) return;
    var list = track.firstElementChild;
    var clone = list.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
    doc.classList.add("marq-on");
    var x = 0, last = performance.now(), lastY = window.scrollY, boost = 0;
    function tick(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      var y = window.scrollY, v = Math.abs(y - lastY); lastY = y;
      boost += (Math.min(v, 60) * 14 - boost) * 0.1;
      var w = list.offsetWidth;
      x -= (55 + boost) * dt;
      if (w && -x >= w) x += w;
      track.style.transform = "translate3d(" + x + "px,0,0)";
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- foto que sigue al mouse ---------- */
  function initPeek() {
    var peek = $("#peek");
    if (!peek || !matchMedia("(hover:hover) and (pointer:fine)").matches) return;
    var img = $("img", peek);
    var tx = 0, ty = 0, cx = 0, cy = 0, on = false, running = false;
    function loop() {
      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
      peek.style.transform = "translate3d(" + cx + "px," + cy + "px,0)";
      if (on || Math.abs(tx - cx) > 0.5) requestAnimationFrame(loop); else running = false;
    }
    $$(".items li").forEach(function (li) {
      li.addEventListener("mouseenter", function (e) {
        img.src = "img/" + li.dataset.img + ".webp";
        on = true; peek.style.opacity = "1";
        if (!running) { cx = tx = e.clientX + 28; cy = ty = e.clientY - 150; running = true; requestAnimationFrame(loop); }
      });
      li.addEventListener("mousemove", function (e) {
        var h = peek.offsetHeight || 300;
        tx = Math.min(e.clientX + 28, innerWidth - 260);
        ty = Math.max(10, Math.min(e.clientY - h / 2, innerHeight - h - 10));
      });
      li.addEventListener("mouseleave", function () { on = false; peek.style.opacity = "0"; });
    });
    peek.style.transition = "opacity .25s";
  }

  /* ---------- movimiento ---------- */
  function initMotion() {
    if (!doc.classList.contains("js") || !window.gsap || !window.ScrollTrigger) return false;
    gsap.registerPlugin(ScrollTrigger);
    if (window.Lenis) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
    /* letras del título: solo opacidad + desplazamiento corto */
    var inner = $("#megaIn");
    if (inner && !$(".ch", inner)) {
      var txt = inner.textContent; inner.textContent = "";
      txt.split("").forEach(function (c) { var s = document.createElement("span"); s.className = "ch"; s.setAttribute("aria-hidden", "true"); s.textContent = c; inner.appendChild(s); });
    }
    fitAll();

    function intro() {
      var tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.to(".bar", { opacity: 1, duration: 0.5 }, 0)
        .to(".mega .ch", { opacity: 1, y: 0, duration: 0.5, stagger: 0.04 }, 0.05)
        .to(".ask", { opacity: 1, y: 0, duration: 0.5 }, 0.35)
        .to(".cone", { opacity: 1, y: 0, duration: 0.6 }, 0.45)
        .to(".ticket", { opacity: 1, y: 0, duration: 0.55 }, 0.55)
        .to(".cta", { opacity: 1, y: 0, duration: 0.5 }, 0.8);
      window.RW = { intro: tl };
    }

    if (doc.classList.contains("ld") && $("#loader")) {
      var ld = $("#loader");
      var strip = $(".ld-strip", ld);
      gsap.set(strip, { opacity: 0, y: 24 });
      var run = function () {
        fitAll();
        var tl = gsap.timeline();
        tl.to(strip, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" })
          .to(ld, { opacity: 0, duration: 0.5, ease: "power1.out" }, "+=0.7")
          .add(function () {
            ld.style.display = "none"; doc.classList.remove("ld");
            try { sessionStorage.setItem("bac-seen", "1"); } catch (e) {}
            fitAll();
          })
          .add(intro, "-=0.2");
        window.RW = { loader: tl };
      };
      var started = false;
      var go = function () { if (started) return; started = true; run(); };
      if (document.fonts && document.fonts.ready) { document.fonts.ready.then(go); setTimeout(go, 1500); } else go();
    } else intro();

    /* revelar al rolar */
    $$("[data-reveal]").forEach(function (el) {
      ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: function () { gsap.to(el, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }); } });
    });
    /* fotos: aparecen y derivan a distinta velocidad */
    $$(".ph, .cf").forEach(function (el) {
      ScrollTrigger.create({ trigger: el, start: "top 92%", once: true, onEnter: function () { gsap.to(el, { opacity: 1, duration: 0.7, ease: "power2.out" }); } });
      var s = parseFloat(el.dataset.speed || 0);
      if (s) gsap.fromTo(el, { yPercent: -s }, { yPercent: s, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    });
    /* trama de lazos */
    [["#laceHero", "#hero"], ["#laceUbic", "#ubicaciones"], ["#laceFoot", ".foot"]].forEach(function (p) {
      var l = $(p[0]), t = $(p[1]);
      if (l && t) gsap.fromTo(l, { yPercent: -5 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: t, start: "top bottom", end: "bottom top", scrub: true } });
    });
    return true;
  }

  /* ---------- arranque ---------- */
  function init() {
    initMarquee();
    var l = initLang();
    initTabs();
    initAnchors();
    initDock();
    initPeek();
    var motion = initMotion();
    setLang(l, false);
    status();
    setInterval(status, 60000);
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { fitAll(); if (window.ScrollTrigger) ScrollTrigger.refresh(); }, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitAll(); if (window.ScrollTrigger) ScrollTrigger.refresh(); });
    window.addEventListener("load", function () { fitAll(); if (window.ScrollTrigger) ScrollTrigger.refresh(); });
    return motion;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
