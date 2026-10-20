/* Catering por SMS: monta a mensagem com o que a pessoa escreveu e abre o app de mensagens.
   O 689-364-3026 é um iPhone comercial (não é WhatsApp). Sem e-mail do cliente ainda. */
(function () {
  var f = document.getElementById('cater'), out = document.getElementById('cater-out');
  if (!f) return;
  var TO = '+16893643026';
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = function (n) { return (f.elements[n].value || '').trim(); };
    var lines = ['Hi Soulful Sazón! I would like to ask about catering.'];
    [['Name', 'name'], ['Event date', 'date'], ['Where', 'where'], ['How many people', 'people'], ['Notes', 'notes']].forEach(function (r) {
      if (v(r[1])) lines.push(r[0] + ': ' + v(r[1]));
    });
    var body = lines.join('\n');
    out.hidden = false;
    out.textContent = 'Opening your messages app. If nothing opens, text this to 689-364-3026:\n' + body;
    window.location.href = 'sms:' + TO + '?&body=' + encodeURIComponent(body);
  });
})();
