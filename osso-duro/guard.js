/* Ribeiro Web Co. — template v2, guard.js (sites com "modern": concept e final).
   Rede de segurança para quando a CDN falha pela metade: os scripts do GSAP, do SplitText e do Lenis são "defer" e o main.js só roda
   depois deles; se um deles trava (servidor lento, conexão que não responde), o main.js demora ou não roda e o nome gigante do rodapé
   fica no tamanho do CSS (18vw), cortado, e o título do topo sem ajuste. Este arquivo vem ANTES das bibliotecas, roda na hora e, enquanto
   o main.js não rodou (ele tira a classe "intro" da página ao começar), faz o essencial: ajusta o tamanho dos textos gigantes
   ([data-fit]), preenche o ano e deixa o menu em tela cheia funcionar. Quando o main.js roda, este arquivo para: tudo que ele
   faz é idempotente, então com tudo carregando a saída é a mesma de antes. Também mede a altura do cabeçalho para o menu em tela cheia. */
(function () {
  var root = document.documentElement;
  var done = function () { return !root.classList.contains("intro"); };   // main.js remove "intro" assim que executa
  var $ = function (s) { return document.querySelector(s); };

  /* mesmos cálculos do main.js */
  function fit(el) {
    var inner = el.firstElementChild || el;
    el.style.fontSize = "100px";
    var w = inner.getBoundingClientRect().width;
    if (!w) return;
    var cs = getComputedStyle(el);
    var avail = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var size = 98 * avail * (parseFloat(el.getAttribute("data-fit-ratio")) || 1) / w;
    var maxH = window.innerHeight * (parseFloat(el.getAttribute("data-fit-max")) || 0.36);
    el.style.fontSize = Math.min(size, maxH / 0.84) + "px";
  }
  function shrinkToFit() {
    [].forEach.call(document.querySelectorAll(".sec-title, .mc-title, .v-addr, .sv-name, .cl-title"), function (el) {
      el.style.fontSize = "";
      var avail = el.clientWidth, need = el.scrollWidth;
      if (avail && need > avail + 1) el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * avail / need * 0.98) + "px";
    });
  }
  function fitHeroTitle() {
    var body = $(".hero--poster .hero-body"), title = body && body.querySelector(".hero-title");
    if (!title) return;
    var lines = [].slice.call(title.querySelectorAll(".hl[data-fit]"));
    for (var pass = 0; pass < 3; pass++) {
      var cs = getComputedStyle(body);
      var room = body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      [].slice.call(body.children).forEach(function (ch) {
        if (ch === title) return;
        var s = getComputedStyle(ch);
        if (s.position === "absolute" || s.display === "none") return;
        room -= ch.offsetHeight + parseFloat(s.marginTop) + parseFloat(s.marginBottom);
      });
      room -= 4;
      var h = title.getBoundingClientRect().height;
      if (h <= room || room <= 0) break;
      var k = room / h;
      lines.forEach(function (l) { l.style.fontSize = (parseFloat(l.style.fontSize) * k) + "px"; });
    }
  }
  function rescue() {
    if (done()) return;
    try { [].forEach.call(document.querySelectorAll("[data-fit]"), fit); shrinkToFit(); fitHeroTitle(); } catch (err) {}
    [].forEach.call(document.querySelectorAll("[data-year]"), function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* menu em tela cheia enquanto o main.js não chegou (depois dele, estes ouvintes não fazem nada) */
  function setOverlay(open) {
    var ov = $("[data-overlay]"), toggle = $("[data-toggle]");
    if (!ov || !toggle) return;
    ov.classList.toggle("is-open", open);
    ov.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("ov-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    var label = toggle.querySelector(".hdr-toggle-label");
    if (label) label.textContent = label.getAttribute(open ? "data-label-close" : "data-label-open");
  }
  document.addEventListener("click", function (ev) {
    if (done()) return;
    if (ev.target.closest("[data-toggle]")) { var ov = $("[data-overlay]"); setOverlay(!(ov && ov.classList.contains("is-open"))); }
    else if (ev.target.closest("[data-close]")) setOverlay(false);
  });
  document.addEventListener("keydown", function (ev) { if (!done() && ev.key === "Escape") setOverlay(false); });

  /* menu em tela cheia: o primeiro item começa abaixo do cabeçalho real (nome + faixa de aviso, que quebra em 2 linhas em celular estreito).
     --ov-top é medido ao abrir o menu, ao girar a tela, ao redimensionar e quando as fontes chegam; roda sempre, com ou sem main.js */
  function setOvTop() {
    var h = $(".hdr");
    if (h) root.style.setProperty("--ov-top", Math.ceil(h.getBoundingClientRect().bottom + 14) + "px");
  }
  setOvTop();
  document.addEventListener("click", function (ev) { if (ev.target.closest("[data-toggle]")) setOvTop(); }, true);
  window.addEventListener("load", setOvTop);
  window.addEventListener("resize", function () { setTimeout(setOvTop, 150); });
  window.addEventListener("orientationchange", function () { setTimeout(setOvTop, 300); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setOvTop);

  /* só entra em ação se o main.js demorar mais de ~1,2 s; depois repete a cada segundo até ele chegar */
  var tries = 0, timer;
  function tick() { if (done() || ++tries > 180) return clearInterval(timer); rescue(); }
  setTimeout(function () { rescue(); timer = setInterval(tick, 1000); }, 1200);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(rescue, 1300); });
  window.addEventListener("resize", function () { setTimeout(rescue, 150); });
})();
