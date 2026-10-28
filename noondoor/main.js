/* Noondoor v3: main.js. Um arquivo so, sem GSAP e sem ScrollTrigger: nada aqui espera uma CDN (o Lenis e o three.js entram depois do load, e so se o visitante aceita
   movimento e a maquina aguenta). Texto nunca entra com mascara, clip-path ou cortina: so opacidade e deslocamento. Bloco invisivel = visibility:hidden. */
(function () {
  "use strict";

  /* ============ CONFIG: o que muda quando a FormSubmit e o Instagram estiverem ligados ============ */
  var CONTACT_EMAIL = "hello.noondoor@gmail.com";   // e-mail de contato (o Gmail ja existe). Trocando aqui o JS atualiza links, textos e JSON-LD
  var SOURCE_EMAIL = "hello.noondoor@gmail.com";    // valor escrito no HTML e no _dev/lang.py (nao mexer; ver entrega.md para trocar a fonte tambem)
  var INSTAGRAM = "noondoorstudio";                  // conta da marca; vazio esconde o "DM PREVIEW"
  var FORM_LIVE = false;                             // true so quando o Patrick ativar a FormSubmit (e-mail de ativacao). false = modo previa (valida e nao envia)
  var FORM_ENDPOINT = "https://formsubmit.co/ajax/"; // + CONTACT_EMAIL (ou o apelido que a FormSubmit der depois da ativacao)
  var LENIS_URL = "https://cdn.jsdelivr.net/npm/lenis@1.3.4/dist/lenis.min.js";

  var root = document.documentElement;
  var reduce = root.classList.contains("reduce") || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ss = function (a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var easeIO = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  var lang = function () { return (window.SiteLang && window.SiteLang.lang) || "en"; };
  var coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;

  var porta = $("[data-porta]"), stage = $("[data-stage]"), sHero = $("[data-s-hero]"), sWorld = $("[data-s-world]");
  var slotEl = $("[data-slot]"), slotSun = $("[data-slot-sun]"), poster = $("[data-poster]"), canvas = $("[data-gl]"), ring = $("[data-sun-ring]");
  var h1 = $("[data-h1]"), sub = $("[data-sub]"), ctas = $("[data-ctas]"), heroText = $("[data-hero-text]");
  var scroller = $("[data-world-scroll]"), strip = $("[data-strip]"), head = $("[data-doors-head]");
  var offer = $("[data-t2='offer']"), end = $("[data-t2='end']");
  var contact = $("#contact"), hdr = $("[data-header]"), bar = $("[data-bar]");
  var trail = !reduce;

  /* ============ e-mail (uma constante so), Instagram, ano ============ */
  function applyEmail() {
    $$("[data-email]").forEach(function (a) { a.textContent = CONTACT_EMAIL; if (a.tagName === "A") a.setAttribute("href", "mailto:" + CONTACT_EMAIL); });
    $$("[data-email-alt]").forEach(function (a) { a.setAttribute("href", "mailto:" + CONTACT_EMAIL); });
    if (CONTACT_EMAIL === SOURCE_EMAIL) return;
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n, hit = [];
    while ((n = w.nextNode())) { if (n.data.indexOf(SOURCE_EMAIL) > -1 && !/^(SCRIPT|STYLE)$/.test(n.parentNode.tagName)) hit.push(n); }
    hit.forEach(function (t) { t.data = t.data.split(SOURCE_EMAIL).join(CONTACT_EMAIL); });
    $$('script[type="application/ld+json"]').forEach(function (s) { if (s.textContent.indexOf(SOURCE_EMAIL) > -1) s.textContent = s.textContent.split(SOURCE_EMAIL).join(CONTACT_EMAIL); });
  }
  applyEmail();
  window.addEventListener("sitelang", applyEmail);
  $$("[data-ig]").forEach(function (a) { if (INSTAGRAM) a.setAttribute("href", "https://ig.me/m/" + INSTAGRAM); else a.style.display = "none"; });
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ============ textos que o JS monta (cadastro, porta aberta) ============ */
  var T = {
    en: { doneTitle: function (n) { return "Got it" + (n ? ", " + n : "") + "."; },
          doneText: function (m) { return "I'll reach out by " + m + ". If it's a fit, I'll build your preview, and you only pay after you approve the finished site."; },
          m: { instagram: "Instagram DM", email: "email", whatsapp: "WhatsApp" }, sending: "Sending…",
          consent: "Yes, you can message me at this number about my site. Message and data rates may apply. Reply STOP anytime.",
          sample: "a sample site", opening: "Opening ", noload: "That sample is slow to load. Open it in a new tab instead." },
    pt: { doneTitle: function (n) { return "Recebi" + (n ? ", " + n : "") + "."; },
          doneText: function (m) { return "Vou te chamar por " + m + ". Se fizer sentido, eu monto a sua prévia, e você só paga depois de aprovar o site pronto."; },
          m: { instagram: "Instagram", email: "e-mail", whatsapp: "WhatsApp" }, sending: "Enviando…",
          consent: "Pode me chamar no WhatsApp neste número para falar do meu site.",
          sample: "site de exemplo", opening: "Abrindo ", noload: "Esse exemplo demora para abrir. Abra em outra aba." }
  };

  /* ============ T5: troca de idioma so por opacidade (sem painel) ============ */
  if (window.SiteLang && !reduce) {
    var setLang = window.SiteLang.set;
    window.SiteLang.set = function (code, save) {
      if (code === window.SiteLang.lang) return;
      root.classList.add("lang-swap");
      setTimeout(function () { setLang.call(window.SiteLang, code, save); setTimeout(function () { root.classList.remove("lang-swap"); }, 40); }, 150);
    };
  }

  /* ============ cadastro (nao depende de nada externo) ============ */
  var formEl = $("[data-form]"), panel = $("[data-panel]"), done = $("[data-done]");
  var formShown = false, firstFocusAt = 0;
  (function form() {
    if (!formEl) return;
    var conds = $$("[data-cond]"), radios = $$('input[name="Best way to reach you"]');
    var methodTouched = false, igTouched = false;
    var curMethod = function () { var r = radios.filter(function (x) { return x.checked; })[0]; return r ? r.closest("[data-opt]").getAttribute("data-opt") : "instagram"; };
    function clearBad(f) { f.classList.remove("is-bad"); var i = $("input,textarea", f), e = $(".err", f); if (i) i.removeAttribute("aria-invalid"); if (e) e.hidden = true; }
    function markBad(f) { f.classList.add("is-bad"); var i = $("input:not([type=checkbox]),textarea", f) || $("input", f), e = $(".err", f); if (i) i.setAttribute("aria-invalid", "true"); if (e) e.hidden = false; return i; }
    function setMethod(m) {
      radios.forEach(function (r) { r.checked = r.closest("[data-opt]").getAttribute("data-opt") === m; });
      conds.forEach(function (c) {
        var on = c.getAttribute("data-cond") === m;
        c.classList.toggle("is-open", on);
        if ("inert" in c) c.inert = !on;
        $$("input,textarea", c).forEach(function (i) { i.disabled = !on; });
        if (!on) $$("[data-field]", c).forEach(clearBad);
      });
      fitPanel();
    }
    radios.forEach(function (r) { r.addEventListener("change", function () { methodTouched = true; setMethod(curMethod()); }); });
    window.addEventListener("sitelang", function () { if (!methodTouched) setMethod(lang() === "pt" ? "whatsapp" : "instagram"); });
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
    var msgFail = $("[data-form-fail]"), msgPrev = $("[data-form-preview]"), btn = $("[data-submit]");
    formEl.addEventListener("focusin", function () { if (!firstFocusAt) firstFocusAt = Date.now(); });
    formEl.addEventListener("input", function (ev) { var f = ev.target.closest && ev.target.closest("[data-field]"); if (f) clearBad(f); });
    formEl.addEventListener("change", function (ev) { var f = ev.target.closest && ev.target.closest("[data-field]"); if (f) clearBad(f); });
    formEl.addEventListener("submit", function (ev) {
      ev.preventDefault();
      msgFail.hidden = true; msgPrev.hidden = true;
      var bad = validate();
      if (bad.length) { if (bad[0]) bad[0].focus(); return; }
      var g = function (id) { return (document.getElementById(id) || {}).value || ""; }, m = curMethod(), L = lang();
      if (formEl.elements._honey && formEl.elements._honey.value) { showDone(); return; }                       // antispam: campo-isca
      if (FORM_LIVE && firstFocusAt && Date.now() - firstFocusAt < 1500) { showDone(); return; }             // trava de tempo: 1,5 s depois do primeiro foco no formulario
      if (!FORM_LIVE) { msgPrev.hidden = false; return; }                                                       // modo previa: nao envia
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
        var tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
        payload["Consent"] = T[L].consent + " | " + new Date().toISOString() + " | " + (tz || "tz unknown");   // o e-mail que chega vira o registro do consentimento
      }
      btn.disabled = true; btn.setAttribute("aria-busy", "true"); var txt0 = btn.textContent; btn.textContent = T[L].sending;
      fetch(FORM_ENDPOINT + CONTACT_EMAIL, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return r.ok && String(j.success) === "true"; }); })
        .catch(function () { return false; })
        .then(function (ok) {
          btn.disabled = false; btn.removeAttribute("aria-busy"); btn.textContent = txt0;
          if (ok) showDone(); else { msgFail.hidden = false; msgFail.setAttribute("tabindex", "-1"); msgFail.focus(); }
        });
    });
    function showDone() {
      var L = lang(), first = (document.getElementById("f-name").value || "").trim().split(/\s+/)[0], m = curMethod();
      $("[data-done-title]").textContent = T[L].doneTitle(first);
      $("[data-done-text]").textContent = T[L].doneText(T[L].m[m]);
      formEl.hidden = true; done.hidden = false;
      var sun = $("[data-done-sun]");
      if (sun) {
        sun.setAttribute("cy", "100");
        if (!reduce && sun.animate) { sun.setAttribute("cy", "132"); var t0 = performance.now(); (function f(now) { var k = clamp((now - t0 - 200) / 1200, 0, 1); sun.setAttribute("cy", 132 - 32 * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0); }
      }
      $("[data-done-title]").focus();
      fitPanel();
    }
    formEl.classList.add("is-init"); setMethod(lang() === "pt" ? "whatsapp" : "instagram"); void formEl.offsetHeight; formEl.classList.remove("is-init");   // o estado inicial entra sem animar (nada se mexe depois do load)
    if (formEl && "IntersectionObserver" in window) new IntersectionObserver(function (es) { formShown = es[0].isIntersecting; updateBar(); }, { threshold: 0.15 }).observe(formEl);
  })();

  /* o painel do formulario fica colado (sticky) no notebook; se for mais alto que a tela, cola pela base para o botao nunca ficar escondido */
  function fitPanel() {
    if (!panel) return;
    var wide = window.matchMedia("(min-width: 900px)").matches;
    panel.style.top = wide ? Math.min(104, window.innerHeight - panel.offsetHeight - 20) + "px" : "";
  }

  /* ============ o mundo: enquadramento (mesma funcao no CSS, no fundo do topo e no shader do sol) ============ */
  var IMG = { w: 4096, h: 2294, horizon: 0.628, base: 0.6853, slabs: [0.1343, 0.8657] };
  var DOORS = [0.2111, 0.4040, 0.5966, 0.7894];
  function worldFrame(vw, vh, focus) {
    var R = IMG.w / IMG.h;
    var fit = (vw - 64) / (vh * R * (IMG.slabs[1] - IMG.slabs[0]));
    var pan = fit < 1;
    var s = pan ? (vw < 600 ? 1.4 : 1.25) : Math.min(1.25, fit);
    var H = vh * s, W = H * R;
    if (W < vw) { W = vw; H = W / R; }
    var cy = pan ? 0.52 : 0.50;
    var top = Math.max(0, Math.min(H - vh, cy * H - vh / 2));
    var fx = pan ? DOORS[focus || 0] : 0.5;
    var left = Math.max(0, Math.min(W - vw, fx * W - vw / 2));
    return { W: W, H: H, left: left, top: top, pan: pan, s: s, horizonY: IMG.horizon * H - top, baseY: IMG.base * H - top };
  }
  var fr = null, vw = 0, vh = 0, wide = false, pan = false, slotH = 120, baseY = 0;
  var cssVar = function (el, name, v) { el.style.setProperty(name, v); };

  function layout() {
    t2Cache.clear();
    root.classList.add("laid");
    vw = sHero.clientWidth; vh = sHero.clientHeight;
    if (!vw || !vh) return;
    wide = vw >= 900 || (vw >= 600 && vw > vh * 1.2);
    root.classList.toggle("wide", wide);
    var keep = pan && scroller ? nearestDoor() : 0;
    fr = worldFrame(vw, vh, 0);
    pan = fr.pan; root.classList.toggle("pan", pan);
    cssVar(porta, "--fw", fr.W + "px"); cssVar(porta, "--fh", fr.H + "px"); cssVar(porta, "--fl", fr.left + "px"); cssVar(porta, "--ft", fr.top + "px");
    root.classList.add("framed");
    baseY = fr.baseY;
    slotH = wide ? clamp(0.19 * vh, vh < 520 ? 64 : 120, 190) : clamp(0.13 * vh, 84, 120);
    slotEl.style.width = slotEl.style.height = slotH + "px";
    slotEl.style.marginLeft = -slotH / 2 + "px";
    slotEl.style.top = baseY - slotH + "px";
    // o mundo: a faixa rola so no celular; no notebook o recorte e fixo
    var f2 = worldFrame(vw, vh, keep);
    if (scroller) { var sl = pan ? f2.left : fr.left; scroller.scrollLeft = sl; }
    layoutHero();
    updatePager();
  }

  function layoutHero() {
    var hh = hdr.offsetHeight, gut = parseFloat(getComputedStyle(sub).left) || 16;
    var top0 = wide ? hh + 28 : hh + 14;
    h1.style.fontSize = "100px";
    h1.style.top = top0 + "px";
    var ls = $$(".l", h1), w = 1;
    ls.forEach(function (l) { w = Math.max(w, l.getBoundingClientRect().width); });
    var avail = vw - 2 * gut, size = 100 * avail / w;
    var slotTop = baseY - slotH;
    var maxSize = wide ? clamp(0.084 * vw, 64, 132) : 64;
    size = Math.min(size, maxSize);
    sub.style.top = "0px";
    if (wide) {
      size = Math.min(size, (slotTop - 20 - top0) / (2 * 0.95));
      h1.style.fontSize = Math.max(36, size) + "px";
      sub.style.top = baseY + 36 + "px"; ctas.style.top = baseY + 36 + "px";
    } else {
      h1.style.fontSize = Math.max(36, Math.min(size, 64)) + "px";
      sub.style.top = top0 + h1.offsetHeight + 12 + "px";
      var avl = slotTop - (top0 + h1.offsetHeight + 12 + sub.offsetHeight) - 20;
      if (avl < 0) {   // sem espaco (celular deitado ou tela curta): encolhe o titulo ate caber
        var k = (h1.offsetHeight + avl) / h1.offsetHeight;
        h1.style.fontSize = Math.max(32, parseFloat(h1.style.fontSize) * clamp(k, 0.5, 1)) + "px";
        sub.style.top = top0 + h1.offsetHeight + 10 + "px";
      }
      ctas.style.top = baseY + 22 + "px";
    }
  }

  /* ============ doors: carrossel do celular, contador 1 / 4 ============ */
  var pgPrev = $("[data-prev]"), pgNext = $("[data-next]"), pgCount = $("[data-count]");
  function nearestDoor() {
    if (!fr) return 0;
    var cx = scroller.scrollLeft + vw / 2, best = 0, bd = 1e9;
    DOORS.forEach(function (c, i) { var d = Math.abs(c * fr.W - cx); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function goDoor(i) { i = clamp(i, 0, 3); var f = worldFrame(vw, vh, i); scroller.scrollTo({ left: f.left, behavior: reduce ? "auto" : "smooth" }); }
  function updatePager() {
    if (!pgCount || !fr) return;
    var i = pan ? nearestDoor() : 0;
    pgCount.textContent = (i + 1) + " / 4";
    pgPrev.disabled = i === 0; pgNext.disabled = i === 3;
    cssVar(porta, "--door-mid", ((0.3932 + IMG.base) / 2 * fr.H - fr.top) + "px");
  }
  if (scroller) {
    var pgT = 0;
    scroller.addEventListener("scroll", function () { cancelAnimationFrame(pgT); pgT = requestAnimationFrame(updatePager); }, { passive: true });
    pgPrev.addEventListener("click", function () { goDoor(nearestDoor() - 1); });
    pgNext.addEventListener("click", function () { goDoor(nearestDoor() + 1); });
  }

  /* ============ T3: a porta que cobre ============ */
  var cover = $("[data-cover]"), lenis = null, busyJump = false;
  function rawScroll(y) { if (lenis) { lenis.scrollTo(y, { immediate: true, force: true }); } window.scrollTo(0, y); requestTick(true); }
  function docTop(el) { return el.getBoundingClientRect().top + window.pageYOffset; }
  function targetY(name) {
    if (name === "top") return 0;
    if (name === "samples") return trail ? docTop(porta) + 0.8 * trailA() : docTop(sWorld) - hdr.offsetHeight;
    if (name === "pricing") return docTop(offer);
    if (name === "contact") return docTop(contact);
    if (name === "faq") return docTop($("#faq")) - hdr.offsetHeight - 24;
    return null;
  }
  function jump(name) {
    var y = targetY(name);
    if (y === null || busyJump) return;
    y = Math.max(0, Math.round(y));
    var far = Math.abs(y - window.pageYOffset) > window.innerHeight * 0.5;
    var after = function () { if (name === "contact") { var f = $("#f-name"); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } } } };
    if (!far || reduce || !cover.animate) { rawScroll(y); after(); return; }
    busyJump = true;
    cover.classList.add("is-on");
    var inA = cover.animate([{ transform: "translateY(100%)", borderRadius: "50vw 50vw 0 0 / 50vw 50vw 0 0" }, { transform: "translateY(0)", borderRadius: "0 0 0 0" }], { duration: 320, easing: "cubic-bezier(.7,0,.3,1)", fill: "forwards" });
    inA.onfinish = function () {
      rawScroll(y); after();
      requestAnimationFrame(function () {
        var outA = cover.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: "ease-out", fill: "forwards" });
        outA.onfinish = function () { inA.cancel(); outA.cancel(); cover.classList.remove("is-on"); busyJump = false; };
      });
    };
  }
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("a[data-jump]");
    if (!a || ev.defaultPrevented || ev.button || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
    ev.preventDefault();
    if (walkOpen) closeWalk(false, true);
    jump(a.getAttribute("data-jump"));
    if (history.replaceState) history.replaceState(null, "", a.getAttribute("href"));
  });

  /* ============ T4: entrar na porta (o site-modelo abre aqui mesmo) ============ */
  var walkBox = $("[data-walk-box]"), walkClone = $("[data-walk-clone]"), walkFrame = null, walkWait = $("[data-walk-wait]");
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";   // voltar do navegador nunca pula a pagina
  var walkBar = $(".walk-bar", walkBox), walkY = 0, walkOpen = false, walkDoor = null, walkLoaded = false, walkShown = false, walkSlug = "", walkTimers = [], walkAnim = null, walkBack = false, walkHinted = {};
  // dica de carregamento: so um <link rel=prefetch> (nao toca iframe nem historico)
  function walkHint(a) {
    var u = a.getAttribute("href");
    if (!u || walkHinted[u]) return;
    walkHinted[u] = 1;
    var l = document.createElement("link"); l.rel = "prefetch"; l.href = u; document.head.appendChild(l);
  }
  // um iframe novo a cada abertura: o primeiro carregamento de um iframe novo nao entra no historico do navegador
  function walkMakeFrame(url, title) {
    var f = document.createElement("iframe");
    f.className = "walk-frame"; f.setAttribute("data-walk-frame", ""); f.setAttribute("title", title); f.style.opacity = "0";
    f.onload = function () { if (f !== walkFrame) return; walkLoaded = true; walkGo(); };
    f.src = url;
    walkBox.insertBefore(f, walkWait);
    return f;
  }
  function walkGo() {
    if (!walkOpen || !walkLoaded || !walkShown || !walkFrame) return;
    walkFrame.classList.add("is-on"); walkFrame.style.transition = "opacity .3s ease"; walkFrame.style.opacity = "1"; walkWait.hidden = true;
  }
  function visibleDoor(slug) { return $$(".door[data-walk='" + slug + "']", strip).filter(function (d) { return d.offsetParent !== null; })[0]; }
  function rectStyle(r) { return { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" }; }
  function radOf(d) {      // raio do arco da porta em px, no formato "h h 0 0 / v v 0 0"
    var cs = getComputedStyle(d), a = cs.borderTopLeftRadius.split(" "), b = cs.borderTopRightRadius.split(" ");
    var ah = parseFloat(a[0]) || 0, av = parseFloat(a[1] || a[0]) || 0, bh = parseFloat(b[0]) || 0, bv = parseFloat(b[1] || b[0]) || 0;
    return ah + "px " + bh + "px 0px 0px / " + av + "px " + bv + "px 0px 0px";
  }
  var RAD0 = "0px 0px 0px 0px / 0px 0px 0px 0px";
  function timer(fn, ms) { var t = setTimeout(fn, ms); walkTimers.push(t); return t; }

  function openWalk(a) {
    var door = visibleDoor(a.getAttribute("data-walk")) || a, r = door.getBoundingClientRect(), L = lang();
    var name = door.getAttribute("data-name"), url = door.getAttribute("href"), img = $("img", door);
    walkDoor = door; walkSlug = door.getAttribute("data-walk"); walkOpen = true; walkY = window.pageYOffset;
    walkLoaded = false; walkShown = false;
    if (walkFrame) walkFrame.remove();
    walkFrame = walkMakeFrame(url, name + ", " + T[L].sample);
    $("[data-walk-title]").textContent = name + ", " + T[L].sample;
    $("[data-walk-newtab]").setAttribute("href", url);
    walkWait.hidden = true;
    walkBox.hidden = false; document.body.classList.add("walk-open"); if (lenis) lenis.stop();
    $("img", walkClone).setAttribute("src", img ? img.getAttribute("src") : "");
    var rad = radOf(door);
    Object.assign(walkClone.style, rectStyle(r), { borderRadius: rad, display: "block", opacity: "1" });
    walkBar.style.opacity = "0"; walkBar.style.transform = "translateY(-100%)"; walkBox.style.background = "rgba(33,26,21,0)";
    try { history.pushState({ walk: walkSlug }, "", "#walk-" + walkSlug); } catch (e) {}
    var fin = function () { walkBar.style.transition = "opacity .2s ease, transform .2s ease"; walkBar.style.opacity = "1"; walkBar.style.transform = "none"; walkShown = true; walkGo(); $("[data-walk-back]").focus(); };
    if (reduce || !walkClone.animate) { Object.assign(walkClone.style, { left: "0px", top: "0px", width: "100%", height: "100%", borderRadius: RAD0 }); fin(); }
    else {
      walkBox.style.transition = "background-color .7s ease"; walkBox.style.background = "rgba(33,26,21,.2)";
      walkAnim = walkClone.animate([
        { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: rad },
        { left: "0px", top: "0px", width: window.innerWidth + "px", height: window.innerHeight + "px", borderRadius: RAD0 }], { duration: 700, easing: "cubic-bezier(.7,0,.2,1)", fill: "forwards" });
      walkAnim.onfinish = fin;
    }
    timer(function () { if (!walkLoaded && walkOpen) { walkWait.hidden = false; walkWait.textContent = T[lang()].opening + name + "…"; } }, 2500);
    timer(function () { if (!walkLoaded && walkOpen) { walkWait.hidden = false; walkWait.innerHTML = ""; var l = document.createElement("a"); l.href = url; l.target = "_blank"; l.rel = "noopener"; l.style.color = "inherit"; l.textContent = T[lang()].noload; walkWait.appendChild(l); } }, 8000);
  }
  // tira o #walk-... da URL: Voltar do navegador (a entrada que o pushState criou), com replaceState de garantia se o Voltar for gasto dentro do iframe
  function walkUnwind(instant) {
    var clean = function () { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} };
    if (instant) { clean(); return; }
    walkBack = true;
    try { history.back(); } catch (e) { walkBack = false; clean(); return; }
    setTimeout(function () { if (walkBack) { walkBack = false; if (/^#walk-/.test(location.hash)) clean(); } }, 350);
  }
  function closeWalk(fromPop, instant) {
    if (!walkOpen) return;
    walkOpen = false; walkTimers.forEach(clearTimeout); walkTimers = [];
    if (!fromPop && history.state && history.state.walk) walkUnwind(instant);
    var finish = function () {
      walkBox.hidden = true; walkClone.style.display = "none";
      if (walkFrame) { walkFrame.remove(); walkFrame = null; }
      walkLoaded = false; walkShown = false;
      document.body.classList.remove("walk-open"); if (lenis) lenis.start();
      rawScroll(walkY);
      if (walkDoor && !instant) { try { walkDoor.focus({ preventScroll: true }); } catch (e) {} }
    };
    if (walkFrame) { walkFrame.style.transition = "opacity .2s ease"; walkFrame.style.opacity = "0"; }
    walkBar.style.opacity = "0";
    if (reduce || instant || !walkClone.animate) { finish(); return; }
    var r = walkDoor.getBoundingClientRect(), rad = radOf(walkDoor);
    var back = walkClone.animate([
      { left: "0px", top: "0px", width: window.innerWidth + "px", height: window.innerHeight + "px", borderRadius: RAD0 },
      { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: rad }], { duration: 600, easing: "cubic-bezier(.7,0,.2,1)", fill: "forwards" });
    walkBox.style.background = "rgba(33,26,21,0)";
    back.onfinish = function () { back.cancel(); if (walkAnim) walkAnim.cancel(); finish(); };
  }
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("a[data-walk]");
    if (!a || ev.defaultPrevented || ev.button || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
    ev.preventDefault(); openWalk(a);
  });
  ["pointerenter", "focusin", "touchstart"].forEach(function (evn) {
    strip.addEventListener(evn, function (ev) { var a = ev.target.closest && ev.target.closest("a[data-walk]"); if (a && !walkOpen) walkHint(a); }, { passive: true, capture: true });
  });
  $("[data-walk-back]").addEventListener("click", function () { closeWalk(false); });
  $("[data-walk-cta]").addEventListener("click", function (ev) { ev.preventDefault(); closeWalk(false, true); setTimeout(function () { jump("contact"); }, 30); });
  window.addEventListener("popstate", function () { walkBack = false; if (walkOpen) closeWalk(true); });
  document.addEventListener("keydown", function (e) {
    if (!walkOpen) return;
    if (e.key === "Escape") { e.preventDefault(); closeWalk(false); }
    else if (e.key === "Tab") {
      var f = $$("button, a[href]", walkBar).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1)) { e.preventDefault(); f[0].focus(); }
      else if (i === -1) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* ============ o laco de rolagem: progresso p do palco, oferta (T2), final (T2), cabecalho, barra ============ */
  var tickQ = false, lastP = -1, curP = 0, live = false, worldOn = false, glActive = false, portaApi = null, tier = "c", use2D = true, canvasGone = false;
  function trailA() { return porta.offsetHeight - 2 * stage.clientHeight; }
  function requestTick(force) { if (force) lastP = -2; if (!tickQ) { tickQ = true; requestAnimationFrame(tick); } }
  window.addEventListener("scroll", function () { requestTick(); }, { passive: true });

  function vis(el, o, y) {      // opacidade + deslocamento; invisivel = visibility:hidden (nunca engole clique nem foco)
    var hidden = o <= 0.001;
    el.style.opacity = hidden ? "0" : o >= 0.999 ? "" : o.toFixed(3);
    el.style.visibility = hidden ? "hidden" : "";
    el.style.transform = y ? "translateY(" + y.toFixed(1) + "px)" : "";
  }
  var heroLines = $$(".l", h1), heroBtns = $$(".btn", ctas), heroNote = $(".note", ctas);
  var doorEls = $$(".door", strip), legendEls = $$(".legend", strip);
  var headBits = [$(".h2", head), $(".lead", head), $("[data-note-doors]"), $("[data-pager]", head), $("[data-prev]"), $("[data-next]")];

  function applyHero(p) {
    var f = function (a, b) { return 1 - ss(a, b, p); };
    vis(heroLines[0], f(0.03, 0.09), -24 * (1 - f(0.03, 0.09)));
    vis(heroLines[1], f(0.045, 0.105), -24 * (1 - f(0.045, 0.105)));
    vis(sub, f(0.05, 0.11), -24 * (1 - f(0.05, 0.11)));
    vis(heroBtns[0], f(0.06, 0.12), -24 * (1 - f(0.06, 0.12)));
    vis(heroBtns[1], f(0.07, 0.12), -24 * (1 - f(0.07, 0.12)));
    vis(heroNote, f(0.07, 0.12), -24 * (1 - f(0.07, 0.12)));
  }
  function applyWorld(p) {
    var show = p >= 0.5;
    if (show !== worldOn) { worldOn = show; sWorld.style.visibility = show ? "visible" : "hidden"; }
    var b = lerp(1.12, 1, ss(0.55, 0.68, p)), s = lerp(1.04, 1, ss(0.55, 0.68, p));
    scroller.style.transform = s > 1.0005 ? "scale(" + s.toFixed(4) + ")" : "";
    scroller.style.filter = b > 1.002 ? "brightness(" + b.toFixed(3) + ")" : "";
    var nowLive = p >= 0.7;
    if (nowLive !== live) { live = nowLive; sWorld.classList.toggle("is-live", live); }
    // portas acendem da esquerda para a direita (no celular, a porta em foco primeiro): fotos 60 a 72%, legendas 66 a 76%
    var focus = pan ? nearestDoor() : 0, i, order;
    doorEls.forEach(function (d) {
      var slug = d.getAttribute("data-walk"), idx = d.getAttribute("data-set") === "br" || d.getAttribute("data-set") === "en" ? visibleIndex(d) : 0;
      order = (idx - focus + 4) % 4;
      var o = ss(0.60 + 0.02 * order, 0.66 + 0.02 * order, p);
      $("img", d).style.opacity = o.toFixed(3);
    });
    legendEls.forEach(function (l) { var idx = visibleIndex(l), order = (idx - focus + 4) % 4, o = ss(0.66 + 0.01 * order, 0.72 + 0.01 * order, p); vis(l, o, 12 * (1 - o)); });
    headBits.forEach(function (el, k) { if (!el) return; var o = ss(0.62 + 0.015 * k, 0.68 + 0.015 * k, p); vis(el, o, 24 * (1 - o)); });
  }
  var idxCache = new Map();
  function visibleIndex(el) {
    var v = idxCache.get(el);
    if (v === undefined) { var set = el.getAttribute("data-set"), sel = el.classList.contains("door") ? ".door" : ".legend"; v = $$(sel + "[data-set='" + set + "']", strip).indexOf(el); idxCache.set(el, v); }
    return v;
  }

  /* modo 2D (tier C, sem WebGL ou enquanto o 3D carrega): o poster cresce a partir do sol e a praca aparece por um circulo que cresce do sol */
  function apply2D(p) {
    var tr = clamp((p - 0.16) / 0.34, 0, 1), scale = 1 + 7 * tr * tr * tr, noon = ss(0.08, 0.20, p);
    var sunTop = lerp(88, 63.06, 1 - Math.pow(1 - introV, 3)); sunTop = lerp(sunTop, 50, noon);
    slotSun.style.top = sunTop + "%";
    slotEl.style.transformOrigin = "50% " + (sunTop) + "%";
    slotEl.style.transform = scale > 1.001 ? "scale(" + scale.toFixed(3) + ")" : "";
    var cx = vw / 2, cy = baseY - slotH + slotH * sunTop / 100, r0 = 0.116 * slotH * scale, rc = Math.hypot(vw, vh);
    var k = ss(0.30, 0.52, p), r = lerp(r0, rc, k);
    if (p >= 0.30) {
      sWorld.style.visibility = "visible";
      sWorld.style.clipPath = k >= 1 ? "none" : "circle(" + r.toFixed(1) + "px at " + cx.toFixed(1) + "px " + cy.toFixed(1) + "px)";
      ring.style.visibility = (k > 0 && k < 1) ? "visible" : "hidden";
      var rr = r - 3, o = 1 - ss(0.46, 0.52, p);
      ring.style.left = (cx - rr) + "px"; ring.style.top = (cy - rr) + "px"; ring.style.width = ring.style.height = 2 * rr + "px"; ring.style.opacity = o.toFixed(3);
    } else { sWorld.style.clipPath = ""; ring.style.visibility = "hidden"; if (!worldOn) sWorld.style.visibility = "hidden"; }
    if (p >= 0.52) { worldOn = true; sWorld.style.visibility = "visible"; }
  }
  function clear2D() { slotEl.style.transform = ""; sWorld.style.clipPath = ""; ring.style.visibility = "hidden"; slotSun.style.top = ""; }

  /* T2: a porta que sobe (oferta e final). O fundo tem clip-path (so forma, nunca no texto). Cada bloco de texto so aparece quando o arco ja o cobre inteiro (a folga
     ate a borda do arco, nos dois cantos de cima, e positiva) e entra por opacidade e deslocamento; fora do arco ele fica invisivel e sem foco. */
  var T2_SEL = "h1,h2,h3,p,li,a,button,summary,details,.lang,.where,.end-mid";
  var t2Cache = new Map();
  function t2Units(el, content) {
    var st = t2Cache.get(el);
    if (st) return st;
    var W = el.clientWidth, units = [];
    function add(node, line) {
      var x = 0, y = 0, n = node;
      while (n && n !== el) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      if (!n) return;
      var x1 = Math.max(x, 16), x2 = Math.min(x + node.offsetWidth, W - 16);
      units.push({ el: node, line: line, x1: x1, x2: x2, y: y, ramp: clamp(Math.min(x1, W - x2, y) - 4, 12, 60), r: -1 });
    }
    $$(T2_SEL, content).forEach(function (u) {
      if (u.classList.contains("sr") || !u.offsetParent) return;
      var up = u.parentElement && u.parentElement.closest(T2_SEL);
      if (up && content.contains(up)) return;
      add(u, false);
    });
    var ob = $(".offer-bottom", content);
    if (ob && ob.offsetParent) add(ob, true);          // so a linha de cima do bloco (borda); os filhos tem a propria revelacao
    st = { W: W, units: units }; t2Cache.set(el, st);
    return st;
  }
  function t2Set(u, r) {
    r = Math.round(r * 500) / 500;
    if (u.r === r) return;
    u.r = r;
    var s = u.el.style;
    if (u.line) { if (r >= 1) s.removeProperty("--r"); else s.setProperty("--r", String(r)); return; }
    if (r >= 1) { s.opacity = ""; s.transform = ""; s.visibility = ""; s.transition = ""; return; }
    s.transition = "none"; s.opacity = String(r); s.visibility = r <= 0 ? "hidden" : ""; s.transform = "translateY(" + (18 * (1 - r)).toFixed(1) + "px)";
  }
  // distancia (px) de um ponto ate a borda do arco: caixa de x = L a Wd - L, topo em y = 0, cantos de cima com raio R. Negativa = fora
  function t2Slack(px, py, L, Wd, R) {
    var d = Math.min(px - L, Wd - L - px, py);
    if (R > 0 && py < R) {
      if (px < L + R) d = Math.min(d, R - Math.hypot(px - (L + R), py - R));
      else if (px > Wd - L - R) d = Math.min(d, R - Math.hypot(px - (Wd - L - R), py - R));
    }
    return d;
  }
  function t2(el, q) {
    var bg = $(".door-bg", el), content = $("[data-t2-content]", el);
    var w0 = vw < 700 ? 0.72 : 0.34;
    var a = easeIO(ss(0.10, 0.80, q)), wf = lerp(w0, 1, a), X = (1 - wf) / 2 * 100;
    var R = lerp(wf * window.innerWidth / 2, 0, ss(0.55, 1.0, q));
    bg.style.clipPath = q >= 0.999 ? "none" : "inset(0 " + X.toFixed(2) + "% 0 " + X.toFixed(2) + "% round " + R.toFixed(1) + "px " + R.toFixed(1) + "px 0 0)";
    var st = t2Cache.get(el);
    if (q >= 0.999) { if (st) st.units.forEach(function (u) { t2Set(u, 1); }); content.style.visibility = ""; return; }
    if (q <= 0.001) { content.style.visibility = "hidden"; return; }
    content.style.visibility = "";
    st = t2Units(el, content);
    var L = X / 100 * st.W, Wd = st.W;
    st.units.forEach(function (u) {
      var d = Math.min(t2Slack(u.x1, u.y, L, Wd, R), t2Slack(u.x2, u.y, L, Wd, R));
      t2Set(u, ss(0, 1, (d - 4) / u.ramp));
    });
  }

  var barOn = false;
  function updateBar() {
    if (!bar) return;
    var on = (trail ? curP >= 0.8 : window.pageYOffset > window.innerHeight * 0.8) && !formShown && !walkOpen && end.getBoundingClientRect().top > window.innerHeight * 0.45;   // no final os mesmos botoes ja estao na tela
    if (on !== barOn) { barOn = on; bar.classList.toggle("is-hidden", !on); }
  }

  function tick() {
    tickQ = false;
    var vhh = window.innerHeight, pr = porta.getBoundingClientRect();
    var p = 0;
    if (trail) {
      var A = trailA();
      p = A > 0 ? clamp(-pr.top / A, 0, 1) : 0;
      var oq = clamp(1 - offer.getBoundingClientRect().top / vhh, 0, 1);
      t2(offer, oq);
      t2(end, clamp(1 - end.getBoundingClientRect().top / vhh, 0, 1));
      curP = p;
      if (p !== lastP) {
        lastP = p;
        if (p > 0.02 && introAnims.length) cancelIntro();
        applyHero(p); applyWorld(p);
        slotEl.style.visibility = p >= 0.55 ? "hidden" : "";
        if (portaApi && glActive) {
          portaApi.setProgress(p);
          var fade = 1 - ss(0.52, 0.55, p);
          canvas.style.opacity = fade >= 0.999 ? "" : fade.toFixed(3);
          if (p >= 0.55 && !canvasGone) { canvasGone = true; portaApi.stop(); canvas.style.visibility = "hidden"; }
          else if (p < 0.55 && canvasGone) { canvasGone = false; canvas.style.visibility = ""; portaApi.start(); }
          canvas.style.pointerEvents = p > 0.1 ? "none" : "";
        } else if (use2D) apply2D(p);
      }
      // cabecalho: transparente sobre a praca; solido quando a oferta chega nele; tom escuro so no final
      var hh = hdr.offsetHeight, er = end.getBoundingClientRect();
      hdr.classList.toggle("solid", offer.getBoundingClientRect().top <= hh);
      var tone = er.top < hh * 0.5 ? "dark" : "light";
      if (hdr.getAttribute("data-tone") !== tone) hdr.setAttribute("data-tone", tone);
    } else {
      var er2 = end.getBoundingClientRect();
      hdr.classList.toggle("solid", window.pageYOffset > 20);
      var tone2 = er2.top < hdr.offsetHeight * 0.5 ? "dark" : "light";
      if (hdr.getAttribute("data-tone") !== tone2) hdr.setAttribute("data-tone", tone2);
    }
    updateBar();
    watchWhere();
  }

  /* ============ o final: o pais troca, com a hora local de la ============ */
  var WHERE = [
    ["United States", "Estados Unidos", "New York", "Nova York", "America/New_York"], ["Brazil", "Brasil", "São Paulo", "São Paulo", "America/Sao_Paulo"],
    ["Canada", "Canadá", "Toronto", "Toronto", "America/Toronto"], ["Mexico", "México", "Mexico City", "Cidade do México", "America/Mexico_City"],
    ["United Kingdom", "Reino Unido", "London", "Londres", "Europe/London"], ["Ireland", "Irlanda", "Dublin", "Dublin", "Europe/Dublin"],
    ["Portugal", "Portugal", "Lisbon", "Lisboa", "Europe/Lisbon"], ["Spain", "Espanha", "Madrid", "Madri", "Europe/Madrid"],
    ["Colombia", "Colômbia", "Bogotá", "Bogotá", "America/Bogota"], ["Argentina", "Argentina", "Buenos Aires", "Buenos Aires", "America/Argentina/Buenos_Aires"],
    ["Australia", "Austrália", "Sydney", "Sydney", "Australia/Sydney"], ["Italy", "Itália", "Rome", "Roma", "Europe/Rome"]];
  var US_CITIES = { "America/New_York": ["New York", "Nova York"], "America/Chicago": ["Chicago", "Chicago"], "America/Denver": ["Denver", "Denver"], "America/Phoenix": ["Phoenix", "Phoenix"],
    "America/Los_Angeles": ["Los Angeles", "Los Angeles"], "America/Anchorage": ["Anchorage", "Anchorage"], "Pacific/Honolulu": ["Honolulu", "Honolulu"] };
  var whereEl = $("[data-where]"), countryEl = $("[data-country]"), lineEl = $(".where-line", whereEl), cityEl = $("[data-city]"), timeEl = $("[data-time]"), miniSun = $("[data-mini-sun]");
  var whereIdx = 0, whereTimer = 0, wherePaused = false, whereDone = false, whereSeen = false;
  (function usCity() {
    var tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    if (US_CITIES[tz]) { WHERE[0][4] = tz; WHERE[0][2] = US_CITIES[tz][0]; WHERE[0][3] = US_CITIES[tz][1]; }
  })();
  function hourFrac(tz) {
    try {
      var parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", hourCycle: "h23", timeZone: tz }).formatToParts(new Date()), h = 0, m = 0;
      parts.forEach(function (x) { if (x.type === "hour") h = +x.value; if (x.type === "minute") m = +x.value; });
      return h + m / 60;
    } catch (e) { return 12; }
  }
  function timeStr(tz) {
    var pt = lang() === "pt";
    try { return new Intl.DateTimeFormat(pt ? "pt-BR" : "en-US", { hour: "numeric", minute: "2-digit", hour12: !pt, timeZone: tz }).format(new Date()).replace(/ /g, " "); } catch (e) { return ""; }
  }
  function showWhere(i) {
    var w = WHERE[i], pt = lang() === "pt";
    countryEl.textContent = pt ? w[1] : w[0]; cityEl.textContent = pt ? w[3] : w[2]; timeEl.textContent = timeStr(w[4]);
    // o arquinho: sol no alto ao meio-dia; 6 h e 18 h na abertura; de noite fica escondido embaixo da porta
    var h = hourFrac(w[4]), a = (h - 6) / 12, cy = a >= 0 && a <= 1 ? 26 - 16 * Math.sin(Math.PI * a) : 34;
    miniSun.setAttribute("cy", cy.toFixed(1)); miniSun.setAttribute("opacity", a >= 0 && a <= 1 ? "1" : "0");
  }
  function fitCountry() {
    if (!countryEl) return;
    var pt = lang() === "pt", box = whereEl.clientWidth || (window.innerWidth - 32), cur = countryEl.textContent, wmax = 1;
    countryEl.style.fontSize = "100px";
    WHERE.forEach(function (w) { countryEl.textContent = pt ? w[1] : w[0]; wmax = Math.max(wmax, countryEl.getBoundingClientRect().width); });
    countryEl.textContent = cur;
    var css = window.matchMedia("(min-width: 900px)").matches ? clamp(0.076 * window.innerWidth, 40, 112) : clamp(0.14 * window.innerWidth, 48, 76);
    countryEl.style.fontSize = clamp(Math.min(css, 100 * box / wmax), 34, 112) + "px";
  }
  function whereStep() {
    whereTimer = 0;
    if (whereDone || wherePaused || !whereSeen) { return; }
    var next = (whereIdx + 1) % WHERE.length;
    countryEl.classList.add("is-out"); lineEl.classList.add("is-out");
    setTimeout(function () {
      whereIdx = next; showWhere(next);
      countryEl.classList.add("is-in"); void countryEl.offsetWidth; countryEl.classList.remove("is-out"); countryEl.classList.remove("is-in"); lineEl.classList.remove("is-out");
      if (next === 0) { whereDone = true; return; }          // uma volta inteira e para no primeiro pais (WCAG 2.2.2)
      whereTimer = setTimeout(whereStep, 2400);
    }, 440);
  }
  function watchWhere() {
    if (!whereEl || reduce) return;
    var r = end.getBoundingClientRect(), seen = r.top < window.innerHeight * 0.8 && r.bottom > 0;
    if (seen && !whereSeen) { whereSeen = true; if (!whereTimer && !whereDone) whereTimer = setTimeout(whereStep, 2400); }
    else if (!seen && whereSeen) { whereSeen = false; clearTimeout(whereTimer); whereTimer = 0; }
  }
  if (whereEl) {
    var pause = function (v) { return function () { wherePaused = v; if (!v && whereSeen && !whereTimer && !whereDone) whereTimer = setTimeout(whereStep, 2400); }; };
    ["mouseenter", "focusin"].forEach(function (e) { end.addEventListener(e, pause(true)); });
    ["mouseleave", "focusout"].forEach(function (e) { end.addEventListener(e, pause(false)); });
    showWhere(0);
    setInterval(function () { timeEl.textContent = timeStr(WHERE[whereIdx][4]); }, 20000);
    window.addEventListener("sitelang", function () { showWhere(whereIdx); fitCountry(); });
  }

  /* ============ 3D: so depois do load, com WebGL2 testado antes (sem console.error) e so com movimento permitido ============ */
  var introV = 0;
  function pickTier() {
    var nv = navigator;
    if (nv.deviceMemory && nv.deviceMemory <= 2) return "c";
    if (nv.hardwareConcurrency && nv.hardwareConcurrency <= 2) return "c";
    if (nv.connection && nv.connection.saveData) return "c";
    return (wide && !coarse) ? "a" : "b";
  }
  function webgl2Ok() {
    try { var c = document.createElement("canvas"), g = c.getContext("webgl2"); if (!g) return false; var x = g.getExtension("WEBGL_lose_context"); if (x) x.loseContext(); return true; } catch (e) { return false; }
  }
  function startGL() {
    if (reduce || !webgl2Ok()) return;
    tier = pickTier();
    if (tier === "c") return;
    import("./porta3d.js").then(function (m) {
      return m.createPorta({
        canvas: canvas, container: stage, slot: slotEl, tier: tier, bgUrl: wide ? "img/v3/praca-vazia-2752.webp" : "img/v3/praca-vazia-1600.webp", worldUrl: "img/v3/mundo-dia-1920.webp",
        dprMax: { a: 1.75, b: 1.5 }, spinSeconds: { a: 18, b: 22 },
        getFrame: function () { return { left: scroller.scrollLeft, top: fr.top, W: fr.W, H: fr.H }; },
        onFirstFrame: function () { root.classList.add("is-gl"); },
        onTier: function (t) { if (t === "c") toTwoD(); },
        onLost: function () { toTwoD(); }
      });
    }).then(function (api) {
      portaApi = api; use2D = false; glActive = true; clear2D(); canvas.style.display = "block"; api.setIntro(introV); api.setProgress(curP);
      if (curP >= 0.55) { canvasGone = true; canvas.style.visibility = "hidden"; } else api.start();
      canvas.addEventListener("click", function (e) {
        if (!trail || curP > 0.1 || coarse) return;
        var sr = slotEl.getBoundingClientRect();
        if (e.clientX > sr.left && e.clientX < sr.right && e.clientY > sr.top && e.clientY < sr.bottom) jump("samples");
      });
      canvas.addEventListener("pointermove", function (e) {
        if (e.pointerType === "touch") return;
        var sr = slotEl.getBoundingClientRect();
        canvas.style.cursor = (curP < 0.1 && e.clientX > sr.left && e.clientX < sr.right && e.clientY > sr.top && e.clientY < sr.bottom) ? "pointer" : "";
      }, { passive: true });
      lastP = -2; tick();
    }).catch(function () { toTwoD(); });
  }
  function toTwoD() {
    if (portaApi) { try { portaApi.dispose(); } catch (e) {} }
    portaApi = null; glActive = false; use2D = true; canvasGone = false;
    root.classList.remove("is-gl"); canvas.style.display = "none"; canvas.style.visibility = ""; canvas.style.opacity = "";
    lastP = -2; tick();
  }

  function bootLenis() {
    if (reduce || coarse) return;
    var s = document.createElement("script"); s.src = LENIS_URL; s.async = true;
    s.onload = function () {
      if (!window.Lenis) return;
      lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
      lenis.on("scroll", function () { requestTick(); });
      (function raf(t) { if (lenis) lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    };
    document.head.appendChild(s);
  }

  /* ============ entrada ao carregar: o titulo sobe por linha, o simbolo entra e o sol nasce (sem tela de loading) ============ */
  var introAnims = [];
  function cancelIntro() { introAnims.forEach(function (a) { try { a.cancel(); } catch (e) {} }); introAnims = []; }
  function intro() {
    var els = [heroLines[0], heroLines[1], sub, ctas];
    if (!reduce && els[0].animate) {
      els.forEach(function (el, i) { var a = el.animate([{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], { duration: 600, delay: 80 * i, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" }); introAnims.push(a); a.onfinish = function () { a.cancel(); }; });
      var s = slotEl.animate([{ transform: "scale(.94)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 700, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" });
      introAnims.push(s); s.onfinish = function () { s.cancel(); };
      var t0 = performance.now();
      (function f(now) { var k = clamp((now - t0 - 150) / 900, 0, 1); introV = k; if (portaApi) portaApi.setIntro(k); else if (use2D) apply2D(curP); if (k < 1) requestAnimationFrame(f); })(t0);
    } else introV = 1;
  }

  /* ============ montar ============ */
  layout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); fitCountry(); fitPanel(); requestTick(true); });
  var rzT, lastW = window.innerWidth, lastH = window.innerHeight;
  window.addEventListener("resize", function () {
    clearTimeout(rzT);
    rzT = setTimeout(function () {
      var w = window.innerWidth, h = window.innerHeight;
      if (w === lastW && Math.abs(h - lastH) < 120 && coarse) return;    // barra do navegador do celular
      lastW = w; lastH = h; layout(); fitCountry(); fitPanel(); if (portaApi) portaApi.layout(); requestTick(true);
    }, 120);
  });
  window.addEventListener("orientationchange", function () { setTimeout(function () { layout(); fitCountry(); if (portaApi) portaApi.layout(); requestTick(true); }, 300); });
  window.addEventListener("sitelang", function () {
    idxCache.clear(); layout(); fitCountry(); fitPanel();
    if (pan) { scroller.scrollLeft = worldFrame(vw, vh, 0).left; }
    updatePager(); requestTick(true);
    if (walkOpen) { var nm = walkDoor.getAttribute("data-name"); $("[data-walk-title]").textContent = nm + ", " + T[lang()].sample; }
  });
  fitCountry(); fitPanel();
  tick();
  intro();
  var worldImg = $(".world-img", strip);
  var boot = function () {
    if (worldImg && worldImg.decode) worldImg.decode().catch(function () {});     // decodifica antes de revelar (sem piscar)
    if (reduce) return;
    var go = function () { startGL(); bootLenis(); };
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 1500 }); else setTimeout(go, 300);
  };
  if (document.readyState === "complete") boot(); else window.addEventListener("load", boot);
  // vindo de um link com #walk-... (voltar do navegador) nao reabre a porta; ancora normal vai pelo salto
  if (/^#(samples|pricing|contact|faq)$/.test(location.hash)) setTimeout(function () { jump(location.hash.slice(1)); }, 400);
})();
