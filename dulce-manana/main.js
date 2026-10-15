/* Ribeiro Web Co. — template v2: movimento e comportamento.
   Sem GSAP/Lenis (CDN fora do ar) ou com "reduzir movimento", o site continua completo e parado. */
(function () {
  var root = document.documentElement;
  var data = {};
  try { data = JSON.parse(document.getElementById("site-data").textContent); } catch (err) {}
  var t = data.i18n || {};
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var small = function () { return window.innerWidth < 900; };
  var motion = !reduce && !!(window.gsap && window.ScrollTrigger);
  var lenis = null;

  /* ---------- topo fixo abaixo da faixa de prévia (que rola junto com a página) ---------- */
  var pbar = document.querySelector(".pbar");
  function placeHeader() {
    var h = pbar ? pbar.offsetHeight : 0;
    root.style.setProperty("--pbar-real", h + "px");
    root.style.setProperty("--hdr-top", Math.max(0, h - window.scrollY) + "px");
  }
  placeHeader();
  window.addEventListener("scroll", placeHeader, { passive: true });
  window.addEventListener("resize", placeHeader);

  /* ---------- texto que preenche a largura ---------- */
  function fit(el) {
    var inner = el.firstElementChild || el;
    el.style.fontSize = "100px";
    var w = inner.getBoundingClientRect().width;
    if (!w) return;
    var size = 100 * el.clientWidth * (parseFloat(el.getAttribute("data-fit-ratio")) || 1) / w;
    var maxH = window.innerHeight * (parseFloat(el.getAttribute("data-fit-max")) || 0.36);
    el.style.fontSize = Math.min(size, maxH / 0.84) + "px";
  }
  function fitAll() { document.querySelectorAll("[data-fit]").forEach(fit); }
  fitAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitAll(); if (motion) ScrollTrigger.refresh(); });
  var resizeTimer;
  window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(fitAll, 120); });

  /* ---------- rolagem suave ---------- */
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.11, smoothWheel: true });
    if (motion) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(0);
    }
  }
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href");
    var target = id.length > 1 ? document.querySelector(id) : null;
    if (!target) return;
    ev.preventDefault();
    closeOverlay();
    if (lenis) lenis.scrollTo(target, { offset: id === "#top" ? 0 : -20, duration: 1.4 });
    else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  });

  /* ---------- menu em tela cheia ---------- */
  var toggle = document.querySelector("[data-toggle]");
  var overlay = document.querySelector("[data-overlay]");
  var label = toggle && toggle.querySelector(".hdr-toggle-label");
  function setOverlay(open) {
    if (!overlay) return;
    overlay.classList.toggle("is-open", open);
    overlay.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("ov-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (label) label.textContent = label.getAttribute(open ? "data-label-close" : "data-label-open");
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  function closeOverlay() { if (overlay && overlay.classList.contains("is-open")) setOverlay(false); }
  if (toggle) toggle.addEventListener("click", function () { setOverlay(!overlay.classList.contains("is-open")); });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") closeOverlay(); });

  /* ---------- vídeo do topo ---------- */
  var saveData = navigator.connection && navigator.connection.saveData;
  document.querySelectorAll("video.media").forEach(function (v) {
    if (reduce || saveData) { v.removeAttribute("autoplay"); v.pause(); }
  });

  /* ---------- ano, horário e "aberto agora" no fuso do negócio ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  var DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  var SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var toMin = function (s) { var p = s.split(":"); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); };
  var fill = function (tpl, vars) { return (tpl || "").replace(/\{(\w+)\}/g, function (_, k) { return vars[k] || ""; }); };
  var now = null;
  if (data.tz) {
    try {
      var parts = {};
      new Intl.DateTimeFormat("en-US", { timeZone: data.tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
        .formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
      now = { day: SHORT.indexOf(parts.weekday), min: (parseInt(parts.hour, 10) % 24) * 60 + parseInt(parts.minute, 10) };
    } catch (err) { now = null; }
  }
  if (now && now.day >= 0) {
    var today = DAYS[now.day];
    var row = document.querySelector('[data-day="' + today + '"]');
    if (row && t.today) {
      row.classList.add("is-today");
      var badge = document.createElement("span");
      badge.className = "today-badge";
      badge.textContent = t.today;
      row.firstElementChild.appendChild(badge);
    }
    var hours = data.hours || {};
    if (Object.keys(hours).length) {
      var text = "", open = false, ranges = hours[today] || [];
      for (var i = 0; i < ranges.length; i++) {
        var o = toMin(ranges[i][0]), c = toMin(ranges[i][1]);
        if (c <= o) c += 1440;
        if (now.min >= o && now.min < c) { open = true; text = fill(t.open_until, { time: ranges[i][3] }); break; }
      }
      for (var d = 0; !open && !text && d < 8; d++) {
        var key = DAYS[(now.day + d) % 7], list = hours[key] || [];
        for (var j = 0; j < list.length; j++) {
          if (d === 0 && toMin(list[j][0]) <= now.min) continue;
          var tpl = d === 0 ? t.opens_today : d === 1 ? t.opens_tomorrow : t.opens_day;
          text = fill(tpl, { time: list[j][2], day: (t.days || {})[key] || key });
          break;
        }
      }
      if (text) document.querySelectorAll("[data-open-status]").forEach(function (s) {
        s.textContent = text;
        var tab = s.closest(".hero-tab");
        if (tab) tab.classList.toggle("is-open-now", open);
      });
    }
  }

  /* ---------- formulário (Web3Forms). Na prévia, não envia. ---------- */
  var form = document.querySelector("[data-form]");
  if (form) {
    var out = form.querySelector("[data-form-status]");
    form.addEventListener("submit", function (ev) {
      if (form.getAttribute("data-preview") === "true") { ev.preventDefault(); out.textContent = t.preview_form; return; }
      if (!window.fetch) return;
      ev.preventDefault();
      var btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      fetch(form.action, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) })
        .then(function (r) { return r.json(); })
        .then(function (j) { out.textContent = j.success ? t.sent : t.error; if (j.success) form.reset(); })
        .catch(function () { out.textContent = t.error; })
        .then(function () { btn.disabled = false; });
    });
  }

  /* ---------- tela de carregamento ---------- */
  var loader = document.querySelector("[data-loader]");
  function finishLoader(done) {
    try { sessionStorage.setItem("seen", "1"); } catch (err) {}
    if (!loader || getComputedStyle(loader).display === "none") { if (loader) loader.remove(); done(); return; }
    var count = loader.querySelector("[data-count]");
    var start = performance.now(), dur = reduce ? 0 : 900;
    (function tick(now) {
      var p = Math.min(1, (now - start) / dur);
      if (count) count.textContent = String(Math.round(p * 100)).padStart(2, "0");
      if (p < 1) return requestAnimationFrame(tick);
      loader.classList.add("is-done");
      setTimeout(function () { loader.remove(); }, 1000);
      done();
    })(start);
  }

  /* ---------- cursor ---------- */
  var cursor = document.querySelector("[data-cursor]");
  if (cursor && fine && !reduce) {
    var cx = window.gsap ? gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3" }) : null;
    var cy = window.gsap ? gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3" }) : null;
    window.addEventListener("mousemove", function (ev) {
      cursor.classList.add("is-on");
      if (cx) { cx(ev.clientX); cy(ev.clientY); } else cursor.style.transform = "translate(" + ev.clientX + "px," + ev.clientY + "px)";
    });
    document.addEventListener("mouseover", function (ev) { cursor.classList.toggle("is-hover", !!ev.target.closest("a, button, .mr, label")); });
    document.addEventListener("mouseleave", function () { cursor.classList.remove("is-on"); });
  }

  /* ---------- foto que segue o mouse no cardápio ---------- */
  var floater = document.querySelector("[data-menu-float]");
  if (floater && fine) {
    var fimg = floater.querySelector("img");
    var fx = window.gsap ? gsap.quickTo(floater, "x", { duration: 0.5, ease: "power3" }) : null;
    var fy = window.gsap ? gsap.quickTo(floater, "y", { duration: 0.5, ease: "power3" }) : null;
    document.querySelectorAll(".mr[data-img]").forEach(function (rowEl) {
      rowEl.addEventListener("mouseenter", function () { fimg.src = rowEl.getAttribute("data-img"); floater.classList.add("is-on"); });
      rowEl.addEventListener("mouseleave", function () { floater.classList.remove("is-on"); });
    });
    window.addEventListener("mousemove", function (ev) {
      if (fx) { fx(ev.clientX); fy(ev.clientY); } else floater.style.transform = "translate(" + ev.clientX + "px," + ev.clientY + "px)";
    });
  }

  if (!motion) { root.classList.remove("intro"); finishLoader(function () {}); return; }

  // espera as fontes (no máximo 1,5 s) antes de dividir as letras: medidas certas e sem "pulo" no título
  var fontsReady = document.fonts && document.fonts.ready
    ? Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1500); })])
    : Promise.resolve();
  fontsReady.then(startMotion);

  function startMotion() {

  /* =================== animações (GSAP + ScrollTrigger + SplitText) =================== */
  gsap.registerPlugin(ScrollTrigger);
  var Split = window.SplitText;
  if (Split) gsap.registerPlugin(Split);
  // letras recortadas pela própria máscara: sobem "de dentro" da linha
  var split = function (el, type) {
    if (!Split) return null;
    var opts = type === "chars" ? { type: "chars", mask: "chars" } : { type: type };
    try { return Split.create ? Split.create(el, opts) : new Split(el, { type: type }); }
    catch (err) { return null; }
  };

  // faixa corrida: velocidade sobe com a rolagem
  document.querySelectorAll("[data-marquee]").forEach(function (track) {
    track.classList.add("is-js");
    var loop = gsap.to(track, { xPercent: -50, repeat: -1, duration: 34, ease: "none" });
    ScrollTrigger.create({
      trigger: track, start: "top bottom", end: "bottom top",
      onUpdate: function (self) {
        var boost = 1 + Math.min(5, Math.abs(self.getVelocity()) / 350);
        gsap.to(loop, { timeScale: boost, duration: 0.2, overwrite: true, onComplete: function () { gsap.to(loop, { timeScale: 1, duration: 1.2 }); } });
      }
    });
  });

  // mídia do topo: leve zoom e parallax ao rolar
  var heroMedia = document.querySelector("[data-hero-media] .media");
  if (heroMedia) {
    gsap.to(heroMedia, { yPercent: 10, scale: 1.08, ease: "none",
      scrollTrigger: { trigger: "[data-hero]", start: "top top", end: "bottom top", scrub: true } });
  }

  // títulos de seção: letras sobem
  document.querySelectorAll("[data-split]").forEach(function (el) {
    var s = split(el, "chars");
    if (!s) return;
    gsap.from(s.chars, { yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.018,
      scrollTrigger: { trigger: el, start: "top 86%" } });
  });

  // frase grande: palavras acendem conforme a rolagem
  document.querySelectorAll("[data-words]").forEach(function (el) {
    var s = split(el, "words");
    if (!s) return;
    gsap.fromTo(s.words, { opacity: 0.14 }, { opacity: 1, ease: "none", stagger: 0.08,
      scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 42%", scrub: true } });
  });

  // camadas em velocidades diferentes (colagem, fotos da frase, história)
  document.querySelectorAll("[data-speed]").forEach(function (el) {
    var speed = parseFloat(el.getAttribute("data-speed")) || 0;
    gsap.to(el, { y: function () { return -speed * (small() ? 160 : 420); }, ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true } });
  });

  // linhas do cardápio, serviços, avaliações e horário entram em sequência
  [".mr", ".sv", ".rv", ".hours li", ".ct-links li"].forEach(function (sel) {
    var items = document.querySelectorAll(sel);
    if (!items.length) return;
    gsap.set(items, { opacity: 0, y: 26 });
    ScrollTrigger.batch(items, { start: "top 92%", once: true,
      onEnter: function (batch) { gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.06 }); } });
  });

  // mapa do bairro: as ruas se desenham
  var map = document.querySelector("[data-map]");
  if (map) {
    var paths = map.querySelectorAll(".m-roads path:not(.m-water):not(.m-park)");
    paths.forEach(function (p) {
      var len = p.getTotalLength ? p.getTotalLength() : 0;
      if (!len) return;
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    });
    gsap.to(paths, { strokeDashoffset: 0, duration: 2.8, ease: "power2.inOut", stagger: 0.25,
      scrollTrigger: { trigger: map, start: "top 82%" } });
  }

  // nome gigante do rodapé
  var word = document.querySelector(".ftr-word span");
  if (word) {
    var ws = split(word, "chars");
    if (ws) gsap.from(ws.chars, { yPercent: 100, duration: 1.2, ease: "expo.out", stagger: 0.03,
      scrollTrigger: { trigger: word, start: "top 95%" } });
  }

  // entrada do topo (depois da tela de carregamento)
  var heroLines = document.querySelectorAll(".hero-title .hl-in");
  var heroBits = document.querySelectorAll(".hero-kicker, .hero-sub, .hero-actions, .hero-tab, .hero-row");
  gsap.set(heroBits, { opacity: 0, y: 20 });
  var heroChars = [];
  heroLines.forEach(function (ln) { var s = split(ln, "chars"); if (s) heroChars = heroChars.concat(s.chars); });
  if (heroChars.length) gsap.set(heroChars, { yPercent: 115 });
  if (heroMedia) gsap.set(heroMedia.parentNode, { scale: 1.18 });
  root.classList.remove("intro");
  finishLoader(function () {
    var tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    if (heroMedia) tl.to(heroMedia.parentNode, { scale: 1, duration: 2.2 }, 0);
    if (heroChars.length) tl.to(heroChars, { yPercent: 0, duration: 1.1, stagger: Math.min(0.022, 0.6 / heroChars.length) }, 0.1);
    tl.to(heroBits, { opacity: 1, y: 0, duration: 1, stagger: 0.07 }, 0.45);
    fitAll();
    ScrollTrigger.refresh();
  });
  }
})();
