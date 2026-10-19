(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function(s,c){return (c||document).querySelector(s)};
  var $$ = function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
  var top = $('#top'), dock = $('#dock');

  /* ---------- language (EN / ES) ---------- */
  var lang = 'en';
  try{ lang = localStorage.getItem('mm-lang') || ((navigator.language||'').slice(0,2) === 'es' ? 'es' : 'en'); }catch(e){}
  var ES = window.ES || {};
  var els = [];
  $$('h1 *, h2, h3, p, a, span, li, legend, label span, button, .opts span, .fld > span, option, .stp-l, .hl, .nav a, .dock a').forEach(function(el){
    var k = el.innerHTML.trim();
    if(ES[k] !== undefined){ el.setAttribute('data-en', k); els.push(el); }
  });
  var UI = {
    en:{ place:{home:'Home',apartment:'Apartment',office:'Office',airbnb:'Airbnb',commercial:'Commercial space'},
         kind:{general:'General cleaning',deep:'Deep cleaning',unsure:'Cleaning (not sure yet)'},
         extra:{grout:'Grout & tile joints',grease:'Kitchen grease',closet:'Closet organizing',fridge:'Inside fridge or oven',windows:'Windows',pets:'Pets at home'},
         when:{asap:'As soon as possible',week:'This week',later:'Next week or later',asking:'Just asking for now'},
         bed:['Studio','1 bedroom','bedrooms'], bath:['1 bathroom','bathrooms'],
         hi:"Hi Magic Maid! I'd like a quote.", L:{place:'Place',size:'Size',kind:'Cleaning',extras:'Extras',when:'When',area:'Area',notes:'Notes',name:'Name'} },
    es:{ place:{home:'Casa',apartment:'Apartamento',office:'Oficina',airbnb:'Airbnb',commercial:'Espacio comercial'},
         kind:{general:'Limpieza general',deep:'Limpieza profunda',unsure:'Limpieza (aún no sé)'},
         extra:{grout:'Juntas de la cerámica',grease:'Grasa de cocina',closet:'Organizar clósets',fridge:'Dentro del refrigerador u horno',windows:'Ventanas',pets:'Mascotas en casa'},
         when:{asap:'Lo antes posible',week:'Esta semana',later:'La próxima semana o después',asking:'Solo estoy preguntando'},
         bed:['Estudio','1 cuarto','cuartos'], bath:['1 baño','baños'],
         hi:'¡Hola Magic Maid! Quisiera una cotización.', L:{place:'Lugar',size:'Tamaño',kind:'Limpieza',extras:'Extras',when:'Cuándo',area:'Zona',notes:'Notas',name:'Nombre'} }
  };
  var form = $('#quoteForm');
  var st = { beds: 2, baths: 1 };
  function sizeText(l){
    var u = UI[l];
    var b = st.beds === 0 ? u.bed[0] : st.beds === 1 ? u.bed[1] : st.beds + ' ' + u.bed[2];
    var ba = st.baths === 1 ? u.bath[0] : st.baths + ' ' + u.bath[1];
    return b + ', ' + ba;
  }
  function val(n){ var c = form.querySelector('[name="'+n+'"]:checked'); return c ? c.value : ''; }
  function refreshBasket(){
    if(!form) return;
    var place = val('place'), kind = val('kind');
    var ex = $$('[name="extra"]:checked', form).map(function(i){return i.value;});
    var on = { cloth:1, gloves:1, spray:1 };
    if(kind === 'deep'){ on.brush = 1; }
    if(st.beds >= 4 || st.baths >= 3){ on.sponge = on.sponge || 0; }
    if(ex.indexOf('grout')>-1) on.grout = 1;
    if(ex.indexOf('grease')>-1) on.sponge = 1;
    if(ex.indexOf('closet')>-1) on.box = 1;
    if(ex.indexOf('fridge')>-1) on.spark = 1;
    if(ex.indexOf('windows')>-1) on.squeegee = 1;
    if(ex.indexOf('pets')>-1) on.paw = 1;
    $$('#basketSvg .item').forEach(function(g){ g.classList.toggle('on', !!on[g.id.replace('it-','')]); });
    var u = UI[lang];
    $('#tag1').textContent = u.place[place];
    $('#tag2').textContent = (st.beds === 0 ? u.bed[0] : st.beds + (lang==='es'?' cuartos':' bed')) + ' · ' + (st.baths + (lang==='es'?(st.baths===1?' baño':' baños'):' bath'));
    $('#tag3').textContent = u.kind[kind].replace(' (not sure yet)','').replace(' (aún no sé)','');
    $('#bedsOut').textContent = st.beds === 0 ? (lang==='es'?'Estudio':'Studio') : st.beds;
    $('#bathsOut').textContent = st.baths;
  }
  function setLang(l){
    lang = l;
    document.documentElement.lang = l;
    els.forEach(function(el){ el.innerHTML = l === 'es' ? ES[el.getAttribute('data-en')] : el.getAttribute('data-en'); });
    var lb = $('#langBtn'); if(lb) lb.innerHTML = l === 'es' ? 'EN / <b>ES</b>' : '<b>EN</b> / ES';
    if(form){ form.elements.mlang.value = l; }
    var ph = $('input[name="zip"]'); if(ph) ph.placeholder = 'Orlando, FL';
    refreshBasket();
    try{ localStorage.setItem('mm-lang', l); }catch(e){}
  }
  var lbtn = $('#langBtn');
  if(lbtn) lbtn.addEventListener('click', function(){ setLang(lang === 'es' ? 'en' : 'es'); });

  /* ---------- Pack your basket: builds the WhatsApp message ---------- */
  if(form){
    form.addEventListener('change', refreshBasket);
    $$('.stp-b', form).forEach(function(b){
      b.addEventListener('click', function(){
        var k = b.parentNode.getAttribute('data-k'), d = +b.getAttribute('data-d');
        st[k] = Math.max(k === 'beds' ? 0 : 1, Math.min(k === 'beds' ? 8 : 6, st[k] + d));
        refreshBasket();
      });
    });
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var l = form.elements.mlang.value, u = UI[l], L = u.L;
      var ex = $$('[name="extra"]:checked', form).map(function(i){ return u.extra[i.value]; });
      var zip = form.elements.zip.value.trim(), notes = form.elements.notes.value.trim(), name = form.elements.name.value.trim();
      var msg = [u.hi,
        L.place + ': ' + u.place[val('place')],
        L.size + ': ' + sizeText(l),
        L.kind + ': ' + u.kind[val('kind')].replace(' (not sure yet)',' (not sure yet)'),
        ex.length ? L.extras + ': ' + ex.join(', ') : '',
        L.when + ': ' + u.when[form.elements.when.value],
        zip ? L.area + ': ' + zip : '',
        notes ? L.notes + ': ' + notes : '',
        name ? L.name + ': ' + name : ''].filter(Boolean).join('\n');
      window.open('https://wa.me/13218887611?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    });
    $('#basketSvg').classList.add('ready');
  }
  setLang(lang);

  /* ---------- grout wipe (drag / range) ---------- */
  var wipe = $('#wipe'), range = $('#wipeRange'), bar = $('#wipeBar'), dirty = $('#wipeDirty');
  function setWipe(v){
    v = Math.max(0, Math.min(100, v));
    // dirty tiles stay on the right of the bar
    dirty.style.clipPath = 'inset(0 0 0 ' + v + '%)';
    dirty.setAttribute('style', 'clip-path:inset(0 0 0 ' + v + '%);-webkit-clip-path:inset(0 0 0 ' + v + '%)');
    bar.style.left = v + '%';
    range.value = v;
  }
  if(wipe){
    setWipe(0);
    range.addEventListener('input', function(){ setWipe(+range.value); });
    // pointer drag over the whole panel (range is transparent on top)
  }

  if(reduce){
    $$('.step').forEach(function(s){ s.style.opacity = 1; });
    if(wipe) setWipe(70);
    return;
  }

  function boot(){
    if(!window.gsap || !window.ScrollTrigger || !window.Lenis){ return setTimeout(boot, 60); }
    gsap.registerPlugin(ScrollTrigger);

    var lenis = new Lenis({ lerp: .09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function(t){ lenis.raf(t*1000); });
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(function(a){
      a.addEventListener('click', function(e){
        var id = a.getAttribute('href'); if(id.length < 2) return;
        var t = $(id); if(!t) return;
        e.preventDefault();
        lenis.scrollTo(id === '#hero' ? 0 : t, { offset: id === '#hero' ? 0 : -20, duration: 1.3 });
      });
    });

    /* hero entrance: fade + rise, never a mask */
    gsap.set('.hero-img', { scale: 1.14 });
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to('.hero-img', { scale: 1, duration: 2.6, ease: 'power2.out' }, 0)
      .from('.top', { opacity: 0, y: -14, duration: .9 }, .3)
      .from('.h-hero .hl', { opacity: 0, y: 36, duration: 1.1, stagger: .22 }, .35)
      .from('.hero-sub', { opacity: 0, y: 20, duration: .9 }, 1.0)
      .from('.hero-cta .btn', { opacity: 0, y: 20, duration: .8, stagger: .12 }, 1.15);

    /* glints on the sunny floor */
    $$('.gl').forEach(function(g, i){
      gsap.fromTo(g, { opacity: 0, scale: .2, rotate: -20 },
        { opacity: 1, scale: 1, rotate: 0, duration: .9, ease: 'back.out(2)', repeat: -1, yoyo: true,
          repeatDelay: 1.2 + i*.7, delay: 1.6 + i*.55 });
    });

    /* hero parallax */
    gsap.to('.hero-img', { yPercent: 7, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    /* header: solid after hero, hides while reading down, back on scroll up */
    var lastY = 0;
    lenis.on('scroll', function(e){
      var y = e.scroll, h = $('.hero').offsetHeight - 120;
      top.classList.toggle('solid', y > h);
      top.classList.toggle('gone', y > h + 300 && y > lastY);
      if(y < lastY) top.classList.remove('gone');
      lastY = y;
      var q = $('#quote').getBoundingClientRect();
      dock.classList.toggle('gone', y < 300 || (q.top < innerHeight*.55));
    });
    dock.classList.add('gone');

    /* basket: zoom the photo into each step */
    var img = $('#basketImg'), steps = $$('.step');
    function activate(s){
      steps.forEach(function(x){ x.classList.toggle('is-on', x === s); });
      gsap.to(img, { scale: +s.dataset.zoom, transformOrigin: s.dataset.ox + '% ' + s.dataset.oy + '%', duration: 1.2, ease: 'power3.inOut', overwrite: true });
    }
    steps.forEach(function(s){
      ScrollTrigger.create({ trigger: s, start: 'top 58%', end: 'bottom 58%',
        onToggle: function(self){ if(self.isActive) activate(s); } });
    });

    /* rows: image drift + gentle rise */
    $$('.row').forEach(function(r){
      var im = $('img', r);
      if(im) gsap.fromTo(im, { yPercent: -7 }, { yPercent: 7, ease: 'none',
        scrollTrigger: { trigger: r, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from(r, { opacity: 0, y: 50, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: r, start: 'top 85%' } });
    });

    /* headings and notes: fade + rise */
    $$('.h-big, .lede, .notice p, .tool-vis .wa, .form').forEach(function(el){
      gsap.from(el, { opacity: 0, y: 34, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' } });
    });

    /* grout: auto-sweep when it enters, then it is yours to drag */
    var user = false;
    range.addEventListener('pointerdown', function(){ user = true; });
    var o = { v: 0 };
    ScrollTrigger.create({ trigger: wipe, start: 'top 70%', once: true, onEnter: function(){
      gsap.to(o, { v: 100, duration: 3.2, ease: 'power2.inOut', onUpdate: function(){ if(!user) setWipe(o.v); },
        onComplete: function(){ if(!user) gsap.to(o, { v: 55, duration: 1.4, ease: 'power2.inOut', delay: .4, onUpdate: function(){ if(!user) setWipe(o.v); } }); } });
    }});
  }
  boot();
})();
