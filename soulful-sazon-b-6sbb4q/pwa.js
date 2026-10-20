/* Soulful Sazón · modo app: registra o service worker e mostra uma dica "Add to Home Screen" (celular, uma vez). */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var KEY = 'sazon-a2hs-v1';
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js', { scope: './' }).catch(function () {}); });
  }
  if (standalone) return;
  var seen = false; try { seen = localStorage.getItem(KEY) === '1'; } catch (e) {}
  if (seen) return;
  var phone = window.matchMedia && matchMedia('(max-width:899px) and (pointer:coarse)').matches;
  if (!phone) return;
  var ua = navigator.userAgent || '';
  var ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var deferred = null, tip = null, shown = false, hideT = null;

  function done() { try { localStorage.setItem(KEY, '1'); } catch (e) {} close(); }
  function close() { if (tip) { tip.classList.remove('on'); setTimeout(function () { if (tip && tip.parentNode) tip.parentNode.removeChild(tip); tip = null; }, 300); } clearTimeout(hideT); }
  function build(html, withBtn) {
    tip = document.createElement('div');
    tip.className = 'a2hs'; tip.setAttribute('role', 'status');
    tip.innerHTML = '<p>' + html + '</p>' + (withBtn ? '<button type="button" class="a2hs-go">Install</button>' : '') + '<button type="button" class="a2hs-x" aria-label="Close">×</button>';
    document.body.appendChild(tip);
    tip.querySelector('.a2hs-x').addEventListener('click', done);
    tip.addEventListener('click', function (e) { if (e.target === tip || e.target.tagName === 'P') done(); });
    if (withBtn) tip.querySelector('.a2hs-go').addEventListener('click', function () {
      if (!deferred) return done();
      deferred.prompt(); deferred.userChoice.then(done, done); deferred = null;
    });
    requestAnimationFrame(function () { tip.classList.add('on'); });
    hideT = setTimeout(done, 14000);
  }
  function show() {
    if (shown) return; shown = true;
    if (ios) build('Add this site to your phone: tap <b>Share</b>, then <b>Add to Home Screen</b>.', false);
    else if (deferred) build('Use Soulful Sazón like an app on your phone.', true);
    else shown = false;
    watchOrder();
  }
  /* some enquanto a seção Order está na tela, para nunca cobrir os botões Order, Call e Text */
  function watchOrder() {
    var o = document.getElementById('order');
    if (!o || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (en) { if (tip) tip.classList.toggle('on', !en[0].isIntersecting); }, { threshold: 0.02 }).observe(o);
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; if (!shown) setTimeout(show, 6000); });
  window.addEventListener('appinstalled', done);
  if (ios) window.addEventListener('load', function () { setTimeout(show, 7000); });
})();
