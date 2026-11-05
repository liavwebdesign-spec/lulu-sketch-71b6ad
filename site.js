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

// Sketch A: the choreography. Everything here only moves what is already in the page.
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  // "you are here": this works with motion off as well
  var NAMES = { top: 'הבית', about: 'על לולו', weeks: 'שבועות גידול', products: 'המוצרים', recipes: 'מתכונים', where: 'איפה קונים' };
  var here = $('[data-here]');
  function spy(id) {
    $$('[data-nav]').forEach(function (a) {
      var on = a.dataset.nav === id;
      a.classList.toggle('is-on', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    if (here) here.textContent = NAMES[id] || '';
  }
  if ('IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) spy(x.target.dataset.spy); }); }, { rootMargin: '-50% 0px -50% 0px' });
    $$('[data-spy]').forEach(function (s) { sio.observe(s); });
  }
  spy('top');

  if (!document.documentElement.classList.contains('gsap-live')) return;
  ScrollTrigger.config({ ignoreMobileResize: true });
  var mobile = function () { return innerWidth < 1024; };

  function scene(sel, opts) {
    var o = { trigger: sel, start: 'top top', end: 'bottom bottom', scrub: true };
    for (var k in opts) o[k] = opts[k];
    return gsap.timeline({ defaults: { ease: 'none', duration: 1 }, scrollTrigger: o });
  }

  // the logo walks to its place in the rail
  (function logoFly() {
    var fly = $('.logo-fly'), slot = $('.logo-slot'), dock = $('.rail-logo');
    var a = {}, b = {}, prog = 0;
    function draw() {
      var e = prog * prog * (3 - 2 * prog);
      var s = 1 + (b.s - 1) * e;
      var x = a.x + (b.x - a.x) * e;
      var y = a.y + (b.y - a.y) * e - Math.abs(Math.sin(prog * Math.PI * 7)) * 10 * (1 - e);
      fly.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')';
      Lulu.walk(fly, prog * 7, prog > 0.01 && prog < 0.99 ? 1 : 0);
      dock.classList.toggle('is-docked', prog >= 1);
    }
    function measure() {
      var r = slot.getBoundingClientRect();
      a = { x: r.left, y: r.top + scrollY, w: r.width };
      var t = (dock.querySelector('svg') || dock).getBoundingClientRect();
      b = { x: t.left, y: t.top, s: t.width / r.width };
      fly.style.width = r.width + 'px';
      fly.style.height = r.height + 'px';
      draw();
    }
    ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: function () { return '+=' + innerHeight * 0.85; }, scrub: true,
      onUpdate: function (s) { prog = s.progress; draw(); }, onRefresh: function (s) { prog = s.progress; measure(); } });
    measure();
    addEventListener('load', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  })();

  // hens leave the hero in every direction
  (function hero() {
    var peck = $('.hh-peck .hen');
    scene('.hero', { end: 'bottom top', onUpdate: function (s) { if (peck) Lulu.walk(peck, s.progress * 5); } })
      .to('.hh-bust', { yPercent: 90 }, 0)
      .to('.hh-hang', { yPercent: 110 }, 0)
      .to('.hh-side', { yPercent: 130 }, 0)
      .to('.hh-peck', { x: function () { return -innerWidth * 0.3; }, yPercent: 60 }, 0)
      .to('.hero-cue', { autoAlpha: 0, duration: 0.2 }, 0);
    // without the rail the logo walks straight up through the words, so they step aside first
    gsap.matchMedia().add('(max-width:1023px)', function () {
      // and they come back once the hero is off screen, so nothing is left switched off further down the page
      var words = function (a) { gsap.set('.hero-in', { opacity: a }); };
      ScrollTrigger.create({
        trigger: '.hero', start: 'top top', end: 'bottom top',
        onUpdate: function (s) { words(Math.max(0, 1 - (s.scroll() - s.start) / (innerHeight * 0.12))); },
        onLeave: function () { words(1); },
        onLeaveBack: function () { words(1); }
      });
      return function () { gsap.set('.hero-in', { clearProps: 'opacity' }); };
    });
  })();

  // the world slows down under your finger
  (function fast() {
    var anims = null;
    var tl = scene('.fast', { start: 'top bottom', onUpdate: function (s) {
      if (!anims) anims = $('.fast').getAnimations({ subtree: true });
      var t = clamp((s.progress - 0.36) / 0.5, 0, 1);
      var rate = 1 + (0.035 - 1) * (t * (2 - t));
      for (var i = 0; i < anims.length; i++) anims[i].playbackRate = rate;
    } });
    gsap.set('.fast-2', { opacity: 0, y: 24 });
    tl.to('.fast-1', { scale: 0.86, opacity: 0.5, duration: 0.2 }, 0.54)
      .to('.fast-2', { opacity: 1, y: 0, duration: 0.2 }, 0.56)
      .to('.mq', { autoAlpha: 0.2, duration: 0.3 }, 0.5)
      .to({}, { duration: 0.14 }, 0.86);
  })();

  // sixteen weeks around the ring: an egg, a chick, a hen
  (function slow() {
    var feet = $$('.rf'), wkFeet = $$('.wk-f'), week = $('[data-week]'), weekL = $('[data-week-l]'), walker = $('.ring-hen'), last = -1;
    function setWeek(n) { week.textContent = n; weekL.textContent = n === 1 ? 'שבוע גידול' : 'שבועות גידול'; }
    setWeek(1);
    gsap.set('.rc-chick', { scale: 0, transformOrigin: '50% 100%' });
    gsap.set('.rc-hen', { scale: 0.25, autoAlpha: 0, transformOrigin: '50% 100%' });
    gsap.set('.slow-p2', { opacity: 0, y: 16 });
    var tl = scene('.slow', { onUpdate: function (s) {
      var n = Math.min(16, Math.floor(s.progress * 17));
      if (n !== last) {
        last = n;
        feet.forEach(function (f, i) { f.classList.toggle('on', i < n); });
        wkFeet.forEach(function (f, i) { f.classList.toggle('on', i < n); });
        setWeek(Math.max(1, n));
      }
      Lulu.walk(walker, s.progress * 22);
    } });
    tl.to('.ring-arm', { rotation: 337.5, duration: 0.94 }, 0)
      .to('.rc-egg', { keyframes: { rotation: [0, -7, 7, -9, 9, -4, 0] }, duration: 0.16, transformOrigin: '50% 90%' }, 0.08)
      .to('.rc-egg', { scale: 0, duration: 0.03, transformOrigin: '50% 90%' }, 0.24)
      .to('.rc-chick', { keyframes: { scale: [0, 0.8, 0.72, 0.76] }, duration: 0.05 }, 0.25)
      .to('.rc-chick', { scale: 1, duration: 0.2 }, 0.3)
      .to('.rc-chick', { scale: 0, duration: 0.03 }, 0.52)
      .to('.rc-hen', { autoAlpha: 1, scale: 0.5, duration: 0.03 }, 0.52)
      .to('.rc-hen', { scale: 1, duration: 0.35 }, 0.55)
      .to('.slow-p1', { opacity: 0, y: -16, duration: 0.06 }, 0.54)
      .to('.slow-p2', { opacity: 1, y: 0, duration: 0.06 }, 0.6)
      .fromTo('.ring-stamp', { autoAlpha: 0, scale: 2.1 }, { keyframes: [{ autoAlpha: 1, scale: 0.94, duration: 0.03 }, { scale: 1.05, duration: 0.015 }, { scale: 1, duration: 0.015 }] }, 0.9)
      .to({}, { duration: 0.04 }, 0.96);
  })();

  // she pecks one grain and the whole screen turns to corn
  (function corn() {
    var stage = $('.corn-sec .stage'), flood = $('.corn-flood'), grain = $('.grain'), ckA = $('.ck-a'), ckB = $('.ck-b');
    var st = { r: 0 }, cx = 0, cy = 0, R = 0, last = null;
    function measure() {
      var h = stage.clientHeight, w = stage.clientWidth;
      var br = ckA.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      var u = br.width / 301.5;
      cx = br.left - sr.left + 262 * u; cy = br.top - sr.top + 306 * u;
      grain.style.left = cx + 'px'; grain.style.top = cy + 'px'; grain.style.translate = '-50% -50%';
      R = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) + 8;
      paint();
    }
    function paint() { flood.style.clipPath = 'circle(' + (st.r * R).toFixed(1) + 'px at ' + cx.toFixed(1) + 'px ' + cy.toFixed(1) + 'px)'; }
    gsap.set('.corn-copy > *', { opacity: 0, y: 24 });
    gsap.set('.cob', { autoAlpha: 0, y: 60 });
    gsap.set('.corn-stamp', { autoAlpha: 0 });
    var tl = scene('.corn-sec', { onUpdate: function (s) {
      var on = Math.sin(s.progress * 62) > 0.1;
      if (on !== last) { last = on; ckA.classList.toggle('is-peck', on); ckB.classList.toggle('is-peck', on); }
    }, onRefresh: measure });
    tl.fromTo('.grain', { scale: 1 }, { scale: 2.6, duration: 0.14 }, 0.08)
      .to('.corn-q', { autoAlpha: 0, duration: 0.06 }, 0.17)
      .to(st, { r: 1, duration: 0.3, ease: 'power2.in', onUpdate: paint }, 0.22)
      .to('.cob', { autoAlpha: 1, y: 0, stagger: 0.03, duration: 0.1 }, 0.5)
      .to('.cob-1', { y: -60, duration: 0.3 }, 0.62).to('.cob-2', { y: -110, duration: 0.3 }, 0.62).to('.cob-3', { y: -30, duration: 0.3 }, 0.62)
      .to('.corn-copy > *', { opacity: 1, y: 0, stagger: 0.035, duration: 0.08 }, 0.5)
      .fromTo('.corn-stamp', { autoAlpha: 0, scale: 2.1 }, { keyframes: [{ autoAlpha: 1, scale: 0.94, duration: 0.03 }, { scale: 1.05, duration: 0.015 }, { scale: 1, duration: 0.015 }] }, 0.8)
      .to({}, { duration: 0.1 }, 0.9);
    measure();
    addEventListener('load', measure);
  })();

  // look her in the eye, and fall through
  (function portal() {
    var stage = $('.portal .stage'), pb = $('.pb'), cover = $('.portal-cover');
    var st = { tail: 0 }, h = 0, R = 0;
    // the green circle is the pupil itself: same size as she grows, then it keeps going until it is the next section
    function paint() {
      var s = gsap.getProperty(pb, 'scale');
      var r = s > 1.01 ? (8.85 / 258.4) * h * s + st.tail * R : 0;
      cover.style.clipPath = 'circle(' + r.toFixed(1) + 'px at 50% 50%)';
    }
    function measure() { h = parseFloat(getComputedStyle(pb).height); R = Math.hypot(stage.clientWidth, stage.clientHeight) / 2 + 10; paint(); }
    gsap.set(pb, { xPercent: -60.7, yPercent: -39.5, transformOrigin: '60.7% 39.5%' });
    var tl = scene('.portal', { onRefresh: measure, onToggle: function (s) { pb.classList.toggle('no-look', s.isActive); } });
    tl.fromTo(pb, { y: function () { return innerHeight * 0.95; } }, { y: 0, duration: 0.3, ease: 'power2.out' }, 0)
      .to('.portal-q', { yPercent: -260, duration: 0.1, ease: 'power2.in' }, 0.24)
      .to('.pb .bu-sp', { autoAlpha: 0, duration: 0.08 }, 0.32)
      .to(pb, { scale: 15, duration: 0.42, ease: 'power3.in', onUpdate: paint }, 0.38)
      .to(st, { tail: 1, duration: 0.2, ease: 'power2.in', onUpdate: paint }, 0.74)
      .to({}, { duration: 0.06 }, 0.94);
    measure();
  })();

  // the coop: layers drift, the hens run and jump
  (function free() {
    gsap.to('.pano-far', { x: 90, ease: 'none', scrollTrigger: { trigger: '.pano', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.to('.pano-near', { x: 44, ease: 'none', scrollTrigger: { trigger: '.pano', start: 'top bottom', end: 'bottom top', scrub: true } });
    var hens = $$('.runner'), W = innerWidth;
    function run(p) {
      hens.forEach(function (h, i) {
        var q = p * 1.5 - i * 0.11;
        // the translate property sits outside the flip, so flipped and plain hens run the same way
        var x = W * 1.05 - q * W * 1.1;
        var y = i % 2 ? -Math.abs(Math.sin(q * Math.PI * 7)) * 46 : -Math.abs(Math.sin(q * Math.PI * 16)) * 8;
        h.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
        Lulu.walk(h, q * 11);
      });
    }
    ScrollTrigger.create({ trigger: '.pano', start: 'top bottom', end: 'bottom top', onUpdate: function (s) { run(s.progress); }, onRefresh: function (s) { W = innerWidth; run(s.progress); } });
    run(0);
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } });
    }, { threshold: 0.12 });
    $$('.thud').forEach(function (t) { io.observe(t); });
  })();

  // lilach's line, as a line of footprints: it runs in the margin and crosses in the gaps between sections
  (function trail() {
    var box = $('.trail'), cat = $('.catalog');
    if (!box) return;
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg'), feet = [], walker = null, shown = 0, top0 = 0;
    box.appendChild(svg);
    var henTpl = $('.ring-hen');
    if (henTpl) { walker = henTpl.cloneNode(true); walker.setAttribute('class', 'hen trail-hen'); walker.style.opacity = 0; box.appendChild(walker); }
    function spline(pts, step) {
      var out = [], carry = 0;
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        var seg = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(4, Math.round(seg / 6));
        var px = p1[0], py = p1[1];
        for (var j = 1; j <= n; j++) {
          var t = j / n, t2 = t * t, t3 = t2 * t;
          var x = 0.5 * (2 * p1[0] + (p2[0] - p0[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * t3);
          var y = 0.5 * (2 * p1[1] + (p2[1] - p0[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * t3);
          carry += Math.hypot(x - px, y - py);
          if (carry >= step) { carry = 0; out.push([x, y, Math.atan2(y - py, x - px)]); }
          px = x; py = y;
        }
      }
      return out;
    }
    function build() {
      var W = cat.clientWidth, H = cat.scrollHeight, phone = innerWidth < 768;
      top0 = cat.getBoundingClientRect().top + scrollY;
      var g = parseFloat(getComputedStyle($('.wrap')).paddingInlineStart) || 40;
      var side = phone ? 8 : g / 2, L = side, Rr = W - side;
      svg.setAttribute('width', W); svg.setAttribute('height', H);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var secs = $$('.sec', cat).map(function (s) { var r = s.getBoundingClientRect(); return [r.top + scrollY - top0, r.height]; });
      var pts = [[Rr, 0]], cur = Rr;
      secs.forEach(function (s, i) {
        var end = s[0] + s[1], pad = phone ? 0 : parseFloat(getComputedStyle($('.sec')).paddingTop) * 0.5;
        var m = 6;
        for (var k = 1; k <= m; k++) { var yy = s[0] + (s[1] - pad) * (k / m); pts.push([cur + Math.sin(k * 1.7) * (phone ? 2 : side * 0.34), yy]); }
        if (i < secs.length - 1 && !phone) {
          var next = cur === Rr ? L : Rr;
          pts.push([W * 0.72 * (cur === Rr ? 1 : 0.4), end - pad * 0.15], [W * 0.5, end + pad * 0.1], [W * 0.28 * (cur === Rr ? 1 : 2.5), end + pad * 0.3], [next, end + pad * 1.05]);
          cur = next;
        }
      });
      var list = spline(pts, phone ? 34 : 50);
      svg.textContent = '';
      var size = phone ? 12 : 22, frag = document.createDocumentFragment();
      feet = list.map(function (p, i) {
        var u = document.createElementNS(NS, 'use');
        var nx = -Math.sin(p[2]) * size * 0.38 * (i % 2 ? 1 : -1), ny = Math.cos(p[2]) * size * 0.38 * (i % 2 ? 1 : -1);
        var x = p[0] + nx, y = p[1] + ny;
        u.setAttribute('href', '#foot'); u.setAttribute('width', size); u.setAttribute('height', size * 0.69);
        u.setAttribute('x', x - size / 2); u.setAttribute('y', y - size * 0.35);
        u.setAttribute('transform', 'rotate(' + ((p[2] * 180) / Math.PI - 90).toFixed(1) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
        u.setAttribute('class', 'tf');
        frag.appendChild(u);
        return { el: u, x: p[0], y: p[1], a: p[2] };
      });
      svg.appendChild(frag);
      shown = 0;
      advance();
    }
    function advance() {
      var y = scrollY + innerHeight * 0.72 - top0;
      var n = shown;
      while (n < feet.length && feet[n].y < y) { feet[n].el.classList.add('on'); n++; }
      while (n > 0 && feet[n - 1].y >= y) { n--; feet[n].el.classList.remove('on'); }
      if (n !== shown || (walker && n === 0)) {
        shown = n;
        if (walker) {
          var f = feet[Math.max(0, n - 1)];
          walker.style.opacity = n > 0 && n < feet.length ? 1 : 0;
          if (f) {
            var w = walker.getBoundingClientRect().width, flip = Math.cos(f.a) < -0.2;
            walker.style.transform = 'translate(' + (f.x - w / 2).toFixed(1) + 'px,' + (f.y - w * 1.3).toFixed(1) + 'px) scaleX(' + (flip ? -1 : 1) + ')';
            Lulu.walk(walker, n / 2);
          }
        }
      }
    }
    ScrollTrigger.create({ trigger: cat, start: 'top bottom', end: 'bottom top', onUpdate: advance, onRefresh: build });
    var t = 0;
    document.addEventListener('lulu:layout', function () { clearTimeout(t); t = setTimeout(build, 80); });
    build();
    addEventListener('load', build);
  })();
})();
