// Smooth scroll, anchor glide and one-shot reveal. Reduced motion gets none of it and the page simply works.
(function () {
  var root = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var Lulu = (window.Lulu = window.Lulu || {});
  Lulu.reduced = reduced;

  if (!reduced && window.gsap && window.ScrollTrigger && window.Lenis) {
    gsap.registerPlugin(ScrollTrigger);
    var lenis = new Lenis({ autoRaf: false, lerp: 0.08 });
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
    var go = function () { var y = el.getBoundingClientRect().top + scrollY; if (window.lenis) window.lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y); };
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
  }
})();

// The hens are alive: eyes follow the pointer, blink now and then, and legs move only when something asks them to.
// Nothing here runs in a loop at rest: eyes only on pointer moves, blinks on a slow timer, off-screen hens are skipped.
(function () {
  var Lulu = (window.Lulu = window.Lulu || {});
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; }
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
  function moveLine(e) { if (line) line.style.transform = 'translateY(' + e.clientY + 'px)'; }
  function apply() {
    root.style.setProperty('--a11y-scale', SCALE[state.size || 0]);
    TOGGLES.forEach(function (t) { root.classList.toggle('a11y-' + t[0], !!state[t[0]]); });
    if (document.getAnimations) {
      document.getAnimations().forEach(function (a) {
        if (!a.effect || a.effect.getComputedTiming().iterations !== Infinity) return;
        if (state.still) a.pause(); else a.play();
      });
    }
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
  var list = TOGGLES.map(function (t) { return '<button type="button" class="a11y-opt" data-t="' + t[0] + '" aria-pressed="' + !!state[t[0]] + '">' + t[1] + '</button>'; }).join('');
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
      state = {};
      panel.querySelectorAll('[aria-pressed]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      panel.querySelector('[data-size]').textContent = '100%';
    } else return;
    apply(); save();
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
  function filterPts() {
    var term = (q && q.value || '').trim().toLowerCase();
    var shown = 0, match = 0;
    pts.forEach(function (li) {
      var ok = (region === 'all' || li.dataset.region === region) && (!term || li.dataset.name.toLowerCase().indexOf(term) > -1);
      if (ok) match++;
      var vis = ok && (expanded || term || region !== 'all' || shown < 12);
      li.hidden = !vis;
      if (vis) shown++;
    });
    if (count) count.textContent = match + (match === 1 ? ' נקודת מכירה' : ' נקודות מכירה');
    if (empty) empty.hidden = match !== 0;
    if (allBtn) {
      allBtn.hidden = !!term || region !== 'all' || match <= 12;
      allBtn.setAttribute('aria-expanded', String(expanded));
      allBtn.textContent = expanded ? 'להציג פחות' : 'להציג את כל ' + pts.length + ' הנקודות';
    }
    refresh();
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
      location.href = form.dataset.thanks;
    });
  });
})();

// Sketch B: one walk. A single scroll-bound timeline runs the story, the layers move on the compositor, and nothing is measured while scrolling.
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var html = document.documentElement;
  var live = html.classList.contains('gsap-live');

  // menu and "you are here": these work with motion off as well
  var menuBtn = $('[data-menu]'), mnav = $('#mnav');
  function menu(on) {
    if (!mnav) return;
    mnav.hidden = !on;
    menuBtn.setAttribute('aria-expanded', String(on));
    if (on) { var f = $('a', mnav); if (f) f.focus({ preventScroll: true }); }
  }
  if (menuBtn) menuBtn.addEventListener('click', function () { menu(mnav.hidden); });
  $$('[data-mclose]').forEach(function (a) { a.addEventListener('click', function () { menu(false); }); });
  document.addEventListener('lulu:closemenu', function () { menu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mnav && !mnav.hidden) { menu(false); menuBtn.focus(); } });
  var NAMES = { top: 'הבית', about: 'על לולו', weeks: 'שבועות גידול', products: 'המוצרים', recipes: 'מתכונים', where: 'איפה קונים' };
  var here = $('[data-here]'), spied = '', pinned = document.body.dataset.pinNav;
  function spy(id) {
    id = pinned || id;
    if (id === spied) return;
    spied = id;
    $$('[data-nav]').forEach(function (a) {
      var on = a.dataset.nav === id;
      a.classList.toggle('is-on', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    if (here) here.textContent = NAMES[id] || '';
  }
  if ('IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) spy(e.target.dataset.spy); }); }, { rootMargin: '-50% 0px -50% 0px' });
    $$(live ? '.catalog [data-spy]' : '[data-spy]').forEach(function (s) { sio.observe(s); });
  }
  spy('top');

  // the preview beside the product list: follows the pointer or the keyboard, and the hen on the card pecks at each change
  var view = $('.prd-view'), list = $('[data-list="products"]');
  if (view && list) {
    var vImg = $('.view-img', view), vName = $('.view-name', view), vDesc = $('.view-desc', view), vCard = $('.view-card', view), vHen = $('.view-hen', view), peckT;
    var show = function (li) {
      var im = $('.prd-img', li), a = $('.prd-link', li);
      if (!im || vCard.getAttribute('href') === a.getAttribute('href')) return;
      vImg.src = im.currentSrc || im.src;
      vName.textContent = $('.prd-name', li).textContent;
      var de = $('.prd-desc', li); vDesc.textContent = de ? de.textContent : '';
      vCard.href = a.href;
      vHen.classList.add('is-peck');
      clearTimeout(peckT); peckT = setTimeout(function () { vHen.classList.remove('is-peck'); }, 170);
    };
    var pick = function (e) { var li = e.target.closest && e.target.closest('.prd:not(.prd-more)'); if (li) show(li); };
    list.addEventListener('pointerover', pick);
    list.addEventListener('focusin', pick);
    document.addEventListener('lulu:layout', function () { var li = $('.prd:not(.prd-more):not([hidden])', list); if (li) show(li); });
  }

  if (!live) return;
  ScrollTrigger.config({ ignoreMobileResize: true });

  var world = $('.world'), stage = $('.stage');
  var STOPS = JSON.parse(world.dataset.stops);
  function posAt(t) {
    for (var i = 1; i < STOPS.length; i++) if (t <= STOPS[i][0]) { var a = STOPS[i - 1], b = STOPS[i]; return a[1] + ((t - a[0]) / (b[0] - a[0])) * (b[1] - a[1]); }
    return STOPS[STOPS.length - 1][1];
  }
  var layers = $$('.layer').map(function (el) { return { el: el, k: +el.dataset.k || 1 }; });
  var chick = $('.lu-chick .hen'), hen = $('.lu-hen .hen'), eggBox = $('.lu-egg'), clip = $('.line-clip'), weekEl = $('[data-week]');
  var herd = $$('.herd').map(function (el) { return { el: el, run: +el.dataset.run, x0: posAt(+el.dataset.t), bird: $('.hen', el) }; });
  // a piece exists only from the moment it starts to stand until it has left the screen, so the page never carries the whole village at once
  var pops = $$('.pop[data-t]').map(function (el) { return { el: el, t: +el.dataset.t, p: parseFloat(el.style.insetInlineStart), on: null }; });
  var lastX = -1, lastWeek = 0, lastPeck = null, lastClip = null, heroGone = false;

  function frame(self) {
    var t = self.progress * 100, x = posAt(t);
    if (x !== lastX) {
      for (var i = 0; i < layers.length; i++) layers[i].el.style.transform = 'translate3d(' + (x * layers[i].k).toFixed(2) + 'vw,0,0)';
      if (t < 17) eggBox.style.rotate = (Math.sin(x / 2.4) * 9).toFixed(1) + 'deg';
      if (t >= 16 && t < 37) Lulu.walk(chick, x / 3.6);
      if (t >= 36) Lulu.walk(hen, x / 5.5, t > 57 && t < 68 ? 0 : 1);
      for (var q = 0; q < pops.length; q++) {
        var o = pops[q], show = t >= o.t && o.p - x > -60;
        if (show !== o.on) { o.el.style.visibility = show ? '' : 'hidden'; o.on = show; }
      }
      for (var h = 0; h < herd.length; h++) {
        var g = herd[h], d = x - g.x0;
        if (d < -60 || d > 130 || !g.run) continue;
        g.el.style.translate = (-g.run * d).toFixed(2) + 'vw 0';
        if (g.bird) Lulu.walk(g.bird, (d + h * 3) / 4);
      }
      lastX = x;
    }
    var w = Math.min(16, 1 + Math.floor(t / 80 * 16));
    if (w !== lastWeek) { weekEl.textContent = w; lastWeek = w; }
    // she stops at the corn and pecks: the drawing swaps in time with the scroll
    var peck = t > 58 && t < 67 && Math.floor(t * 1.5) % 2 === 0;
    if (peck !== lastPeck) { hen.classList.toggle('is-peck', peck); lastPeck = peck; }
    stage.classList.toggle('on-wood', t > 86.5);
    html.classList.toggle('is-past', t > 9);
    html.classList.toggle('is-done', t > 99.5);
    // the last stretch: the line stops trailing behind her and runs on ahead, to the edge of the table
    var c = t <= 91 ? 35 : t >= 99 ? 0 : 35 * (99 - t) / 8;
    if (c !== lastClip) { clip.style.clipPath = 'inset(0 0 0 ' + c.toFixed(2) + 'vw)'; lastClip = c; }
    spy(t < 9 ? 'top' : 'about');
    // the first page has walked out of the frame: its links stop taking keyboard focus
    if ((t > 11) !== heroGone) { heroGone = t > 11; $('.hero').inert = heroGone; }
  }

  var tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.journey', start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: frame, onRefresh: frame }
  });
  tl.to({}, { duration: 0.001 }, 100);

  // the book: each piece stands up on its hinge as she nears it
  gsap.set('.pop[data-t]', { transformPerspective: 900, rotationX: 86 });
  $$('.pop[data-t]').forEach(function (el) {
    var t = +el.dataset.t;
    tl.to(el, { rotationX: -6, duration: 2.1, ease: 'power2.out' }, t).to(el, { rotationX: 0, duration: 0.7, ease: 'power2.inOut' }, t + 2.1);
  });

  // the first page leaves, then one chapter at a time drifts through, a touch slower than the world
  tl.to('.hero', { xPercent: 100, duration: 8.5, ease: 'power2.in' }, 2.5);
  [['.chap-1', 12, 22.5], ['.chap-2', 24, 38.5], ['.chap-3', 40, 54.5], ['.chap-4', 56, 69.5], ['.chap-5', 71, 84.5], ['.chap-6', 88.5, 101]].forEach(function (c) {
    var kids = $$(c[0] + ' > :not(.chap-art)');
    tl.set(c[0], { opacity: 1 }, c[1]);
    tl.fromTo(kids, { opacity: 0, xPercent: -5 }, { opacity: 1, xPercent: 0, duration: 1.8, stagger: 0.3, ease: 'power2.out' }, c[1]);
    if (c[2] <= 100) tl.to(kids, { opacity: 0, xPercent: 5, duration: 1.3, stagger: 0.1, ease: 'power2.in' }, c[2] - 1.6);
  });
  gsap.set($$('.chap > :not(.chap-art)'), { opacity: 0 });
  // keyboard: focus on the closing button brings its moment on screen
  var closing = $('.chap-acts a');
  if (closing) closing.addEventListener('focus', function () { var s = tl.scrollTrigger; lenis.scrollTo(s.start + (s.end - s.start) * 0.93, { immediate: true, force: true }); });

  // egg to chick to hen. The shell breaks on the same zigzag as the pack's edge
  tl.set('.egg-whole', { opacity: 0 }, 16.4).set('.shell', { opacity: 1 }, 16.4);
  tl.to('.shell-t', { yPercent: -150, xPercent: 60, rotation: 30, opacity: 0, duration: 1.8, ease: 'power2.out' }, 16.4);
  tl.to('.shell-b', { xPercent: 240, opacity: 0, duration: 4, ease: 'none' }, 16.8);
  tl.fromTo('.lu-chick', { scale: 0.12, opacity: 0 }, { keyframes: [{ scale: 0.46, opacity: 1, duration: 1.1, ease: 'power2.out' }, { scale: 0.4, duration: 0.5, ease: 'power2.inOut' }] }, 16.6);
  tl.to('.lu-chick', { scale: 0.56, duration: 17.6 }, 18.2);
  tl.set('.lu-chick', { opacity: 0 }, 36.2);
  tl.fromTo('.lu-hen', { scale: 0.46, opacity: 0 }, { keyframes: [{ scale: 0.64, opacity: 1, duration: 0.8, ease: 'power2.out' }, { scale: 0.6, duration: 0.4, ease: 'power2.inOut' }] }, 36.2);
  tl.to('.lu-hen', { scale: 1, duration: 17 }, 37.4);

  // the end of the walk: yellow wood wipes the kraft away, the farm stamp comes up like a sun
  gsap.set('.wood', { xPercent: -106 });
  tl.to('.wood', { xPercent: 0, duration: 5.2, ease: 'power2.inOut' }, 84);
  gsap.set('.farm-sun', { yPercent: 112, rotation: -16, autoAlpha: 0 });
  tl.set('.farm-sun', { autoAlpha: 1 }, 89);
  tl.to('.farm-sun', { yPercent: 0, rotation: 0, duration: 7, ease: 'power2.out' }, 89);

  // the white line: drawn once per size, revealed by a fixed edge at her feet, so scrolling never repaints it
  var svg = $('.line-svg'), path = $('.line-p');
  function vuNow(W, H) { return Math.min(Math.max(0.62, Math.min(W * 0.00085, 1.3)), H * 0.0014); }
  function arm(from, to, seg) {
    var dx = (to[0] - from[0]) / 6, dy = (to[1] - from[1]) / 6, len = Math.hypot(dx, dy), max = seg * 0.4, k = len > max && len ? max / len : 1;
    return [dx * k, dy * k];
  }
  function spline(p) {
    var d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1);
    for (var i = 0; i < p.length - 1; i++) {
      var a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c, seg = Math.hypot(c[0] - b[0], c[1] - b[1]);
      var m = arm(a, c, seg), n = arm(b, e, seg);
      d += 'C' + (b[0] + m[0]).toFixed(1) + ' ' + (b[1] + m[1]).toFixed(1) + ' ' + (c[0] - n[0]).toFixed(1) + ' ' + (c[1] - n[1]).toFixed(1) + ' ' + c[0].toFixed(1) + ' ' + c[1].toFixed(1);
    }
    return d;
  }
  // [screen widths/100 from the right, height above the ground in drawing units]
  var ROUTE = [[0, 7], [40, 7], [65, 7], [85, 20], [105, 8], [125, 30], [145, 10], [170, 14], [198, 18], [205, 84], [210, 150], [205, 186], [200, 150], [205, 84], [214, 16], [245, 8], [270, 44], [295, 12], [320, 34], [345, 14], [364, 20], [370, 90], [375, 158], [370, 190], [365, 158], [370, 90], [380, 18], [425, 8], [450, 28], [470, 8], [488, 12], [499, 8]];
  function drawLine() {
    var W = innerWidth, H = stage.clientHeight, vw = W / 100, vu = vuNow(W, H), gr = $('.ground').offsetHeight, full = 520 * vw;
    svg.setAttribute('width', full); svg.setAttribute('height', H);
    svg.setAttribute('viewBox', '0 0 ' + full + ' ' + H);
    var pts = ROUTE.map(function (p) { return [full - p[0] * vw, H - gr - p[1] * vu]; });
    pts.push([full - 501 * vw, H - gr * 0.5], [full - 501 * vw, H + 8]);
    path.setAttribute('d', spline(pts));
  }
  drawLine();

  // the catalog: the same line carries on down the page in the margins and across the gaps between sections, and ends at the nest
  var X0 = function () { return innerWidth * 0.14; };
  var secs = $$('.catalog .sec, .ft');
  var lnSegs = secs.map(function (sec) {
    var c = document.createElement('div'), i = document.createElement('div');
    c.className = 'ln'; c.setAttribute('aria-hidden', 'true'); i.className = 'ln-i';
    i.innerHTML = '<svg><path/></svg>';
    c.appendChild(i); sec.insertBefore(c, sec.firstChild);
    gsap.fromTo(c, { yPercent: -100 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: sec, start: 'top 78%', end: sec.classList.contains('ft') ? 'bottom bottom' : 'bottom 78%', scrub: true } });
    gsap.fromTo(i, { yPercent: 100 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: sec, start: 'top 78%', end: sec.classList.contains('ft') ? 'bottom bottom' : 'bottom 78%', scrub: true } });
    return { sec: sec, svg: $('svg', i), path: $('path', i) };
  });
  function drawCatalog() {
    var W = document.documentElement.clientWidth, wrap = $('.wrap'), side = Math.max(8, (wrap ? parseFloat(getComputedStyle(wrap).paddingLeft) : W * 0.04) * 0.45), wave = Math.min(side * 0.5, 16);
    var L = side, R = W - side, x = X0(), toRight = false;
    lnSegs.forEach(function (s, n) {
      var H = s.sec.offsetHeight, pad = parseFloat(getComputedStyle(s.sec).paddingTop) || 64, to = toRight ? R : L, p;
      var isFoot = s.sec.classList.contains('ft');
      if (isFoot) {
        var nest = $('.ft-nest', s.sec), r = nest.getBoundingClientRect(), o = s.sec.getBoundingClientRect();
        var nx = r.left - o.left + r.width * 0.5, ny = r.top - o.top + r.height * 0.82, land = $('.ft-land', s.sec).offsetTop;
        p = [[x, 0], [x + (x < W / 2 ? wave : -wave), land * 0.5], [x, land + 4], [(x + nx) / 2, land + (ny - land) * 1.1], [nx, ny]];
      } else if (n === 0) {
        p = [[x, -2], [(x + to) / 2, pad * 0.36], [to, pad * 0.9], [to + wave, H * 0.34], [to - wave * 0.4, H * 0.68], [to, H + 16]];
      } else {
        // the crossing: a slow S with one loop, in the space above the heading
        var mid = (x + to) / 2, dir = to > x ? 1 : -1, ry = pad * 0.34;
        p = [[x, -2], [x + dir * (W * 0.12), pad * 0.52], [mid - dir * W * 0.06, pad * 0.66], [mid + dir * W * 0.015, pad * 0.34], [mid, pad * 0.12], [mid - dir * W * 0.015, pad * 0.34], [mid + dir * W * 0.08, pad * 0.68], [to - dir * W * 0.1, pad * 0.72], [to, pad], [to + wave, H * 0.4], [to - wave * 0.4, H * 0.72], [to, H + 16]];
      }
      s.svg.setAttribute('width', W); s.svg.setAttribute('height', H + 16);
      s.svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (H + 16));
      s.path.setAttribute('d', spline(p));
      x = to; toRight = !toRight;
    });
  }
  drawCatalog();
  var built = innerWidth, rT;
  addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(function () { if (innerWidth === built) return; built = innerWidth; drawLine(); drawCatalog(); }, 160); });
  document.addEventListener('lulu:layout', drawCatalog);
  addEventListener('load', function () { drawCatalog(); });

  // the dock steps aside while you read the catalog, and comes back when you scroll up. Over the footer it stays away
  var lastY = 0, footIn = false, jEnd = function () { return tl.scrollTrigger.end; };
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { footIn = en[0].isIntersecting; html.classList.toggle('dock-away', footIn || html.classList.contains('dock-away')); }).observe($('.ft'));
  function dockFrom(y) {
    var dn = y > lastY + 2, up = y < lastY - 2;
    if (y < jEnd() + 40 || (up && !footIn)) html.classList.remove('dock-away');
    else if (dn) html.classList.add('dock-away');
    lastY = y;
  }
  window.lenis.on('scroll', function (e) { dockFrom(e.scroll); });
})();
