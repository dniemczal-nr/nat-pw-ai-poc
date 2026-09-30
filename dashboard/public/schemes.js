/* Colour-scheme picker shared by the dashboard and run reports (inlined there). */
(function () {
  var KEY = 'nat.scheme';
  var SCHEMES = [
    { id: '', name: 'System', swatch: 'linear-gradient(135deg, #f9f9f7 50%, #1a1a19 50%)' },
    { id: 'paper', name: 'Paper', swatch: 'linear-gradient(135deg, #f9f9f7 55%, #2a78d6 55%)' },
    { id: 'graphite', name: 'Graphite', swatch: 'linear-gradient(135deg, #1a1a19 55%, #3987e5 55%)' },
    { id: 'ocean', name: 'Ocean', swatch: 'linear-gradient(135deg, #0e1c2b 55%, #38b2d8 55%)' },
    { id: 'dusk', name: 'Dusk', swatch: 'linear-gradient(135deg, #1a1626 55%, #9085e9 55%)' },
    { id: 'sand', name: 'Sand', swatch: 'linear-gradient(135deg, #f6f1e9 55%, #4a3aa7 55%)' },
    { id: 'projector', name: 'Projector (high contrast)', swatch: 'linear-gradient(135deg, #ffffff 55%, #000000 55%)' }
  ];

  function read() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode */ } }

  function apply(id) {
    document.querySelectorAll('.nat-theme').forEach(function (n) {
      if (id) n.setAttribute('data-scheme', id); else n.removeAttribute('data-scheme');
    });
    document.querySelectorAll('[data-scheme-picker] button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.id === id ? 'true' : 'false');
    });
    document.dispatchEvent(new CustomEvent('nat:scheme', { detail: id }));
  }

  function mount(target) {
    target.classList.add('scheme-picker');
    target.setAttribute('role', 'group');
    target.setAttribute('aria-label', 'Colour scheme');
    SCHEMES.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.id = s.id;
      b.title = s.name;
      b.setAttribute('aria-label', s.name);
      var dot = document.createElement('span');
      dot.style.background = s.swatch;
      b.appendChild(dot);
      b.addEventListener('click', function () { write(s.id); apply(s.id); });
      target.appendChild(b);
    });
  }

  document.querySelectorAll('[data-scheme-picker]').forEach(mount);
  apply(read());
  window.addEventListener('storage', function (e) { if (e.key === KEY) apply(e.newValue || ''); });
})();
