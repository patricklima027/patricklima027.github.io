(function(){
  var d=document, root=d.documentElement;
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  clearTimeout(window.__rv);

  var items=[].slice.call(d.querySelectorAll('.rv'));
  var haveGsap=!!(window.gsap&&window.ScrollTrigger);

  /* Fallback: no GSAP (offline/CDN blocked) or reduced motion. Simple reveal, everything readable. */
  if(!haveGsap||reduce){
    if(!('IntersectionObserver' in window)||reduce){items.forEach(function(e){e.classList.add('in')});}
    else{
      var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}})},{rootMargin:'0px 0px -8% 0px',threshold:.08});
      items.forEach(function(e){io.observe(e)});
    }
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ignoreMobileResize:true});
  root.classList.add('gs');

  /* smooth wheel scrolling (touch stays native) */
  var lenis=null;
  if(window.Lenis){
    lenis=new Lenis({lerp:.1,wheelMultiplier:1,anchors:true});
    lenis.on('scroll',ScrollTrigger.update);
    gsap.ticker.add(function(t){lenis.raf(t*1000)});
    gsap.ticker.lagSmoothing(0);
  }

  var q=function(s,c){return [].slice.call((c||d).querySelectorAll(s))};

  /* progress bar */
  gsap.to('.prog i',{scaleX:1,ease:'none',scrollTrigger:{trigger:root,start:0,end:'max',scrub:.2}});

  /* ---------- HERO: pinned, burger lights layer by layer, photo zooms ---------- */
  (function(){
    var hero=q('.hero')[0];
    var tl=gsap.timeline({defaults:{ease:'none'},scrollTrigger:{trigger:hero,start:'top top',end:'+=110%',pin:true,scrub:.6,anticipatePin:1}});
    tl.fromTo('.hero-photo img',{scale:1},{scale:1.32,yPercent:-4,duration:1},0);
    tl.fromTo('.neon',{scale:.92,transformOrigin:'50% 50%'},{scale:1.12,duration:1},0);
    ['.t1','.t2','.t3','.t4'].forEach(function(s,i){
      tl.fromTo('.neon '+s,{strokeDashoffset:i===0?.55:1},{strokeDashoffset:0,duration:.2,ease:'power1.inOut'},i*.18+(i===0?0:.05));
    });
    tl.fromTo('.hero-glow',{opacity:0},{opacity:1,duration:.8},.1);
    tl.fromTo('.hero-in > :not(.neon)',{y:0,opacity:1},{y:-36,opacity:0,duration:.18,stagger:.02,ease:'power1.in'},.66);
  })();

  var mm=gsap.matchMedia();

  /* ---------- BURGER OF THE MONTH ---------- */
  var bomParts=['.bom .mono','.bom .b1','.bom .b2','.bom .b3','.bom .price'].concat(q('.bom .parts li').map(function(_,i){return '.bom .parts li:nth-child('+(i+1)+')'}),['.bom .note']);
  mm.add('(min-width:900px) and (min-height:640px)',function(){
    var tl=gsap.timeline({defaults:{ease:'none'},scrollTrigger:{trigger:'.bom',start:'top top',end:'+=170%',pin:true,scrub:.7,anticipatePin:1}});
    tl.fromTo('.bom-poster',{y:260,x:-60,rotation:12,opacity:0,scale:.9},{y:0,x:0,rotation:-2.2,opacity:1,scale:1,duration:.3,ease:'power2.out'},0);
    tl.to('.bom-poster',{rotation:1.6,scale:1.05,y:-14,duration:.7},.3);
    bomParts.forEach(function(s,i){
      tl.fromTo(s,{opacity:0,y:34},{opacity:1,y:0,duration:.1,ease:'power2.out'},.08+i*.058);
    });
  });
  mm.add('(max-width:899px), (max-height:639px)',function(){
    gsap.fromTo('.bom-poster',{y:90,rotation:5,opacity:0},{y:0,rotation:-2.2,opacity:1,ease:'none',scrollTrigger:{trigger:'.bom-poster',start:'top 100%',end:'top 55%',scrub:.5}});
    gsap.to('.bom-poster',{y:-30,rotation:.5,ease:'none',scrollTrigger:{trigger:'.bom-poster',start:'top 40%',end:'bottom -10%',scrub:.5}});
    bomParts.forEach(function(s){
      var el=q(s)[0];if(!el)return;
      gsap.fromTo(el,{opacity:0,y:30},{opacity:1,y:0,ease:'none',scrollTrigger:{trigger:el,start:'top 94%',end:'top 72%',scrub:.4}});
    });
  });

  /* ---------- BOARD: rows switch on like a neon sign ---------- */
  var rows=q('.row');
  mm.add('(min-width:900px) and (min-height:700px)',function(){
    var tl=gsap.timeline({defaults:{ease:'none'},scrollTrigger:{trigger:'.board',start:'top top',end:'+=150%',pin:true,scrub:.6,anticipatePin:1}});
    tl.fromTo('.board h2',{opacity:.3},{opacity:1,duration:.12,ease:'steps(4)'},0);
    rows.forEach(function(r,i){
      tl.fromTo(r,{opacity:.22,'--lit':0},{opacity:1,'--lit':1,duration:.17,ease:'steps(5)'},.14+i*.2);
    });
  });
  mm.add('(max-width:899px), (max-height:699px)',function(){
    gsap.fromTo('.board h2',{opacity:.3},{opacity:1,ease:'steps(4)',scrollTrigger:{trigger:'.board h2',start:'top 92%',end:'top 70%',scrub:.3}});
    rows.forEach(function(r){
      gsap.fromTo(r,{opacity:.22,'--lit':0},{opacity:1,'--lit':1,ease:'steps(5)',scrollTrigger:{trigger:r,start:'top 88%',end:'top 58%',scrub:.3}});
    });
  });

  /* ---------- PHOTO WALL: different speeds ---------- */
  var speeds=[70,150,40];
  q('.wall figure').forEach(function(f,i){
    var img=f.querySelector('img');
    gsap.fromTo(f,{y:speeds[i]},{y:-speeds[i]*.6,ease:'none',scrollTrigger:{trigger:'.wall',start:'top bottom',end:'bottom top',scrub:.6}});
    gsap.fromTo(img,{scale:1.22},{scale:1.02,ease:'none',scrollTrigger:{trigger:f,start:'top bottom',end:'bottom top',scrub:.6}});
  });

  /* ---------- SATURDAY, CATERING, wall heading: scrubbed rise ---------- */
  q('.sat .rv, .events .rv, .wall-h').forEach(function(el){
    gsap.fromTo(el,{opacity:0,y:44},{opacity:1,y:0,ease:'none',scrollTrigger:{trigger:el,start:'top 94%',end:'top 66%',scrub:.4}});
  });
  gsap.fromTo('.sat h2 span',{y:20},{y:-14,ease:'none',scrollTrigger:{trigger:'.sat',start:'top bottom',end:'bottom top',scrub:.6}});
  gsap.fromTo('.events h2 span',{y:30},{y:-10,ease:'none',scrollTrigger:{trigger:'.events',start:'top bottom',end:'bottom top',scrub:.6}});

  addEventListener('load',function(){ScrollTrigger.refresh()});
  if(d.fonts&&d.fonts.ready)d.fonts.ready.then(function(){ScrollTrigger.refresh()});
})();
