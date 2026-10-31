/* Follow The Smoke Memphis BBQ — preview (L0716).
   Agenda "This week" (agenda.json, fuso America/New_York), trilha de fumaça (SVG que se desenha com a rolagem),
   painel "next stop", barra fixa do celular, formulário de catering (na prévia não envia nada).
   O núcleo (agenda, trilha por scroll, barra fixa, formulário) roda sozinho e NÃO espera nenhuma CDN.
   GSAP + ScrollTrigger (e Lenis no computador) são carregados por aqui, em paralelo e sem bloquear: se chegarem,
   a trilha passa a usar scrub do ScrollTrigger e entra o parallax leve; se não chegarem, a página funciona igual.
   Com prefers-reduced-motion: nada de GSAP, tudo aparece parado e completo. Sem marquee, sem cursor customizado. */
(function () {
  'use strict';
  var d = document, root = d.documentElement, W = window;
  var reduce = !!(W.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  if (W.__rv) clearTimeout(W.__rv);
  if (reduce) root.classList.add('reduce');
  if (saveData) root.classList.add('save-data');

  var CFG = {
    FORM_KEY: '',                       // [CONFIRMAR] chave Web3Forms (dev-backend). Vazia = prévia: o formulário não envia nada.
    FORM_URL: 'https://api.web3forms.com/submit',
    AGENDA: 'agenda.json',
    IG_URL: 'https://www.instagram.com/followthesmokebbq/',
    IG_USER: 'followthesmokebbq',
    TZ: 'America/New_York',
    NAME: 'Follow The Smoke Memphis BBQ',
    GSAP: 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js',
    ST: 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js',
    LENIS: 'https://cdn.jsdelivr.net/npm/lenis@1.3.4/dist/lenis.min.js'
  };

  var $ = function (i) { return d.getElementById(i); };
  var q = function (s, c) { return [].slice.call((c || d).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var haveGsap = false;

  /* o painel só espera o JS no site final (data-live); nunca mais de 1,5 s */
  var ready = function () { root.classList.add('agenda-ready'); };
  setTimeout(ready, 1500);

  /* ---------- altura da faixa de prévia (para o topo ocupar exatamente a tela) ---------- */
  var draft = q('.draft')[0];
  function setDraft() {
    var h = draft && draft.offsetParent !== null ? draft.offsetHeight : 0;
    root.style.setProperty('--draft-h', h + 'px');
  }
  setDraft();
  W.addEventListener('resize', setDraft);

  /* ---------- tempo no fuso do trailer ---------- */
  var DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var fmtNY = null;
  function nowNY() {
    try {
      fmtNY = fmtNY || new Intl.DateTimeFormat('en-US', { timeZone: CFG.TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
      var o = {};
      fmtNY.formatToParts(new Date()).forEach(function (x) { o[x.type] = x.value; });
      return { y: +o.year, m: +o.month, d: +o.day, min: (+o.hour % 24) * 60 + (+o.minute) };
    } catch (e) {
      var t = new Date();
      return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate(), min: t.getHours() * 60 + t.getMinutes() };
    }
  }
  function pad(n) { return ('0' + n).slice(-2); }
  function isoOf(y, m, dd) { return y + '-' + pad(m) + '-' + pad(dd); }
  function wd(iso) { var a = iso.split('-'); return new Date(Date.UTC(+a[0], +a[1] - 1, +a[2])).getUTCDay(); }
  function mins(t) { var a = String(t).split(':'); return +a[0] * 60 + +a[1]; }
  function t12(t) { var a = String(t).split(':'), h = +a[0], m = a[1], s = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + (m === '00' ? '' : ':' + m) + ' ' + s; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dayOf(x) { return x.date ? wd(x.date) : x.weekday; }
  function mapsUrl(s) {
    var place = s.place || s.name;
    if (s.address) return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(place + ', ' + s.address);
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(place);
  }

  /* ---------- revelar (só opacidade e deslocamento leve; texto nunca com máscara) ---------- */
  var io = null;
  function reveal(scope) {
    var els = q('.rv:not(.in)', scope);
    if (reduce || !('IntersectionObserver' in W)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    if (!io) {
      io = new IntersectionObserver(function (es) {
        var k = 0;
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var t = e.target;
          t.style.transitionDelay = (k++ * 90) + 'ms';
          t.classList.add('in');
          io.unobserve(t);
          setTimeout(function () { t.style.transitionDelay = ''; }, 1400);
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    }
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- a trilha de fumaça ---------- */
  var T = { ol: null, svg: null, items: [], base: null, glow: null, core: null, head: null, len: 0, lens: [], tween: null, scrollFn: null };
  var NS = 'http://www.w3.org/2000/svg';

  function trailRaw() {
    var r = T.ol.getBoundingClientRect();
    return clamp((innerHeight * 0.62 - r.top) / Math.max(r.height, 1), 0, 1);
  }
  function trailSet(p) {
    if (!T.core || !T.len) return;
    var off = T.len * (1 - p);
    T.glow.style.strokeDashoffset = off;
    T.core.style.strokeDashoffset = off;
    var pt = T.core.getPointAtLength(T.len * p);
    T.head.setAttribute('cx', pt.x);
    T.head.setAttribute('cy', pt.y);
    T.head.style.opacity = reduce ? 0 : 1;
    var at = T.len * p;
    T.items.forEach(function (li, i) { li.classList.toggle('reached', reduce || at >= (T.lens[i] || 0) - 1); });
  }
  function trailMeasure() {
    if (!T.ol || !T.svg) return;
    var H = T.ol.offsetHeight, Wd = 56;
    T.svg.setAttribute('viewBox', '0 0 ' + Wd + ' ' + H);
    T.svg.style.height = H + 'px';
    var ys = T.items.map(function (li) { var nd = li.querySelector('.node'); return li.offsetTop + nd.offsetTop + nd.offsetHeight / 2; });
    var pts = [[28, 0]].concat(ys.map(function (y) { return [28, y]; }));
    var dd = 'M28 0';
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], m = (b[1] - a[1]) / 2;
      dd += ' C ' + (28 + (i % 2 ? 22 : -22)) + ' ' + (a[1] + m * 0.55) + ' ' + (28 + (i % 2 ? -22 : 22)) + ' ' + (b[1] - m * 0.55) + ' 28 ' + b[1];
    }
    [T.base, T.glow, T.core].forEach(function (p) { p.setAttribute('d', dd); });
    T.svg.querySelector('#fire').setAttribute('y2', H);
    T.len = T.core.getTotalLength();
    [T.glow, T.core].forEach(function (p) { p.style.strokeDasharray = T.len; });
    // comprimento do traço em que cada nó fica (o caminho só desce, então a busca binária serve)
    T.lens = ys.map(function (y) {
      var lo = 0, hi = T.len;
      for (var k = 0; k < 26; k++) { var mid = (lo + hi) / 2; if (T.core.getPointAtLength(mid).y < y) lo = mid; else hi = mid; }
      return hi;
    });
    trailSet(reduce ? 1 : trailRaw());
  }
  function trailUnbind() {
    if (T.tween) { if (T.tween.scrollTrigger) T.tween.scrollTrigger.kill(); T.tween.kill(); T.tween = null; }
    if (T.scrollFn) { W.removeEventListener('scroll', T.scrollFn); T.scrollFn = null; }
  }
  function trailBind() {
    trailUnbind();
    if (reduce || !T.core) return;
    if (haveGsap) {   // scrub do ScrollTrigger: a ponta de brasa acompanha a rolagem com um leve atraso
      var proxy = { p: trailRaw() };
      T.tween = gsap.to(proxy, {
        p: 1, ease: 'none',
        scrollTrigger: { trigger: T.ol, start: 'top 62%', end: 'bottom 62%', scrub: 0.5 },
        onUpdate: function () { trailSet(proxy.p); }
      });
    } else {          // sem GSAP: o mesmo desenho, direto da posição de rolagem
      var tick = false;
      T.scrollFn = function () { if (tick) return; tick = true; requestAnimationFrame(function () { tick = false; trailSet(trailRaw()); }); };
      W.addEventListener('scroll', T.scrollFn, { passive: true });
    }
  }
  function trailBuild() {
    trailUnbind();
    T.ol = $('stops');
    if (!T.ol) return;
    var old = T.ol.querySelector('.trail');
    if (old) old.remove();
    T.items = q('.stop', T.ol);
    if (!T.items.length) return;
    var svg = d.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'trail');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = '<defs><linearGradient id="fire" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D52B1E"/><stop offset=".5" stop-color="#F26B1D"/><stop offset="1" stop-color="#FDB515"/></linearGradient></defs><path class="base"/><path class="glow"/><path class="core"/><circle class="head" r="5"/>';
    T.ol.insertBefore(svg, T.ol.firstChild);
    T.svg = svg;
    T.base = svg.querySelector('.base'); T.glow = svg.querySelector('.glow'); T.core = svg.querySelector('.core'); T.head = svg.querySelector('.head');
    if (!reduce) T.ol.classList.add('js-trail');
    trailMeasure();
    trailBind();
  }
  var rzT = 0;
  W.addEventListener('resize', function () { clearTimeout(rzT); rzT = setTimeout(trailMeasure, 120); });
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { trailMeasure(); if (haveGsap) ScrollTrigger.refresh(); });

  /* ---------- agenda ---------- */
  var A = { data: null, sig: '', live: [], nx: null };
  function compute(data) {
    var n = nowNY(), today = isoOf(n.y, n.m, n.d);
    var all = (data.days || []).filter(function (x) { return !x.closed; });
    if (data.sample) {
      // Semana de exemplo: não depende do relógio. Ordem do JSON, só o dia da semana, nada de "Today" nem "Serving now".
      var ex = all.map(function (x) { var o = {}; for (var k in x) o[k] = x[k]; if (o.weekday == null && o.date) o.weekday = wd(o.date); o.date = ''; return o; });
      return { n: n, today: today, sample: true, live: ex, nx: ex[0] || null, isT: false, serving: false };
    }
    var list = all.map(function (x) {
      var o = {}; for (var k in x) o[k] = x[k];
      var s = mins(o.start), e = mins(o.end); if (e <= s) e += 1440;
      o._s = s; o._e = e; return o;
    }).filter(function (x) { return x.date; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a._s - b._s; });
    var live = list.filter(function (x) { return x.date > today || (x.date === today && n.min < x._e); });
    var nx = live[0] || null, isT = !!nx && nx.date === today;
    return { n: n, today: today, sample: false, live: live, nx: nx, isT: isT, serving: isT && n.min >= nx._s && n.min < nx._e };
  }
  function listHtml(st) {
    var ICONS = { sun: 1, drop: 1, night: 1, plate: 1 };
    return st.live.map(function (x, i) {
      var ic = ICONS[x.icon] ? x.icon : 'sun', isT = !st.sample && x.date === st.today, a = x.date ? x.date.split('-') : null;
      return '<li class="stop rv' + (i === 0 ? ' next-one' : '') + (isT ? ' is-today' : '') + '">' +
        '<span class="node"><img src="img/picto-' + ic + '.svg" alt="" width="48" height="48"></span>' +
        '<div class="body"><div class="day"><span class="dow">' + (isT ? 'Today' : DOW[dayOf(x)]) + '</span>' + (a ? '<span class="date">' + MON[+a[1] - 1] + ' ' + (+a[2]) + '</span>' : '') + '</div>' +
        '<div class="name">' + esc(x.name) + '</div>' +
        '<div class="when">' + t12(x.start) + ' – ' + t12(x.end) + '</div>' +
        (x.address ? '<div class="addr">' + esc(x.address) + '</div>' : '') +
        (x.note ? '<div class="addr">' + esc(x.note) + '</div>' : '') +
        '<a class="dir" href="' + esc(mapsUrl(x)) + '" target="_blank" rel="noopener" aria-label="Directions to ' + esc(x.name) + '">Directions <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18 18 6M8 6h10v10"/></svg></a></div></li>';
    }).join('');
  }
  function setText(el, t) { if (el && el.textContent !== t) el.textContent = t; }
  function setLink(el, href, ext) { if (!el) return; el.setAttribute('href', href); if (ext) { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener'); } }

  function paint(st) {
    var nx = st.nx, next = $('next'), dot = $('dot'), dock = $('dockgo'), find = $('find-next');
    next.classList.toggle('between', !nx);
    if (!nx) { // sem paradas futuras
      setText($('nstat'), 'Between weeks'); setText($('npl'), 'Follow @' + CFG.IG_USER); setText($('ntm'), '');
      dot.className = 'dot off';
      setLink(next, CFG.IG_URL, true); next.setAttribute('aria-label', 'Between weeks. Follow ' + CFG.IG_USER + ' on Instagram.');
      setText(dock, 'Instagram'); setLink(dock, CFG.IG_URL, true);
      if (find) { find.closest('li').hidden = true; }
      return;
    }
    var url = mapsUrl(nx), when = t12(nx.start) + ' – ' + t12(nx.end), label, tm, aria;
    if (st.sample) {   // exemplo: nada de "Today" / "Serving now" nem ponto pulsando
      label = 'Example stop';
      tm = 'Example: ' + DOW[dayOf(nx)] + '  ' + when;
      aria = 'Example stop: ' + nx.name + ', ' + DOW[dayOf(nx)] + ' ' + when.replace(' – ', ' to ') + '. Open directions.';
      dot.className = 'dot off';
    } else {
      label = st.serving ? 'Serving now' : (st.isT ? 'Today' : 'Next stop');
      tm = (st.isT ? 'TODAY' : DOW[dayOf(nx)]) + '  ' + when;
      aria = label + ': ' + nx.name + ', ' + (st.isT ? 'today' : DOW[dayOf(nx)]) + ' ' + when.replace(' – ', ' to ') + '. Open directions.';
      dot.className = 'dot' + (st.serving || st.isT ? '' : ' off');
    }
    setText($('nstat'), label);
    setText($('npl'), nx.name);
    setText($('ntm'), tm);
    setLink(next, url, true);
    next.setAttribute('aria-label', aria);
    setText(dock, st.sample ? 'Example directions' : 'Directions'); setLink(dock, url, true);
    if (find) { find.closest('li').hidden = false; setLink(find, url, true); setText($('find-sub'), (st.sample ? 'Example stop: ' : '') + nx.name); }
  }

  function renderAgenda(data) {
    A.data = data;
    var st = compute(data); A.live = st.live; A.nx = st.nx;
    var sig = (st.sample ? 'S' : st.today) + '|' + st.live.map(function (x) { return (x.date || x.weekday) + x.name + x.start + x.end; }).join(',');
    var sample = $('sample'); if (sample) sample.hidden = !data.sample;
    var share = $('share'); if (share) share.hidden = !!data.sample;      // exemplo não se compartilha
    paint(st);
    ready();
    if (sig === A.sig) return;
    A.sig = sig;
    var ol = $('stops'), end = $('endnote');
    if (st.live.length) {
      ol.innerHTML = listHtml(st);
      reveal(ol);
      trailBuild();
    } else {
      trailUnbind(); ol.innerHTML = ''; ol.classList.remove('js-trail');
    }
    end.hidden = false;
    if (haveGsap) ScrollTrigger.refresh();
  }

  function loadAgenda() {
    var fb = function () { var el = $('agenda-fallback'); try { var j = el && JSON.parse(el.textContent); return j && j.days ? j : null; } catch (e) { return null; } };
    return fetch(CFG.AGENDA, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('agenda'); return r.json(); }).catch(fb);
  }

  loadAgenda().then(function (data) {
    if (!data) { ready(); reveal(d); trailBuild(); return; }   // fica a semana escrita no HTML
    renderAgenda(data);
    reveal(d);
    setInterval(function () { if (!d.hidden) renderAgenda(A.data); }, 60000);   // M6: o rótulo "Serving now" se atualiza (só fora do exemplo)
    d.addEventListener('visibilitychange', function () { if (!d.hidden) renderAgenda(A.data); });
  });

  /* ---------- barra do topo (computador) e barra fixa (celular) ---------- */
  var bar = $('bar'), dock = $('dock'), hero = q('.hero')[0];
  var sT = false;
  function onScroll() { if (sT) return; sT = true; requestAnimationFrame(function () { sT = false; bar.classList.toggle('stuck', (W.pageYOffset || root.scrollTop) > 40); }); }
  W.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if ('IntersectionObserver' in W && hero) {
    new IntersectionObserver(function (e) { dock.classList.toggle('on', !e[0].isIntersecting); }, { threshold: 0.05 }).observe(hero);
  } else { dock.classList.add('on'); }

  /* ---------- rodapé: os fios de fumaça só andam quando estão na tela ---------- */
  var art = q('.foot-art')[0];
  if (art && 'IntersectionObserver' in W) new IntersectionObserver(function (e) { art.classList.toggle('live', e[0].isIntersecting); }).observe(art);

  /* ---------- "Send this week to a friend" (só com a semana real) ---------- */
  var shareBtn = $('share');
  if (shareBtn) shareBtn.addEventListener('click', function () {
    if (A.data && A.data.sample) return;
    var lines = A.live.map(function (x) {
      var a = x.date.split('-');
      return DOW[dayOf(x)] + ' ' + MON[+a[1] - 1] + ' ' + (+a[2]) + ': ' + x.name + ', ' + t12(x.start) + ' – ' + t12(x.end);
    });
    var text = 'This week with ' + CFG.NAME + (lines.length ? ':\n' + lines.join('\n') : '') + '\n';
    var note = $('shared');
    var say = function (t) { if (note) { note.textContent = t; note.hidden = false; } };
    if (navigator.share) {
      navigator.share({ title: CFG.NAME, text: text, url: location.href }).catch(function () {});
      return;
    }
    var full = text + location.href;
    var fallback = function () {
      var ta = d.createElement('textarea'); ta.value = full; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      d.body.appendChild(ta); ta.select();
      var ok = false; try { ok = d.execCommand('copy'); } catch (e) {}
      d.body.removeChild(ta); say(ok ? 'Copied. Paste it in a text.' : 'Copy this: ' + full);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(full).then(function () { say('Copied. Paste it in a text.'); }, fallback);
    else fallback();
  });

  /* ---------- catering ---------- */
  var f = $('cater-form');
  if (f) {
    var dateEl = f.elements.date;
    if (dateEl) { var n0 = nowNY(); dateEl.min = isoOf(n0.y, n0.m, n0.d); }
    var msg = $('cater-msg');
    var show = function (t) { msg.textContent = t; msg.hidden = false; };
    f.addEventListener('focusin', function () { dock.classList.add('typing'); });
    f.addEventListener('focusout', function () { dock.classList.remove('typing'); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (f.elements.botcheck && f.elements.botcheck.checked) return;          // honeypot
      if (!CFG.FORM_KEY) { show('Preview only, not connected yet: this form doesn\'t send anything.'); return; }
      var btn = f.querySelector('button[type=submit]');
      btn.disabled = true; show('Sending...');
      var fd = new FormData(f);
      fd.append('access_key', CFG.FORM_KEY);
      fd.append('subject', 'Catering request from the Follow The Smoke website');
      fd.append('from_name', CFG.NAME + ' website');
      fetch(CFG.FORM_URL, { method: 'POST', body: fd }).then(function (r) { return r.json(); }).then(function (j) {
        if (j && j.success) { show('Got it. We\'ll be in touch.'); f.reset(); }
        else throw new Error('form');
      }).catch(function () { show('Something went wrong. Message us on Instagram instead.'); }).then(function () { btn.disabled = false; });
    });
  }

  reveal(d);

  /* ---------- extras que dependem de CDN: parallax e scrub (GSAP + ScrollTrigger) e Lenis no computador ---------- */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = d.createElement('script');
      s.src = src; s.async = true; s.onload = res; s.onerror = rej;
      d.head.appendChild(s);
    });
  }
  function bootGsap() {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    haveGsap = true;
    var mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      var H = function () { return hero.offsetHeight; };
      var st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true };
      gsap.fromTo('.hero-copy', { y: 0 }, { y: function () { return -H() * 0.08; }, ease: 'none', scrollTrigger: st });
      gsap.fromTo('.photo', { y: 0 }, { y: function () { return H() * 0.06; }, ease: 'none', scrollTrigger: st });
      gsap.fromTo('.smoke', { y: 0 }, { y: function () { return -H() * 0.14; }, ease: 'none', scrollTrigger: st });
      q('.shot').forEach(function (fig) {
        var p = +fig.getAttribute('data-p') || 24;
        gsap.fromTo(fig, { y: p }, { y: -p, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
      });
    });
    if (T.core) trailBind();            // a trilha passa do scroll direto para o scrub do ScrollTrigger
    ScrollTrigger.refresh();
    if (matchMedia('(min-width:900px) and (pointer:fine)').matches) {
      loadScript(CFG.LENIS).then(function () {
        if (!W.Lenis) return;
        var lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
        gsap.ticker.lagSmoothing(0);
        d.addEventListener('click', function (ev) {
          var a = ev.target.closest && ev.target.closest('a[href^="#"]');
          if (!a) return;
          var id = a.getAttribute('href').slice(1), el = id ? d.getElementById(id) : root;
          if (!el) return;
          ev.preventDefault();
          lenis.scrollTo(!id || id === 'top' ? 0 : el, { offset: !id || id === 'top' ? 0 : -76, duration: 1.1 });
        });
      }).catch(function () {});
    }
  }
  if (!reduce && !saveData) {
    Promise.all([loadScript(CFG.GSAP), loadScript(CFG.ST)]).then(function () {
      if (W.gsap && W.ScrollTrigger) bootGsap();
    }).catch(function () {});
  }
})();
