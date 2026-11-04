/* Manno's Grill v4 (preview) */
// [CONFIRMAR] owner's WhatsApp number, digits only with country code (ex.: '14075551234'). Empty = order text is copied and the Call button is highlighted.
var WA_NUMBER='';
var PHONE_TEL='+14078007128'; // (407) 800-7128, from the owner's DM
(function(){
'use strict';
var d=document,$=function(s,r){return (r||d).querySelector(s)},$$=function(s,r){return [].slice.call((r||d).querySelectorAll(s))};
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
d.documentElement.classList.add('js');
$$('[data-call]').forEach(function(a){a.href='tel:'+PHONE_TEL});

/* hero settle */
requestAnimationFrame(function(){d.documentElement.classList.add('loaded')});

/* header shadow */
var hdr=$('.hdr');
function onScroll(){hdr.classList.toggle('on',window.scrollY>8)}
addEventListener('scroll',onScroll,{passive:true});onScroll();

/* reveal */
var rv=$$('.rv');
if(reduce||!('IntersectionObserver' in window)){rv.forEach(function(e){e.classList.add('in')})}
else{
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.15,rootMargin:'0px 0px -6% 0px'});
  rv.forEach(function(e){io.observe(e)});
}

/* soft parallax: image drifts inside its frame (scale keeps edges covered) */
var pars=$$('[data-par]');
if(!reduce&&pars.length){
  pars.forEach(function(i){i.style.transform='scale(1.12)'});
  var tick=false;
  var run=function(){
    tick=false;var vh=innerHeight;
    pars.forEach(function(img){
      var f=img.parentElement.getBoundingClientRect();
      if(f.bottom<-50||f.top>vh+50)return;
      var p=((f.top+f.height/2)-vh/2)/(vh/2+f.height/2); // -1..1
      var max=(img.parentElement.offsetHeight*.12)/2;
      img.style.transform='translate3d(0,'+(-p*max).toFixed(1)+'px,0) scale(1.12)';
    });
  };
  addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(run)}},{passive:true});
  addEventListener('resize',run);run();
}

/* order builder */
var form=$('#orderForm'),qty=1,out=$('#qty'),msg=$('#orderMsg');
function waLink(t){return WA_NUMBER?('https://wa.me/'+WA_NUMBER+'?text='+encodeURIComponent(t)):''}
function orderText(){
  var it=form.item.value,combo=form.combo.checked,n=form.name.value.trim(),notes=form.notes.value.trim();
  var t="Hi Manno's Grill! I'd like to order "+qty+"x "+it+(combo?' as a combo':'')+'.';
  if(notes)t+=' Notes: '+notes+'.';
  if(n)t+=' Name: '+n+'.';
  return t+' Is it pickup or delivery? Thank you!';
}
$$('[data-q]',form).forEach(function(b){b.addEventListener('click',function(){qty=Math.max(1,Math.min(20,qty+ +b.dataset.q));out.textContent=qty})});
$$('[data-pick]').forEach(function(a){a.addEventListener('click',function(){
  $$('input[name=item]',form).forEach(function(r){if(r.value===a.dataset.pick)r.checked=true});
})});
form.addEventListener('submit',function(e){
  e.preventDefault();var t=orderText(),l=waLink(t);
  if(l){window.open(l,'_blank','noopener');msg.textContent='Opening WhatsApp with your order ready.';return}
  var done=function(){msg.textContent='Your order is copied. Paste it in a message to us, or tap Call to order.'};
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,function(){msg.textContent=t})}else{msg.textContent=t}
});

/* catering quotes */
$$('[data-quote]').forEach(function(a){
  var t="Hi Manno's Grill! I'd like a catering quote ("+a.dataset.quote+'). Date: __ . Headcount: __ . Location: __ .';
  if(WA_NUMBER){a.href=waLink(t);a.target='_blank';a.rel='noopener'}
  else{a.href='tel:'+PHONE_TEL}
});
})();
