/* YS Cuts: marcador de horario. Escolhe corte, dia e janela e monta a mensagem para o DM do Yusuf. Nada e enviado pelo site. */
(function () {
  var host = document.querySelector('#schedule .wrap');
  var list = host && host.querySelector('.sch-list');
  if (!host || !list) return;
  var DM = 'https://ig.me/m/ys.cuts_';
  var cuts = ['Skin or taper fade', 'Scissor cut', 'Beard line-up', 'Cut and beard', 'Not sure yet'];
  var wins = [['Morning', 'morning'], ['Afternoon', 'afternoon'], ['Evening', 'evening'], ['Any time', 'any time']];
  var state = { cut: '', day: '', win: '' };
  var tz = 'Europe/London';
  function days() {
    var out = [], now = new Date();
    for (var i = 0; i < 8; i++) {
      var d = new Date(now.getTime() + i * 864e5);
      var w = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: tz }).format(d);
      var n = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: tz }).format(d);
      var m = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: tz }).format(d);
      out.push({ w: i === 0 ? 'Today' : w, n: n, m: m, full: (i === 0 ? 'today' : w) + ' ' + n + ' ' + m });
    }
    return out;
  }
  function group(name, legend, items, cls) {
    return '<fieldset class="bk-group ' + cls + '"><legend><span class="bk-step">' + legend[0] + '</span>' + legend[1] + '</legend><div class="bk-opts">' +
      items.map(function (it, i) {
        return '<label class="bk-opt"><input type="radio" name="' + name + '" value="' + it.value.replace(/"/g, '&quot;') + '"><span class="bk-face">' + it.html + '</span></label>';
      }).join('') + '</div></fieldset>';
  }
  var D = days();
  var form = document.createElement('form');
  form.className = 'bk';
  form.setAttribute('novalidate', '');
  form.innerHTML =
    group('cut', ['1', 'The cut'], cuts.map(function (c) { return { value: c, html: '<b>' + c + '</b>' }; }), 'bk-cuts') +
    group('day', ['2', 'The day'], D.map(function (d) { return { value: d.full, html: '<i>' + d.w + '</i><b>' + d.n + '</b><em>' + d.m + '</em>' }; }), 'bk-days') +
    group('win', ['3', 'The window'], wins.map(function (w) { return { value: w[1], html: '<b>' + w[0] + '</b>' }; }), 'bk-wins') +
    '<div class="bk-name"><label for="bk-name">Your name <span>(optional)</span></label><input id="bk-name" type="text" autocomplete="given-name" maxlength="40"></div>' +
    '<div class="bk-out"><p class="bk-label">Your message</p><p class="bk-msg" id="bk-msg" aria-live="polite">Choose a cut, a day and a window.</p>' +
    '<a class="btn btn--solid btn--lg bk-send" id="bk-send" href="' + DM + '" target="_blank" rel="noopener" aria-disabled="true">Send to Yusuf on Instagram</a>' +
    '<p class="bk-hint" id="bk-hint">The message is copied when you tap send. Paste it in the chat and Yusuf confirms the time.</p></div>';
  list.replaceWith(form);
  var msg = form.querySelector('#bk-msg'), send = form.querySelector('#bk-send'), hint = form.querySelector('#bk-hint');
  function text() {
    var n = form.querySelector('#bk-name').value.trim();
    return 'Hi Yusuf, ' + (n ? 'it\'s ' + n + '. ' : '') + 'I\'d like to book: ' + state.cut + '. Day: ' + state.day + '. Time: ' + state.win + '. Is that free?';
  }
  function ready() { return state.cut && state.day && state.win; }
  function paint() {
    if (ready()) { msg.textContent = text(); send.removeAttribute('aria-disabled'); form.classList.add('is-ready'); }
    else { msg.textContent = 'Choose a cut, a day and a window.'; send.setAttribute('aria-disabled', 'true'); form.classList.remove('is-ready'); }
  }
  form.addEventListener('change', function (e) { if (e.target.name && state.hasOwnProperty(e.target.name)) { state[e.target.name] = e.target.value; paint(); } });
  form.querySelector('#bk-name').addEventListener('input', paint);
  function copy(t) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).catch(function () {}); return true; } } catch (e) {}
    try { var ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); return true; } catch (e) {}
    return false;
  }
  send.addEventListener('click', function (e) {
    if (!ready()) { e.preventDefault(); hint.textContent = 'Pick a cut, a day and a window first.'; form.classList.add('is-missing'); return; }
    form.classList.remove('is-missing');
    var ok = copy(text());
    hint.textContent = ok ? 'Message copied. Paste it in the chat with Yusuf.' : 'Copy the message above and paste it in the chat with Yusuf.';
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
})();
