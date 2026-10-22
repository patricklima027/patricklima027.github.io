/* Ribeiro Web Co. — template v2, extras.js (só carregado com "booking": true).
   A barra fixa do celular (Ligar + Agendar) fica escondida enquanto o botão de agendar do topo está na tela,
   para não mostrar o mesmo botão duas vezes na mesma tela; assim que ele sai, a barra aparece e fica. */
(function () {
  var body = document.body;
  var cta = document.querySelector(".hero--booking .hero-actions .btn--solid");
  var show = function (on) { body.classList.toggle("mbar-on", on); };
  if (!cta || !("IntersectionObserver" in window)) { show(true); return; }
  new IntersectionObserver(function (entries) {
    show(!entries[entries.length - 1].isIntersecting);
  }, { threshold: 0.6 }).observe(cta);
})();
