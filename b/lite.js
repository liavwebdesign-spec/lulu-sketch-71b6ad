// The hens are alive: eyes follow the pointer, blink now and then, and legs move only when something asks them to.
// Nothing here runs in a loop at rest: eyes only on pointer moves, blinks on a slow timer, off-screen hens are skipped.
(function () {
  var Lulu = (window.Lulu = window.Lulu || {});
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');

  Lulu.walk = function (el, phase, amp) {
    var s = Math.sin(phase * Math.PI * 2) * (amp === undefined ? 1 : amp);
    el.style.setProperty('--s', s.toFixed(3));
    el.style.setProperty('--b', Math.abs(Math.cos(phase * Math.PI * 2)).toFixed(3));
  };

  var hens = [].slice.call(document.querySelectorAll('.hen'));
  var live = new Set();
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        x.target.classList.toggle('is-off', !x.isIntersecting);
        if (x.isIntersecting) live.add(x.target); else live.delete(x.target);
      });
    });
    hens.forEach(function (h) { io.observe(h); });
  }
  if (reduced) return;

  var mx = 0, my = 0, queued = false;
  function look() {
    queued = false;
    live.forEach(function (h) {
      if (h.classList.contains('no-look')) return;
      h.querySelectorAll('.eye').forEach(function (e) {
        var p = e.querySelector('.pupil');
        if (!p || !e.getClientRects().length) return;
        var r = e.getBoundingClientRect();
        if (!r.width) return;
        var dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2);
        var len = Math.hypot(dx, dy) || 1;
        var max = +p.dataset.max || 8;
        // reach grows with distance, tops out inside the iris; flipped or hanging birds read their own axes
        var reach = Math.min(1, len / 240) * max;
        var fx = h.classList.contains('flip') ? -1 : 1, fy = h.classList.contains('hang') ? -1 : 1;
        var tx = (dx / len) * reach * fx, ty = (dy / len) * reach * fy;
        // a bird on the side wall is flipped and turned a quarter, so the screen's axes swap
        if (h.classList.contains('side')) { tx = (dy / len) * reach; ty = (dx / len) * reach; }
        p.setAttribute('transform', 'translate(' + tx.toFixed(1) + ' ' + ty.toFixed(1) + ')');
      });
    });
  }
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
    addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!queued) { queued = true; requestAnimationFrame(look); }
    }, { passive: true });
  }

  (function blink() {
    setTimeout(function () {
      var arr = [];
      live.forEach(function (h) { var e = h.querySelector('.eye:not(.lid)'); if (e && !h.classList.contains('no-look') && !document.documentElement.classList.contains('a11y-still')) arr.push(e); });
      if (arr.length) {
        var e = arr[Math.floor(Math.random() * arr.length)];
        e.classList.add('blink');
        setTimeout(function () { e.classList.remove('blink'); }, 180);
      }
      blink();
    }, 1800 + Math.random() * 2600);
  })();
})();

// Display adjustments panel. The link in the HTML still leads to the statement when scripts are off.
(function () {
  var root = document.documentElement;
  var KEY = 'lulu-a11y';
  var BACK = 'lulu-a11y-back';
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; }
  // What the visitor already set in their system decides. Forced colours win over our contrast and invert modes,
  // and a system preference is where a switch starts until they touch it.
  var wants = function (q) { return !!(window.matchMedia && matchMedia(q).matches); };
  var forced = wants('(forced-colors: active)');
  function defaults(s) {
    if (s.contrast === undefined && wants('(prefers-contrast: more)')) s.contrast = true;
    if (s.still === undefined && wants('(prefers-reduced-motion: reduce)')) s.still = true;
    return s;
  }
  defaults(state);
  var save = function () { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };

  var SCALE = [1, 1.15, 1.3, 1.5];
  var TOGGLES = [
    ['contrast', 'ניגודיות גבוהה'],
    ['invert', 'היפוך צבעים'],
    ['gray', 'גווני אפור'],
    ['links', 'הדגשת קישורים'],
    ['readable', 'גופן קריא'],
    ['spacing', 'ריווח טקסט'],
    ['still', 'עצירת אנימציות'],
    ['cursor', 'סמן גדול'],
    ['line', 'קו קריאה'],
  ];
  var line;
  var loadedStill = false;
  function moveLine(e) { if (line) line.style.transform = 'translateY(' + e.clientY + 'px)'; }
  function apply() {
    root.style.setProperty('--a11y-scale', SCALE[state.size || 0]);
    TOGGLES.forEach(function (t) { root.classList.toggle('a11y-' + t[0], !!state[t[0]] && !(forced && (t[0] === 'contrast' || t[0] === 'invert'))); });
    if (state.line && !line) {
      line = document.createElement('div');
      line.className = 'a11y-line';
      document.body.appendChild(line);
      addEventListener('pointermove', moveLine, { passive: true });
    } else if (!state.line && line) {
      line.remove(); line = null; removeEventListener('pointermove', moveLine);
    }
  }
  apply();
  loadedStill = !!state.still;

  var anchor = document.querySelector('.a11y-fab');
  if (!anchor) return;
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'a11y-fab';
  btn.setAttribute('aria-label', 'נגישות, התאמות תצוגה');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'a11y-panel');
  btn.innerHTML = anchor.innerHTML;
  anchor.replaceWith(btn);

  var panel = document.createElement('div');
  panel.id = 'a11y-panel';
  panel.className = 'a11y-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'התאמות תצוגה');
  panel.hidden = true;
  var list = TOGGLES.filter(function (t) { return !(forced && (t[0] === 'contrast' || t[0] === 'invert')); }).map(function (t) { return '<button type="button" class="a11y-opt" data-t="' + t[0] + '" aria-pressed="' + !!state[t[0]] + '">' + t[1] + '</button>'; }).join('');
  panel.innerHTML =
    '<div class="a11y-head"><strong>התאמות תצוגה</strong><button type="button" class="a11y-x" aria-label="סגירה">×</button></div>' +
    '<div class="a11y-list" data-lenis-prevent><div class="a11y-size"><span>גודל טקסט</span><div><button type="button" data-s="-1" aria-label="הקטנת טקסט">&minus;</button><output data-size>' + Math.round(SCALE[state.size || 0] * 100) + '%</output><button type="button" data-s="1" aria-label="הגדלת טקסט">+</button></div></div>' + list +
    '<button type="button" class="a11y-opt a11y-reset" data-reset>איפוס</button></div>' +
    '<a class="a11y-state" href="accessibility.html">להצהרת הנגישות</a>';
  document.body.appendChild(panel);

  function open(v) {
    panel.hidden = !v;
    btn.setAttribute('aria-expanded', String(v));
    if (v) panel.querySelector('.a11y-x').focus(); else btn.focus();
  }
  // Scenes tied to the scroll are built once, on load. Stopping them for real means loading the page again,
  // back at the same heading, with the panel open and focus on the button that was pressed.
  function heads() { return [].slice.call(document.querySelectorAll('main h1,main h2,main h3')); }
  function restart(mark) {
    var at = 0;
    heads().forEach(function (h, i) { if (h.offsetWidth && h.getBoundingClientRect().top < innerHeight * 0.5) at = i; });
    try { sessionStorage.setItem(BACK, JSON.stringify({ at: at, mark: mark })); } catch (e) { return false; }
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    location.reload();
    return true;
  }
  var back = null;
  try { back = JSON.parse(sessionStorage.getItem(BACK) || 'null'); sessionStorage.removeItem(BACK); } catch (e) { back = null; }
  if (back) {
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    var pressed = panel.querySelector(back.mark);
    if (pressed) pressed.focus({ preventScroll: true });
    var land = function () {
      var h = heads()[back.at];
      if (!h) return;
      var y = h.getBoundingClientRect().top + scrollY - 96;
      if (window.lenis) window.lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y);
    };
    land();
    addEventListener('load', function () { land(); setTimeout(land, 400); });
  }

  btn.addEventListener('click', function () { open(panel.hidden); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) open(false); });
  document.addEventListener('pointerdown', function (e) { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
  panel.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('.a11y-x')) return open(false);
    if (t.dataset.s) {
      state.size = Math.max(0, Math.min(SCALE.length - 1, (state.size || 0) + +t.dataset.s));
      panel.querySelector('[data-size]').textContent = Math.round(SCALE[state.size] * 100) + '%';
    } else if (t.dataset.t) {
      state[t.dataset.t] = !state[t.dataset.t];
      t.setAttribute('aria-pressed', String(state[t.dataset.t]));
    } else if (t.hasAttribute('data-reset')) {
      state = defaults({});
      panel.querySelectorAll('[aria-pressed]').forEach(function (b) { b.setAttribute('aria-pressed', String(!!state[b.dataset.t])); });
      panel.querySelector('[data-size]').textContent = '100%';
    } else return;
    apply(); save();
    if (!!state.still !== loadedStill && !matchMedia('(prefers-reduced-motion: reduce)').matches && restart(t.dataset.t ? '[data-t="still"]' : '[data-reset]')) return;
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });
})();

// The small pages' phone menu: opens under the logo, takes the focus, Escape closes it and gives the focus back.
(function () {
  var b = document.querySelector('.small-burger'), nav = document.getElementById('snav');
  if (!b || !nav) return;
  function set(on) {
    nav.classList.toggle('is-open', on);
    b.setAttribute('aria-expanded', String(on));
    if (on) { var f = nav.querySelector('a'); if (f) f.focus(); }
  }
  b.addEventListener('click', function () { set(!nav.classList.contains('is-open')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { set(false); b.focus(); } });
})();
