(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function(s,c){return (c||document).querySelector(s)};
  var $$ = function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
  var top = $('#top'), dock = $('#dock');

  /* ---------- form: builds the WhatsApp message ---------- */
  var form = $('#quoteForm');
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var d = new FormData(form);
      var name = (d.get('name')||'').toString().trim();
      var msg = 'Hi Magic Maid! I would like a quote.\n' +
        'Place: ' + d.get('place') + '\n' +
        'Cleaning: ' + d.get('kind') + '\n' +
        (d.get('zip') ? 'Area: ' + d.get('zip') + '\n' : '') +
        (d.get('notes') ? 'Notes: ' + d.get('notes') + '\n' : '') +
        (name ? 'Name: ' + name : '');
      window.open('https://wa.me/13218887611?text=' + encodeURIComponent(msg.trim()), '_blank', 'noopener');
    });
  }

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
    $$('.h-big, .lede, .notice p, .wa, .form').forEach(function(el){
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
