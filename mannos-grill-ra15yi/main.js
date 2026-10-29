(function(){
  var d=document, root=d.documentElement;
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

  clearTimeout(window.__rv);

  // reveal on scroll
  var items=[].slice.call(d.querySelectorAll('.rv'));
  if(!('IntersectionObserver' in window)||reduce){items.forEach(function(e){e.classList.add('in')});}
  else{
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}})},{rootMargin:'0px 0px -8% 0px',threshold:.08});
    items.forEach(function(e){io.observe(e)});
  }

  // gentle parallax: photos drift at different speeds
  var pars=[].slice.call(d.querySelectorAll('[data-par]'));
  if(!reduce&&pars.length){
    var tick=false;
    function run(){
      var vh=innerHeight;
      pars.forEach(function(p){
        var r=p.getBoundingClientRect();
        if(r.bottom<-200||r.top>vh+200)return;
        var k=parseFloat(p.getAttribute('data-par'))||0;
        var off=((r.top+r.height/2)-vh/2)*k;
        p.style.translate='0 '+(-off).toFixed(1)+'px';
      });
      tick=false;
    }
    addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(run);}},{passive:true});
    addEventListener('resize',run);run();
  }
})();
