/* Layla Ramos, sobrancelha em Aracruz-ES: prévia (L0611).
   Agenda em três passos (serviço, dia, horário) lida de agenda.json (fuso America/Sao_Paulo); a única saída é a
   mensagem pronta no WhatsApp dela (nada é gravado). Traço dourado que se desenha, janelas do olhar com parallax leve,
   frase que acende com a rolagem, painel de confirmação no celular.
   JS puro, sem biblioteca e sem CDN. Com prefers-reduced-motion ou sem JS: tudo aparece parado e completo.
   Nenhum texto corre na horizontal e o ponteiro é o do sistema. */
(function () {
  'use strict';
  var d = document, root = d.documentElement, W = window;
  var reduce = !!(W.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (W.__rv) clearTimeout(W.__rv);
  if (reduce) root.classList.add('reduce');

  var CFG = {
    AGENDA: 'agenda.json',
    TZ: 'America/Sao_Paulo',
    WA_FALLBACK: '5527998687795',          // o mesmo número do bio dela; o JSON pode sobrescrever
    SAMPLE_SUFFIX: ' (teste da prévia do site, horário de exemplo)'
  };

  var $ = function (i) { return d.getElementById(i); };
  var q = function (s, c) { return [].slice.call((c || d).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var pad = function (n) { return ('0' + n).slice(-2); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- altura da faixa de prévia (o topo ocupa exatamente a tela) ---------- */
  var draft = q('.draft')[0];
  function setDraft() {
    var h = draft && draft.offsetParent !== null ? draft.offsetHeight : 0;
    root.style.setProperty('--draft-h', h + 'px');
  }
  setDraft();

  /* ---------- tempo no fuso de Brasília ---------- */
  var WD = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  var WD3 = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  var MO3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var fmtSP = null;
  function nowSP() {
    try {
      fmtSP = fmtSP || new Intl.DateTimeFormat('en-US', { timeZone: CFG.TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
      var o = {};
      fmtSP.formatToParts(new Date()).forEach(function (x) { o[x.type] = x.value; });
      return { y: +o.year, m: +o.month, d: +o.day, min: (+o.hour % 24) * 60 + (+o.minute) };
    } catch (e) {
      var t = new Date();
      return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate(), min: t.getHours() * 60 + t.getMinutes() };
    }
  }
  function dayAt(n, i) {
    var D = new Date(Date.UTC(n.y, n.m - 1, n.d + i));
    var o = { y: D.getUTCFullYear(), m: D.getUTCMonth() + 1, d: D.getUTCDate(), w: D.getUTCDay(), i: i };
    o.iso = o.y + '-' + pad(o.m) + '-' + pad(o.d);
    return o;
  }
  function mins(t) { var a = String(t).split(':'); return +a[0] * 60 + (+a[1] || 0); }
  function hora(t) { var a = String(t).split(':'), h = +a[0], m = +a[1] || 0; return h + 'h' + (m ? pad(m) : ''); }
  function diaLabel(D) { return WD[D.w] + ', ' + pad(D.d) + '/' + pad(D.m); }

  /* ---------- estado ---------- */
  var S = { svc: '', day: '', time: '' };
  var A = null;                 // agenda.json
  var DAYS = [];                // dias calculados (14 a partir de hoje)
  var el = {
    opts: $('opts'), days: $('days'), times: $('times'), tmsg: $('t-msg'),
    s1: $('s1'), s2: $('s2'), s3: $('s3'), line: $('r-line'), traco: $('r-traco'), go: $('confirmar'),
    msg: $('r-msg'), zap: $('zap-direto'), dock: $('dock'), dockT: $('dock-t'), dockGo: $('dock-go'),
    next: $('next'), nextV: $('next-v'), section: $('agendar')
  };
  var services = {};            // id -> { label, short }
  q('input[name=servico]', el.opts).forEach(function (i) {
    services[i.value] = { label: i.getAttribute('data-label') || i.value, short: i.getAttribute('data-short') || i.value };
  });

  function waNumber() { return (A && A.studio && A.studio.whatsapp) || CFG.WA_FALLBACK; }
  function zapUrl(txt) { return 'https://api.whatsapp.com/send?phone=' + waNumber() + (txt ? '&text=' + encodeURIComponent(txt) : ''); }

  function dayByIso(iso) { for (var i = 0; i < DAYS.length; i++) if (DAYS[i].iso === iso) return DAYS[i]; return null; }
  function slotsFor(D, svc) {
    if (!D) return [];
    return D.slots.filter(function (s) {
      if (!s.only || !s.only.length) return true;
      if (!svc) return true;
      return s.only.indexOf(svc) >= 0;
    });
  }

  /* ---------- agenda: calcula os dias e horários ---------- */
  function buildDays(data) {
    var n = nowSP(), H = +data.horizon_days || 14, notice = (+data.min_notice_hours || 0) * 60;
    var blocked = data.blocked || [], byDate = {}, out = [];
    (data.days || []).forEach(function (x) { if (x && x.date) byDate[x.date] = x; });
    for (var i = 0; i < H; i++) {
      var D = dayAt(n, i), raw = null;
      if (blocked.indexOf(D.iso) < 0) {
        if (data.sample) raw = (data.weekly_sample || {})[D.w];
        else if (byDate[D.iso] && !byDate[D.iso].closed) raw = byDate[D.iso].slots;
      }
      D.slots = [];
      (raw || []).forEach(function (s) {
        var o = typeof s === 'string' ? { t: s } : s;
        if (!o || !o.t) return;
        if (i * 1440 + mins(o.t) < n.min + notice) return;   // já passou ou falta pouco para começar
        D.slots.push({ t: o.t, only: o.only || null });
      });
      D.slots.sort(function (a, b) { return mins(a.t) - mins(b.t); });
      out.push(D);
    }
    return out;
  }

  /* ---------- desenho dos dias e horários ---------- */
  function renderDays() {
    el.days.innerHTML = DAYS.map(function (D) {
      var vazio = slotsFor(D, S.svc).length === 0;
      return '<label class="day' + (vazio ? ' vazio' : '') + '" data-iso="' + D.iso + '">' +
        '<input type="radio" name="dia" value="' + D.iso + '"' + (vazio ? ' aria-disabled="true"' : '') + (S.day === D.iso ? ' checked' : '') +
        ' aria-label="' + esc(diaLabel(D) + (vazio ? ', sem horários' : '')) + '">' +
        '<span class="face"><span class="dw">' + WD3[D.w] + '</span><span class="dn">' + D.d + '</span><span class="dm">' + ((D.i === 0 || D.d === 1) ? MO3[D.m - 1] : '') + '</span></span></label>';
    }).join('');
  }
  function refreshDays() {
    q('.day', el.days).forEach(function (lab) {
      var D = dayByIso(lab.getAttribute('data-iso')), vazio = slotsFor(D, S.svc).length === 0, inp = lab.querySelector('input');
      lab.classList.toggle('vazio', vazio);
      if (vazio) inp.setAttribute('aria-disabled', 'true'); else inp.removeAttribute('aria-disabled');
      inp.setAttribute('aria-label', diaLabel(D) + (vazio ? ', sem horários' : ''));
    });
  }
  function renderTimes() {
    var D = dayByIso(S.day);
    if (!D) {
      S.time = '';
      el.times.hidden = true; el.times.innerHTML = '';
      el.tmsg.hidden = false; el.tmsg.textContent = 'Escolha o dia para ver os horários.';
      return;
    }
    var sl = slotsFor(D, S.svc);
    if (S.time && !sl.some(function (s) { return s.t === S.time; })) S.time = '';
    if (!sl.length) {
      el.times.hidden = true; el.times.innerHTML = '';
      el.tmsg.hidden = false;
      el.tmsg.innerHTML = 'Sem horários nesse dia. <a href="' + esc(zapUrl('')) + '" target="_blank" rel="noopener">Chame a Layla no WhatsApp para combinar.</a>';
      return;
    }
    el.tmsg.hidden = true;
    el.times.hidden = false;
    el.times.innerHTML = sl.map(function (s) {
      return '<label class="time"><input type="radio" name="hora" value="' + esc(s.t) + '"' + (S.time === s.t ? ' checked' : '') + '><span class="face">' + hora(s.t) + '</span></label>';
    }).join('');
  }

  /* ---------- mensagem do WhatsApp ---------- */
  function message() {
    var T = (A && A.whatsapp_text) || {}, D = dayByIso(S.day), sv = services[S.svc] || { short: '' };
    var tpl = S.svc === 'duvida'
      ? (T.duvida || 'Oi Layla! Quero agendar um horário no dia {dia} às {hora} e preciso de ajuda para escolher o serviço.')
      : (T['default'] || 'Oi Layla! Quero agendar {servico} no dia {dia} às {hora}.');
    var txt = tpl.split('{servico}').join(sv.short).split('{dia}').join(diaLabel(D)).split('{hora}').join(hora(S.time));
    if (A && A.sample) txt += (T.sample_suffix != null ? T.sample_suffix : CFG.SAMPLE_SUFFIX);
    return txt;
  }

  /* ---------- atualiza tudo que depende da escolha ---------- */
  function update() {
    var c1 = !!S.svc, c2 = !!S.day, c3 = !!S.time, all = c1 && c2 && c3;
    el.s1.classList.toggle('done', c1);
    el.s2.classList.toggle('done', c2);
    el.s3.classList.toggle('done', c3);
    el.opts.classList.toggle('has-pick', c1);
    q('.opt', el.opts).forEach(function (lab) { lab.classList.toggle('on', lab.querySelector('input').checked); });

    var sv = services[S.svc], D = dayByIso(S.day), label = sv ? sv.label : '';
    if (all) {
      el.line.classList.remove('is-empty');
      el.line.textContent = label + ' · ' + diaLabel(D) + ' · ' + hora(S.time);
    } else {
      var miss = []; if (!c1) miss.push('serviço'); if (!c2) miss.push('dia'); if (!c3) miss.push('horário');
      el.line.classList.add('is-empty');
      el.line.textContent = 'Falta escolher: ' + miss.join(', ') + '.';
    }
    el.traco.classList.toggle('on', all);

    var txt = all ? message() : '', url = all ? zapUrl(txt) : '#agendar';
    [el.go, el.dockGo].forEach(function (a) {
      a.setAttribute('href', url);
      a.setAttribute('aria-disabled', all ? 'false' : 'true');
      if (all) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); }
      else { a.removeAttribute('target'); a.removeAttribute('rel'); }
    });
    el.go.setAttribute('data-msg', txt);
    el.msg.hidden = !all;
    el.msg.textContent = all ? '“' + txt + '”' : '';

    var sub = all ? diaLabel(D) + ' · ' + hora(S.time) : (c2 ? 'escolha o horário' : 'escolha o dia');
    el.dockT.innerHTML = '<b>' + esc(label || 'Escolha o serviço') + '</b><span>' + esc(c1 ? sub : 'e depois o dia e o horário') + '</span>';
    updateDock();
  }

  function onService() { refreshDays(); renderTimes(); update(); }
  function pick(svc) {
    var inp = q('input[name=servico]', el.opts).filter(function (i) { return i.value === svc; })[0];
    if (!inp) return;
    inp.checked = true; S.svc = svc;
    if (A) onService(); else update();
  }
  function choose(iso, t) {
    var D = dayByIso(iso); if (!D) return;
    S.day = iso; S.time = t || '';
    var inp = q('input[name=dia]', el.days).filter(function (i) { return i.value === iso; })[0];
    if (inp) { inp.checked = true; scrollDayIntoView(inp.parentNode); }
    renderTimes(); update();
  }
  function scrollDayIntoView(lab) {
    var s = el.days;
    if (s.scrollWidth <= s.clientWidth + 1) return;
    var left = lab.offsetLeft - (s.clientWidth - lab.offsetWidth) / 2;
    s.scrollTo ? s.scrollTo({ left: left, behavior: reduce ? 'auto' : 'smooth' }) : (s.scrollLeft = left);
  }

  /* ---------- próximo horário livre (painel do topo) ---------- */
  var nextSlot = null;
  function paintNext() {
    nextSlot = null;
    for (var i = 0; i < DAYS.length && !nextSlot; i++) {
      var sl = slotsFor(DAYS[i], '');
      if (sl.length) nextSlot = { D: DAYS[i], t: sl[0].t };
    }
    if (!nextSlot) { el.next.hidden = true; return; }
    var when = nextSlot.D.i === 0 ? 'hoje' : nextSlot.D.i === 1 ? 'amanhã' : WD[nextSlot.D.w];
    el.nextV.textContent = when + ', ' + hora(nextSlot.t);
    el.next.setAttribute('aria-label', 'Próximo horário livre' + (A.sample ? ' (exemplo)' : '') + ': ' + when + ', ' + hora(nextSlot.t) + '. Ir para o agendamento.');
  }

  /* ---------- painel de confirmação do celular ---------- */
  var seeAgenda = false, seeGo = false;
  function updateDock() { el.dock.classList.toggle('on', !!(S.svc && seeAgenda && !seeGo)); }

  /* ---------- liga tudo ---------- */
  function bind() {
    el.opts.addEventListener('change', function (e) {
      if (e.target.name !== 'servico') return;
      S.svc = e.target.value; onService();
    });
    el.days.addEventListener('change', function (e) {
      if (e.target.name !== 'dia') return;
      S.day = e.target.value; renderTimes(); update();
    });
    el.times.addEventListener('change', function (e) {
      if (e.target.name !== 'hora') return;
      S.time = e.target.value; update();
    });
    [el.go, el.dockGo].forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (a.getAttribute('aria-disabled') !== 'true') return;
        e.preventDefault();
        var t = !S.svc ? el.s1 : !S.day ? el.s2 : el.s3;
        t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      });
    });
    el.next.addEventListener('click', function () { if (nextSlot) choose(nextSlot.D.iso, nextSlot.t); });
  }
  // "Agendar henna →" etc.: marca o serviço e deixa o link rolar até o #agendar
  q('[data-servico]').forEach(function (a) {
    a.addEventListener('click', function () { pick(a.getAttribute('data-servico')); });
  });
  var ql = /[?&]servico=([a-z]+)/.exec(location.search);
  if (ql) pick(ql[1]);

  /* ---------- carrega a agenda ---------- */
  function load() {
    var p;
    var valid = function (j) { return j && j.studio && j.studio.whatsapp && j.services && j.services.length ? j : null; };
    try {
      p = fetch(CFG.AGENDA, { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      }).then(function (j) { if (!valid(j)) throw new Error('agenda invalida'); return j; });
    } catch (e) { p = Promise.reject(e); }
    return p.catch(function () {
      try { return valid(JSON.parse($('agenda-fallback').textContent)); } catch (e) { return null; }
    });
  }
  function degrade() {
    el.section.classList.add('agenda-off');
    root.classList.add('agenda-off', 'agenda-ready');
    $('off-box').hidden = false;
    el.dock.hidden = true;
  }
  load().then(function (data) {
    if (!data) return degrade();
    try {
      A = data;
      if (!A.sample) q('[data-sample-only]').forEach(function (n) { n.remove(); });
      DAYS = buildDays(A);
      if (A.services) A.services.forEach(function (s) { if (services[s.id] && s.short) services[s.id].short = s.short; });
      renderDays(); renderTimes(); paintNext(); bind(); update();
      root.classList.add('agenda-ready');
    } catch (e) { degrade(); }
  });
  setTimeout(function () { root.classList.add('agenda-ready'); }, 1500);

  /* ---------- revelar ao rolar (opacidade e deslocamento leve; texto nunca com máscara) ---------- */
  var io = null, hasIO = 'IntersectionObserver' in W;
  var revEls = q('.rv, .sign');
  var trEls = q('.traco--frase, .traco--layla');
  if (reduce || !hasIO) {
    revEls.forEach(function (e) { e.classList.add('in'); });
    trEls.forEach(function (e) { e.classList.add('on'); });
  } else {
    io = new IntersectionObserver(function (es) {
      var k = 0;
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var t = e.target;
        if (t.classList.contains('traco')) { t.classList.add('on'); io.unobserve(t); return; }
        t.style.transitionDelay = (k++ * 80) + 'ms';
        t.classList.add('in');
        io.unobserve(t);
        setTimeout(function () { t.style.transitionDelay = ''; }, 1200);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revEls.forEach(function (e) { io.observe(e); });
    trEls.forEach(function (e) { io.observe(e); });
  }

  /* ---------- rolagem: topo, janelas, frase, barra (um só rAF) ---------- */
  var bar = $('bar'), hero = $('topo'), zoom = $('hero-zoom'), h1 = $('h1');
  var ft = $('frase-t'), words = q('.w', ft), wins = q('.win'), pearls = q('.pearl');
  var ticking = false;
  function frame() {
    ticking = false;
    var vh = W.innerHeight, r, i;
    // vidro claro sobre as seções de pérola
    var br = bar.getBoundingClientRect(), cy = br.top + br.height / 2, onP = false;
    for (i = 0; i < pearls.length; i++) { r = pearls[i].getBoundingClientRect(); if (r.top <= cy && r.bottom > cy) { onP = true; break; } }
    bar.classList.toggle('on-pearl', onP);
    // painel de confirmação: só com o #agendar na tela e sem o botão do próprio bloco à vista (medido na rolagem, não por observer)
    r = el.section.getBoundingClientRect(); seeAgenda = r.top < vh - 40 && r.bottom > 80;
    r = el.go.getBoundingClientRect(); seeGo = r.top < vh - 84 && r.bottom > 0;
    updateDock();
    if (reduce) return;
    // topo: foto desce +6%, nome sobe -8%
    r = hero.getBoundingClientRect();
    if (r.bottom > 0) {
      var p = clamp(-r.top / Math.max(r.height, 1), 0, 1);
      zoom.style.setProperty('--py', (p * 6).toFixed(2) + '%');
      h1.style.setProperty('--hy', (-p * 0.08 * r.height).toFixed(1) + 'px');
    }
    // janelas do olhar: a foto anda de -5% a +5% dentro da moldura
    for (i = 0; i < wins.length; i++) {
      r = wins[i].getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) continue;
      var pw = clamp((vh - r.top) / (vh + r.height), 0, 1);
      wins[i].style.setProperty('--wy', ((pw - 0.5) * 10).toFixed(2) + '%');
    }
    // frase: as palavras acendem de 60% a 100% (cor; nunca máscara)
    r = ft.getBoundingClientRect();
    var pf = clamp((vh * 0.88 - r.top) / (vh * 0.46 + r.height), 0, 1), n = words.length;
    for (i = 0; i < n; i++) words[i].style.opacity = (0.6 + 0.4 * clamp(pf * (n + 3) - i, 0, 1)).toFixed(3);
  }
  function onScroll() { if (!ticking) { ticking = true; W.requestAnimationFrame(frame); } }
  W.addEventListener('scroll', onScroll, { passive: true });
  W.addEventListener('resize', function () { setDraft(); onScroll(); });
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { setDraft(); onScroll(); });
  frame();

  /* ---------- reflexo do vidro que segue o ponteiro (só no painel do topo; o ponteiro continua o do sistema) ---------- */
  if (!reduce && W.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches && el.next) {
    var rf = 0;
    el.next.addEventListener('pointermove', function (e) {
      if (rf) return;
      rf = W.requestAnimationFrame(function () {
        rf = 0;
        var b = el.next.getBoundingClientRect();
        el.next.style.setProperty('--mx', (e.clientX - b.left) + 'px');
        el.next.style.setProperty('--my', (e.clientY - b.top) + 'px');
      });
    });
  }
})();
