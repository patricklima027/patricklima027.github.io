/* Cafuné Estúdio (modelo-br-salao) — custom.js, carregado depois do main.js e do extras.js.
   Quatro gestos, todos com propósito e todos sem esconder informação para sempre (sem JS, ou com "reduzir movimento",
   a página aparece parada e completa):
   1. marca-texto: pinta atrás das palavras em destaque quando elas acendem na frase grande;
   2. a semana da Rô: cada linha é escrita uma de cada vez (a pauta desenha, depois o dia e o texto aparecem);
   3. o preço de caneta "assenta" (de torto para o jeito dele) quando a linha da tabela entra na tela. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;

  /* 0) acessibilidade: o índice de categorias do cardápio vem do template com aria-label "Menu" (igual ao botão do topo) */
  [].forEach.call(document.querySelectorAll(".menu-index"), function (nav) { nav.setAttribute("aria-label", "Categorias de preços"); });

  /* 1) marca-texto. Espera o main.js dividir a frase em palavras (SplitText) e só pinta quando a palavra já acendeu. */
  var marks = [].slice.call(document.querySelectorAll(".st-text em"));
  var splitExpected = !reduce && window.gsap && window.SplitText;
  function paint() {
    var st = document.querySelector(".st-text");
    if (splitExpected && !(st && st.querySelector("div"))) return;   // ainda não dividiu: não pinta antes da hora
    marks.forEach(function (em) {
      if (em.classList.contains("is-lit")) return;
      var word = em.querySelector("div") || em;
      if (parseFloat(getComputedStyle(word).opacity) >= 0.85) em.classList.add("is-lit");
    });
  }
  if (marks.length) {
    window.addEventListener("scroll", paint, { passive: true });
    var tries = 0, poll = setInterval(function () { paint(); if (++tries > 20) clearInterval(poll); }, 300);
  }

  /* 2) a semana da Rô: uma linha de cada vez, na ordem da página */
  var rows = [].slice.call(document.querySelectorAll(".sch-row"));
  if (rows.length && hasIO && !reduce) {
    root.classList.add("sch-anim");
    var queue = [], busy = false;
    var next = function () {
      var row = queue.shift();
      if (!row) { busy = false; return; }
      busy = true;
      row.classList.add("is-in");
      setTimeout(next, 300);
    };
    var io = new IntersectionObserver(function (entries) {
      entries.filter(function (en) { return en.isIntersecting; })
        .sort(function (a, b) { return rows.indexOf(a.target) - rows.indexOf(b.target); })
        .forEach(function (en) { io.unobserve(en.target); queue.push(en.target); });
      if (!busy) next();
    }, { threshold: 0.3, rootMargin: "0px 0px -6% 0px" });
    rows.forEach(function (row) { io.observe(row); });
  }

  /* 3) preço de caneta assenta quando a linha da tabela chega */
  var prices = [].slice.call(document.querySelectorAll(".mr"));
  if (prices.length && hasIO && !reduce) {
    root.classList.add("mr-anim");
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        pio.unobserve(en.target);
        setTimeout(function () { en.target.classList.add("is-seen"); }, 350);
      });
    }, { threshold: 0.6 });
    prices.forEach(function (row) { pio.observe(row); });
  }
})();
