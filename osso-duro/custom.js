/* Osso Duro Jiu-Jitsu & Muay Thai (modelo-br-artes-marciais) — custom.js, carregado depois do main.js e do extras.js.
   Tudo aqui tem propósito e nada esconde informação para sempre: sem JS, ou com "reduzir movimento", a página aparece parada e completa.
   1. faixa fixa no alto: troca de cor com a seção em que você está e, na preta, acende os 4 graus (a troca em si é CSS);
   2. grade de turmas: cada linha ganha o link "Agendar esta turma" (WhatsApp com a turma já escrita) e a barrinha cresce de cima pra baixo;
   3. equipe: a faixa de cada professor "amarra" da esquerda pra direita;
   4. barra do celular: sai da frente quando o botão de agendar do próprio bloco está na tela;
   5. telefone de exemplo: o toque em tel: mostra um aviso em vez de discar o número fictício. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;

  /* 1) faixa do alto. O ponto de leitura fica a 40% da altura da tela: a seção "entra" quando o topo dela passa dali. */
  var belt = document.querySelector(".belt");
  var secs = [].slice.call(document.querySelectorAll("[data-section-belt]"));
  if (belt && secs.length) {
    var first = belt.getAttribute("data-belt-now") || "branca", ticking = false;
    var update = function () {
      ticking = false;
      var probe = window.innerHeight * 0.4, cur = first;
      secs.forEach(function (s) { if (s.getBoundingClientRect().top <= probe) cur = s.getAttribute("data-section-belt"); });
      if (belt.getAttribute("data-belt-now") !== cur) belt.setAttribute("data-belt-now", cur);
    };
    var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("load", update);
    update();
  }

  /* 2) grade de turmas: "Agendar esta turma" em cada linha. A mensagem é a mesma do botão principal, com a turma escrita. */
  var rows = [].slice.call(document.querySelectorAll(".sch-row"));
  var mainBtn = document.querySelector(".schedule .book .btn--solid") || document.querySelector(".hero .btn--solid");
  if (rows.length && mainBtn && /^https:\/\/wa\.me\//.test(mainBtn.getAttribute("href") || "")) {
    var base = mainBtn.getAttribute("href").split("?")[0];
    var wa = mainBtn.querySelector("svg");
    var hello = "Oss! Quero agendar minha aula experimental grátis.";   // primeira linha: a mesma do botão principal
    try { hello = new URL(mainBtn.href).searchParams.get("text").split("\n")[0] || hello; } catch (err) {}
    rows.forEach(function (row) {
      var title = (row.querySelector(".sch-title") || {}).textContent || "";
      var when = (row.querySelector(".sch-when") || {}).textContent || "";
      var time = (row.querySelector(".sch-time") || {}).textContent || "";
      var msg = hello + "\n" +
        "Turma: " + title + ", " + when + ", " + time + "\nMeu nome: \nDia que quero ir: ";
      var a = document.createElement("a");
      a.className = "sch-go";
      a.href = base + "?text=" + encodeURIComponent(msg);
      a.target = "_blank";
      a.rel = "noopener";
      a.setAttribute("aria-label", "Agendar esta turma: " + title + ", " + when + ", " + time);
      if (wa) a.appendChild(wa.cloneNode(true));
      var label = document.createElement("span");
      label.textContent = "Agendar esta turma";
      a.appendChild(label);
      row.appendChild(a);
    });
  }
  if (rows.length && hasIO && !reduce) {
    root.classList.add("sch-anim");
    var queue = [], busy = false;
    var next = function () {
      var row = queue.shift();
      if (!row) { busy = false; return; }
      busy = true;
      row.classList.add("is-in");
      setTimeout(next, 120);
    };
    var io = new IntersectionObserver(function (entries) {
      entries.filter(function (en) { return en.isIntersecting; })
        .sort(function (a, b) { return rows.indexOf(a.target) - rows.indexOf(b.target); })
        .forEach(function (en) { io.unobserve(en.target); queue.push(en.target); });
      if (!busy) next();
    }, { threshold: 0.15, rootMargin: "0px 0px -4% 0px" });
    rows.forEach(function (row) { io.observe(row); });
  }

  /* 3) equipe: a faixa amarra, um professor depois do outro (60 ms entre eles) */
  var people = [].slice.call(document.querySelectorAll(".tm"));
  if (people.length && hasIO && !reduce) {
    root.classList.add("tm-anim");
    var tq = [], tbusy = false;
    var tnext = function () {
      var el = tq.shift();
      if (!el) { tbusy = false; return; }
      tbusy = true;
      el.classList.add("is-in");
      setTimeout(tnext, 60);
    };
    var tio = new IntersectionObserver(function (entries) {
      entries.filter(function (en) { return en.isIntersecting; })
        .sort(function (a, b) { return people.indexOf(a.target) - people.indexOf(b.target); })
        .forEach(function (en) { tio.unobserve(en.target); tq.push(en.target); });
      if (!tbusy) tnext();
    }, { threshold: 0.3 });
    people.forEach(function (p) { tio.observe(p); });
  }

  /* o botão de agendar do próprio bloco está na tela: a barra do celular sai da frente (para não repetir o mesmo botão) */
  var books = [].slice.call(document.querySelectorAll(".book .btn--solid"));
  if (books.length && hasIO) {
    var seen = [];
    var bio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var i = seen.indexOf(en.target);
        if (en.isIntersecting && i < 0) seen.push(en.target);
        if (!en.isIntersecting && i >= 0) seen.splice(i, 1);
      });
      document.body.classList.toggle("book-in-view", seen.length > 0);
    }, { threshold: 0.6 });
    books.forEach(function (b) { bio.observe(b); });
  }

  /* 5) telefone de exemplo: o número é fictício, então o toque explica em vez de discar */
  var toast = null, toastTimer = 0;
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href^="tel:"]');
    if (!a) return;
    ev.preventDefault();
    if (!toast) {
      toast = document.createElement("p");
      toast.className = "ex-toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.textContent = "Telefone de exemplo: no site da sua academia, este botão liga para o número dela.";
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-on"); }, 5000);
  }, true);
})();
