/* Ribeiro Web Co. — template v2, run.js (só carregado quando o site usa as seções run, rsvp ou faq: clube de corrida).
   A página é a corrida: a rota se desenha sobre o mapa conforme a rolagem, o hodômetro no cabeçalho conta a distância e o número de peito
   muda na hora com o ritmo e o nome. Tudo aqui é acréscimo: sem JS ou com "reduzir movimento" a rota já está desenhada e os painéis aparecem em lista.
   Não depende de GSAP nem de Lenis: a rota usa a rolagem nativa (position: sticky) e lê a posição a cada quadro; com a CDN lenta ela funciona igual.
   Revisão (não muda nada no site publicado): ?nt=1 tira as transições · ?route=0.5 leva a rolagem a 50% da rota · ?y=1200 rola até 1200 px. */
(function () {
  var root = document.documentElement, body = document.body;
  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var hasIO = "IntersectionObserver" in window;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  if (/[?&]nt=1/.test(location.search)) { var nt = document.createElement("style"); nt.textContent = "*{transition:none!important}"; document.head.appendChild(nt); }

  /* cabeçalho sólido e posição abaixo da faixa de aviso: o main.js faz o mesmo, mas ele espera a CDN (defer); aqui é idempotente e não depende dela */
  var pbar = $(".pbar"), hdrEl = $("[data-header]");
  function placeHeader() {
    var y = window.pageYOffset || root.scrollTop, h = pbar ? pbar.offsetHeight : 0;
    if (hdrEl) hdrEl.classList.toggle("hdr--solid", y > 80);
    root.style.setProperty("--pbar-real", h + "px");
    root.style.setProperty("--hdr-top", Math.max(0, h - y) + "px");
  }
  placeHeader();
  addEventListener("scroll", placeHeader, { passive: true });
  addEventListener("resize", placeHeader);

  /* "7:00 PM" nunca quebra deixando o "PM" sozinho na linha */
  var NB = /(\d) (AM|PM)\b/gi;
  function nb(str) { return str.replace(NB, "$1\u00a0$2"); }
  function nbAll() {
    var w = document.createTreeWalker($("main") || document.body, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) if (n.parentNode.nodeName !== "SCRIPT" && /\d (AM|PM)\b/i.test(n.nodeValue)) n.nodeValue = nb(n.nodeValue);
  }
  nbAll();

  var run = $("[data-run]");
  var TZ = (run && run.getAttribute("data-tz")) || "";
  /* idioma (lang.js, só nos sites com "i18n"): o que este arquivo gera (relógio, datas, número de peito) pergunta o idioma e se refaz no evento "sitelang" */
  function cv(name, fallback) { var s = window.SiteLang, v = s && s.cfg(name); return v === undefined || v === null ? fallback : v; }
  function tt(str) { return window.SiteLang ? window.SiteLang.t(str) : str; }
  function flag(el) { if (el) el.setAttribute("data-lang-dyn", ""); return el; }
  var redo = [nbAll];   // funções que refazem o texto gerado quando o idioma muda (o texto trocado pelo lang.js volta com espaço comum antes do PM)
  addEventListener("sitelang", function () { redo.forEach(function (f) { f(); }); });

  /* ---------- relógio da largada e datas que rolam (fuso do clube, com horário de verão) ---------- */
  var gunTs = 0;
  if (run && run.hasAttribute("data-gun-day") && TZ) {
    try {
      var fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short" });
      var parts = function (ts) { var o = {}; fmt.formatToParts(new Date(ts)).forEach(function (p) { o[p.type] = p.value; }); return o; };
      var wall = function (ts) { var p = parts(ts); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second); };
      var zonedToUtc = function (y, mo, d, h, mi) { var g = Date.UTC(y, mo - 1, d, h, mi); var t = g - (wall(g) - g); return g - (wall(t) - t); };
      var DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      var gunDay = +run.getAttribute("data-gun-day"), gt = run.getAttribute("data-gun-time").split(":");
      var GUN_H = +gt[0], GUN_M = +gt[1] || 0, RUN_MIN = +run.getAttribute("data-gun-min") || 90;
      var nextGun = function (now) {
        var p = parts(now), add = (gunDay - DOW[p.weekday] + 7) % 7;
        for (var i = 0; i < 2; i++) {
          var b = new Date(Date.UTC(+p.year, +p.month - 1, +p.day + add + i * 7));
          var t = zonedToUtc(b.getUTCFullYear(), b.getUTCMonth() + 1, b.getUTCDate(), GUN_H, GUN_M);
          if (t + RUN_MIN * 60000 > now) return t;
        }
        return 0;
      };
      var clock = flag($(".hero-status"));
      if (clock) { clock.removeAttribute("data-open-status"); var tab = clock.closest(".hero-tab"); if (tab) tab.classList.remove("is-open-now"); }
      var tick = function () {
        var now = Date.now(); gunTs = nextGun(now);
        if (!clock || !gunTs) return;
        var ms = gunTs - now;
        if (ms <= 0) { clock.textContent = run.getAttribute("data-clock-now"); return; }
        var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
        clock.textContent = run.getAttribute("data-clock-soon") + " " + (d ? d + cv("day_unit", "d") + " " : "") + pad(h) + ":" + pad(m) + ":" + pad(sec);
      };
      tick();
      setInterval(tick, 1000);
      var dateOf = function (ts) { var p = parts(ts); return { m: +p.month, d: +p.day, w: DOW[p.weekday] }; };
      var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      var renderDates = function () {
        if (!gunTs) return;
        var days = cv("days", DAYS), months = cv("months", MON), fmtD = cv("date_fmt", "{w}, {m} {d}");
        $$("[data-run-date]").forEach(function (el) {
          flag(el);
          var x = dateOf(gunTs), suf = (el.getAttribute("data-run-date") || "").trim();
          el.textContent = fmtD.replace("{w}", days[x.w]).replace("{m}", months[x.m - 1]).replace("{d}", x.d) + (suf ? " " + nb(suf) : "");
        });
        var st = $("[data-stops][data-rolling]");
        if (st) {   // as linhas das próximas saídas viram as semanas seguintes à próxima largada
          $$(".stop[data-date]", st).forEach(function (row, i) {
            var x = dateOf(gunTs + (i + 1) * 7 * 864e5);
            row.hidden = false; row.removeAttribute("data-open");
            var dEl = flag($(".stop-date", row)), mEl = flag($(".stop-month", row));
            if (dEl) dEl.textContent = x.d;
            if (mEl) mEl.textContent = months[x.m - 1];
          });
          st.classList.remove("is-quiet");
        }
      };
      renderDates();
      redo.push(function () { renderDates(); tick(); });
    } catch (err) {}
  }

  /* ---------- chegada: linha pintada, número de peito vivo e botão ---------- */
  var rsvp = $("#rsvp");
  if (rsvp) {
    if (hasIO && !reduce) {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { rsvp.classList.add("is-in"); io.disconnect(); } }, { threshold: 0.2 });
      io.observe(rsvp);
      var joinBtn = $(".btn--solid", rsvp);   // a barra fixa do celular some enquanto o botão da própria seção está na tela (senão o mesmo botão aparece duas vezes)
      if (joinBtn) new IntersectionObserver(function (en) { body.classList.toggle("in-rsvp", en[0].isIntersecting); }, { threshold: 0.6 }).observe(joinBtn);
    } else rsvp.classList.add("is-in");
    var bib = $(".bib", rsvp), bibNo = $("[data-bib-no]", rsvp), bibName = $("[data-bib-name]", rsvp), bibMeta = $("[data-bib-meta]", rsvp);
    var nameIn = $(".rsvp-name input", rsvp), groups = $$(".rsvp-groups input", rsvp);
    if (bib && bibNo && bibName && bibMeta) {
      var dNo = bibNo.textContent, dName = bibName.textContent;
      [bibNo, bibName, bibMeta].forEach(flag);
      var hash = function (str) { var h = 7; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 9973; return h; };
      var MAXN = nameIn ? parseInt(nameIn.getAttribute("data-max"), 10) || 12 : 12;
      var clip = function (str) {   // conta por caractere visível (emoji com ZWJ e acento contam como 1), não por unidade UTF-16
        var a = window.Intl && Intl.Segmenter ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(str), function (x) { return x.segment; }) : Array.from(str);
        return a.length > MAXN ? a.slice(0, MAXN).join("") : str;
      };
      var fitName = function () {   // o nome fica numa linha só: a fonte encolhe até caber (nunca quebra no meio da palavra)
        bibName.style.fontSize = "";
        var w = bibName.clientWidth, sw = bibName.scrollWidth;
        if (w && sw > w) bibName.style.fontSize = Math.max(24, parseFloat(getComputedStyle(bibName).fontSize) * w / sw * 0.97) + "px";
      };
      var paintBib = function () {
        var g = groups.filter(function (r) { return r.checked; })[0], typed = clip((nameIn && nameIn.value || "").trim());
        if (nameIn && nameIn.value !== typed && nameIn.value.trim() !== typed) nameIn.value = typed;
        bibName.textContent = typed || dName;
        bibNo.textContent = typed ? ("00" + (100 + hash(typed.toLowerCase() + (g ? g.value : "")) % 400)).slice(-3) : dNo;
        var suf = (bib.getAttribute("data-bib-suffix") || "").trim();
        bibMeta.textContent = nb((g ? g.getAttribute("data-label") : "") + (suf ? " " + suf : ""));
        fitName();
      };
      fitName();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitName);
      addEventListener("resize", fitName);
      if (nameIn) nameIn.addEventListener("input", paintBib);
      groups.forEach(function (r) { r.addEventListener("change", paintBib); });
      paintBib(); redo.push(paintBib);
    }
    /* no exemplo o botão não abre inscrição nenhuma: mostra o aviso ao lado e o número de peito assenta. No site real o href é o link do clube e nada disso roda */
    var join = $(".btn--solid", rsvp), status = $("[data-join-status]", rsvp);
    if (status) redo.push(function () { if (status.textContent) status.textContent = status.getAttribute("data-text"); });
    if (join && status && status.getAttribute("data-text") && /^#/.test(join.getAttribute("href") || "")) {
      join.addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        status.textContent = status.getAttribute("data-text"); flag(status);
        if (bib) { bib.classList.remove("is-pinned"); void bib.offsetWidth; bib.classList.add("is-pinned"); }
      });
    }
  }

  /* ---------- a rota ---------- */
  var yM = location.search.match(/[?&]y=(\d+)/); if (yM) setTimeout(function () { scrollTo(0, +yM[1]); }, 300);
  var track = $("[data-run-track]"), pin = $(".run-pin"), mapBox = $(".run-map"), svg = $(".run-map svg"), line = svg && $("#route-line", svg);
  if (!run || !track || !pin || !svg || !line) return;
  var sheet = $(".run-miles", run), panels = $$(".run-mile", run), miles = $$(".rm-mile", svg);
  var UNIT = run.getAttribute("data-unit") || "mi", PACE = parseFloat(run.getAttribute("data-pace")) || 9.5;
  var TOTAL = parseFloat(line.getAttribute("data-miles")) || 3.14;

  if (reduce) {   // sem movimento: mapa inteiro, rota já desenhada, todos os painéis à mostra (o CSS faz o resto); sem HUD nem linha de progresso
    run.classList.add("run--static");
    return;
  }
  run.classList.add("run--live");

  /* HUD no cabeçalho (distância e tempo, em mono) + linha fina no alto: a página inteira é a distância */
  var hdr = $("[data-header]"), hud = document.createElement("div");
  hud.className = "hud"; hud.setAttribute("aria-hidden", "true");
  hud.innerHTML = '<span class="hud-mi">0.00</span><span class="hud-u">' + UNIT + '</span><span class="hud-t">0:00</span>';
  if (hdr) { var brandEl = hdr.querySelector(".hdr-brand"); hdr.insertBefore(hud, brandEl ? brandEl.nextSibling : hdr.querySelector(".hdr-toggle")); }
  var hudMi = $(".hud-mi", hud), hudT = $(".hud-t", hud);
  var course = document.createElement("div"); course.className = "course"; course.setAttribute("aria-hidden", "true");
  course.innerHTML = "<i></i>"; body.appendChild(course);
  var courseBar = $("i", course);
  var lastHud = "";
  var odoMi = $("[data-odo-mi]", run), odoT = $("[data-odo-t]", run);   // hodômetro grande da coluna da direita (computador)
  function setHud(mi) {
    var a = mi.toFixed(2); if (a === lastHud) return; lastHud = a;
    var t = mi * PACE * 60, tm = Math.floor(t / 60) + ":" + pad(Math.floor(t % 60));
    hudMi.textContent = a; hudT.textContent = tm;
    if (odoMi) odoMi.textContent = a;
    if (odoT) odoT.textContent = tm;
  }
  function setCourse() {
    var h = root, p = (window.pageYOffset || h.scrollTop) / Math.max(1, h.scrollHeight - innerHeight);
    courseBar.style.transform = "scaleX(" + clamp(p, 0, 1) + ")";
  }

  /* a rota: o SVG tem o tamanho do zoom de acompanhamento e só se move por translate3d; no fim a câmera se afasta (scale < 1, nunca amplia: ficaria borrado) */
  var vb = svg.viewBox.baseVal, L = line.getTotalLength();
  // caixa da rota (com 120 m de folga): é ela que o zoom final enquadra; o SVG pode ser bem mais largo (ruas dos lados para telas largas)
  var bb = line.getBBox(), rb = { x: bb.x - 120, y: bb.y - 120, w: bb.width + 240, h: bb.height + 240 };
  var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  dot.setAttribute("class", "rm-dot"); dot.setAttribute("r", "17"); svg.appendChild(dot);
  var wide = window.matchMedia("(min-width: 900px), (orientation: landscape) and (min-width: 600px) and (max-height: 520px)");
  var full = window.matchMedia("(min-width: 900px)");   // computador: o mapa é horizontal e cobre a tela toda; o ponto fica um pouco à direita do painel de texto
  var cw = 0, ch = 0, uh = 0, refW = 0, refH = 0, sFit = 1, sF = 1, lastP = -1;
  /* computador: o hodômetro, o botão e o painel do trecho ficam sobre o mapa; marcador ou rótulo que passar por baixo de um deles some (com fade) até sair da zona */
  var cand = $$(".rm-mile, .rm-start circle, .rm-start text, .rm-names text", svg);
  var zoneEls = [$(".run-odo", run), $(".run-side .btn", run), sheet].filter(Boolean);
  function updateCover() {
    if (!full.matches) { cand.forEach(function (e) { if (e.classList.contains("is-covered")) e.classList.remove("is-covered"); }); return; }
    var zones = zoneEls.map(function (e) { return e.getBoundingClientRect(); });
    cand.forEach(function (e) {
      var r = e.getBoundingClientRect(), hit = zones.some(function (z) { return r.right > z.left - 10 && r.left < z.right + 10 && r.bottom > z.top - 10 && r.top < z.bottom + 10; });
      e.classList.toggle("is-covered", hit);
    });
  }
  function layout() {
    cw = mapBox.clientWidth; ch = mapBox.clientHeight;
    var sheetH = wide.matches ? 0 : sheet.offsetHeight;            // no celular o painel de baixo cobre a base do mapa
    uh = ch - sheetH;
    pin.style.setProperty("--sheet-h", sheetH + "px");
    // a barra de endereço do iPhone muda a altura aos poucos: só refaz o zoom quando a mudança é grande (giro, janela); o enquadramento acompanha a altura de cada quadro
    if (!refW || Math.abs(cw - refW) > 2 || Math.abs(ch - refH) > 150) {
      refW = cw; refH = ch;
      sFit = Math.min(cw / rb.w, uh / rb.h);
      sF = full.matches ? Math.max(uh / 850, cw / 2000, sFit * 1.2) : Math.max(sFit * 1.7, wide.matches ? 0.6 : 0.62);
      svg.style.width = vb.width * sF + "px"; svg.style.height = vb.height * sF + "px";
    }
  }
  function place(p) {
    p = clamp(p, 0, 1); lastP = p;
    var pt = line.getPointAtLength(p * L);
    dot.setAttribute("cx", pt.x); dot.setAttribute("cy", pt.y);
    line.style.strokeDashoffset = String(1000 * (1 - p));
    var z = clamp((p - 0.9) / 0.1, 0, 1); z = z * z * (3 - 2 * z);
    var k = lerp(1, sFit / sF, z), s = sF * k;
    var fx = lerp(pt.x - vb.x, rb.x + rb.w / 2 - vb.x, z), fy = lerp(pt.y - vb.y, rb.y + rb.h / 2 - vb.y, z);
    var ax = full.matches ? lerp(0.58, 0.56, z) : 0.5, ay = full.matches ? lerp(0.47, 0.5, z) : 0.5;
    var tx = cw * ax - fx * s, ty = uh * ay - fy * s;
    // a câmera nunca mostra fora do mapa: no computador o mapa é o SVG inteiro; no celular fica a caixa da rota (como sempre foi)
    var bx0 = (full.matches ? vb.x : rb.x) - vb.x, bx1 = (full.matches ? vb.x + vb.width : rb.x + rb.w) - vb.x, by0 = full.matches ? 0 : rb.y - vb.y, by1 = full.matches ? vb.height : rb.y + rb.h - vb.y;
    var wx = (bx1 - bx0) * s, hy = (by1 - by0) * s;
    tx = wx >= cw ? clamp(tx, cw - bx1 * s, -bx0 * s) : (cw - wx) / 2 - bx0 * s;
    ty = hy >= uh ? clamp(ty, uh - by1 * s, -by0 * s) : (uh - hy) / 2 - by0 * s;
    svg.style.transform = "translate3d(" + tx + "px," + ty + "px,0) scale(" + k + ")";
    updateCover();
    var mi = p * TOTAL;
    miles.forEach(function (g) { g.classList.toggle("is-hit", mi >= parseFloat(g.getAttribute("data-mi")) - 0.02); });
    var act = 0;
    panels.forEach(function (li, i) { if (mi >= parseFloat(li.getAttribute("data-at")) - 0.001 && (p < 0.999 || li.hasAttribute("data-finish"))) act = i; });
    if (p >= 0.999) act = panels.length - 1;
    panels.forEach(function (li, i) { li.classList.toggle("is-active", i === act); li.classList.toggle("is-past", i < act); });
    setHud(mi);
  }
  /* progresso = quanto da trilha (a seção alta) já passou do topo, lido da posição real: vale para a rolagem suave, o toque e a barra do iPhone */
  var HOLD = 0.08;   // os últimos 8% da trilha seguram o estado final (rota inteira, painel "Back at Chippewa"): ele aparece antes de o painel soltar
  function progress() {
    var d = track.offsetHeight - pin.offsetHeight;
    return d > 0 ? clamp(-track.getBoundingClientRect().top / (d * (1 - HOLD)), 0, 1) : 0;
  }
  var queued = false;
  function frame() { queued = false; setCourse(); var p = progress(); if (p !== lastP) place(p); }
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
  layout(); place(progress()); setCourse();
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", function () { layout(); place(progress()); setCourse(); });
  if ("ResizeObserver" in window) new ResizeObserver(function () { layout(); place(progress()); }).observe(pin);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); place(progress()); });
  addEventListener("load", function () { layout(); place(progress()); setCourse(); });
  if (hasIO) new IntersectionObserver(function (en) { body.classList.toggle("in-run", en[0].isIntersecting); }, { threshold: 0.5 }).observe(pin);

  var q = location.search.match(/[?&]route=([\d.]+)/);
  if (q) setTimeout(function () {
    var top = track.getBoundingClientRect().top + (window.pageYOffset || root.scrollTop);
    scrollTo(0, top + (track.offsetHeight - pin.offsetHeight) * (1 - HOLD) * parseFloat(q[1]));
  }, 500);
})();
