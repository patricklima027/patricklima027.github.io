(function(){
var DAYS=['SUN','MON','TUE','WED','THU','FRI','SAT'];
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function $(i){return document.getElementById(i)}
function p(d){var a=d.split('-');return new Date(+a[0],+a[1]-1,+a[2])}
function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function t12(t){var a=t.split(':'),h=+a[0],m=a[1],s=h>=12?'pm':'am';h=h%12||12;return h+(m==='00'?'':':'+m)+s}
function dir(a){return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(a)}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}

fetch('agenda.json').then(function(r){return r.json()}).then(render).catch(function(){
  $('stubs').innerHTML='<li class="stub stub--skel">Could not load the schedule. Serve this folder over http (python3 -m http.server).</li>';
});

function render(data){
  var t=data.truck||{};
  $('tname').textContent=t.name; $('ttag').textContent=t.tagline; $('city').textContent=t.city;
  $('call').href='tel:'+t.phone;
  if(data.updated){var u=p(data.updated);$('updated').textContent='Updated '+MON[u.getMonth()]+' '+u.getDate()+'. Times can change, check us here first.'}
  var today=iso(new Date()), nextDay=null, html='';
  data.days.forEach(function(d){
    var dt=p(d.date), cls='stub', body;
    if(d.date<today)cls+=' stub--past';
    if(d.date===today)cls+=' stub--today';
    if(d.closed){cls+=' stub--off';body='<div class="stub__n">Day off</div><div class="stub__p">Resting the smoker.</div>'}
    else{
      if(!nextDay&&d.date>=today)nextDay=d;
      body='<div class="stub__n">'+esc(d.name)+'</div><div class="stub__t">'+t12(d.start)+' – '+t12(d.end)+'</div>'+
      '<div class="stub__p">'+esc(d.place?d.place+' · ':'')+esc(d.address)+'</div>'+
      (d.note?'<div class="stub__note">'+esc(d.note)+'</div>':'')+
      (d.date>=today?'<a class="stub__go" href="'+dir(d.address)+'" target="_blank" rel="noopener">Directions</a>':'');
    }
    html+='<li class="'+cls+'"><div class="stub__d"><span>'+DAYS[dt.getDay()]+'</span><b>'+dt.getDate()+'</b><span>'+MON[dt.getMonth()]+'</span></div><div class="stub__b">'+body+'</div></li>';
  });
  $('stubs').innerHTML=html;
  if(nextDay){
    var isT=nextDay.date===today;
    $('next').innerHTML=(isT?'<strong>Today</strong> ':'<strong>Next</strong> '+DAYS[p(nextDay.date).getDay()]+' ')+t12(nextDay.start)+'–'+t12(nextDay.end)+'<br>'+esc(nextDay.place||nextDay.name);
    $('dirnow').href=dir(nextDay.address);$('dirnow').target='_blank';$('dirnow').rel='noopener';
  }else{$('next').textContent='See the week below.'}
  motion();
}

function motion(){
  if(!window.gsap||!window.ScrollTrigger||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.from('.hero__title',{y:40,opacity:0,duration:.9,ease:'power3.out'});
  gsap.from('.hero__next',{y:20,opacity:0,duration:.7,delay:.3,ease:'power2.out'});
  gsap.to('.hero__title',{yPercent:-12,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});
  gsap.utils.toArray('.stub').forEach(function(el,i){
    gsap.from(el,{y:46,rotate:i%2?1.2:-1.2,opacity:0,duration:.7,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 90%',once:true}});
  });
  gsap.utils.toArray('.item').forEach(function(el){
    gsap.from(el,{x:-30,opacity:0,duration:.6,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 92%',once:true}});
  });
  gsap.from('.qr img',{scale:.85,rotate:-4,opacity:0,duration:.8,ease:'back.out(1.6)',scrollTrigger:{trigger:'.qr',start:'top 85%',once:true}});
  gsap.to('.hero__title',{});
}

var f=$('cform');
f.addEventListener('submit',function(e){
  e.preventDefault();
  var m=$('fmsg'),fd=new FormData(f);
  if(!fd.get('name')||!fd.get('contact')){m.textContent='Add your name and a phone or email.';return}
  if(String(fd.get('access_key')).indexOf('[CONFIRMAR]')>-1){m.textContent='Prototype: form works once a Web3Forms key is set. Nothing was sent.';return}
  fetch('https://api.web3forms.com/submit',{method:'POST',body:fd}).then(function(r){return r.json()}).then(function(j){
    m.textContent=j.success?'Got it. We will reply within a day.':'Something failed. Please call us.';if(j.success)f.reset();
  }).catch(function(){m.textContent='Something failed. Please call us.'});
});
})();
