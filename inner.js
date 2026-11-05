// Smooth scroll, anchor glide and one-shot reveal. Reduced motion gets none of it and the page simply works.
(function () {
  var root = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('a11y-still');
  var Lulu = (window.Lulu = window.Lulu || {});
  Lulu.reduced = reduced;

  if (!reduced && window.gsap && window.ScrollTrigger && window.Lenis) {
    gsap.registerPlugin(ScrollTrigger);
    var lenis = new Lenis({ autoRaf: false, lerp: 0.09 });
    window.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    root.classList.add('gsap-live');
  }

  function focusTarget(el) {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var el = id ? document.getElementById(id) : null;
    if (!el) return;
    e.preventDefault();
    var fromKeys = e.detail === 0;
    if (Lulu.onAnchor) Lulu.onAnchor(a);
    if (window.lenis && !reduced) {
      window.lenis.start();
      window.lenis.scrollTo(id === 'top' ? 0 : el, { duration: 1.1, onComplete: function () { if (fromKeys) focusTarget(el); } });
    } else {
      window.scrollTo(0, id === 'top' ? 0 : el.getBoundingClientRect().top + scrollY);
      if (fromKeys) focusTarget(el);
    }
  });

  // deep links: the page grows once the scenes are measured, so land again after everything has settled
  function deepLink() {
    var id = location.hash.slice(1);
    var el = id && document.getElementById(id);
    if (!el) return;
    var go = function () { var y = el.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0); if (window.lenis) window.lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y); };
    go(); setTimeout(go, 400); setTimeout(go, 1200);
  }
  addEventListener('load', function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); deepLink(); });

  var items = document.querySelectorAll('.reveal,.thud');
  if (reduced || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (!x.isIntersecting) return;
        x.target.classList.add('is-in');
        io.unobserve(x.target);
      });
    }, { threshold: 0.12 });
    items.forEach(function (el, i) { el.style.setProperty('--d', (i % 4) * 70 + 'ms'); io.observe(el); });
    // Tab can land on a block before it has come in, and focus must never sit on something you can't see
    document.addEventListener('focusin', function (e) {
      for (var n = e.target; n && n.closest; n = n.parentElement && n.parentElement.closest('.reveal,.thud')) {
        n = n.closest('.reveal,.thud');
        if (!n) return;
        if (!n.classList.contains('is-in')) { n.classList.add('is-in'); n.style.animation = 'none'; n.style.opacity = '1'; io.unobserve(n); }
      }
    });
  }
})();

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

// The practical half of the site: filter the products, pick a recipe by what is at home, find a store, write to the business desk.
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var refresh = function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); document.dispatchEvent(new Event('lulu:layout')); };

  function chips(name, cb) {
    var box = $('[data-chips="' + name + '"]');
    if (!box) return;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (!b) return;
      $$('.chip', box).forEach(function (c) { c.setAttribute('aria-pressed', String(c === b)); });
      cb(b.dataset.v);
    });
  }
  chips('products', function (v) {
    $$('[data-list="products"] > li').forEach(function (li) {
      var c = li.dataset.cat;
      li.hidden = !(v === 'all' || c === v || c === 'all');
      if (!li.hidden) li.classList.add('is-in');
    });
    refresh();
  });
  chips('recipes', function (v) {
    $$('[data-list="recipes"] > li').forEach(function (li) { li.hidden = li.dataset.cat !== v; });
    var ul = $('[data-list="recipes"]'); if (ul) ul.scrollLeft = 0;
    refresh();
  });

  // stores
  var region = 'all', expanded = false, q = $('#where-q');
  var pts = $$('[data-list="where"] > li');
  var allBtn = $('[data-where-all]'), empty = $('[data-where-empty]'), count = $('[data-where-count]');
  // the stores page shows them all, under their regions; only the short list on the home page folds
  if (!allBtn) expanded = true;
  function filterPts() {
    var term = (q && q.value || '').trim().toLowerCase();
    var shown = 0, match = 0;
    pts.forEach(function (li) {
      var ok = (region === 'all' || li.dataset.region === region) && (!term || (li.dataset.q || li.dataset.name).toLowerCase().indexOf(term) > -1);
      if (ok) match++;
      var vis = ok && (expanded || term || region !== 'all' || shown < 12);
      li.hidden = !vis;
      if (vis) shown++;
    });
    if (count) count.textContent = match + (match === 1 ? ' נקודת מכירה' : ' נקודות מכירה');
    if (empty) empty.hidden = match !== 0;
    $$('[data-where-group]').forEach(function (g) { g.hidden = !$('li:not([hidden])', g); });
    if (allBtn) {
      allBtn.hidden = !!term || region !== 'all' || match <= 12;
      allBtn.setAttribute('aria-expanded', String(expanded));
      allBtn.textContent = expanded ? 'להציג פחות' : 'להציג את כל ' + pts.length + ' הנקודות';
    }
    refresh();
    document.dispatchEvent(new CustomEvent('lulu:where'));
  }
  chips('where', function (v) { region = v; filterPts(); });
  if (q) q.addEventListener('input', filterPts);
  if (allBtn) allBtn.addEventListener('click', function () {
    expanded = !expanded;
    filterPts();
    // folding back: the page got much shorter, so the reader is returned to the top of the list
    if (!expanded) { var list = $('#where-list'); if (window.lenis) window.lenis.scrollTo(list.getBoundingClientRect().top + window.scrollY - 96, { immediate: true, force: true }); else list.scrollIntoView(); }
  });
  if (pts.length) filterPts();

  // the business drawer
  var drawer = $('#biz-drawer'), back = $('[data-drawer-back]'), last = null;
  function openDrawer(on) {
    if (!drawer) return;
    drawer.classList.toggle('is-open', on);
    drawer.inert = !on;
    back.hidden = !on;
    document.documentElement.classList.toggle('drawer-open', on);
    if (window.lenis) { if (on) window.lenis.stop(); else window.lenis.start(); }
    if (on) { last = document.activeElement; var f = $('input', drawer); if (f) f.focus({ preventScroll: true }); }
    else if (last) { last.focus({ preventScroll: true }); }
  }
  $$('[data-drawer-open]').forEach(function (b) { b.addEventListener('click', function () { document.dispatchEvent(new Event('lulu:closemenu')); openDrawer(true); }); });
  $$('[data-drawer-close]').forEach(function (b) { b.addEventListener('click', function () { openDrawer(false); }); });
  if (back) back.addEventListener('click', function () { openDrawer(false); });
  document.addEventListener('keydown', function (e) {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    if (e.key === 'Escape') return openDrawer(false);
    if (e.key !== 'Tab') return;
    var fs = $$('button, a[href], input, textarea', drawer);
    var first = fs[0], end = fs[fs.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); end.focus(); }
    else if (!e.shiftKey && document.activeElement === end) { e.preventDefault(); first.focus(); }
  });

  // Safari skips links and buttons on Tab, so the last stop is not always reached: whatever slips out comes back in
  document.addEventListener('focusin', function (e) {
    if (drawer && drawer.classList.contains('is-open') && !drawer.contains(e.target)) { var f = $('input', drawer); if (f) f.focus({ preventScroll: true }); }
  });

  // the bottom bar steps down while a field has the focus, so it never covers what you are typing
  document.addEventListener('focusin', function (e) { document.documentElement.classList.toggle('field-on', !!e.target.matches && e.target.matches('input,textarea')); });
  document.addEventListener('focusout', function () { document.documentElement.classList.remove('field-on'); });

  $$('form[data-thanks]').forEach(function (form) {
    form.addEventListener('input', function (e) {
      var err = e.target.parentElement && e.target.parentElement.querySelector('.err');
      if (err && !err.hidden) { err.hidden = true; e.target.removeAttribute('aria-invalid'); }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (drawer && drawer.contains(form) && !drawer.classList.contains('is-open')) openDrawer(true);
      var firstBad = null, msg = $('[data-form-msg]', form);
      $$('input,textarea', form).forEach(function (f) {
        var err = f.parentElement.querySelector('.err');
        var bad = (f.required && !f.value.trim()) ||
          (f.type === 'tel' && f.value.trim() && f.value.replace(/[^\d]/g, '').length < 9) ||
          (f.type === 'email' && f.value.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value.trim()));
        if (err) err.hidden = !bad;
        f.setAttribute('aria-invalid', String(!!bad));
        if (bad && !firstBad) firstBad = f;
      });
      if (msg) msg.textContent = firstBad ? 'יש שדות שצריך להשלים. עברנו לראשון מהם.' : '';
      if (firstBad) { firstBad.focus(); return; }
      // the static sketch has nowhere to send to; on the real site the form carries the address of its endpoint
      if (!form.dataset.endpoint) { location.href = form.dataset.thanks; return; }
      var send = $('[type=submit]', form), body = {};
      new FormData(form).forEach(function (v, k) { body[k] = v; });
      send.disabled = true;
      fetch(form.dataset.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) {
        if (!r.ok) throw new Error('not saved');
        location.href = form.dataset.thanks;
      }).catch(function () {
        send.disabled = false;
        if (msg) { msg.classList.remove('vh'); msg.textContent = 'משהו לא עבר. נסו שוב, או כתבו לנו בוואטסאפ.'; }
      });
    });
  });
})();

// The phone menu of the sketch: the home page and the inner pages both use it. It works with motion off as well.
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var menuBtn = $('[data-menu]'), mnav = $('#mnav'), menuOn = false, menuT = 0;
  function menu(on) {
    if (!mnav || on === menuOn) return;
    menuOn = on;
    clearTimeout(menuT);
    menuBtn.setAttribute('aria-expanded', String(on));
    if (on) {
      mnav.hidden = false;
      void mnav.offsetWidth; // the closed look has to be painted once, or the card has nothing to rise from
      mnav.classList.add('is-open');
      var f = $('a', mnav); if (f) f.focus({ preventScroll: true });
      return;
    }
    mnav.classList.remove('is-open');
    var still = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
    if (still) mnav.hidden = true; else menuT = setTimeout(function () { mnav.hidden = true; }, 200);
  }
  if (menuBtn) menuBtn.addEventListener('click', function () { menu(!menuOn); });
  $$('[data-mclose]').forEach(function (a) { a.addEventListener('click', function () { menu(false); }); });
  document.addEventListener('lulu:closemenu', function () { menu(false); });
  document.addEventListener('pointerdown', function (e) { if (menuOn && !mnav.contains(e.target) && !menuBtn.contains(e.target)) menu(false); });
  document.addEventListener('keydown', function (e) {
    if (!menuOn) return;
    if (e.key === 'Escape') { menu(false); menuBtn.focus(); return; }
    if (e.key !== 'Tab') return;
    // the page behind an open menu is out of reach, so the keys go round the menu and its button
    var list = [menuBtn].concat($$('a[href],button', mnav)).filter(function (x) { return x.offsetWidth; });
    var at = list.indexOf(document.activeElement);
    e.preventDefault();
    list[at < 0 ? 0 : (at + (e.shiftKey ? -1 : 1) + list.length) % list.length].focus();
  });
  // Safari can tab past a keydown, so focus that lands behind the menu comes back
  document.addEventListener('focusin', function (e) {
    if (menuOn && !mnav.contains(e.target) && !menuBtn.contains(e.target)) { var f = $('a', mnav); if (f) f.focus({ preventScroll: true }); }
  });
})();

// The recipes: choosing on the list page, and the small helpers of a recipe page. Without a script the list simply shows everything.
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var still = function () { return matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still'); };

  // the list
  var items = $$('[data-list="rcp"] > li');
  if (items.length) {
    var fridge = $('[data-fridge]'), henBox = $('[data-pick-hen]'), q = $('#rcp-q');
    var leads = $$('.lead-rec'), count = $('[data-rcp-count]'), empty = $('[data-rcp-empty]');
    var params = new URLSearchParams(location.search);
    var state = { cat: params.get('cat') || 'all', time: 'all', level: 'all', product: '' };
    // compared and not put into a selector: an odd address must not stop the list
    if (!$$('.pick', fridge).some(function (b) { return b.dataset.v === state.cat; })) state.cat = 'all';
    // coming from the products page: only the recipes of that one product, until you choose anything else
    var names = JSON.parse($('[data-list="rcp"]').dataset.names), clearBtn = $('[data-rcp-clear]');
    // "item" and not "product": on WordPress "product" is a public address word of WooCommerce, and it takes over the page
    if (names[params.get('item')] && items.some(function (li) { return li.dataset.product === params.get('item'); })) state.product = params.get('item');
    if (params.get('q')) q.value = params.get('q');
    var norm = function (s) { return s.toLowerCase().replace(/["'׳״]/g, '').trim(); };
    var timeOk = function (m) { return state.time === 'all' || (state.time === 'long' ? m > 60 : m <= +state.time); };

    function placeHen(hop) {
      var b = $('.pick[aria-pressed="true"]', fridge);
      if (!b || !henBox) return;
      henBox.style.transform = 'translate(' + (b.offsetLeft + b.offsetWidth / 2 - henBox.offsetWidth / 2) + 'px,' + (b.offsetTop - henBox.offsetHeight + 6) + 'px)';
      if (hop && !still()) { henBox.classList.remove('is-hop'); void henBox.offsetWidth; henBox.classList.add('is-hop'); }
    }
    function centerPick() {
      var b = $('.pick[aria-pressed="true"]', fridge);
      if (!b || fridge.scrollWidth <= fridge.clientWidth) return;
      var br = b.getBoundingClientRect(), fr = fridge.getBoundingClientRect();
      fridge.scrollLeft += br.left + br.width / 2 - (fr.left + fr.width / 2);
    }
    function apply() {
      var terms = norm(q.value).split(/\s+/).filter(Boolean);
      var plain = !terms.length && state.time === 'all' && state.level === 'all' && !state.product;
      var lead = null;
      leads.forEach(function (a) {
        var on = plain && a.dataset.for.split(' ').indexOf(state.cat) > -1;
        a.hidden = !on;
        if (on) lead = a.dataset.id;
      });
      var n = 0;
      items.forEach(function (li) {
        var ok = (state.cat === 'all' || li.dataset.cat === state.cat) && (!state.product || li.dataset.product === state.product) && timeOk(+li.dataset.mins) && (state.level === 'all' || li.dataset.level === state.level) && terms.every(function (t) { return li.dataset.q.indexOf(t) > -1; });
        if (ok) n++;
        li.hidden = !ok || li.dataset.id === lead;
      });
      count.textContent = (n === 1 ? 'מתכון אחד' : n + ' מתכונים') + (state.product ? ' עם ' + names[state.product] : '');
      count.hidden = n === 0;
      empty.hidden = n !== 0;
      clearBtn.hidden = !state.product;
      // the address keeps the choice, so going back from a recipe returns to the same shelf
      var url = new URLSearchParams();
      if (state.product) url.set('item', state.product);
      if (state.cat !== 'all') url.set('cat', state.cat);
      if (q.value.trim()) url.set('q', q.value.trim());
      history.replaceState(null, '', location.pathname + (url.toString() ? '?' + url : ''));
      document.dispatchEvent(new Event('lulu:layout'));
    }
    function pressed(box, v) { $$('button', box).forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.v === v)); }); }
    fridge.addEventListener('click', function (e) {
      var b = e.target.closest('.pick');
      if (!b) return;
      state.cat = b.dataset.v;
      state.product = '';
      pressed(fridge, state.cat);
      placeHen(true);
      centerPick();
      apply();
    });
    $$('[data-rcp]').forEach(function (box) {
      box.addEventListener('click', function (e) {
        var b = e.target.closest('.chip');
        if (!b) return;
        state[box.dataset.rcp] = b.dataset.v;
        pressed(box, b.dataset.v);
        apply();
      });
    });
    q.addEventListener('input', apply);
    clearBtn.addEventListener('click', function () { state.product = ''; apply(); });
    $('[data-rcp-reset]').addEventListener('click', function () {
      q.value = ''; state.time = 'all'; state.level = 'all'; state.cat = 'all'; state.product = '';
      pressed(fridge, 'all');
      $$('[data-rcp]').forEach(function (box) { pressed(box, 'all'); });
      placeHen(true); centerPick(); apply(); q.focus();
    });
    // a level no recipe has is not offered; a recipe of that level from the panel brings it back
    $$('[data-rcp="level"] .chip').forEach(function (c) {
      c.hidden = c.dataset.v !== 'all' && !items.some(function (li) { return li.dataset.level === c.dataset.v; });
    });
    pressed(fridge, state.cat);
    apply();
    placeHen(false); centerPick();
    addEventListener('resize', function () { placeHen(false); });
    addEventListener('load', function () { placeHen(false); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placeHen(false); });
  }

  // a recipe: the steps leave footprints as you read down
  var steps = $$('.st');
  if (steps.length) {
    if (still() || !('IntersectionObserver' in window)) steps.forEach(function (s) { s.classList.add('is-on'); });
    else {
      var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('is-on'); io.unobserve(x.target); } }); }, { rootMargin: '0px 0px -40% 0px' });
      steps.forEach(function (s) { io.observe(s); });
    }
  }
  var printBtn = $('[data-print]');
  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
  var shareBtn = $('[data-share]');
  if (shareBtn) shareBtn.addEventListener('click', function () {
    var title = shareBtn.dataset.share, url = location.href;
    if (navigator.share) { navigator.share({ title: title, url: url }).catch(function () {}); return; }
    window.open('https://wa.me/?text=' + encodeURIComponent(title + ' ' + url), '_blank', 'noopener');
  });
})();

// The products page: choosing a shelf, and the hen that walks the edge of each one as it comes up. Without a script every shelf is simply there.
(function () {
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var shelves = $$('[data-shelf]');
  if (!shelves.length) return;
  var root = document.documentElement;

  var box = document.querySelector('[data-chips="shelves"]');
  var count = document.querySelector('[data-prc-count]');
  function show(v, keep) {
    var n = 0;
    shelves.forEach(function (s) {
      s.hidden = !(v === 'all' || s.dataset.shelf === v);
      if (!s.hidden) n += $$('.prc', s).length;
      // a shelf that comes back has nothing left to wait for
      if (!s.hidden) $$('.reveal', s).forEach(function (el) { el.classList.add('is-in'); });
    });
    $$('.chip', box).forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.v === v)); });
    count.textContent = n + ' מוצרים';
    if (!keep) history.replaceState(null, '', location.pathname + (v === 'all' ? '' : '?cat=' + v));
    if (window.ScrollTrigger) ScrollTrigger.refresh();
    document.dispatchEvent(new Event('lulu:layout'));
  }
  box.addEventListener('click', function (e) {
    var b = e.target.closest('.chip');
    if (b) show(b.dataset.v);
  });
  var asked = new URLSearchParams(location.search).get('cat');
  if (asked && shelves.some(function (s) { return s.dataset.shelf === asked; })) show(asked, true);

  // the walk: she crosses the edge while it climbs the screen, and stops the moment you do
  if (!root.classList.contains('gsap-live')) return;
  $$('.shelf-walk').forEach(function (walk) {
    var hen = walk.querySelector('.walk-hen');
    var feet = $$('.walk-foot', walk);
    var rest;
    function draw(p) {
      hen.style.translate = -p * (walk.clientWidth - hen.getBoundingClientRect().width) + 'px 0';
      feet.forEach(function (f, i) { f.classList.toggle('is-on', (i + 0.5) / feet.length < p); });
    }
    ScrollTrigger.create({
      trigger: walk.parentNode,
      start: 'top 92%',
      end: 'top 16%',
      onUpdate: function (st) {
        if (root.classList.contains('a11y-still')) return;
        draw(st.progress);
        hen.classList.add('walking');
        clearTimeout(rest);
        rest = setTimeout(function () { hen.classList.remove('walking'); }, 160);
      },
      onRefresh: function (st) { draw(st.progress); },
    });
  });
})();

// The about page: her footprints fill in behind her as she walks the chain. The stores page: she pecks along with every letter you type.
(function () {
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var still = function () { return reduced || root.classList.contains('a11y-still'); };

  var hen = document.querySelector('.wh-hen'), field = document.getElementById('where-q');
  if (hen && field) {
    var t;
    field.addEventListener('input', function () {
      if (still()) return;
      hen.classList.add('is-peck');
      clearTimeout(t);
      t = setTimeout(function () { hen.classList.remove('is-peck'); }, 130);
    });
  }

  // The map opens on request only: nobody downloads it, or talks to the map's servers, without asking.
  var mapBtn = document.querySelector('[data-map-open]'), mapBox = document.getElementById('wh-map');
  var cards = $$('.ptc[data-lat]');
  var map, pins = [], youPin;
  function load(attr, tag, done) {
    var el = document.createElement(tag);
    if (tag === 'link') { el.rel = 'stylesheet'; el.href = attr; } else { el.src = attr; }
    el.onload = done;
    document.head.appendChild(el);
  }
  function syncPins(fit) {
    if (!map) return;
    var on = [];
    pins.forEach(function (p) {
      var show = !p.card.hidden;
      if (show && !map.hasLayer(p.marker)) p.marker.addTo(map);
      if (!show && map.hasLayer(p.marker)) map.removeLayer(p.marker);
      if (show) on.push(p.marker.getLatLng());
    });
    if (fit !== false && on.length) map.fitBounds(L.latLngBounds(on), { padding: [32, 32], maxZoom: 15, animate: !still() });
  }
  function popup(card) {
    var box = document.createElement('div');
    box.className = 'ptc-pop';
    box.appendChild(card.querySelector('.ptc-head').cloneNode(true));
    box.appendChild(card.querySelector('.ptc-acts').cloneNode(true));
    return box;
  }
  function makeMap() {
    var anim = !still();
    map = L.map(mapBox, { zoomControl: false, scrollWheelZoom: false, dragging: !L.Browser.mobile, zoomAnimation: anim, fadeAnimation: anim, markerZoomAnimation: anim, attributionControl: true, maxBounds: [[28.5, 33.5], [34.2, 36.6]], maxBoundsViscosity: 0.8, minZoom: 6 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(map);
    map.attributionControl.setPrefix(false);
    L.control.zoom({ zoomInTitle: 'הגדלת המפה', zoomOutTitle: 'הקטנת המפה' }).addTo(map);
    map.on('popupopen', function (e) { var x = e.popup.getElement().querySelector('.leaflet-popup-close-button'); if (x) x.setAttribute('aria-label', 'סגירה'); });
    var icon = L.divIcon({ className: 'wh-pin', html: '<svg viewBox="0 0 300 300" aria-hidden="true" focusable="false"><use href="#i-pin"/></svg>', iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14] });
    pins = cards.map(function (c) {
      var m = L.marker([+c.dataset.lat, +c.dataset.lng], { icon: icon, title: c.dataset.name, alt: c.dataset.name });
      m.bindPopup(function () { return popup(c); }, { minWidth: 240, maxWidth: 320 });
      return { card: c, marker: m };
    });
    syncPins();
  }
  if (mapBtn && mapBox && cards.length) {
    var opening = false;
    mapBtn.addEventListener('click', function () {
      var open = mapBox.hidden;
      mapBox.hidden = !open;
      mapBtn.setAttribute('aria-expanded', String(open));
      mapBtn.textContent = open ? 'להסתיר את המפה' : 'לראות על המפה';
      if (!open) return;
      if (map) { map.invalidateSize(); syncPins(); return; }
      if (opening) return;
      opening = true;
      var left = 2, go = function () { if (--left === 0) makeMap(); };
      load(mapBtn.dataset.css, 'link', go);
      load(mapBtn.dataset.js, 'script', go);
    });
    document.addEventListener('lulu:where', function () { syncPins(); });
  } else if (mapBtn) {
    mapBtn.hidden = true;
  }

  // The nearest stores, measured here in the browser. The location goes nowhere.
  var nearBtn = document.querySelector('[data-near]'), list = document.querySelector('.wh-list'), nearCount = document.querySelector('[data-where-count]');
  function km(a, b, c, d) {
    var r = Math.PI / 180, x = Math.sin((c - a) * r / 2), y = Math.sin((d - b) * r / 2);
    return 12742 * Math.asin(Math.sqrt(x * x + Math.cos(a * r) * Math.cos(c * r) * y * y));
  }
  function dropNear() {
    var old = document.querySelector('.wh-near');
    if (old) old.remove();
  }
  function showNear(lat, lng) {
    dropNear();
    var near = cards.map(function (c) { return { c: c, d: km(lat, lng, +c.dataset.lat, +c.dataset.lng) }; }).sort(function (a, b) { return a.d - b.d; }).slice(0, 6);
    var sec = document.createElement('section');
    sec.className = 'wh-group wh-near';
    sec.setAttribute('aria-labelledby', 'wh-near');
    var h = document.createElement('h2');
    h.id = 'wh-near';
    h.tabIndex = -1;
    h.textContent = 'הכי קרוב אליכם';
    var ul = document.createElement('ul');
    ul.className = 'where-list';
    near.forEach(function (n) {
      var li = n.c.cloneNode(true);
      li.hidden = false;
      var p = document.createElement('p');
      p.className = 'ptc-dist';
      p.textContent = n.d < 1 ? 'פחות מקילומטר מכם' : 'כ-' + Math.round(n.d) + ' ק"מ מכם';
      li.querySelector('.ptc-head').appendChild(p);
      ul.appendChild(li);
    });
    sec.appendChild(h);
    sec.appendChild(ul);
    list.insertBefore(sec, list.firstChild);
    h.focus();
    if (map) {
      if (youPin) map.removeLayer(youPin);
      youPin = L.circleMarker([lat, lng], { radius: 9, color: '#fff', weight: 3, fillColor: '#d75632', fillOpacity: 1 }).addTo(map);
      map.fitBounds(L.latLngBounds(near.map(function (n) { return [+n.c.dataset.lat, +n.c.dataset.lng]; }).concat([[lat, lng]])), { padding: [32, 32], maxZoom: 14, animate: !still() });
    }
  }
  if (nearBtn && list && cards.length && navigator.geolocation) {
    nearBtn.addEventListener('click', function () {
      nearBtn.disabled = true;
      navigator.geolocation.getCurrentPosition(function (pos) {
        nearBtn.disabled = false;
        showNear(pos.coords.latitude, pos.coords.longitude);
      }, function () {
        nearBtn.disabled = false;
        if (nearCount) nearCount.textContent = 'לא קיבלנו את המיקום שלכם. אפשר לחפש לפי יישוב.';
      }, { timeout: 10000, maximumAge: 300000 });
    });
    document.addEventListener('lulu:where', dropNear);
  } else if (nearBtn) {
    nearBtn.hidden = true;
  }

  var spine = document.querySelector('.ch-spine');
  if (!spine || !root.classList.contains('gsap-live')) return;
  var feet = $$('.ch-foot', spine), walker = spine.querySelector('.ch-hen'), rest;
  function draw(p) { feet.forEach(function (f, i) { f.classList.toggle('is-on', (i + 0.5) / feet.length < p); }); }
  ScrollTrigger.create({
    trigger: spine,
    start: 'top 50%',
    end: 'bottom 50%',
    onUpdate: function (st) {
      draw(st.progress);
      if (still()) return;
      walker.classList.add('walking');
      clearTimeout(rest);
      rest = setTimeout(function () { walker.classList.remove('walking'); }, 160);
    },
    onRefresh: function (st) { draw(st.progress); },
  });
})();
