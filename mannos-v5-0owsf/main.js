/* Manno's Grill v5 (preview) */
// [CONFIRMAR] owner's WhatsApp number, digits only with country code (ex.: '14075551234'). Empty = the message is copied and the visitor is told to send it on Instagram @mannosgrill.
var WA_NUMBER='';
var PHONE_TEL='+14078007128'; // (407) 800-7128, from the owner's DM
(function(){
'use strict';
var d=document,$=function(s,r){return (r||d).querySelector(s)},$$=function(s,r){return [].slice.call((r||d).querySelectorAll(s))};
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
d.documentElement.classList.add('js');
$$('[data-call]').forEach(function(a){a.href='tel:'+PHONE_TEL});
requestAnimationFrame(function(){d.documentElement.classList.add('loaded')});

var hdr=$('.hdr');
function onScroll(){hdr.classList.toggle('on',window.scrollY>8)}
addEventListener('scroll',onScroll,{passive:true});onScroll();

var rv=$$('.rv');
if(reduce||!('IntersectionObserver' in window)){rv.forEach(function(e){e.classList.add('in')})}
else{
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -4% 0px'});
  rv.forEach(function(e){io.observe(e)});
}

var pars=$$('[data-par]');
if(!reduce&&pars.length){
  pars.forEach(function(i){i.style.transform='scale(1.12)'});
  var tick=false;
  var run=function(){
    tick=false;var vh=innerHeight;
    pars.forEach(function(img){
      var f=img.parentElement.getBoundingClientRect();
      if(f.bottom<-50||f.top>vh+50)return;
      var p=((f.top+f.height/2)-vh/2)/(vh/2+f.height/2);
      var max=(img.parentElement.offsetHeight*.12)/2;
      img.style.transform='translate3d(0,'+(-p*max).toFixed(1)+'px,0) scale(1.12)';
    });
  };
  addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(run)}},{passive:true});
  addEventListener('resize',run);run();
}

function waLink(t){return WA_NUMBER?('https://wa.me/'+WA_NUMBER+'?text='+encodeURIComponent(t)):''}
function copy(t,ok,fail){
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(ok,fail)}else{fail()}
}
var IG_MSG='Copied. Now send it to us on Instagram @mannosgrill, or tap Call.';

/* order builder */
var form=$('#orderForm'),qty=1,out=$('#qty'),msg=$('#orderMsg');
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
  copy(t,function(){msg.textContent=IG_MSG},function(){msg.textContent=t});
});

/* catering quote */
var q=$('#quote'),qm=$('#quoteMsg'),qo=$('#quoteOut'),qt=$('#quoteTxt'),qi=$('#quoteIg');
$$('[data-quote]').forEach(function(a){a.addEventListener('click',function(){
  q.pkg.value=a.dataset.quote;
  setTimeout(function(){try{q.etype[0].focus({preventScroll:true})}catch(x){}},500);
})});
function fd(v){if(!v)return 'to be decided';var p=v.split('-');if(p.length!==3)return v;return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1]-1]+' '+(+p[2])+', '+p[0]}
function quoteText(){
  var f=function(v,e){return v&&v.trim()?v.trim():e};
  var et=q.querySelector('input[name=etype]:checked');
  return ["Hi Manno's Grill! I'd like a catering quote.",
   'Event: '+(et?et.value:'not sure yet'),
   'Starting point: '+q.pkg.value,
   'Date: '+fd(q.date.value),
   'Guests: '+f(q.guests.value,'to be decided'),
   'Location: '+f(q.where.value,'to be decided'),
   'Name: '+f(q.qname.value,''),
   'Contact: '+f(q.contact.value,''),
   'Thank you!'].join('\n');
}
q.addEventListener('submit',function(e){
  e.preventDefault();
  if(!q.qname.value.trim()||!q.contact.value.trim()){
    qm.textContent='Add your name and a phone or email so we can reply.';
    (q.qname.value.trim()?q.contact:q.qname).focus();return;
  }
  var t=quoteText(),l=waLink(t);
  qt.value=t;qo.hidden=false;
  if(l){qi.hidden=true;qm.textContent='Opening WhatsApp with your request ready.';window.open(l,'_blank','noopener');return}
  qi.hidden=false;
  copy(t,function(){qm.textContent=IG_MSG},function(){qm.textContent='Copy the text below and send it to us on Instagram @mannosgrill, or tap Call.';qt.select()});
});
})();
