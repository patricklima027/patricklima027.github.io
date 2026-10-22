/* Cadeira Cativa Barbearia (modelo-br-barbearia) — custom.js, carregado depois do main.js e do extras.js.
   Tudo aqui é acréscimo: sem JS, ou com "reduzir movimento", a comanda aparece parada e completa (total já somado, carimbo no lugar).
   1. relógio da comanda no fuso de São Paulo;
   2. comanda "imprimindo": o cabeçalho, cada linha de cima para baixo (70 ms), o total contando de 0 até o valor e o carimbo caindo;
   3. comanda que se monta: tocar numa linha marca com X, soma o total e leva a lista pronta para a mensagem do WhatsApp
      (os botões de agendar da página inteira passam a levar a comanda);
   0. topo: o script "fiado só amanhã" entra por último, com um balanço de 1,5° (uma vez);
   4. equipe: o número da cadeira acende quando a linha entra e cada barbeiro tem o seu botão "Marcar com ...";
   5. o Clube entra linha por linha;
   6. avisos do exemplo (22/10/2026, QA): o botão abre o WhatsApp para escolher o contato; o telefone e o endereço são de exemplo (links tel: desligados);
      aviso de bebida (maiores de 18) nas linhas do chope; leitor de tela lê o título do topo na ordem certa.
   A comanda interativa é só uma demonstração deste exemplo (não é o sistema de agendamento do cliente). */
(function () {
  var root = document.documentElement;
  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var hasIO = "IntersectionObserver" in window;
  var animate = hasIO && !reduce;
  /* revisão (não muda nada no site publicado): ?slow=0.15 desacelera o GSAP, as animações CSS e os tempos daqui para conferir quadro a quadro */
  var slowM = location.search.match(/[?&]slow=([\d.]+)/);
  var K = slowM ? Math.max(0.02, parseFloat(slowM[1])) : 1;
  if (slowM) {
    var slowCss = document.createElement("style");
    slowCss.textContent = ".slip .mr, .slip-head, .slip-sub, .slip-hint, .mc-title, .mc-note, .slip-total, .slip-foot { transition-duration: " + (0.25 / K) + "s !important } .slip-stamp { transition-duration: " + (0.2 / K) + "s !important }";
    document.head.appendChild(slowCss);
    (function slowDown(n) {
      if (window.gsap) window.gsap.globalTimeline.timeScale(K);
      if (document.getAnimations) document.getAnimations().forEach(function (a) { try { a.playbackRate = K; } catch (e) {} });
      if (n < 60) setTimeout(function () { slowDown(n + 1); }, 250);
    })(0);
  }

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
  function brl(n) { return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function parsePrice(txt) {
    var m = String(txt).replace(/\./g, "").match(/(\d+)(?:,(\d{1,2}))?/);
    return m ? parseFloat(m[1] + "." + (m[2] || "0")) : 0;   // "cortesia" vira 0
  }
  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
  function countTo(el, from, to, ms, fmt, done) {
    if (reduce || ms <= 0) { el.textContent = fmt(to); if (done) done(); return; }
    ms = ms / K;
    var start = null;
    (function step(now) {
      if (start === null) start = now;
      var p = Math.min(1, (now - start) / ms);
      el.textContent = fmt(from + (to - from) * easeOut(p));
      if (p < 1) requestAnimationFrame(step); else { el.textContent = fmt(to); if (done) done(); }
    })(performance.now());
  }

  /* rede de segurança das entradas por rolagem: o IntersectionObserver pode perder um item quando a pessoa rola muito rápido (arrastão, âncora);
     todo item que já ficou acima da borda de baixo da tela entra mesmo assim, na próxima rolagem */
  function catchUp(list, enter, margin) {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        list.forEach(function (el) { if (!el._in && el.getBoundingClientRect().top < window.innerHeight * (margin || 0.96)) enter(el); });
      });
    }, { passive: true });
  }

  /* ---------- 6) avisos do exemplo e acessibilidade ---------- */
  var h1 = $(".hero-title");
  if (h1) h1.setAttribute("aria-label", "Cadeira Cativa, fiado só amanhã");   // sem isso o leitor de tela lê "Cadeira fiado só amanhã Cativa"
  var EX_WA = "Neste exemplo o botão abre o WhatsApp para você escolher o contato. No site da sua barbearia ele vai direto para o seu número.";
  function exNote() { var p = document.createElement("p"); p.className = "ex-wa"; p.textContent = EX_WA; return p; }
  // o aviso do WhatsApp de exemplo está escrito no site.json (subtítulo do topo, notas da comanda e do Clube, legenda do bilhete do contato e rodapé),
  // então vale mesmo sem JS; aqui o do topo só muda de lugar: sai do subtítulo e vai para baixo dos botões
  var heroSub = $(".hero-sub");
  var heroActions = $(".hero-actions");
  if (heroSub && heroActions && heroSub.textContent.indexOf(EX_WA) > -1) {
    heroSub.textContent = heroSub.textContent.replace(EX_WA, "").replace(/\s+$/, "");
    heroActions.appendChild(exNote());
  }
  var ovCta = $(".ov-cta");
  if (ovCta) ovCta.appendChild(exNote());
  var ovSide = $(".ov-side");
  if (ovSide) { var en = document.createElement("p"); en.className = "ex-note"; en.textContent = "Endereço e telefone de exemplo."; ovSide.appendChild(en); }
  // "Como chegar" abriria o Google Maps numa rua que pode existir: o botão e o link do mapa saem do HTML e o mapa ganha uma legenda de texto
  $$(".v-actions").forEach(function (n) { n.remove(); });
  $$(".vmap-go").forEach(function (n) { var t = document.createElement("span"); t.className = "vmap-ex"; t.textContent = "Mapa de exemplo"; n.replaceWith(t); });
  // telefone de exemplo: o link tel: sai do ar (o número (27) 90000-0000 não existe)
  $$('a[href^="tel:"]').forEach(function (a) { a.removeAttribute("href"); a.setAttribute("aria-disabled", "true"); a.classList.add("is-inert"); });

  /* ---------- 0) o script do topo entra depois do título, com um balanço (CSS: .script-wait / .script-go) ---------- */
  var heroScript = $(".hero .hl--script");
  var forPrint = /[?&]noloader/.test(location.search);   // prints.py --com-movimento usa ?noloader=1 e fotografa o estado final: o script já vem no lugar
  if (heroScript && animate && window.gsap && !forPrint) {
    root.classList.add("script-wait");
    var waited = 0;
    var poll = setInterval(function () {
      waited += 80;
      var chars = $$(".hero-title .hl:not(.hl--script) .sp-c"), last = chars[chars.length - 1];
      var titleDone = last && parseFloat(getComputedStyle(last).opacity) >= 0.97 && waited > 400;
      if (titleDone || waited > 7000 / K) {
        clearInterval(poll);
        setTimeout(function () { root.classList.remove("script-wait"); root.classList.add("script-go"); }, 120 / K);
      }
    }, 80);
  }

  /* ---------- WhatsApp: mensagem pronta (a do botão principal) ---------- */
  var waLinks = $$('a[href^="https://wa.me/"]');
  var defaultHref = waLinks.length ? waLinks[0].getAttribute("href") : "";
  var defaultText = "";
  try { defaultText = decodeURIComponent((defaultHref.split("?text=")[1] || "")); } catch (e) {}
  waLinks.forEach(function (a) { a.setAttribute("data-wa-default", a.getAttribute("href")); });
  var order = { names: [], total: 0, club: false, active: false };

  function message(barber) {
    var text = defaultText;
    if (!text) return "";
    if (barber) text = text.replace(/Fala, [^!]+!/, "Fala, " + barber + "!").replace("quero marcar.", "quero marcar com você.");
    if (order.active && order.names.length) {
      var what = order.names.join(" + ") + (order.total > 0 ? " (" + brl(order.total) + (order.club ? ", clube cobrado por mês" : "") + ")" : "");
      text = text.replace(/Serviço ou combo:[ ]*/, "Serviço ou combo: " + what);
    }
    return text;
  }
  function hrefFor(barber) { return "https://wa.me/?text=" + encodeURIComponent(message(barber)); }
  function refreshLinks() {
    waLinks.forEach(function (a) {
      if (a.hasAttribute("data-barber")) { a.setAttribute("href", hrefFor(a.getAttribute("data-barber"))); return; }
      a.setAttribute("href", order.active && order.names.length ? hrefFor() : a.getAttribute("data-wa-default"));
    });
    var mb = $(".mbar .mb-1");
    if (mb) {
      var node = mb.lastChild;
      if (node && node.nodeType === 3) {
        if (!mb.hasAttribute("data-label")) mb.setAttribute("data-label", node.textContent);
        node.textContent = order.active && order.total > 0 ? "Agendar · " + brl(order.total) : mb.getAttribute("data-label");
      }
    }
  }

  /* ---------- 1) relógio da comanda: ao vivo só dentro do horário da loja; fora dele, uma hora fixa marcada como exemplo ---------- */
  var nowEl = $("[data-now]");
  var siteData = {};
  try { siteData = JSON.parse(document.getElementById("site-data").textContent); } catch (e) {}
  var DOW = { Sun: "Su", Mon: "Mo", Tue: "Tu", Wed: "We", Thu: "Th", Fri: "Fr", Sat: "Sa" };
  function clock() {
    if (!nowEl || !window.Intl || !Intl.DateTimeFormat) return;
    try {
      var tz = siteData.tz || "America/Sao_Paulo";
      var parts = new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      var en = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(new Date());
      var get = function (t) { var p = parts.filter(function (x) { return x.type === t; })[0]; return p ? p.value : ""; };
      var h = get("hour"); if (h === "24") h = "00";
      var minutes = parseInt(h, 10) * 60 + parseInt(get("minute"), 10);
      var open = ((siteData.hours || {})[DOW[en]] || []).some(function (r) {
        var o = r[0].split(":"), c = r[1].split(":");
        return minutes >= (+o[0]) * 60 + (+o[1]) && minutes < (+c[0]) * 60 + (+c[1]);
      });
      nowEl.textContent = open ? get("weekday").replace(".", "") + " · " + h + "h" + get("minute") : "ter · 17h40 (exemplo)";
    } catch (e) {}
  }
  clock();
  setInterval(clock, 20000);

  /* ---------- 2 e 3) a comanda ---------- */
  var slip = $(".slip");
  var totalEl = slip && $(".slip-total", slip), totalNum = totalEl && $("b", totalEl), totalLabel = totalEl && $("span", totalEl);
  var comboRow = null, chopRow = null;
  var shown = 0, target = totalNum ? parsePrice(totalNum.getAttribute("data-total")) : 0;
  var live = null;

  if (slip && totalNum) {
    var rows = $$(".mr", slip);

    // dica no alto da comanda (só existe com JS, porque só com JS ela é interativa)
    var hint = document.createElement("p");
    hint.className = "slip-hint";
    var sub = $(".slip-sub", slip);
    (sub || $(".slip-head", slip)).insertAdjacentElement("afterend", hint);
    var clubNote = document.createElement("p");
    clubNote.className = "slip-club"; clubNote.hidden = true;
    totalEl.insertAdjacentElement("afterend", clubNote);
    var warnEl = document.createElement("p");   // o Combo Resenha já inclui corte e barba: escolher um corte ou uma barba junto soma por fora
    warnEl.className = "slip-warn"; warnEl.hidden = true;
    warnEl.textContent = "O Combo Resenha já inclui corte e barba. Corte ou barba marcados junto com ele são somados por fora.";
    clubNote.insertAdjacentElement("afterend", warnEl);
    live = document.createElement("span");
    live.className = "sr-only"; live.setAttribute("role", "status"); live.setAttribute("aria-live", "polite");
    slip.appendChild(live);

    var state = rows.map(function (row) {
      var nameEl = $(".mr-name", row);
      var name = (nameEl.firstChild && nameEl.firstChild.nodeType === 3 ? nameEl.firstChild.textContent : nameEl.textContent).trim();
      var cat = row.closest(".mc"), catTitle = cat ? $(".mc-title", cat).textContent : "";
      var o = { row: row, name: name, price: parsePrice($(".mr-price", row).textContent), priceEl: $(".mr-price", row), priceText: $(".mr-price", row).textContent,
                club: /clube/i.test(catTitle), inc: /cortes|barba/i.test(catTitle) && !/^(Pezinho|Sobrancelha)/.test(name), on: false };
      if (name === "Combo Resenha") comboRow = o;
      if (/^Chope/.test(name)) chopRow = o;
      if (/^(Combo Resenha|Chope)/.test(name)) {   // aviso de bebida alcoólica (texto no site.json): o trecho ganha tinta cheia e negrito
        var dsc = $(".mr-desc", row), ALC = "Só para maiores de 18. Beba com moderação.";
        if (dsc && dsc.textContent.indexOf(ALC) > -1) {
          var before = dsc.textContent.replace(ALC, "").replace(/\s+$/, "");
          dsc.textContent = before + " ";
          var b = document.createElement("b"); b.className = "mr-alc"; b.textContent = ALC; dsc.appendChild(b);
        }
      }
      row.setAttribute("role", "checkbox"); row.setAttribute("tabindex", "0"); row.setAttribute("aria-checked", "false");
      return o;
    });
    $$(".mc-rows", slip).forEach(function (ul) { ul.setAttribute("role", "group"); ul.setAttribute("aria-label", $(".mc-title", ul.closest(".mc")).textContent.replace(/^\d+/, "")); });

    var demo = true;
    var setHint = function () {
      var count = state.filter(function (s) { return s.on; }).length;
      hint.textContent = demo ? "Exemplo de comanda. Toca nos itens pra montar a sua." : (count ? "Sua comanda. Toca pra tirar ou somar." : "Toca nos itens pra montar a sua comanda.");
    };
    var compute = function () {
      var on = state.filter(function (s) { return s.on; });
      var total = 0, club = false;
      on.forEach(function (s) {
        var price = s.price;
        if (s === chopRow && comboRow && comboRow.on) price = 0;   // o chope é de graça no Combo Resenha
        total += price; if (s.club) club = true;
      });
      state.forEach(function (s) {
        if (s !== chopRow) return;
        var free = s.on && comboRow && comboRow.on;
        s.priceEl.textContent = free ? "grátis" : s.priceText;
        s.priceEl.classList.toggle("is-free", !!free);
      });
      warnEl.hidden = !(comboRow && comboRow.on && on.some(function (s) { return s.inc; }));
      order.names = on.map(function (s) { return s.name; });
      order.total = total; order.club = club; order.active = !demo;
      return { on: on, total: total, club: club };
    };
    var render = function (animateTotal) {
      var c = compute();
      var label = "Total";
      if (c.on.length === 1) label += " · " + c.on[0].name; else if (c.on.length > 1) label += " · " + c.on.length + " itens";
      totalLabel.textContent = label;
      clubNote.hidden = !c.club;
      if (c.club) clubNote.textContent = "Inclui o Clube, que é cobrado por mês.";
      setHint();
      var from = shown;
      shown = c.total;
      if (animateTotal) countTo(totalNum, from, c.total, 380, brl, function () { live.textContent = "Total " + brl(c.total) + ", " + c.on.length + (c.on.length === 1 ? " item" : " itens"); });
      else totalNum.textContent = brl(c.total);
      totalNum.setAttribute("data-value", c.total);
      refreshLinks();
    };
    var toggle = function (o) {
      if (demo) {
        demo = false;
        if (o === comboRow) { render(true); return; }   // tocar no exemplo adota o exemplo
        state.forEach(function (s) { s.on = false; s.row.setAttribute("aria-checked", "false"); });
      }
      o.on = !o.on;
      if (o.on && o.club) state.forEach(function (s) { if (s.club && s !== o) { s.on = false; s.row.setAttribute("aria-checked", "false"); } });   // um plano do Clube por vez
      o.row.setAttribute("aria-checked", o.on ? "true" : "false");
      render(true);
    };
    state.forEach(function (o) {
      o.row.addEventListener("click", function () { toggle(o); });
      o.row.addEventListener("keydown", function (ev) { if (ev.key === " " || ev.key === "Enter") { ev.preventDefault(); toggle(o); } });
    });

    // estado inicial: o Combo Resenha marcado, igual ao total do exemplo impresso
    if (comboRow) { comboRow.on = true; comboRow.row.setAttribute("aria-checked", "true"); }
    render(false);
    // o total impresso começa em zero e conta até o valor quando a comanda aparece (sem JS ou com movimento reduzido já fica somado)
    if (animate) totalNum.textContent = brl(0);
  }

  // impressão
  if (slip && animate) {
    root.classList.add("slip-anim");
    var num = $(".slip-num", slip), numFinal = num ? num.textContent : "";
    var stamp = $(".slip-stamp", slip);
    if (num) num.textContent = numFinal.replace(/\d/g, "0");
    var printable = $$(".slip-head, .slip-sub, .slip-hint, .mc-title, .mc-note, .mr, .slip-total, .slip-foot", slip);
    var queue = [], busy = false;
    var drop = function () { if (stamp) stamp.classList.add("is-stamped"); };
    var print = function (el) {
      el.classList.add("is-printed");
      if (el === $(".slip-head", slip) && num) countTo(num, 0, parseInt(numFinal, 10), 650, function (v) { return String(Math.round(v)).padStart(numFinal.length, "0"); });
      if (el === totalEl) countTo(totalNum, 0, shown, 900, brl, function () { setTimeout(drop, 160 / K); });
    };
    var drain = function () {
      var el = queue.shift();
      if (!el) { busy = false; return; }
      busy = true; print(el); setTimeout(drain, 70 / K);
    };
    var enqueue = function (el) {
      if (el._in) return;
      el._in = true; io.unobserve(el); queue.push(el);
      queue.sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
      if (!busy) drain();
    };
    var io = new IntersectionObserver(function (entries) {
      entries.filter(function (en) { return en.isIntersecting; }).forEach(function (en) { enqueue(en.target); });
    }, { threshold: 0.35, rootMargin: "0px 0px -4% 0px" });
    printable.forEach(function (el) { io.observe(el); });
    catchUp(printable, enqueue);
  }

  // computador: título, intro e botão de agendar ficam grudados ao lado da comanda enquanto ela rola (no celular a ordem é título, comanda, botão)
  var menuWrap = $(".menu--comanda > .wrap");
  if (menuWrap && slip && window.matchMedia) {
    var mq = window.matchMedia("(min-width: 1000px)");
    var head = $(":scope > .sec-head", menuWrap), book = $(":scope > .book", menuWrap), note = $(":scope > .menu-note", menuWrap);
    var aside = document.createElement("div");
    aside.className = "menu-aside";
    var layout = function () {
      if (mq.matches) {
        [head, book, note].forEach(function (n) { if (n) aside.appendChild(n); });
        menuWrap.insertBefore(aside, slip);
      } else if (aside.parentNode) {
        if (head) menuWrap.insertBefore(head, aside);
        if (note) slip.insertAdjacentElement("afterend", note);
        if (book) slip.insertAdjacentElement("afterend", book);
        aside.remove();
      }
    };
    layout();
    if (mq.addEventListener) mq.addEventListener("change", layout); else if (mq.addListener) mq.addListener(layout);
  }

  /* ---------- 4) equipe ---------- */
  var team = $$(".tm");
  if (team.length) {
    var icon = $(".hero .btn .icon, .btn--solid .icon");
    team.forEach(function (tm) {
      var name = $(".tm-name", tm).textContent.trim();
      if (!defaultHref) return;
      var a = document.createElement("a");
      a.className = "btn btn--line btn--sm tm-book";
      a.href = hrefFor(name); a.target = "_blank"; a.rel = "noopener"; a.setAttribute("data-barber", name);
      a.setAttribute("data-wa-default", a.href);
      if (icon) a.appendChild(icon.cloneNode(true));
      var label = document.createElement("span");
      label.textContent = "Marcar com o " + name;
      a.appendChild(label);
      tm.appendChild(a);
      waLinks.push(a);
    });
    if (animate) {
      root.classList.add("tm-anim");
      var lightOn = function (tm) { if (tm._in) return; tm._in = true; tio.unobserve(tm); tm.classList.add("is-in"); };
      var tio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) lightOn(en.target); });
      }, { threshold: 0.4 });
      team.forEach(function (tm) { tio.observe(tm); });
      catchUp(team, lightOn);
    }
  }

  /* ---------- 5) o Clube entra linha por linha ---------- */
  var sch = $$(".sch-row");
  if (sch.length && animate) {
    root.classList.add("sch-anim");
    var rowIn = function (r, i) { if (r._in) return; r._in = true; sio.unobserve(r); setTimeout(function () { r.classList.add("is-in"); }, ((i || 0) * 120) / K); };
    var sio = new IntersectionObserver(function (entries) {
      entries.filter(function (en) { return en.isIntersecting; }).forEach(function (en, i) { rowIn(en.target, i); });
    }, { threshold: 0.3, rootMargin: "0px 0px -6% 0px" });
    sch.forEach(function (r) { sio.observe(r); });
    catchUp(sch, rowIn, 0.94);
  }
})();
