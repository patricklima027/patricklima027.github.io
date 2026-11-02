/* Template Corretor: JS sem dependências. Tudo degrada: sem JS o site é legível e os links wa.me já vêm prontos do build. */
(function () {
  "use strict";
  var D = document, H = D.documentElement;
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };
  var reduce = false;
  try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var qs = new URLSearchParams(location.search);
  var seek = parseFloat(qs.get("seek"));

  /* ---------- abertura ---------- */
  var open = $(".open");
  if (H.classList.contains("opening") && open) {
    try { sessionStorage.setItem("dm_open", "1"); } catch (e) {}
    var done = false;
    var end = function () {
      if (done) return; done = true;
      H.classList.remove("opening");
      removeEventListener("wheel", end); removeEventListener("touchstart", end); removeEventListener("keydown", end); removeEventListener("click", end);
    };
    setTimeout(function () { addEventListener("wheel", end, { passive: true }); addEventListener("touchstart", end, { passive: true }); addEventListener("keydown", end); addEventListener("click", end); }, 400);
    setTimeout(end, 5900);
    if (qs.get("noopen")) end();
  }

  /* ---------- cabeçalho e menu ---------- */
  var hdr = $("#hdr");
  var onScroll = function () { if (hdr) hdr.classList.toggle("solid", scrollY > 40); };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  var mb = $(".menu-btn"), menu = $("#menu");
  if (mb && menu) {
    var setMenu = function (o) { menu.hidden = !o; mb.setAttribute("aria-expanded", o); mb.firstChild.textContent = o ? "Fechar" : "Menu"; H.style.overflow = o ? "hidden" : ""; };
    mb.addEventListener("click", function () { setMenu(menu.hidden); });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { setMenu(false); mb.focus(); } });
  }

  /* ---------- revelar ao rolar, com sequência (só opacidade e deslocamento, nunca máscara) ---------- */
  if (!reduce) {
    $$(".cards .card,.g-main,.im-info,.spec,.im-map-in,.bp-name,.bp-map,.bp-grid h2,.cat-title .lede,.sb-copy,.ftr-cta").forEach(function (el) { el.classList.add("rv"); });
  }
  var io = ("IntersectionObserver" in window) ? new IntersectionObserver(function (es) {
    var vis = es.filter(function (e) { return e.isIntersecting; }).sort(function (a, b) { return (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left); });
    vis.forEach(function (e, i) {
      var t = e.target;
      if (i) t.style.transitionDelay = Math.min(i, 5) * 90 + "ms";
      t.classList.add("in"); io.unobserve(t);
      if (i) setTimeout(function () { t.style.transitionDelay = ""; }, 1400);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }) : null;
  $$(".rv,[data-sea]").forEach(function (el) { if (io && !reduce) io.observe(el); else el.classList.add("in"); });

  /* ---------- efeitos guiados pela rolagem ----------
     Um laço só: lê todas as medidas primeiro, escreve depois (sem layout thrash).
     No computador a rolagem é "suavizada" (o valor usado nos efeitos persegue o real);
     no toque usa o valor direto. Só transform/opacidade/variáveis CSS; texto nunca recebe máscara. */
  var words = $$("[data-words] .w");
  var par = $$("[data-par]");
  var grow = $$(".st-fig,.sb-fig");
  var drift = $$(".card-media img,.g-main img");
  var vImg = $(".v-img"), stepsEl = $(".steps"), steps = $$(".step");
  var heroSec = $(".hero,.lc-hero,.cat-hero");
  var heroPic = heroSec && ($(".hero-pic", heroSec) || $(":scope > img", heroSec));
  var heroCopy = heroSec && $(".hero-copy,.lc-copy,.cat-title", heroSec);
  var seaMap = $(".b-map"), seaSec = $(".bairros");
  var seaLine = seaMap && $(".sea-line", seaMap), seaWater = seaMap && $(".sea-water", seaMap);
  var bar = null, vCount = null;
  var fine = false; try { fine = matchMedia("(hover:hover) and (pointer:fine)").matches; } catch (e) {}
  var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var ease = function (x) { return 1 - Math.pow(1 - x, 3); };
  var ly = scrollY, ticking = false, lastAct = -1;
  var near = new Set();
  if ("IntersectionObserver" in window) {
    var nio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) near.add(e.target); else near.delete(e.target); }); }, { rootMargin: "25% 0px 25% 0px" });
    drift.concat(par, grow).forEach(function (el) { nio.observe(el); });
  }
  var isNear = function (el) { return !("IntersectionObserver" in window) || near.has(el); };
  if (!reduce) {
    bar = D.createElement("div"); bar.className = "prog"; bar.setAttribute("aria-hidden", "true"); D.body.appendChild(bar);
    if (seaMap) seaMap.classList.add("sd");
    if (vImg) {
      var fg = vImg.parentNode; vCount = D.createElement("span"); vCount.className = "v-count mono"; vCount.setAttribute("aria-hidden", "true"); fg.appendChild(vCount);
    }
  }
  var frame = function () {
    ticking = false;
    var vh = innerHeight, sy = scrollY;
    ly = fine ? ly + (sy - ly) * 0.14 : sy;
    if (Math.abs(sy - ly) < 0.4) ly = sy; else req();
    var off = sy - ly;               // quanto o efeito está "atrás" da rolagem real
    /* --- leitura --- */
    var R = {};
    var rd = function (k, el) { if (el) R[k] = el.getBoundingClientRect(); };
    rd("w", words[0] && words[0].parentNode);
    rd("hero", heroSec); rd("stage", seaMap && $(".b-stage", seaMap)); rd("sea", seaSec); rd("steps", stepsEl);
    var pr = par.filter(isNear).map(function (el) { return [el, el.getBoundingClientRect()]; });
    var gr = grow.filter(isNear).map(function (el) { return [el, el.getBoundingClientRect()]; });
    var dr = drift.filter(isNear).map(function (el) { return [el, el.parentNode.getBoundingClientRect()]; });
    var stepR = steps.length && vImg ? steps.map(function (s) { return s.getBoundingClientRect(); }) : null;
    var doc = D.documentElement.scrollHeight;
    /* --- escrita --- */
    if (bar) bar.style.transform = "scaleX(" + (doc > vh ? clamp(ly / (doc - vh)).toFixed(4) : 0) + ")";
    if (words.length) {
      var p = (vh * 0.86 - (R.w.top + off)) / (R.w.height + vh * 0.25);
      var n = Math.round(clamp(p) * (words.length + 0.5));
      words.forEach(function (w, i) { var on = i < n; if (w._on !== on) { w._on = on; w.classList.toggle("on", on); } });
    }
    if (heroSec && heroPic && !reduce && R.hero) {
      var hp = clamp(ly / R.hero.height);
      heroPic.style.transform = "translate3d(0," + (hp * 4.5).toFixed(2) + "%,0) scale(" + (1.1 - hp * 0.02).toFixed(4) + ")";
      if (heroCopy && !H.classList.contains("opening")) {
        var cp = clamp(hp * 1.15);
        heroCopy.style.transform = cp ? "translate3d(0," + (cp * 11).toFixed(1) + "vh,0) scale(" + (1 - cp * 0.07).toFixed(4) + ")" : "";
        heroCopy.style.opacity = cp ? (1 - clamp((cp - 0.25) / 0.6)).toFixed(3) : "";
        heroCopy.style.transformOrigin = "0 100%";
      }
    }
    pr.forEach(function (a) {
      var el = a[0], r = a[1], c = r.top + off + r.height / 2 - vh / 2;
      el.style.transform = "translate3d(0," + (c * parseFloat(el.dataset.par) * -1).toFixed(1) + "px,0)";
    });
    gr.forEach(function (a) {
      var el = a[0], r = a[1], g = ease(clamp((vh * 1.0 - (r.top + off)) / (vh * 0.62)));
      el.style.clipPath = g < 1 ? "inset(" + ((1 - g) * 20).toFixed(2) + "% " + ((1 - g) * 12).toFixed(2) + "% " + ((1 - g) * 20).toFixed(2) + "% " + ((1 - g) * 12).toFixed(2) + "%)" : "";
      var im = el.firstElementChild; if (im) im.style.transform = "scale(" + (1 + (1 - g) * 0.28).toFixed(4) + ")";
    });
    dr.forEach(function (a) {
      var el = a[0], r = a[1], c = clamp(((r.top + off) + r.height / 2) / vh + 0.0) * 2 - 1; // -1 (acima) a 1 (abaixo)
      el.style.setProperty("--dy", (c * -4.5).toFixed(2) + "%"); el.style.setProperty("--sc", "1.12");
    });
    if (seaMap && R.stage && seaLine) {
      var sp = clamp((vh * 0.92 - (R.stage.top + off)) / (R.stage.height * 0.8 + vh * 0.22));
      seaLine.style.strokeDashoffset = (1 - sp).toFixed(4); seaLine.style.opacity = sp > 0.002 ? 1 : 0;
      if (seaWater) seaWater.style.opacity = clamp(sp * 1.5 - 0.35).toFixed(3);
    }
    if (seaSec && R.sea) {
      var tide = clamp((vh * 0.95 - (R.sea.top + off)) / (R.sea.height * 0.9));
      seaSec.style.setProperty("--tide", (tide * 0.62).toFixed(4));
    }
    if (stepR) {
      var best = 0, bd = 1e9;
      stepR.forEach(function (r, i) { var d = Math.abs(r.top + off + r.height / 2 - vh * 0.5); if (d < bd) { bd = d; best = i; } });
      if (best !== lastAct) { lastAct = best; steps.forEach(function (s, i) { s.classList.toggle("act", i === best); }); if (vCount) vCount.textContent = "0" + (best + 1) + " / 0" + steps.length; }
      var fp = clamp((vh * 0.55 - (R.steps.top + off)) / R.steps.height);
      vImg.style.setProperty("--tilt", ((fp - 0.5) * 5.2).toFixed(2) + "deg");
      vImg.style.setProperty("--pan", ((fp - 0.5) * -5).toFixed(2) + "%");
      vImg.style.setProperty("--zoom", (1.1 + fp * 0.05).toFixed(3));
      stepsEl.style.setProperty("--sp", fp.toFixed(4));
    }
  };
  var req = function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  if (reduce) { words.forEach(function (w) { w.classList.add("on"); }); steps.forEach(function (s) { s.classList.add("act"); }); }
  else { addEventListener("scroll", req, { passive: true }); addEventListener("resize", req); addEventListener("load", req); frame(); }

  /* ---------- abas de destaques (por bairro) ---------- */
  var tabs = $$(".dtab");
  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      tabs.forEach(function (x) { var on = x === t; x.setAttribute("aria-selected", on); var p = $("#" + x.getAttribute("aria-controls")); if (p) p.hidden = !on; });
    });
    t.addEventListener("keydown", function (e) {
      var i = tabs.indexOf(t), n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
      if (n === null) return; var x = tabs[(n + tabs.length) % tabs.length]; x.focus(); x.click(); e.preventDefault();
    });
  });

  /* ---------- linha do mar: bairros ---------- */
  var pins = $$(".pin");
  var select = function (b) {
    pins.forEach(function (p) { p.setAttribute("aria-current", p.dataset.bairro === b); });
    $$(".binfo").forEach(function (i) { i.hidden = i.dataset.info !== b; });
  };
  pins.forEach(function (p) { p.addEventListener("click", function () { select(p.dataset.bairro); }); });
  if (pins.length) select(pins.length > 1 ? "itapua" : pins[0].dataset.bairro);

  /* ---------- favoritos e compartilhar ---------- */
  var favs = store.get("dm_fav") || [];
  var syncFav = function () {
    $$("[data-fav]").forEach(function (b) { b.setAttribute("aria-pressed", favs.indexOf(b.dataset.fav) > -1); });
    var n = favs.length;
    $$("[data-favcount]").forEach(function (c) { c.textContent = n; });
    $$(".nav-fav,[data-favlink]").forEach(function (a) { a.hidden = !n; });
  };
  D.addEventListener("click", function (e) {
    var b = e.target.closest("[data-fav]");
    if (b) {
      var id = b.dataset.fav, i = favs.indexOf(id);
      if (i > -1) favs.splice(i, 1); else favs.push(id);
      store.set("dm_fav", favs); syncFav(); if (typeof applyFilters === "function") applyFilters();
      return;
    }
    var s = e.target.closest("[data-share]");
    if (s) {
      var url = s.dataset.share ? new URL(s.dataset.share, location.href).href : location.href.split("#")[0];
      var title = s.dataset.title || D.title;
      if (navigator.share) { navigator.share({ title: title, url: url }).catch(function () {}); }
      else { open_ = window.open("https://wa.me/?text=" + encodeURIComponent(title + " " + url), "_blank", "noopener"); }
    }
  });
  var open_;
  syncFav();

  /* ---------- galeria do imóvel ---------- */
  $$(".g-t").forEach(function (t) {
    t.addEventListener("click", function () {
      var img = $("#g-img"); img.src = t.dataset.src; img.alt = t.dataset.alt;
      $$(".g-t").forEach(function (x) { x.removeAttribute("aria-current"); }); t.setAttribute("aria-current", "true");
    });
  });

  /* ---------- catálogo com filtros na URL ---------- */
  var grid = $("[data-grid]");
  var GROUPS = ["fin", "bairro", "tipo", "q", "v", "preco"];
  var applyFilters = null;
  if (grid) {
    var cards = $$(".card", grid);
    var state = {};
    GROUPS.concat(["ord", "fav"]).forEach(function (g) { state[g] = qs.get(g) || ""; });
    var filtros = $("#filtros"), toggle = $(".f-toggle"), sortSel = $("[data-sort]");
    var match = function (c, f) {
      var d = c.dataset;
      if (f.fin && d.fin !== f.fin) return false;
      if (f.bairro && d.bairro !== f.bairro) return false;
      if (f.tipo && d.tipo !== f.tipo) return false;
      if (f.q) { var q = +d.q; if (!q) return false; if (f.q === "4" ? q < 4 : q !== +f.q) return false; }
      if (f.v) { var v = +d.v; if (!v) return false; if (f.v === "3" ? v < 3 : v !== +f.v) return false; }
      if (f.preco) {
        var p = +d.preco; if (!p) return false;
        var r = { p1: [0, 1e6], p2: [1e6, 2.5e6], p3: [2.5e6, 5e6], p4: [5e6, 1e12] }[f.preco];
        if (p < r[0] || p > r[1]) return false;
      }
      if (f.fav === "1" && (favs.indexOf(d.id) < 0)) return false;
      return true;
    };
    applyFilters = function () {
      var shown = 0, n = 0;
      cards.forEach(function (c) { var ok = match(c, state); c.hidden = !ok; if (ok) shown++; });
      GROUPS.forEach(function (g) { if (state[g]) n++; });
      var order = cards.slice();
      if (state.ord === "menor") order.sort(function (a, b) { return (+a.dataset.preco || 9e12) - (+b.dataset.preco || 9e12); });
      else if (state.ord === "maior") order.sort(function (a, b) { return (+b.dataset.preco) - (+a.dataset.preco); });
      else if (state.ord === "area") order.sort(function (a, b) { return (+b.dataset.area) - (+a.dataset.area); });
      else order.sort(function (a, b) { return (+a.dataset.ord) - (+b.dataset.ord); });
      order.forEach(function (c) { grid.appendChild(c); });
      $("[data-count]").textContent = shown;
      $(".count").lastChild.textContent = shown === 1 ? " imóvel" : " imóveis";
      $("[data-empty]").hidden = shown > 0;
      $("[data-nfil]").textContent = n ? "(" + n + ")" : "";
      $$(".fgrp").forEach(function (g) { $$(".chip", g).forEach(function (c) { c.setAttribute("aria-pressed", state[g.dataset.g] === c.dataset.v); }); });
      if (sortSel) sortSel.value = state.ord;
      var u = new URLSearchParams();
      GROUPS.concat(["ord", "fav"]).forEach(function (g) { if (state[g]) u.set(g, state[g]); });
      try { history.replaceState(null, "", location.pathname + (u.toString() ? "?" + u : "")); } catch (e) {}
    };
    $$(".fgrp").forEach(function (g) {
      $$(".chip", g).forEach(function (c) { c.addEventListener("click", function () { state[g.dataset.g] = state[g.dataset.g] === c.dataset.v ? "" : c.dataset.v; applyFilters(); }); });
    });
    if (sortSel) sortSel.addEventListener("change", function () { state.ord = sortSel.value; applyFilters(); });
    $("[data-clear]").addEventListener("click", function () { GROUPS.forEach(function (g) { state[g] = ""; }); state.fav = ""; applyFilters(); });
    if (toggle) toggle.addEventListener("click", function () { var o = filtros.classList.toggle("open"); toggle.setAttribute("aria-expanded", o); });
    if (GROUPS.some(function (g) { return state[g]; }) && toggle) { filtros.classList.add("open"); toggle.setAttribute("aria-expanded", "true"); }
    applyFilters();
  }

  /* ---------- agendar visita (monta o link wa.me) ---------- */
  var ag = $("#agendar");
  if (ag) {
    var form = $(".agendar-form", ag), wa = ag.dataset.wa;
    var dias = ag.dataset.dias.split(",").map(Number), horas = ag.dataset.horas.split(","), jan = +ag.dataset.janela;
    var days = $("[data-days]", ag), hours = $("[data-hours]", ag), go = $("[data-go]", ag), hint = $("[data-hint]", ag);
    var WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"], MO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    var WDL = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
    var sel = { day: null, hour: null };
    var today = new Date();
    for (var k = 1, made = 0; made < jan && k < 60; k++) {
      var dt = new Date(today.getFullYear(), today.getMonth(), today.getDate() + k);
      if (dias.indexOf(dt.getDay()) < 0) continue;
      made++;
      var b = D.createElement("button"); b.type = "button"; b.className = "cd"; b.setAttribute("aria-pressed", "false");
      b.dataset.label = WDL[dt.getDay()] + ", " + dt.getDate() + " de " + ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"][dt.getMonth()];
      b.innerHTML = "<small>" + WD[dt.getDay()] + "</small><b>" + dt.getDate() + "</b><small>" + MO[dt.getMonth()] + "</small>";
      days.appendChild(b);
    }
    horas.forEach(function (h) { var b = D.createElement("button"); b.type = "button"; b.className = "cd"; b.setAttribute("aria-pressed", "false"); b.dataset.label = h; b.innerHTML = "<b>" + h + "</b>"; hours.appendChild(b); });
    var update = function () {
      var s = form.imovel, opt = s.options[s.selectedIndex], nome = form.nome.value.trim();
      var que = s.value ? "o *" + opt.text.replace(/^[^:]+: /, "") + "* (código " + s.value + ")" : "seus imóveis";
      var msg = "Olá, Desirée! Vi " + que + " no seu site";
      if (sel.day && sel.hour) msg += " e gostaria de visitar em *" + sel.day + "* às *" + sel.hour + "*";
      else if (sel.day) msg += " e gostaria de visitar em *" + sel.day + "*";
      else msg += " e gostaria de agendar uma visita";
      msg += "." + (nome ? " Meu nome é " + nome + "." : "");
      go.href = "https://wa.me/" + wa + "?text=" + encodeURIComponent(msg);
      var ok = sel.day && sel.hour;
      go.setAttribute("aria-disabled", ok ? "false" : "true");
      go.dataset.msg = msg;
      hint.textContent = ok ? "O WhatsApp abre com a mensagem pronta. Eu confirmo o horário por lá." : "Escolha o dia e o horário para liberar o botão.";
    };
    [days, hours].forEach(function (box, n) {
      box.addEventListener("click", function (e) {
        var b = e.target.closest(".cd"); if (!b) return;
        $$(".cd", box).forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
        if (n === 0) sel.day = b.dataset.label; else sel.hour = b.dataset.label; update();
      });
    });
    form.addEventListener("input", update); form.addEventListener("change", update);
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    update();
    // vindo de #agendar com imóvel na URL (?imovel=DM-001)
    var pre = qs.get("imovel"); if (pre && form.imovel.querySelector('[value="' + pre + '"]')) { form.imovel.value = pre; update(); }
  }

  /* ---------- quero vender ---------- */
  var vf = $(".vender-form");
  if (vf) {
    var vgo = $("[data-go]", vf), vwa = (ag && ag.dataset.wa) || "";
    if (!vwa) { var m = /wa\.me\/(\d+)/.exec(vgo.href); vwa = m ? m[1] : ""; }
    var vu = function () {
      var p = ["Olá, Desirée! Quero vender meu imóvel."];
      if (vf.bairro.value.trim()) p.push("Bairro: " + vf.bairro.value.trim() + ".");
      if (vf.tipo.value.trim()) p.push("Imóvel: " + vf.tipo.value.trim() + ".");
      if (vf.fone.value.trim()) p.push("Meu WhatsApp: " + vf.fone.value.trim() + ".");
      vgo.href = "https://wa.me/" + vwa + "?text=" + encodeURIComponent(p.join(" "));
    };
    vf.addEventListener("input", vu); vf.addEventListener("submit", function (e) { e.preventDefault(); }); vu();
  }

  /* ---------- simulador (tabela Price, só referência) ---------- */
  var sf = $(".sim-form");
  if (sf) {
    var out = $("[data-out]", sf), sub = $("[data-sub]", sf), max = +$("#simulador").dataset.max || 35;
    var brl = function (n) { return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    var parse = function (v) { return parseFloat(String(v).replace(/\./g, "").replace(",", ".")) || 0; };
    var money = function (inp) { inp.addEventListener("input", function () { var d = inp.value.replace(/\D/g, ""); inp.value = d ? (+d).toLocaleString("pt-BR") : ""; }); };
    money(sf.valor); money(sf.entrada);
    var calc = function () {
      var v = parse(sf.valor.value), e = parse(sf.entrada.value), y = Math.min(max, Math.max(0, +sf.prazo.value)), t = parse(sf.taxa.value);
      out.classList.remove("ph");
      if (!t) { out.textContent = "Informe a taxa para ver a parcela."; out.classList.add("ph"); sub.textContent = ""; return; }
      if (v <= 0 || e >= v || y <= 0) { out.textContent = "Confira o valor, a entrada e o prazo."; out.classList.add("ph"); sub.textContent = ""; return; }
      var pv = v - e, n = y * 12, i = Math.pow(1 + t / 100, 1 / 12) - 1;
      var pmt = pv * i / (1 - Math.pow(1 + i, -n));
      out.textContent = brl(pmt) + " por mês";
      sub.textContent = "Financiado: " + brl(pv) + " em " + n + " meses (taxa de " + t.toLocaleString("pt-BR") + "% ao ano). Simulação, não é proposta.";
    };
    sf.addEventListener("input", calc); sf.addEventListener("submit", function (e) { e.preventDefault(); }); calc();
  }

  /* ---------- depuração: ?seek= para conferir a abertura quadro a quadro ---------- */
  if (!isNaN(seek) && open) {
    H.classList.add("opening");
    var pause = function () { D.getAnimations().forEach(function (a) { a.pause(); a.currentTime = seek * 1000; }); };
    setTimeout(pause, 60); setTimeout(pause, 600);
  }
})();
