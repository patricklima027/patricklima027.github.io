/* Noondoor: lang.js (seletor de idioma EN | PT, sem recarregar).
   O texto padrão (o idioma do site.json) fica no HTML; a outra língua é um dicionário embutido no próprio HTML (<script id="lang-data">):
   a chave é o texto em inglês como aparece na página (sem marcação, espaços normais) e o valor é a tradução, com *palavra* para destaque.
   Cada trecho é achado pelo texto, não por posição: o título, o hero, os alt, aria-label, placeholder e os atributos data-* de rótulo trocam juntos.
   O que o JS do site gera (relógio, datas, número de peito) pergunta o idioma por window.SiteLang e refaz o texto quando recebe o evento "sitelang".
   Padrão: o idioma de i18n.default (en). A escolha vale por visitante (localStorage) e ?lang=pt vale por link; nada de detectar o navegador.
   Roda antes do GSAP (defer, primeiro da fila) e não depende dele: na carga já entra em português, sem o título "pular".
   Depois que o SplitText partiu um título em letras, a troca põe o texto inteiro de volta no elemento (visível, sem a animação de entrada). */
(function () {
  var doc = document.documentElement;
  var node = document.getElementById("lang-data");
  if (!node) return;
  var cfg;
  try { cfg = JSON.parse(node.textContent); } catch (e) { return; }
  var langs = cfg.langs || [], base = cfg.base || "en", def = cfg.default || base, key = cfg.storage || "site-lang";
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
  function norm(s) { return String(s).replace(/[\s ]+/g, " ").trim(); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  var ATTRS = ["alt", "aria-label", "title", "placeholder", "data-label-open", "data-label-close", "data-label", "data-text", "data-clock-soon", "data-clock-now", "data-run-date", "data-bib-suffix", "content"];

  var dict = {};   // code -> { en text -> texto traduzido }
  langs.forEach(function (l) { if (l.code !== base && cfg[l.code]) dict[l.code] = cfg[l.code].strings || {}; });
  var current = base;

  /* ---------- registro dos trechos (feito uma vez, com a página ainda em inglês) ---------- */
  var reg = [];
  var chain = function (el) { var t = el; while (t.children.length === 1 && !hasText(t)) t = t.children[0]; return t; };
  function hasText(el) { return [].some.call(el.childNodes, function (c) { return c.nodeType === 3 && c.data.trim(); }); }
  function known(k) { for (var c in dict) if (dict[c][k] !== undefined) return true; return false; }
  function regAttrs(el) {
    ATTRS.forEach(function (a) {
      if (a === "content" && !(el.tagName === "META" && /^(description|og:title|og:description)$/.test(el.getAttribute("name") || el.getAttribute("property") || ""))) return;
      var v = el.getAttribute && el.getAttribute(a);
      if (v && known(norm(v))) reg.push({ n: el, a: a, k: norm(v), o: v });
    });
  }
  function walk(el) {
    var tag = el.tagName;
    if (/^(SCRIPT|STYLE|NOSCRIPT)$/i.test(tag)) return;
    regAttrs(el);
    if (el.hasAttribute("data-lang-skip")) return;
    var k = norm(el.textContent);
    // só se troca por inteiro o elemento cujo miolo é texto com marcação de texto (em, b, i, strong, br): se tiver span, ícone, controle, foto ou
    // SVG dentro, apagar o miolo quebraria o elemento (o ícone do menu, o input do ritmo, a foto da galeria): então desce até o trecho de texto
    if (k && known(k) && !el.hasAttribute("data-lang-dyn") && [].every.call(el.querySelectorAll("*"), function (c) { return /^(EM|B|I|STRONG|BR)$/.test(c.tagName); })) {
      var root = chain(el);
      reg.push({ n: el, h: 1, k: k, root: root, oRoot: root.innerHTML, oEl: el.innerHTML });
      $$("*", el).forEach(regAttrs);
      return;
    }
    [].forEach.call(el.childNodes, function (c) {
      if (c.nodeType === 3) { var t = norm(c.data); if (t && known(t)) reg.push({ n: c, t: 1, k: t, o: c.data }); }
      else if (c.nodeType === 1) walk(c);
    });
  }

  function html(v) { return esc(v).replace(/\*(.+?)\*/g, "<em>$1</em>"); }
  function plain(v) { return v.replace(/\*/g, ""); }
  function tr(k, code) { var d = dict[code]; return d && d[k] !== undefined ? d[k] : null; }

  function apply(code) {
    current = code;
    reg.forEach(function (r) {
      if (r.n.nodeType === 1 && r.n.hasAttribute("data-lang-dyn") && !r.a) return;   // texto que o JS do site gera (relógio, datas, número de peito): ele mesmo troca
      var v = code === base ? null : tr(r.k, code);
      if (r.a) r.n.setAttribute(r.a, v === null ? r.o : plain(v));
      else if (r.t) r.n.data = v === null ? r.o : r.o.replace(norm(r.o), plain(v));
      else {
        var root = r.root && r.root.isConnected ? r.root : r.n;
        if (v === null) root.innerHTML = root === r.root ? r.oRoot : r.oEl;
        else root.innerHTML = html(v);
      }
    });
    var L = langs.filter(function (l) { return l.code === code; })[0] || {};
    doc.lang = L.html_lang || code;
    var meta = code === base ? null : cfg[code] || {};
    if (cfg.titles) document.title = code === base ? cfg.titles.base : (meta.title || cfg.titles.base);
    $$(".lang button").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-lang") === code ? "true" : "false"); });
    var lab = $("[data-toggle] .hdr-toggle-label");
    if (lab) lab.textContent = lab.getAttribute(lab.closest("[aria-expanded]") && lab.closest("[aria-expanded]").getAttribute("aria-expanded") === "true" ? "data-label-close" : "data-label-open") || lab.textContent;
    doc.setAttribute("data-lang", code);
    window.dispatchEvent(new CustomEvent("sitelang", { detail: { lang: code } }));
    // títulos que o fit-text mede (hero, nome do rodapé) e posições das animações mudam com o texto
    setTimeout(function () { window.dispatchEvent(new Event("resize")); }, 60);
  }

  /* ---------- API para o JS do site ---------- */
  window.SiteLang = {
    get lang() { return current; },
    base: base,
    t: function (s) { var v = current === base ? null : tr(norm(s), current); return v === null ? s : plain(v); },
    cfg: function (name) { var c = cfg[current]; return c && c[name] !== undefined ? c[name] : (cfg[base] || {})[name]; },
    set: function (code, save) {
      if (!langs.some(function (l) { return l.code === code; })) return;
      if (save) { try { localStorage.setItem(key, code); } catch (e) {} }
      apply(code);
    }
  };

  function init() {
    if (cfg.titles) cfg.titles.base = document.title;
    walk(document.head);
    walk(document.body);
    var q = /[?&]lang=([a-z-]+)/.exec(location.search), l = q ? q[1] : null;
    if (!l) { try { l = localStorage.getItem(key); } catch (e) { l = null; } }
    if (!langs.some(function (x) { return x.code === l; })) l = def;
    doc.classList.add("i18n");
    $$(".lang button").forEach(function (b) {
      b.addEventListener("click", function () { window.SiteLang.set(b.getAttribute("data-lang"), true); });
    });
    if (l !== base) apply(l); else $$(".lang button").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-lang") === base ? "true" : "false"); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
