(function(){
var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/* ticket */
var lines=[].slice.call(document.querySelectorAll('.tk-line')),send=document.getElementById('tkSend'),note=document.getElementById('tkNote'),hint=document.getElementById('tkHint');
var WA='https://wa.me/14078007128';
try{document.getElementById('tkNum').textContent=String(Math.floor(Math.random()*900)+100).padStart(4,'0')}catch(e){}
function upd(){
  var parts=[],n=0;
  lines.forEach(function(l){var q=+l.querySelector('output').textContent;l.classList.toggle('on',q>0);if(q>0){n+=q;parts.push(q+' x '+l.dataset.name)}});
  var msg="Hi Manno's Grill! I'd like to order:\n"+parts.join('\n')+(note.value.trim()?'\nNotes: '+note.value.trim():'')+'\n(Sent from the website)';
  send.href=WA+'?text='+encodeURIComponent(msg);
  send.classList.toggle('off',!n);
  hint.textContent=n?n+(n>1?' items on the ticket.':' item on the ticket.'):'Add at least one item.';
}
lines.forEach(function(l){var o=l.querySelector('output');
  l.querySelector('.p').onclick=function(){o.textContent=Math.min(20,+o.textContent+1);upd()};
  l.querySelector('.m').onclick=function(){o.textContent=Math.max(0,+o.textContent-1);upd()}});
note.addEventListener('input',upd);upd();
document.querySelectorAll('[data-pk]').forEach(function(a){
  a.href=WA+'?text='+encodeURIComponent("Hi Manno's Grill! I'd like a catering quote: "+a.dataset.pk+".\nDate:\nPlace:\nHow many people:")});

function go(){
  if(!window.gsap||!window.ScrollTrigger){document.documentElement.classList.add('rv-fallback');return}
  clearTimeout(window.__rv);
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('gs');
  if(reduce){return}
  if(window.Lenis){var lenis=new Lenis({lerp:.1});lenis.on('scroll',ScrollTrigger.update);gsap.ticker.add(function(t){lenis.raf(t*1000)});gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){var t=document.querySelector(a.getAttribute('href'));if(t){e.preventDefault();lenis.scrollTo(t,{offset:-10})}})})}
  var tl=gsap.timeline({defaults:{ease:'power3.out'}});
  tl.from('.hero-photo img',{scale:1.15,duration:1.6,ease:'power2.out'},0)
    .from('.l1',{yPercent:60,opacity:0,duration:.9},.15)
    .from('.l2',{yPercent:60,opacity:0,duration:.9},.3)
    .from('.lede,.hero .cta',{y:20,opacity:0,duration:.7,stagger:.12},.6)
    .from('.dr',{scaleY:.2,transformOrigin:'50% 0',duration:1.2,ease:'elastic.out(1,.5)'},.5);
  gsap.to('.hero-photo img',{yPercent:-9,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});
  gsap.utils.toArray('.order-copy h2,.order-copy p,.order-alt,.sat-text>*,.cat h2,.cat-lede,.cat .fine').forEach(function(el){
    gsap.fromTo(el,{y:30,opacity:0},{y:0,opacity:1,duration:.8,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 90%'}})});
  /* ticket prints out */
  gsap.fromTo('.ticket',{y:80,opacity:0,rotate:-1},{y:0,opacity:1,rotate:window.innerWidth>899?1.2:0,duration:1.1,ease:'power3.out',scrollTrigger:{trigger:'.ticket',start:'top 88%'}});
  gsap.utils.toArray('.tk-line').forEach(function(l,i){gsap.from(l,{x:-20,opacity:0,duration:.5,delay:.35+i*.15,scrollTrigger:{trigger:'.ticket',start:'top 88%'}})});
  gsap.from('.order-pic',{y:60,rotate:-9,opacity:0,duration:1,scrollTrigger:{trigger:'.order-pic',start:'top 92%'}});
  /* saturday photos drift */
  gsap.to('.sp1',{yPercent:-6,ease:'none',scrollTrigger:{trigger:'.sat',start:'top bottom',end:'bottom top',scrub:true}});
  gsap.to('.sp2',{yPercent:10,ease:'none',scrollTrigger:{trigger:'.sat',start:'top bottom',end:'bottom top',scrub:true}});
  /* packages stack up */
  gsap.utils.toArray('.pkg').forEach(function(p,i){gsap.from(p,{y:70,opacity:0,duration:.8,delay:i*.1,ease:'power3.out',scrollTrigger:{trigger:'.pk',start:'top 85%'}})});
  gsap.utils.toArray('.menu-wall figure').forEach(function(f,i){gsap.from(f,{y:60,opacity:0,rotate:i?9:-9,duration:.9,scrollTrigger:{trigger:f,start:'top 92%'}})});
  gsap.from('.ftr-big',{y:50,opacity:0,duration:.9,scrollTrigger:{trigger:'.ftr',start:'top 85%'}});
}
function wait(n){if(window.gsap&&window.ScrollTrigger)go();else if(n>60){document.documentElement.classList.add('rv-fallback')}else setTimeout(function(){wait(n+1)},100)}
wait(0);
})();
