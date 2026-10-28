/* Noondoor: main.js (v2, a porta de vidro)
   Tudo o que nao e animacao (relogio, cadastro, menu, cabecalho, idioma) roda sem GSAP e sem three. A porta 3D (porta3d.js, three.js) so e baixada
   depois do load, se o visitante aceita movimento e a maquina aguenta (tier A/B); senao o topo usa o poster e uma travessia 2D (tier C).
   Com "reduzir movimento": nada de trilho, nada de three; tudo aparece parado e completo.
   Texto nunca entra com mascara, clip-path ou cortina: so opacity + translateY curto. */
(function () {
  "use strict";

  /* ============ CONFIG: o que muda quando o Gmail, o Instagram e a FormSubmit estiverem ligados ============ */
  var CONTACT_EMAIL = "hello.noondoor@gmail.com";   // e-mail de contato (o Gmail ja existe). Trocando aqui o JS atualiza links, textos e JSON-LD
  var SOURCE_EMAIL = "hello.noondoor@gmail.com";    // valor escrito no HTML e no _dev/lang.py (nao mexer; ver entrega.md para trocar a fonte tambem)
  var INSTAGRAM = "noondoorstudio";                  // conta da marca; vazio esconde o "DM PREVIEW"
  var FORM_LIVE = false;                             // true so quando o Patrick ativar a FormSubmit (e-mail de ativacao). false = modo previa (valida e nao envia)
  var FORM_ENDPOINT = "https://formsubmit.co/ajax/"; // + CONTACT_EMAIL (ou o apelido que a FormSubmit der depois da ativacao)
  var BR_TZ = "America/Sao_Paulo";

  var root = document.documentElement;
  var Q = new URLSearchParams(location.search);
  var reduce = root.classList.contains("reduce") || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };
  var isDesk = function () { return window.matchMedia("(min-width: 900px)").matches; };
  var coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;
  var lang = function () { return (window.SiteLang && window.SiteLang.lang) || "en"; };
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var anim = hasGsap && !reduce;
  var lenis = null;
  var CREAM = "#F3EADB", UMBER = "#2A1D14", CLAY = "#8C5B3F";

  var porta = $("[data-porta]"), stage = $("[data-stage]"), topEl = $("[data-top]"), slotEl = $("[data-door-slot]"), canvas = $("[data-gl]");
  var h1 = $("[data-h1]"), heroText = $("[data-hero-text]"), frase = $("[data-frase]"), head = $("[data-samples-head]");
  var endEl = $("[data-end]"), endGl = $("[data-end-gl]"), endSlot = $("[data-end-slot]");
  var hdr = $("[data-header]"), bar = $("[data-bar]");
  var portaP = 0, trailST = null, trail = false;

  /* ============ e-mail (uma constante so), Instagram, ano ============ */
  function applyEmail() {
    $$("[data-email]").forEach(function (a) {
      a.textContent = CONTACT_EMAIL;
      if (a.tagName === "A") a.setAttribute("href", "mailto:" + CONTACT_EMAIL);
    });
    $$("[data-email-alt]").forEach(function (a) { a.setAttribute("href", "mailto:" + CONTACT_EMAIL); });
    if (CONTACT_EMAIL === SOURCE_EMAIL) return;
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n, hit = [];
    while ((n = w.nextNode())) { if (n.data.indexOf(SOURCE_EMAIL) > -1 && !/^(SCRIPT|STYLE)$/.test(n.parentNode.tagName)) hit.push(n); }
    hit.forEach(function (t) { t.data = t.data.split(SOURCE_EMAIL).join(CONTACT_EMAIL); });
    $$('script[type="application/ld+json"]').forEach(function (s) { if (s.textContent.indexOf(SOURCE_EMAIL) > -1) s.textContent = s.textContent.split(SOURCE_EMAIL).join(CONTACT_EMAIL); });
  }
  applyEmail();
  window.addEventListener("sitelang", applyEmail);
  $$("[data-ig]").forEach(function (a) { if (INSTAGRAM) a.setAttribute("href", "https://instagram.com/" + INSTAGRAM); else a.style.display = "none"; });
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ============ relogio das duas portas ============ */
  function fmtTime(tz) {
    var pt = lang() === "pt";
    try { return new Intl.DateTimeFormat(pt ? "pt-BR" : "en-US", { hour: "numeric", minute: "2-digit", hour12: !pt, timeZone: tz }).format(new Date()).replace(/ /g, " "); }
    catch (e) { return "--:--"; }
  }
  function visitorTz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { return ""; } }
  function updateClock() {
    var br = fmtTime(BR_TZ), tz = visitorTz(), you = tz ? fmtTime(tz) : "", pt = lang() === "pt";
    var same = !tz || tz === BR_TZ || you === br;
    var el = $("[data-clock]");
    if (el) {
      if (same) el.textContent = pt ? "Aqui são " + br + " no Brasil." : "Right now in Brazil: " + br + ".";
      else el.textContent = pt ? "Aqui são " + br + " no Brasil. Aí são " + you + "." : "Here it's " + br + " in Brazil. There it's " + you + ".";
    }
    var b = $("[data-clock-br]"), y = $("[data-clock-you]");
    if (b) b.textContent = br;
    if (y) y.textContent = you || br;
  }
  updateClock();
  setInterval(updateClock, 20000);

  /* ============ menu em tela cheia (celular) ============ */
  var ov = $("[data-overlay]"), toggle = $("[data-toggle]");
  function setMenu(open) {
    if (!ov || !toggle) return;
    ov.classList.toggle("is-open", open);
    ov.setAttribute("aria-hidden", open ? "false" : "true");
    root.classList.toggle("ov-open", open);
    document.body.classList.toggle("ov-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    var label = $(".hdr-toggle-label", toggle);
    if (label) label.textContent = label.getAttribute(open ? "data-label-close" : "data-label-open") || label.textContent;
    if (lenis) { open ? lenis.stop() : lenis.start(); }
    if (open) { var first = $("a", ov); if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 140); }
  }
  if (toggle) toggle.addEventListener("click", function () { setMenu(!ov.classList.contains("is-open")); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && ov && ov.classList.contains("is-open")) { setMenu(false); toggle.focus(); } });
  window.addEventListener("resize", function () { if (isDesk()) setMenu(false); });

  /* ============ links internos ============ */
  function samplesY() { return trail && trailST ? trailST.end : null; }
  function goTo(id, dur) {
    var y;
    if (id === "#top") y = 0;
    else if (id === "#samples" && samplesY() !== null) y = samplesY();
    else { var t = document.querySelector(id); if (!t) return; y = null; if (lenis) lenis.scrollTo(t, { offset: 0, duration: dur || 1.2 }); else t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); return; }
    if (lenis) lenis.scrollTo(y, { duration: dur || 1.2 }); else window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  }
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href");
    if (id.length < 2) return;
    if (id !== "#top" && !document.querySelector(id)) return;
    ev.preventDefault();
    var wasOpen = ov && ov.classList.contains("is-open");
    if (wasOpen) setMenu(false);
    var go = function () { goTo(id); if (history.replaceState) history.replaceState(null, "", id); };
    wasOpen ? setTimeout(go, 80) : go();
  });

  /* ============ cabecalho: tom, fundo solido, sol que viaja ============ */
  var arc = $("[data-arc]"), arcSun = $("[data-arc-sun]"), sunbar = $("[data-sunbar]");
  var sections = $$("[data-tone]").filter(function (s) { return s !== hdr; });
  var arcLen = arc && arc.getTotalLength ? arc.getTotalLength() : 0;
  var ticking = false;
  function headerState() {
    ticking = false;
    var h = hdr.offsetHeight, probe = h / 2, tone = "dark";
    for (var i = 0; i < sections.length; i++) {
      var r = sections[i].getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) tone = sections[i].getAttribute("data-tone");
    }
    if (trail && tone === "dark" && portaP >= 0.60) tone = "light";
    if (hdr.getAttribute("data-tone") !== tone) hdr.setAttribute("data-tone", tone);
    var pr = porta.getBoundingClientRect();
    hdr.classList.toggle("solid", trail ? pr.bottom <= window.innerHeight + 2 : pr.bottom <= h + 1);
    var max = document.documentElement.scrollHeight - window.innerHeight, p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (arcLen && arcSun) { var pt = arc.getPointAtLength(p * arcLen); arcSun.setAttribute("cx", pt.x.toFixed(2)); arcSun.setAttribute("cy", pt.y.toFixed(2)); }
    if (sunbar) sunbar.style.transform = "scaleX(" + p.toFixed(4) + ")";
    updateBar();
    if (syncZone) syncZone();
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(headerState); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  /* ============ barra fixa do celular: aparece depois da travessia, some no cadastro ============ */
  var formEl = $("[data-form]"), formOnScreen = false;
  function updateBar() {
    if (!bar) return;
    var after = trail ? portaP >= 0.66 : window.scrollY > window.innerHeight * 0.8;
    bar.classList.toggle("is-hidden", !after || formOnScreen);
  }
  if (formEl && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { formOnScreen = es[0].isIntersecting; if (formOnScreen && !formShownAt) formShownAt = Date.now(); updateBar(); }, { threshold: 0.15 }).observe(formEl);
  }
  var formShownAt = 0;

  /* ============ cadastro ============ */
  var T = {
    en: { doneTitle: function (n) { return "Got it" + (n ? ", " + n : "") + "."; },
          doneText: function (m) { return "I'll reach out by " + m + ". If it's a fit, I'll build your preview, and you only pay after you approve the finished site."; },
          m: { instagram: "Instagram DM", email: "email", whatsapp: "WhatsApp" },
          consent: "Yes, you can message me at this number about my site. Message and data rates may apply. Reply STOP anytime." },
    pt: { doneTitle: function (n) { return "Recebi" + (n ? ", " + n : "") + "."; },
          doneText: function (m) { return "Vou te chamar por " + m + ". Se fizer sentido, eu monto a sua prévia, e você só paga depois de aprovar o site pronto."; },
          m: { instagram: "Instagram", email: "e-mail", whatsapp: "WhatsApp" },
          consent: "Pode me chamar no WhatsApp neste número para falar do meu site." }
  };
  var panel = $("[data-panel]"), done = $("[data-done]");
  var conds = $$("[data-cond]"), radios = $$('input[name="Best way to reach you"]');
  var methodTouched = false, igTouched = false;
  function curMethod() { var r = radios.filter(function (x) { return x.checked; })[0]; return r ? r.closest("[data-opt]").getAttribute("data-opt") : "instagram"; }
  function setMethod(m) {
    radios.forEach(function (r) { r.checked = r.closest("[data-opt]").getAttribute("data-opt") === m; });
    conds.forEach(function (c) {
      var on = c.getAttribute("data-cond") === m;
      c.classList.toggle("is-open", on);
      if ("inert" in c) c.inert = !on;
      $$("input,textarea", c).forEach(function (i) { i.disabled = !on; });
      if (!on) $$(".field", c).forEach(function (f) { clearBad(f); });
    });
  }
  function defaultMethod() { if (!methodTouched) setMethod(lang() === "pt" ? "whatsapp" : "instagram"); }
  radios.forEach(function (r) { r.addEventListener("change", function () { methodTouched = true; setMethod(curMethod()); }); });
  function clearBad(f) { f.classList.remove("is-bad"); var i = $("input,textarea", f), e = $(".err", f); if (i) i.removeAttribute("aria-invalid"); if (e) e.hidden = true; }
  function markBad(f) { f.classList.add("is-bad"); var i = $("input:not([type=checkbox]),textarea", f) || $("input", f), e = $(".err", f); if (i) i.setAttribute("aria-invalid", "true"); if (e) e.hidden = false; return i; }
  var digits = function (v) { return (String(v).match(/\d/g) || []).length; };
  var igOk = function (v) { return /^@?[A-Za-z0-9._]{1,30}$/.test(v.trim()); };
  var mailOk = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); };
  function validate() {
    var bad = [], m = curMethod(), el = function (id) { return document.getElementById(id); };
    $$("[data-field]", formEl).forEach(clearBad);
    var chk = function (id, ok) { var i = el(id); if (!ok(i)) bad.push(markBad(i.closest("[data-field]"))); };
    chk("f-name", function (i) { return i.value.trim().length > 0; });
    chk("f-biz", function (i) { return i.value.trim().length > 0; });
    if (m === "instagram") chk("f-ig", function (i) { return igOk(i.value); });
    if (m === "email") chk("f-mail", function (i) { return mailOk(i.value); });
    if (m === "whatsapp") {
      chk("f-wa", function (i) { return digits(i.value) >= 8 && /^[\d+\s().-]+$/.test(i.value.trim()); });
      chk("f-consent", function (i) { return i.checked; });
    }
    return bad;
  }
  var linkEl = $("#f-link"), igEl = $("#f-ig");
  if (igEl) igEl.addEventListener("input", function () { igTouched = true; });
  if (linkEl && igEl) linkEl.addEventListener("input", function () {          // @handle ou instagram.com/handle no campo 3 preenche o Instagram sozinho (editavel)
    if (igTouched && igEl.value) return;
    var v = linkEl.value.trim(), m = /instagram\.com\/([A-Za-z0-9._]+)/i.exec(v);
    if (m) igEl.value = "@" + m[1]; else if (/^@[A-Za-z0-9._]{1,30}$/.test(v)) igEl.value = v;
  });
  if (formEl) {
    var msgFail = $("[data-form-fail]"), msgPrev = $("[data-form-preview]"), btn = $("[data-submit]");
    formEl.addEventListener("input", function (ev) { var f = ev.target.closest && ev.target.closest("[data-field]"); if (f) clearBad(f); });
    formEl.addEventListener("change", function (ev) { var f = ev.target.closest && ev.target.closest("[data-field]"); if (f) clearBad(f); });
    formEl.addEventListener("submit", function (ev) {
      ev.preventDefault();
      msgFail.hidden = true; msgPrev.hidden = true;
      var bad = validate();
      if (bad.length) { if (bad[0]) bad[0].focus(); return; }
      var g = function (id) { return (document.getElementById(id) || {}).value || ""; }, m = curMethod(), L = lang();
      if (formEl.elements._honey && formEl.elements._honey.value) { showDone(); return; }                  // antispam: campo-isca
      if (FORM_LIVE && formShownAt && Date.now() - formShownAt < 3000) { showDone(); return; }          // armadilha de tempo: envio em menos de 3 s mostra o sucesso sem enviar
      if (!FORM_LIVE) { msgPrev.hidden = false; return; }                                                  // modo previa: nao envia
      var payload = {
        _subject: "Preview request: " + g("f-biz"), _template: "table", _captcha: "false", _honey: "",
        "Name": g("f-name"), "Business": g("f-biz"), "Instagram or website": g("f-link"),
        "Best way to reach you": (formEl.querySelector('input[name="Best way to reach you"]:checked') || {}).value,
        "City / state": g("f-city"), "Message": g("f-msg"), "Language": L, "Page": location.href
      };
      if (m === "instagram") payload["Instagram"] = g("f-ig").trim();
      if (m === "email") payload["email"] = g("f-mail").trim();
      if (m === "whatsapp") {
        payload["WhatsApp"] = g("f-wa").trim();
        var tz = visitorTz();
        payload["Consent"] = T[L].consent + " | " + new Date().toISOString() + " | " + (tz || "tz unknown");   // o e-mail que chega vira o registro do consentimento
      }
      btn.disabled = true; btn.setAttribute("aria-busy", "true"); var txt0 = btn.textContent; btn.textContent = L === "pt" ? "Enviando…" : "Sending…";
      fetch(FORM_ENDPOINT + CONTACT_EMAIL, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return r.ok && String(j.success) === "true"; }); })
        .catch(function () { return false; })
        .then(function (ok) {
          btn.disabled = false; btn.removeAttribute("aria-busy"); btn.textContent = txt0;
          if (ok) showDone(); else { msgFail.hidden = false; msgFail.focus && msgFail.setAttribute("tabindex", "-1"); msgFail.focus(); }
        });
    });
  }
  function showDone() {
    var L = lang(), first = (document.getElementById("f-name").value || "").trim().split(/\s+/)[0], m = curMethod();
    $("[data-done-title]").textContent = T[L].doneTitle(first);
    $("[data-done-text]").textContent = T[L].doneText(T[L].m[m]);
    formEl.hidden = true; done.hidden = false;
    var sun = $("[data-done-sun]");
    if (sun) { if (anim) { sun.setAttribute("cy", "132"); gsap.to(sun, { attr: { cy: 100 }, duration: 1.2, ease: "power2.out", delay: 0.2 }); } else sun.setAttribute("cy", "100"); }
    $("[data-done-title]").focus();
  }
  defaultMethod(); setMethod(curMethod());
  window.addEventListener("sitelang", function () { defaultMethod(); });

  /* ============ titulo do topo: cabe na largura e na altura ============ */
  function fitH1() {
    if (!h1 || !heroText) return;
    var side = $(".hero-side", heroText), slot = slotEl.getBoundingClientRect(), top = topEl.getBoundingClientRect();
    var lines = $$(".l", h1), desk = isDesk();
    h1.style.fontSize = "100px";
    heroText.style.setProperty("--hero-b", (side ? side.offsetHeight : 0) + "px");
    var size;
    if (desk) {
      var l2 = lines[1].getBoundingClientRect(), l3 = lines[2].getBoundingClientRect(), rowW = Math.max(1, l3.right - l2.left);
      var maxW = side.getBoundingClientRect().left - h1.getBoundingClientRect().left - 32;
      size = 100 * maxW / rowW;
      var cap = Math.min(128, Math.max(56, window.innerWidth * 0.074));
      var bottomPx = parseFloat(getComputedStyle(h1).bottom) || 60;
      var room = top.height - bottomPx - (slot.bottom - top.top) - 44;
      size = Math.min(size, cap, room / (2 * 0.95));
    } else {
      var w = 0; lines.forEach(function (l) { w = Math.max(w, l.getBoundingClientRect().width); });
      size = 100 * (window.innerWidth - 2 * parseFloat(getComputedStyle(heroText).paddingLeft)) / w;
      var roomM = top.height - (slot.bottom - top.top) - 22 - (side ? side.offsetHeight : 0) - 34;
      size = Math.min(size, 84, roomM / (3 * 0.95));
    }
    h1.style.fontSize = Math.max(40, size) + "px";
  }
  fitH1();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitH1(); if (hasGsap) ScrollTrigger.refresh(); });
  var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { fitH1(); if (portaApi) portaApi.layout(); }, 120); });

  /* ============ cursor proprio (so mouse) ============ */
  var cur = $("[data-cursor]");
  if (cur && !reduce && window.matchMedia("(hover:hover) and (pointer:fine)").matches) {
    var cx = 0, cy = 0, tx = 0, ty = 0, started = false;
    document.addEventListener("pointermove", function (e) { tx = e.clientX; ty = e.clientY; if (!started) { cx = tx; cy = ty; started = true; } cur.classList.add("is-on"); });
    document.addEventListener("pointerleave", function () { cur.classList.remove("is-on"); });
    document.addEventListener("pointerover", function (e) { cur.classList.toggle("is-big", !!(e.target.closest && e.target.closest("a,button,summary,label"))); });
    (function loop() { cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22; cur.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)"; requestAnimationFrame(loop); })();
  }

  /* ============ porta 3D: carregamento, tiers, zonas (topo e rodape) ============ */
  var portaApi = null, tierNow = "c", syncZone = null, gl2dReady = false;
  var slotSun = $("[data-slot-sun]"), slotMem = $("[data-slot-mem]");
  var HUD = null;
  if (Q.get("fps")) { HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:300;font:12px ui-monospace,monospace;color:#F3EADB;background:rgba(0,0,0,.6);padding:3px 8px"; document.body.appendChild(HUD); }

  function pickTier() {
    if (reduce || !anim) return "c";
    var nv = navigator;
    if (Q.get("tier")) return Q.get("tier");
    if (nv.deviceMemory && nv.deviceMemory <= 2) return "c";
    if (nv.hardwareConcurrency && nv.hardwareConcurrency <= 2) return "c";
    if (nv.connection && nv.connection.saveData) return "c";
    return (isDesk() && !coarse) ? "a" : "b";
  }

  function glZone() {            // onde o 3D precisa estar rodando agora
    var vh = window.innerHeight;
    var pr = porta.getBoundingClientRect(), er = endEl.getBoundingClientRect();
    var inTop = pr.bottom > 0 && pr.top < vh && (!trail || portaP < 0.66);
    var inFoot = er.top < vh && er.bottom > 0;
    return inTop ? "top" : (inFoot && portaApi && portaApi.tier === "a" ? "foot" : null);
  }
  var curZone = null;
  function syncZoneImpl() {
    if (!portaApi) return;
    var z = glZone();
    if (z === curZone) return;
    curZone = z;
    if (z === "top") {
      portaApi.setMode("top", topEl, slotEl); endEl.classList.remove("is-gl-end"); portaApi.setProgress(portaP); portaApi.start();
      canvas.style.visibility = "visible";
    } else if (z === "foot") {
      portaApi.stop(); portaApi.setMode("foot", endGl, endSlot); endEl.classList.add("is-gl-end"); canvas.style.visibility = "visible"; portaApi.setFootProgress(footQ); portaApi.start();
    } else { portaApi.stop(); if (canvas.parentNode === topEl) canvas.style.visibility = "hidden"; }
  }
  var footQ = 0;

  function startGL() {
    tierNow = pickTier();
    if (tierNow === "c") { setup2D(); return; }
    var leaves = isDesk() ? "img/shadows-1400.webp" : "img/shadows-900.webp";
    import("./porta3d.js").then(function (m) {
      return m.createPorta({
        canvas: canvas, container: topEl, slot: slotEl, tier: tierNow, leavesUrl: leaves, worldUrl: "img/3d/mundo-640.webp",
        dprMax: { a: 1.75, b: 1.5 }, spinSeconds: { a: 16, b: 20 }, noDrop: !!Q.get("tier") || !!Q.get("nodrop"),
        onFirstFrame: function () { root.classList.add("is-gl"); },
        onTier: function (t) { if (t === "c") { fallbackTo2D(); } },
        onLost: function () { fallbackTo2D(); }
      });
    }).then(function (api) {
      portaApi = api; syncZone = syncZoneImpl; window.__portaApi = api;
      // clique no arco = travessia (so mouse): o botao "See the samples" faz o mesmo e e o caminho por teclado
      canvas.addEventListener("click", function (e) {
        if (e.pointerType === "touch" || !trail || portaP > 0.12) return;
        var sr = slotEl.getBoundingClientRect();
        if (e.clientX > sr.left && e.clientX < sr.right && e.clientY > sr.top && e.clientY < sr.bottom) goTo("#samples", 2.2);
      });
      canvas.addEventListener("pointermove", function (e) {
        if (e.pointerType === "touch") return;
        var sr = slotEl.getBoundingClientRect();
        canvas.style.cursor = (portaP < 0.12 && e.clientX > sr.left && e.clientX < sr.right && e.clientY > sr.top && e.clientY < sr.bottom) ? "pointer" : "";
      }, { passive: true });
      curZone = null; syncZoneImpl(); headerState();
      if (HUD) { var n = 0, t0 = performance.now(); (function f() { n++; var t = performance.now(); if (t - t0 > 1000) { HUD.textContent = Math.round(n * 1000 / (t - t0)) + " fps | tier " + (portaApi ? portaApi.tier : "-") + " | dpr " + (portaApi ? portaApi.dpr : "-") + " | zone " + curZone + " | avg " + (portaApi ? portaApi.avgMs.toFixed(1) : "-") + " ms"; n = 0; t0 = t; } requestAnimationFrame(f); })(); }
    }).catch(function (err) { if (window.console) console.warn("porta3d: usando o poster 2D", err && err.message); fallbackTo2D(); });
  }
  function fallbackTo2D() {
    if (portaApi) { try { portaApi.stop(); } catch (e) {} }
    portaApi = null; syncZone = null; curZone = null;
    root.classList.remove("is-gl"); endEl.classList.remove("is-gl-end");
    if (canvas) canvas.style.display = "none";
    tierNow = "c"; setup2D();
  }

  /* ---- tier C / sem WebGL: travessia 2D no mesmo trilho (o poster cresce a partir do centro do vao) ---- */
  function setup2D() {
    if (gl2dReady || !trail) { gl2dReady = true; return; }
    gl2dReady = true; root.classList.add("is-2d");
    gsap.set(slotEl, { clearProps: "transform" });
    gsap.set(slotEl, { xPercent: -50, yPercent: -50, transformOrigin: "50% 66.9%" });
    // o vao mostra o mundo do meio-dia (um site de exemplo banhado de luz) com o centro ja claro, como na versao 3D
    if (slotMem) slotMem.style.background = "radial-gradient(ellipse 60% 45% at 50% 48%, rgba(243,234,219,.92) 0%, rgba(243,234,219,0) 100%), linear-gradient(180deg, rgba(240,180,80,0) 70%, rgba(240,180,80,.3) 100%), url(img/3d/mundo-640.webp) center/cover no-repeat";
    update2D(portaP);
  }

  /* ============ trilho do topo (GSAP): giro, meio-dia, travessia, abertura dos exemplos ============ */
  var trailTl = null;
  function splitWords(el) {
    if (el.querySelector(".w")) return;
    (function walk(node, em) {
      [].slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.data.split(/(\s+)/).forEach(function (tok) {
            if (!tok) return;
            if (/^\s+$/.test(tok)) frag.appendChild(document.createTextNode(tok));
            else { var sp = document.createElement("span"); sp.className = "w" + (em ? " em" : ""); sp.textContent = tok; frag.appendChild(sp); }
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1 && c.tagName === "EM") walk(c, true);
      });
    })(el, false);
  }
  function setDay(day) {
    stage.classList.toggle("is-day", day);
    stage.classList.toggle("no-grain", day);
  }
  function applyP(p) {
    portaP = p;
    if (portaApi && curZone === "top") portaApi.setProgress(p);
    var day = p >= 0.60;
    if (day !== stage.classList.contains("is-day")) {
      setDay(day); porta.setAttribute("data-tone", day ? "light" : "dark"); headerState();
    }
    if (syncZone) syncZone();
    if (!portaApi) update2D(p);
    updateBar();
    if (hdr) { var tone = day ? "light" : "dark"; if (porta.getAttribute("data-tone") !== tone) porta.setAttribute("data-tone", tone); }
  }
  function ssm(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function update2D(p) {
    if (!gl2dReady) return;
    var tr = Math.min(1, Math.max(0, (p - 0.40) / 0.20));
    var S = Math.max(14, Math.max(window.innerWidth / (slotEl.offsetHeight * 0.3226), window.innerHeight / (slotEl.offsetHeight * 0.66)) * 1.15);
    gsap.set(slotEl, { scale: 1 + (S - 1) * tr * tr * tr, y: 0 });
    var noon = ssm(0.10, 0.28, p);
    if (slotSun) slotSun.style.top = (63.06 - 13.06 * noon) + "%";
    if (slotMem) slotMem.style.opacity = ssm(0.12, 0.26, p);
    slotEl.style.opacity = p >= 0.60 ? 0 : 1;
  }
  function buildTrail() {
    if (!trail) return;
    if (trailTl) { trailTl.scrollTrigger && trailTl.scrollTrigger.kill(); trailTl.kill(); trailTl = null; }
    splitWords(frase);
    var words = $$(".w", frase), lines = $$(".l", h1);
    var side = [$(".sub", heroText)].concat($$(".ctas .btn", heroText), [$(".note", heroText)]).filter(Boolean);   // .ctas e display:contents no celular: anima os botoes
    var proxy = { p: 0 };
    gsap.set(frase, { opacity: 0 }); gsap.set(head, { opacity: 0 });
    gsap.set(words, { color: CLAY });
    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: porta, start: "top top", end: "bottom bottom", scrub: (isDesk() && !coarse) ? 0.6 : true, invalidateOnRefresh: true }
    });
    trailTl = tl; trailST = tl.scrollTrigger;
    tl.to(proxy, { p: 1, duration: 1, onUpdate: function () { applyP(proxy.p); } }, 0);
    // 0 a 10%: o titulo sobe 24 px e some linha por linha; sub, botoes e nota ate 12%; o relogio de 10 a 16%
    tl.to(lines, { y: -24, autoAlpha: 0, duration: 0.05, stagger: 0.015 }, 0.0)
      .to(side, { y: -24, autoAlpha: 0, duration: 0.07, stagger: 0.01 }, 0.02)
      .to($("[data-clock]"), { autoAlpha: 0, duration: 0.06 }, 0.10);
    // 22 a 46%: a frase da travessia acende palavra por palavra, fica legivel e sai
    tl.fromTo(frase, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.03, immediateRender: false }, 0.19)
      .to(words, { color: function (i, t) { return t.classList.contains("em") ? "#D9A03F" : CREAM; }, duration: 0.05, stagger: 0.075 / Math.max(1, words.length) }, 0.22)
      .to(frase, { y: -24, opacity: 0, duration: 0.06 }, 0.40);
    // 60 a 74%: a abertura dos exemplos entra no proprio palco, no instante em que o quadro vira creme (nenhum quadro vazio)
    var headBits = $$(".h2, .lead, .samples-note", head);
    tl.set(head, { opacity: 1 }, 0.595)
      .fromTo(headBits, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.07, stagger: 0.025, immediateRender: false }, 0.60)
      .to({}, { duration: 0.001 }, 1);
    return tl;
  }

  /* ============ tudo o que precisa de GSAP ============ */
  if (!anim) {
    root.classList.remove("intro");
    // sem GSAP ou com movimento reduzido: topo estatico, sem trilho e sem three
    window.addEventListener("sitelang", function () { updateClock(); fitH1(); });
    headerState();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  root.classList.add("anim"); root.classList.add("trail"); trail = true; root.classList.remove("intro");

  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  buildTrail();
  fitH1();
  var ppForced = Q.get("pp");           // ?pp=0.34 congela o trilho num ponto (so para prints e testes)
  function forcePP() { if (ppForced === null || !trailTl) return; if (trailTl.scrollTrigger) { trailTl.scrollTrigger.kill(); trailST = null; } trailTl.progress(parseFloat(ppForced)); }
  forcePP();

  /* ---------- faixa corrida: corre sozinha e acelera com a rolagem ---------- */
  function marquee() {
    var track = $("[data-marquee-track]"); if (!track) return;
    var tw = gsap.to(track, { xPercent: -50, ease: "none", duration: 44, repeat: -1 });
    var boost = 0;
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { tw.paused(!es[0].isIntersecting); }).observe($("#kinds"));
    ScrollTrigger.create({ onUpdate: function (s) { boost = Math.min(5, Math.abs(s.getVelocity()) / 450); } });
    gsap.ticker.add(function () { boost *= 0.93; tw.timeScale(1 + boost); });
  }

  /* ---------- exemplos: tira horizontal pinada no notebook (~200vh); cada tela rola por dentro quando esta no centro ---------- */
  function samplesPin() {
    var sec = $("[data-samples]"), track = $("[data-samples-track]"); if (!sec || !track) return function () {};
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    var tw = gsap.to(track, { x: function () { return -dist(); }, ease: "none",
      scrollTrigger: { trigger: sec, start: "top top", end: function () { return "+=" + Math.round(Math.min(dist() * 0.8, window.innerHeight * 2.1)); }, pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true } });
    return function () { tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill(); gsap.set(track, { clearProps: "transform" }); };
  }
  var cardTweens = [];
  function cardScroll() {
    cardTweens.forEach(function (t) { t.kill(); });
    cardTweens = [];
    $$("[data-card]").forEach(function (card) {
      var img = $(".card-screen img", card), box = $(".card-screen", card);
      gsap.set(img, { y: 0 });
      var over = img.offsetHeight - box.clientHeight;
      if (over <= 0) { card._tw = null; return; }
      var tw = gsap.to(img, { y: -over, duration: Math.max(16, over / 34), ease: "none", repeat: -1, yoyo: true, paused: true });
      card._tw = tw; cardTweens.push(tw);
    });
  }
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { var tw = e.target._tw; if (!tw) return; e.isIntersecting ? tw.play() : tw.pause(); });
    }, { rootMargin: "0px -30% 0px -30%", threshold: 0 });
    $$("[data-card]").forEach(function (c) { cio.observe(c); });
  }

  /* ---------- como funciona: a folha da porta abre conforme o passo entra ---------- */
  function how() {
    $$("[data-step]").forEach(function (st) {
      var svg = $(".hdoor", st), target = parseFloat(st.getAttribute("data-leaf"));
      gsap.from(st, { y: 44, opacity: 0, duration: 0.8, ease: "power2.out", scrollTrigger: { trigger: st, start: "top 90%", once: true } });
      if (target < 1) gsap.fromTo(svg, { "--leaf": 1 }, { "--leaf": target, ease: "none", scrollTrigger: { trigger: st, start: "top 78%", end: "top 38%", scrub: true } });
    });
  }

  /* ---------- preco: contador ate o valor e o sol nascendo atras ---------- */
  function price() {
    var box = $("[data-price]"); if (!box) return;
    var sunEl = $("[data-price-sun]", box);
    $$(".num", box).forEach(function (el) {
      var end = parseInt(el.getAttribute("data-count"), 10), pre = el.getAttribute("data-prefix") || "";
      var o = { v: 0 }, set = function () { el.textContent = pre + Math.round(o.v); };
      el.style.minWidth = el.offsetWidth ? el.offsetWidth + "px" : "";
      set();
      gsap.to(o, { v: end, duration: 0.9, ease: "power2.out", onUpdate: set, scrollTrigger: { trigger: box, start: "top 78%", once: true } });
    });
    gsap.fromTo(sunEl, { scale: 0.2, y: 80, opacity: 0 }, { scale: 1, y: 0, opacity: 1, duration: 1.1, ease: "power2.out", scrollTrigger: { trigger: box, start: "top 78%", once: true } });
  }

  /* ---------- rodape: as letras "oondoor" se escrevem; o sol se poe saindo por baixo da porta ---------- */
  function endMark() {
    var paths = $$("[data-end-paths] path"), sun = $("[data-end-sun]"); if (!paths.length) return;
    gsap.set(paths, { strokeDasharray: "1 2", strokeDashoffset: 1.02 });
    gsap.set(sun, { xPercent: -50, yPercent: -50, top: "63.06%" });
    var q = { v: 0 };
    gsap.timeline({ scrollTrigger: { trigger: "#end", start: "top 88%", end: "bottom bottom", scrub: true } })
      .to(paths, { strokeDashoffset: 0, ease: "none", duration: 0.5, stagger: 0.1 }, 0)
      .to(q, { v: 1, ease: "none", duration: 0.7, onUpdate: function () { footQ = q.v; if (portaApi && curZone === "foot") portaApi.setFootProgress(q.v); } }, 0.45)
      .to(sun, { top: "170%", ease: "power1.in", duration: 0.7 }, 0.45)
      .to(sun, { opacity: 0, ease: "none", duration: 0.2 }, 0.95);
  }

  /* ---------- montar ---------- */
  var mm = gsap.matchMedia();
  mm.add("(min-width: 900px)", function () { return samplesPin(); });
  marquee();
  cardScroll();
  how();
  price();
  endMark();
  // o three so e baixado depois do load, quando o navegador esta ocioso (o LCP e o H1 ou o poster, nunca o canvas)
  var boot = function () { if (window.requestIdleCallback) requestIdleCallback(startGL, { timeout: 1500 }); else setTimeout(startGL, 300); };
  if (document.readyState === "complete") boot(); else window.addEventListener("load", boot);
  headerState();

  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(cardScroll, 250); });
  window.addEventListener("sitelang", function () {
    updateClock(); fitH1(); cardScroll();
    if (trail) { buildTrail(); forcePP(); }
    setTimeout(function () { ScrollTrigger.refresh(); fitH1(); }, 120);
  });
  window.addEventListener("load", function () { ScrollTrigger.refresh(); fitH1(); forcePP(); });
})();
