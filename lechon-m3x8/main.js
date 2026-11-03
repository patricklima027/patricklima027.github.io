(function(){
  var d=document,root=d.documentElement,rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  clearTimeout(window.__rv);
  // fit dos titulos do topo: cada linha preenche a largura
  function fit(){
    var t=d.querySelector('.hero-title');if(!t)return;
    var w=t.clientWidth,max=Math.min(innerHeight*.155,240);
    t.querySelectorAll('[data-fit]').forEach(function(l){
      var s=l.firstElementChild;s.style.fontSize='100px';
      var sw=s.getBoundingClientRect().width||1,fs=100*w/sw;
      s.style.fontSize=Math.min(fs,max*(l.classList.contains('hl-script')?1.1:1))+'px';
    });
  }
  function start(){fit();requestAnimationFrame(function(){root.classList.add('ready')});}
  if(d.fonts&&d.fonts.ready){d.fonts.ready.then(start);setTimeout(start,2500)}else start();
  addEventListener('resize',fit);

  // reveal
  var rv=[].slice.call(d.querySelectorAll('.rv'));
  if('IntersectionObserver' in window&&!rm){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.08});
    rv.forEach(function(el){io.observe(el)});
  }else rv.forEach(function(el){el.classList.add('in')});

  // header e barra fixa
  var hdr=d.getElementById('hdr'),bar=d.getElementById('bar'),hero=d.querySelector('.hero'),heroBg=d.querySelector('.hero-bg');
  // processo: o scroll e o fogo
  var proc=d.getElementById('process'),track=proc.querySelector('.proc-track');
  var pps=proc.querySelectorAll('.pp'),steps=proc.querySelectorAll('.ps'),labels=proc.querySelectorAll('.proc-rail b'),dot=proc.querySelector('.proc-dot'),rail=proc.querySelector('.proc-rail');
  var cur=-1;
  function setStep(i){
    if(i===cur)return;cur=i;
    pps.forEach(function(p,k){p.classList.toggle('is-on',k===i)});
    steps.forEach(function(p,k){p.classList.toggle('is-on',k===i)});
    labels.forEach(function(p,k){p.classList.toggle('is-on',k===i)});
    proc.setAttribute('data-s',i);
  }
  setStep(0);
  var ticking=false;
  function onScroll(){
    var y=scrollY;
    hdr.classList.toggle('is-solid',y>40);
    var hb=hero.offsetHeight;
    bar.classList.toggle('is-on',y>hb*.6);
    if(!rm&&y<hb)heroBg.style.transform='translate3d(0,'+(y*.18)+'px,0)';
    var r=track.getBoundingClientRect(),total=track.offsetHeight-innerHeight;
    var p=Math.min(1,Math.max(0,-r.top/total));
    if(!rm){
      setStep(Math.min(3,Math.floor(p*4*.999)));
      if(dot&&rail){dot.style.top=(p*100)+'%'}
    }
    ticking=false;
  }
  addEventListener('scroll',function(){if(!ticking){ticking=true;requestAnimationFrame(onScroll)}},{passive:true});
  onScroll();
})();
