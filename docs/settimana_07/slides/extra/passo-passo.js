/*
 * Slide scritte a mano: la retta dei minimi quadrati senza derivate, piano
 * piano. Dieci scene, una idea per slide:
 *
 *   pp-fissa       si tiene ferma la pendenza α: restano le parallele, una per β
 *   pp-resta       u_i = y_i − α x_i, prima per un punto, poi per tutti
 *   pp-togli       si toglie la pendenza: i punti scendono all'altezza u_i
 *   pp-residuo     r_i = y_i − (α x_i + β) = u_i − β: una retta orizzontale
 *   pp-quadrati    i quadrati dei residui; la loro somma f è minima nella media
 *   pp-resto       f(β) = resto + n (m_U − β)²: come h(c), il minimo in β = m_U
 *   pp-rimetti     si rimette la pendenza: β = m_Y − α m_X
 *   pp-baricentro  la retta passa per (m_X, m_Y)
 *   pp-ventaglio   cambiando α la retta gira attorno al baricentro
 *   pp-quale       f al variare di α: il minimo è la retta dei minimi quadrati
 *
 * I dati sono qui sotto e si possono cambiare: assi, zoom, cursori, formule
 * con i numeri e frasi con i numeri si ricalcolano da soli.
 */
(function () {
  'use strict';

  // ── I dati (x crescenti) e la pendenza che si tiene ferma nel passo 1 ──
  var XS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  var YS = [3, 3, 5, 4, 6, 8, 7, 9, 10, 10];
  var ALPHA = 1;

  // ── Quantità derivate ──
  var N = XS.length;
  var sum = function (a) { return a.reduce(function (s, v) { return s + v; }, 0); };
  var max = function (a) { return Math.max.apply(null, a); };
  var min = function (a) { return Math.min.apply(null, a); };
  var US = XS.map(function (x, i) { return YS[i] - ALPHA * x; });
  var MX = sum(XS) / N, MY = sum(YS) / N, M_U = sum(US) / N;
  var SXX = sum(XS.map(function (x) { return (x - MX) * (x - MX); }));
  var SXY = sum(XS.map(function (x, i) { return (x - MX) * (YS[i] - MY); }));
  var A_BEST = SXY / SXX;
  var betaFor = function (a) { return MY - a * MX; };
  var B_BEST = betaFor(A_BEST);
  var fBeta = function (b) { return sum(US.map(function (u) { return (u - b) * (u - b); })); };
  var fAlpha = function (a) {
    var b = betaFor(a);
    return sum(XS.map(function (x, i) { var r = YS[i] - a * x - b; return r * r; }));
  };
  var REST = fBeta(M_U);

  // Il punto da guardare per primo: u più grande, a parità il più centrale.
  var FOCUS = 0;
  US.forEach(function (u, i) {
    var mid = (N - 1) / 2;
    if (u > US[FOCUS] || (u === US[FOCUS] && Math.abs(i - mid) < Math.abs(FOCUS - mid))) FOCUS = i;
  });

  // Di quanto si sposta β attorno alla media nelle animazioni.
  var D = Math.max(0.5, Math.round(max(US) - min(US)) / 2);
  var B_HIGH = M_U + D, B_LOW = M_U - D;

  // Pendenze del ventaglio: attorno alla migliore, con dentro quella fissata.
  var AD = Math.max(0.6, Math.abs(ALPHA - A_BEST) + 0.3);
  var A_LO = A_BEST - AD, A_HI = A_BEST + AD;

  // ── Formati ──
  function fmtN(v, d) {          // numero «pulito»: 5; 0,5; 1,47
    d = d === undefined ? 2 : d;
    var p = Math.pow(10, d), r = Math.round(v * p) / p;
    if (Math.abs(r) < 1e-9) r = 0;
    return r.toLocaleString('it-IT', { maximumFractionDigits: d });
  }
  function fmtF(v, d) {          // decimali fissi, per i numeri che cambiano
    var p = Math.pow(10, d), r = Math.round(v * p) / p;
    if (Math.abs(r) < 1e-9) r = 0;
    return r.toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−');
  }
  var fmtS = function (v) { return fmtN(v).replace('-', '−'); };   // per i testi SVG
  var texN = function (v) { return fmtN(v).replace(',', '{,}'); };  // per KaTeX
  var clamp01 = function (v) { return Math.max(0, Math.min(1, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  // ── Colori ──
  var C = {
    pt: '#4684f1', slope: '#9ca3af', u: '#f59e0b', beta: '#1f4e78', mean: '#38aa57',
    band: '#e6f4ea', sq: '#ed4335', grid: '#e5e7eb', axis: '#9ca3af', dark: '#111827',
    fan: '#9ca3af', zero: '#cbd5e1'
  };

  // ── Viste verticali dei grafici ──
  var X_LO = 0, X_HI = max(XS) + 1;
  var PH_MAIN = 540 - 12 - 48, PW_MAIN = 800 - 58 - 16;
  function padded(lo, hi, below, above) {
    var s = (hi - lo) || 1;
    return [lo - s * below, hi + s * above];
  }
  // Dati con la pendenza: tutti i punti e la retta y = αx.
  var FULL = padded(Math.min(0, min(YS)), Math.max(max(YS), ALPHA * X_HI), 0.05, 0.08);
  // Dati senza pendenza: gli u e le rette orizzontali. La scala verticale è
  // quella orizzontale (se basta), così i quadrati dei residui sono quadrati.
  var ZOOM = (function () {
    var lo = Math.min(0, min(US), B_LOW), hi = Math.max(max(US), B_HIGH);
    var span = Math.max((hi - lo) * 1.9, PH_MAIN / (PW_MAIN / (X_HI - X_LO)));
    var mid = (lo + hi) / 2;
    return [mid - 0.42 * span, mid + 0.58 * span];
  })();
  // Il ventaglio: tutte le rette tra A_LO e A_HI.
  var FAN = (function () {
    var ends = [A_LO, A_HI].reduce(function (acc, a) {
      return acc.concat([betaFor(a), a * X_HI + betaFor(a)]);
    }, YS.slice());
    return padded(Math.min(0, min(ends)), max(ends), 0.05, 0.06);
  })();

  // ── Piccole utilità SVG ──
  var svg = function (tag, attrs, parent) { return PSI.svg(tag, attrs, parent); };
  var text = function (parent, x, y, content, cls, attrs) { return PSI.text(parent, x, y, content, cls, attrs); };
  function line(parent, stroke, width, dash) {
    return svg('line', { stroke: stroke, 'stroke-width': width || 1, 'stroke-dasharray': dash || null }, parent);
  }
  function setLine(n, x1, y1, x2, y2) {
    n.setAttribute('x1', x1); n.setAttribute('y1', y1);
    n.setAttribute('x2', x2); n.setAttribute('y2', y2);
  }
  function op(n, v) { n.setAttribute('opacity', v); }
  // Testo con un deponente: sub(nodo, 'prima ', 'U', ' dopo') scrive «prima m_U dopo».
  function sub(node, before, idx, after) {
    node.textContent = before + 'm';
    svg('tspan', { 'baseline-shift': 'sub', 'font-size': '72%' }, node).textContent = idx;
    svg('tspan', {}, node).textContent = after;
    return node;
  }
  function niceStep(span, target) {
    var raw = span / target, mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  }

  // Un grafico: assi, griglia che segue la vista verticale, livelli.
  var clipN = 0;
  function chart(root, o) {
    o = Object.assign({
      W: 800, H: 540, L: 58, R: 16, T: 12, B: 48, xLo: X_LO, xHi: X_HI,
      view: FULL, xLabel: 'x', yLabel: 'y', xTarget: 11, yTarget: 6
    }, o);
    var c = { o: o, lo: o.view[0], hi: o.view[1] };
    var PW = o.W - o.L - o.R, PH = o.H - o.T - o.B;
    c.PH = PH;
    c.X = function (x) { return o.L + (x - o.xLo) / (o.xHi - o.xLo) * PW; };
    c.Y = function (v) { return o.T + PH - (v - c.lo) / (c.hi - c.lo) * PH; };
    c.px = function () { return PH / (c.hi - c.lo); };

    var id = 'pp-clip-' + (++clipN);
    var cp = svg('clipPath', { id: id }, svg('defs', {}, root));
    svg('rect', { x: o.L, y: o.T, width: PW, height: PH }, cp);
    c.grid = svg('g', {}, root);
    c.plot = svg('g', { 'clip-path': 'url(#' + id + ')' }, root);
    var axes = svg('g', {}, root);
    c.top = svg('g', {}, root);

    setLine(line(axes, C.axis, 1.4), o.L, o.T + PH, o.W - o.R, o.T + PH);
    setLine(line(axes, C.axis, 1.4), o.L, o.T, o.L, o.T + PH);
    var xs = niceStep(o.xHi - o.xLo, o.xTarget);
    for (var v = Math.ceil(o.xLo / xs) * xs; v < o.xHi - 1e-9; v += xs) {
      var vx = Math.round(v / xs) * xs;
      setLine(line(axes, C.axis, 1.4), c.X(vx), o.T + PH, c.X(vx), o.T + PH + 5);
      text(axes, c.X(vx), o.T + PH + 21, fmtS(vx), 'pp-tick', { 'text-anchor': 'middle' });
    }
    text(axes, o.W - o.R, o.H - 6, o.xLabel, 'pp-axis-label', { 'text-anchor': 'end' });
    c.yLab = text(axes, o.L - 44, o.T + PH / 2, o.yLabel, 'pp-axis-label', {
      'text-anchor': 'middle', transform: 'rotate(-90 ' + (o.L - 44) + ' ' + (o.T + PH / 2) + ')'
    });

    var key = '';
    c.setView = function (lo, hi) {
      c.lo = lo; c.hi = hi;
      var k = lo.toFixed(4) + ':' + hi.toFixed(4);
      if (k === key) return;
      key = k;
      c.grid.textContent = '';
      var step = niceStep(hi - lo, o.yTarget);
      for (var w = Math.ceil(lo / step) * step; w <= hi + 1e-9; w += step) {
        var vy = Math.round(w / step) * step, y = c.Y(vy);
        setLine(line(c.grid, Math.abs(vy) < 1e-9 ? C.zero : C.grid, 1), o.L, y, o.W - o.R, y);
        text(c.grid, o.L - 10, y + 5, fmtS(vy), 'pp-tick', { 'text-anchor': 'end' });
      }
    };
    c.setView(c.lo, c.hi);
    // Una retta y = f(x) da un bordo all'altro (il resto lo taglia il clip).
    c.lineFn = function (n, f) { setLine(n, c.X(o.xLo), c.Y(f(o.xLo)), c.X(o.xHi), c.Y(f(o.xHi))); };
    c.seg = function (n, x, y1, y2) { setLine(n, c.X(x), c.Y(y1), c.X(x), c.Y(y2)); };
    return c;
  }

  // I punti, con la pendenza tolta in parte (s = 0: i dati; s = 1: gli u).
  var ptY = function (i, s) { return YS[i] - s * ALPHA * XS[i]; };
  var tilt = function (x, s) { return (1 - s) * ALPHA * x; };
  function dots(c) {
    return XS.map(function () {
      return svg('circle', { r: 6.5, fill: C.pt, stroke: '#fff', 'stroke-width': 1.5 }, c.plot);
    });
  }
  function placeDots(c, ds, s) {
    ds.forEach(function (d, i) {
      d.setAttribute('cx', c.X(XS[i]));
      d.setAttribute('cy', c.Y(ptY(i, s)));
    });
  }
  function shearView(c, s) { c.setView(lerp(FULL[0], ZOOM[0], s), lerp(FULL[1], ZOOM[1], s)); }
  // Il baricentro (m_X, m_Y); place() lo rimette al suo posto se la vista cambia.
  function baricentro(c) {
    var g = svg('g', {}, c.top);
    var ring = svg('circle', { r: 15, fill: 'none', stroke: C.dark, 'stroke-width': 2 }, g);
    var dot = svg('circle', { r: 8, fill: C.dark, stroke: '#fff', 'stroke-width': 2.5 }, g);
    var lab = text(g, 0, 0, 'il baricentro', 'pp-lab pp-dark', {});
    var b = {
      g: g, ring: ring,
      place: function () {
        [ring, dot].forEach(function (n) { n.setAttribute('cx', c.X(MX)); n.setAttribute('cy', c.Y(MY)); });
        lab.setAttribute('x', c.X(MX) + 18);
        lab.setAttribute('y', c.Y(MY) + 30);
      }
    };
    b.place();
    return b;
  }

  // ── Formule e frasi: livelli sovrapposti, uno visibile per volta ──
  var SLOPE_TEX = ALPHA === 1 ? 'x' : texN(ALPHA) + '\\,x';
  var TEX = {
    fix: '\\alpha=' + texN(ALPHA) + ':\\qquad \\hat y=' + SLOPE_TEX + '+\\beta',
    fixq: '\\hat y=' + SLOPE_TEX + '+\\beta,\\qquad \\beta=\\;?',
    ufocus: 'u=' + texN(YS[FOCUS]) + '-' + texN(ALPHA) + '\\cdot ' + texN(XS[FOCUS]) + '=' + texN(US[FOCUS]),
    ulist: 'u_i:\\quad ' + US.map(texN).join(',\\;\\,'),
    fnum: 'f(\\beta)=\\textcolor{#23753c}{' + texN(REST) + '}+\\textcolor{#c5221f}{' + N +
          '\\,(' + texN(M_U) + '-\\beta)^2}',
    bnum: '\\beta=' + texN(MY) + '-' + texN(ALPHA) + '\\cdot ' + texN(MX) + '=' + texN(M_U),
    best: '\\alpha=' + texN(A_BEST) + ',\\qquad \\beta=' + texN(B_BEST)
  };
  var NUM = {
    alpha: fmtS(ALPHA), fy: fmtS(YS[FOCUS]), fax: fmtS(ALPHA * XS[FOCUS]), fu: fmtS(US[FOCUS])
  };
  function prepare(el) {
    el.querySelectorAll('[data-tex]').forEach(function (n) {
      if (window.katex) katex.render(TEX[n.getAttribute('data-tex')], n, { throwOnError: false });
      else n.textContent = TEX[n.getAttribute('data-tex')];
    });
    el.querySelectorAll('[data-n]').forEach(function (n) { n.textContent = NUM[n.getAttribute('data-n')]; });
    var eq = [].slice.call(el.querySelectorAll('.pp-eq .pp-v'));
    var say = [].slice.call(el.querySelectorAll('.pp-say .pp-v'));
    // v intero: si vede il livello v; tra due interi uno sparisce e l'altro compare.
    function fade(nodes, v) {
      nodes.forEach(function (n, i) { n.style.opacity = clamp01(1 - 2 * Math.abs(v - i)); });
    }
    return function (st) { fade(eq, st.eq || 0); fade(say, st.say || 0); };
  }
  var one = function (el, sel) { return el.querySelector(sel); };

  // Avanzamenti: ogni tween ridisegna la scena dallo stato.
  function steps(tl, st, render) {
    var base = function (vars) {
      return Object.assign({ duration: 0.8, ease: 'power2.inOut', onUpdate: render }, vars);
    };
    return {
      to: function (vars, pos) { tl.to(st, base(vars), pos); },
      fromTo: function (from, vars, pos) {
        tl.fromTo(st, from, base(Object.assign({ immediateRender: false }, vars)), pos);
      },
      label: function (name) { tl.addLabel(name); }
    };
  }
  function bindSlider(input, lo, hi, step, onInput) {
    input.min = lo; input.max = hi; input.step = step;
    input.addEventListener('input', function () { onInput(+this.value); });
    input.addEventListener('change', function () { this.blur(); });
    input.addEventListener('keydown', function (e) {
      if (/^Arrow/.test(e.key)) e.stopPropagation();   // le frecce non cambiano slide
    });
    return function (v) { if (Math.abs(+input.value - v) > step / 2) input.value = v; };
  }

  // ═══ 1. Teniamo ferma la pendenza ═══
  PSI.scene('pp-fissa', function (el, tl) {
    var show = prepare(el);
    var c = chart(one(el, '.pp-svg'));
    var pars = [-3, -2, -1, 0, 1, 2, 3].map(function (k) {
      var n = line(c.plot, C.beta, 2);
      c.lineFn(n, function (x) { return ALPHA * x + M_U + k * D; });
      return n;
    });
    var slope = line(c.plot, C.slope, 2.5, '8 6');
    c.lineFn(slope, function (x) { return ALPHA * x; });
    var ds = dots(c);
    placeDots(c, ds, 0);
    var slopeLab = text(c.top, c.X(0.5), c.Y(ALPHA * 0.5) + 26, 'y = αx', 'pp-lab pp-gray', {});

    var st = { line: 0, par: 0, eq: 0, say: 0 };
    function render() {
      show(st);
      op(slope, st.line); op(slopeLab, st.line);
      pars.forEach(function (n, k) { op(n, 0.45 * clamp01(st.par * pars.length - k)); });
    }
    render();
    var go = steps(tl, st, render);
    go.label('s0');
    go.to({ line: 1, eq: 1, say: 1 });
    go.label('s1');
    go.to({ eq: 2, say: 2 });
    go.to({ par: 1, duration: 1.4, ease: 'none' }, '<');
    go.label('s2');
  });

  // ═══ 2. Quello che resta, tolta la pendenza ═══
  PSI.scene('pp-resta', function (el, tl) {
    var show = prepare(el);
    var c = chart(one(el, '.pp-svg'));
    var slope = line(c.plot, C.slope, 2.5, '8 6');
    c.lineFn(slope, function (x) { return ALPHA * x; });
    var segs = XS.map(function (x, i) {
      var n = line(c.plot, C.u, 4);
      c.seg(n, x, ALPHA * x, YS[i]);
      return n;
    });
    var ds = dots(c);
    placeDots(c, ds, 0);
    var nums = XS.map(function (x, i) {
      return text(c.top, c.X(x) + 9, c.Y((ALPHA * x + YS[i]) / 2) + 5, fmtS(US[i]), 'pp-lab pp-u', {});
    });
    var F = FOCUS, fx = XS[F], up = US[F] >= 0;
    var focus = [
      svg('circle', { cx: c.X(fx), cy: c.Y(ALPHA * fx), r: 5, fill: C.slope }, c.top),
      text(c.top, c.X(fx), c.Y(YS[F]) + (up ? -14 : 26), 'y = ' + fmtS(YS[F]), 'pp-lab pp-pt',
        { 'text-anchor': 'middle' }),
      text(c.top, c.X(fx) + 12, c.Y(ALPHA * fx) + (up ? 22 : -12), 'αx = ' + fmtS(ALPHA * fx), 'pp-lab pp-gray', {}),
      text(c.top, c.X(fx) - 14, c.Y((ALPHA * fx + YS[F]) / 2) + 6, 'u = ' + fmtS(US[F]), 'pp-lab pp-u',
        { 'text-anchor': 'end' })
    ];

    var st = { focus: 0, all: 0, eq: 0, say: 0 };
    function render() {
      show(st);
      var dim = 1 - 0.75 * st.focus * (1 - st.all);
      ds.forEach(function (d, i) { op(d, i === F ? 1 : dim); });
      segs.forEach(function (n, i) { op(n, i === F ? Math.max(st.focus, st.all) : st.all); });
      nums.forEach(function (n) { op(n, st.all); });
      focus.forEach(function (n) { op(n, st.focus * (1 - st.all)); });
    }
    render();
    var go = steps(tl, st, render);
    go.label('s0');
    go.to({ focus: 1, eq: 1, say: 1 });
    go.label('s1');
    go.to({ all: 1, eq: 2, say: 2 });
    go.label('s2');
  });

  // ═══ 3. Togliamo la pendenza ═══
  PSI.scene('pp-togli', function (el, tl) {
    var show = prepare(el);
    var c = chart(one(el, '.pp-svg'));
    var slope = line(c.plot, C.slope, 2.5, '8 6');
    var segs = XS.map(function () { return line(c.plot, C.u, 4); });
    var ds = dots(c);
    var nums = XS.map(function (x, i) { return text(c.top, 0, 0, fmtS(US[i]), 'pp-lab pp-u', {}); });

    var st = { shear: 0, seg: 1, eq: 0, say: 0 };
    function render() {
      show(st);
      var s = st.shear;
      shearView(c, s);
      c.lineFn(slope, function (x) { return tilt(x, s); });
      placeDots(c, ds, s);
      XS.forEach(function (x, i) {
        c.seg(segs[i], x, tilt(x, s), ptY(i, s));
        op(segs[i], st.seg);
        nums[i].setAttribute('x', c.X(x) + 9);
        nums[i].setAttribute('y', c.Y((tilt(x, s) + ptY(i, s)) / 2) + 5);
      });
      c.yLab.textContent = s < 0.5 ? 'y' : 'u = y − αx';
    }
    render();
    var go = steps(tl, st, render);
    go.label('s0');
    go.to({ say: 1 });
    go.fromTo({ shear: 0 }, { shear: 1, duration: 2.2 }, '<');
    go.label('s1');
    go.to({ seg: 0.25, eq: 1, say: 2 });
    go.label('s2');
  });

  // Le scene 4-7 lavorano sugli u: grafico «senza pendenza».
  function uChart(el) {
    var c = chart(one(el, '.pp-svg'), { view: ZOOM, yLabel: 'u = y − αx' });
    var zero = line(c.plot, C.slope, 2.5, '8 6');
    c.lineFn(zero, function () { return 0; });
    return c;
  }

  // ═══ 4. Il residuo, visto da qui ═══
  PSI.scene('pp-residuo', function (el, tl) {
    var show = prepare(el);
    var c = uChart(el);
    var res = XS.map(function () { return line(c.plot, C.beta, 2); });
    var bl = line(c.plot, C.beta, 3);
    var ds = dots(c);
    placeDots(c, ds, 1);
    var nums = XS.map(function (x, i) {
      return text(c.top, c.X(x) + 9, c.Y(US[i] / 2) + 5, fmtS(US[i]), 'pp-lab pp-u', {});
    });
    var bLab = text(c.top, c.X(X_HI) - 8, 0, 'altezza β', 'pp-lab pp-blue', { 'text-anchor': 'end' });

    var st = { bline: 0, beta: B_HIGH, eq: 0, say: 0 };
    function render() {
      show(st);
      var b = st.beta;
      c.lineFn(bl, function () { return b; });
      op(bl, st.bline);
      XS.forEach(function (x, i) { c.seg(res[i], x, b, US[i]); op(res[i], 0.6 * st.bline); });
      nums.forEach(function (n) { op(n, 1 - st.bline); });
      bLab.setAttribute('y', c.Y(b) - 12);
      op(bLab, st.bline);
    }
    render();
    var go = steps(tl, st, render);
    go.label('s0');
    go.to({ eq: 1, say: 1 });
    go.label('s1');
    go.to({ eq: 2, say: 2, bline: 1 });
    go.label('s2');
    go.to({ say: 3 });
    go.fromTo({ beta: B_HIGH }, { beta: B_LOW, duration: 1.3 }, '<');
    go.fromTo({ beta: B_LOW }, { beta: B_HIGH, duration: 1.3 });
    go.label('s3');
  });

  // ═══ 5. La somma dei quadrati ═══
  PSI.scene('pp-quadrati', function (el, tl) {
    var show = prepare(el);
    var c = uChart(el);
    var sqs = XS.map(function () {
      return svg('rect', {
        fill: C.sq, 'fill-opacity': 0.08, stroke: C.sq, 'stroke-opacity': 0.9, 'stroke-width': 1.8
      }, c.plot);
    });
    var ml = line(c.plot, C.mean, 2.5, '9 6');
    c.lineFn(ml, function () { return M_U; });
    var res = XS.map(function () { return line(c.plot, C.beta, 2); });
    var bl = line(c.plot, C.beta, 3);
    var ds = dots(c);
    placeDots(c, ds, 1);
    var bLab = text(c.top, c.X(X_HI) - 8, 0, 'altezza β', 'pp-lab pp-blue', { 'text-anchor': 'end' });
    var mLab = sub(text(c.top, c.X(0.2), c.Y(M_U) + 24, '', 'pp-lab pp-green', {}),
      'la media degli u: ', 'U', ' = ' + fmtS(M_U));

    var fEl = one(el, '.pp-f'), bEl = one(el, '.pp-b'), big = one(el, '.pp-big');
    var st = { sq: 0, beta: B_HIGH, mean: 0, say: 0 };
    var sync = bindSlider(one(el, '.pp-slider input'), M_U - 2 * D, M_U + 2 * D, D / 20,
      function (v) { st.beta = v; render(); });
    function render() {
      show(st);
      var b = st.beta, px = c.px();
      c.lineFn(bl, function () { return b; });
      XS.forEach(function (x, i) {
        var r = US[i] - b, side = Math.abs(r) * px * st.sq;
        c.seg(res[i], x, b, US[i]);
        op(res[i], 0.6);
        sqs[i].setAttribute('x', c.X(x));
        sqs[i].setAttribute('y', c.Y(Math.max(US[i], b)));
        sqs[i].setAttribute('width', side);
        sqs[i].setAttribute('height', side);
      });
      bLab.setAttribute('y', c.Y(b) - 12);
      op(ml, st.mean); op(mLab, st.mean);
      fEl.textContent = 'f = ' + fmtF(fBeta(b), 2);
      bEl.textContent = fmtF(b, 2);
      big.style.opacity = 0.3 + 0.7 * st.sq;
      sync(b);
    }
    render();
    var go = steps(tl, st, render);
    go.label('s0');
    go.to({ sq: 1, say: 1 });
    go.label('s1');
    go.to({ say: 2 });
    go.fromTo({ beta: B_HIGH }, { beta: M_U, duration: 1.6 }, '<');
    go.label('s2');
    go.to({ say: 3 });
    go.fromTo({ beta: M_U }, { beta: B_LOW, duration: 1.4 }, '<');
    go.label('s3');
    go.to({ say: 4 });
    go.fromTo({ beta: B_LOW }, { beta: M_U, duration: 1.4 }, '<');
    go.to({ mean: 1, duration: 0.5 });
    go.label('s4');
  });

  // ═══ 6. Di nuovo: un quadrato più un resto ═══
  PSI.scene('pp-resto', function (el, tl) {
    var show = prepare(el);
    var BLO = M_U - 2 * D, BHI = M_U + 2 * D, pad = 0.12 * (BHI - BLO);
    var FMAX = Math.max(fBeta(BLO), fBeta(BHI));
    var c = chart(one(el, '.pp-svg'), {
      xLo: BLO - pad, xHi: BHI + pad, view: [0, FMAX * 1.1], xLabel: 'β', yLabel: 'f', xTarget: 8
    });
    var X0 = c.o.xLo, X1 = c.o.xHi, BAR = 26;
    var band = svg('rect', { x: c.X(X0), y: c.Y(REST), height: c.Y(0) - c.Y(REST), width: 0, fill: C.band }, c.plot);
    var floor = line(c.plot, C.mean, 2.5);
    var curve = svg('path', { fill: 'none', stroke: C.sq, 'stroke-width': 3, 'stroke-linecap': 'round' }, c.plot);
    var barG = svg('rect', { width: BAR, fill: C.mean }, c.plot);
    var barR = svg('rect', { width: BAR, fill: C.sq, 'fill-opacity': 0.9 }, c.plot);
    var dot = svg('circle', { r: 6.5, fill: C.sq, stroke: '#fff', 'stroke-width': 2 }, c.top);
    var ring = svg('circle', { cx: c.X(M_U), cy: c.Y(REST), r: 14, fill: 'none', stroke: C.beta, 'stroke-width': 2.5 }, c.top);
    var gLab = text(c.top, c.X(X0) + 12, c.Y(REST / 2) + 6, 'il resto: ' + fmtS(REST), 'pp-lab pp-green', {});
    var rLab = text(c.top, 0, 0, 'il quadrato', 'pp-lab pp-red', {});
    var mLab = sub(text(c.top, c.X(M_U), c.Y(REST) - 26, '', 'pp-lab pp-blue', { 'text-anchor': 'middle' }),
      'β = ', 'U', ' = ' + fmtS(M_U));

    var sumBox = one(el, '.pp-sumbox');
    var gEl = one(el, '.pp-sum .pp-g'), rEl = one(el, '.pp-sum .pp-r'), tEl = one(el, '.pp-sum .pp-t');
    var st = { b: BLO, trace: BLO, dot: 0, bar: 0, ring: 0, eq: 0, say: 0 };
    function render() {
      show(st);
      var b = st.b, f = fBeta(b), top = REST + (f - REST);
      // la parabola fin dove è arrivato il punto
      var d = '';
      for (var x = BLO; x < st.trace; x += (BHI - BLO) / 120) {
        d += (d ? 'L' : 'M') + c.X(x).toFixed(1) + ',' + c.Y(fBeta(x)).toFixed(1);
      }
      if (st.trace > BLO) d += 'L' + c.X(st.trace).toFixed(1) + ',' + c.Y(fBeta(st.trace)).toFixed(1);
      curve.setAttribute('d', d);
      dot.setAttribute('cx', c.X(b)); dot.setAttribute('cy', c.Y(f)); op(dot, st.dot);

      band.setAttribute('width', st.bar * (c.X(X1) - c.X(X0)));
      setLine(floor, c.X(X0), c.Y(REST), c.X(X0) + st.bar * (c.X(X1) - c.X(X0)), c.Y(REST));
      barG.setAttribute('x', c.X(b) - BAR / 2); barG.setAttribute('y', c.Y(REST));
      barG.setAttribute('height', c.Y(0) - c.Y(REST)); op(barG, st.bar);
      barR.setAttribute('x', c.X(b) - BAR / 2); barR.setAttribute('y', c.Y(top));
      barR.setAttribute('height', c.Y(REST) - c.Y(top)); op(barR, st.bar);
      op(gLab, st.bar);
      var redPx = c.Y(REST) - c.Y(top), right = b < (BLO + BHI) / 2;
      rLab.setAttribute('x', c.X(b) + (right ? BAR / 2 + 10 : -BAR / 2 - 10));
      rLab.setAttribute('y', c.Y(top) + Math.min(redPx / 2, 80) + 6);
      rLab.setAttribute('text-anchor', right ? 'start' : 'end');
      op(rLab, redPx > 22 ? st.bar : 0);
      op(ring, st.ring); op(mLab, st.ring);

      var sq = f - REST;
      gEl.textContent = fmtF(REST, 2); rEl.textContent = fmtF(sq, 2); tEl.textContent = fmtF(f, 2);
      sumBox.style.opacity = 0.25 + 0.75 * st.bar;
    }
    render();
    var go = steps(tl, st, render);
    go.label('s0');
    go.to({ say: 1, dot: 1, duration: 0.4 });
    go.fromTo({ b: BLO, trace: BLO }, { b: BHI, trace: BHI, duration: 2.4, ease: 'sine.inOut' }, '<');
    go.label('s1');
    go.to({ bar: 1, eq: 1, say: 2 });
    go.label('s2');
    go.to({ say: 3 });
    go.fromTo({ b: BHI }, { b: M_U, duration: 1.4 }, '<');
    go.to({ ring: 1, duration: 0.5 });
    go.label('s3');
    go.to({ eq: 2, say: 4 });
    go.label('s4');
  });

  // ═══ 7. Rimettiamo la pendenza ═══
  PSI.scene('pp-rimetti', function (el, tl) {
    var show = prepare(el);
    var c = chart(one(el, '.pp-svg'), { view: ZOOM, yLabel: 'u = y − αx' });
    var slope = line(c.plot, C.slope, 2.5, '8 6');
    var res = XS.map(function () { return line(c.plot, C.beta, 2); });
    var bl = line(c.plot, C.beta, 3);
    var ds = dots(c);
    var lab = text(c.top, 0, 0, '', 'pp-lab pp-blue', {});

    var st = { shear: 1, eq: 0, say: 0 };
    function render() {
      show(st);
      var s = st.shear;
      shearView(c, s);
      c.lineFn(slope, function (x) { return tilt(x, s); });
      c.lineFn(bl, function (x) { return M_U + tilt(x, s); });
      placeDots(c, ds, s);
      XS.forEach(function (x, i) { c.seg(res[i], x, M_U + tilt(x, s), ptY(i, s)); op(res[i], 0.6); });
      c.yLab.textContent = s < 0.5 ? 'y' : 'u = y − αx';
      if (s < 0.5) lab.textContent = 'ŷ = αx + β';
      else sub(lab, 'β = ', 'U', '');
      lab.setAttribute('x', c.X(0.25));
      lab.setAttribute('y', c.Y(M_U + tilt(0.25, s)) - 14);
    }
    render();
    var go = steps(tl, st, render);
    go.label('s0');
    go.to({ say: 1 });
    go.fromTo({ shear: 1 }, { shear: 0, duration: 2.2 }, '<');
    go.label('s1');
    go.to({ eq: 1, say: 2 });
    go.label('s2');
    go.to({ eq: 2, say: 3 });
    go.label('s3');
  });

  // ═══ 8. La retta passa per il baricentro ═══
  PSI.scene('pp-baricentro', function (el, tl) {
    var show = prepare(el);
    var c = chart(one(el, '.pp-svg'));
    var gv = line(c.plot, C.beta, 1.6, '5 5'), gh = line(c.plot, C.beta, 1.6, '5 5');
    setLine(gv, c.X(MX), c.Y(MY), c.X(MX), c.Y(c.lo));
    setLine(gh, c.X(X_LO), c.Y(MY), c.X(MX), c.Y(MY));
    var bl = line(c.plot, C.beta, 3);
    c.lineFn(bl, function (x) { return ALPHA * x + M_U; });
    var ds = dots(c);
    placeDots(c, ds, 0);
    var bar = baricentro(c);
    var labX = sub(text(c.top, c.X(MX), c.o.H - 6, '', 'pp-lab pp-blue', { 'text-anchor': 'middle' }),
      '', 'X', ' = ' + fmtS(MX));
    var labY = sub(text(c.top, c.X(X_LO) + 8, c.Y(MY) - 9, '', 'pp-lab pp-blue', {}), '', 'Y', ' = ' + fmtS(MY));

    var st = { bary: 0, pulse: 0, eq: 0, say: 0 };
    function render() {
      show(st);
      [gv, gh, bar.g, labX, labY].forEach(function (n) { op(n, st.bary); });
      gv.setAttribute('stroke-width', 1.6 + 2 * st.pulse);
      bar.ring.setAttribute('r', 15 + 5 * st.pulse);
    }
    render();
    var go = steps(tl, st, render);
    go.label('s0');
    go.to({ bary: 1, say: 1 });
    go.label('s1');
    go.to({ eq: 1, say: 2 });
    go.label('s2');
    go.to({ eq: 2, say: 3 });
    go.label('s3');
    go.to({ eq: 3, say: 4, pulse: 1 });
    go.label('s4');
  });

  // Il ventaglio (scene 9 e 10): rette con l'intercetta migliore.
  var GHOSTS = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (k) { return A_LO + k / 8 * (A_HI - A_LO); });
  function fanChart(el, view) {
    var c = chart(one(el, '.pp-svg'), { view: view });
    var gv = line(c.plot, C.beta, 1.2, '4 6'), gh = line(c.plot, C.beta, 1.2, '4 6');
    var ghosts = GHOSTS.map(function (a) {
      var n = line(c.plot, C.fan, 1.6);
      return { a: a, n: n };
    });
    var main = line(c.plot, C.beta, 3.2);
    var ds = dots(c);
    var bDot = svg('circle', { r: 6, fill: C.sq, stroke: '#fff', 'stroke-width': 2 }, c.top);
    var bLab = text(c.top, c.X(X_LO) + 12, 0, '', 'pp-lab pp-red', {});
    var bar = baricentro(c);
    var f = {
      c: c, ghosts: ghosts, main: main,
      draw: function (a) {
        setLine(gv, c.X(MX), c.Y(MY), c.X(MX), c.Y(c.lo));
        setLine(gh, c.X(X_LO), c.Y(MY), c.X(MX), c.Y(MY));
        ghosts.forEach(function (g) { c.lineFn(g.n, function (x) { return g.a * x + betaFor(g.a); }); });
        c.lineFn(main, function (x) { return a * x + betaFor(a); });
        placeDots(c, ds, 0);
        bar.place();
        bDot.setAttribute('cx', c.X(X_LO)); bDot.setAttribute('cy', c.Y(betaFor(a)));
        bLab.setAttribute('y', c.Y(betaFor(a)) + 24);
        bLab.textContent = 'β = ' + fmtF(betaFor(a), 2);
      }
    };
    return f;
  }

  // ═══ 9. Cambiamo la pendenza: il ventaglio ═══
  PSI.scene('pp-ventaglio', function (el, tl) {
    var show = prepare(el);
    var fan = fanChart(el, FULL), c = fan.c;
    var L1 = A_HI - ALPHA, L2 = A_HI - A_LO, L3 = ALPHA - A_LO, LT = L1 + L2 + L3;
    function pathAlpha(d) {
      if (d <= L1) return ALPHA + d;
      if (d <= L1 + L2) return A_HI - (d - L1);
      return A_LO + (d - L1 - L2);
    }
    function firstPass(a) { return a >= ALPHA ? a - ALPHA : L1 + (A_HI - a); }

    var aEl = one(el, '.pp-a'), bEl = one(el, '.pp-bv');
    var st = { zoom: 0, d: 0, eq: 0, say: 0 }, manual = null;
    var sync = bindSlider(one(el, '.pp-slider input'), A_LO, A_HI, 0.01,
      function (v) { manual = v; render(); });
    function render() {
      show(st);
      c.setView(lerp(FULL[0], FAN[0], st.zoom), lerp(FULL[1], FAN[1], st.zoom));
      var a = manual !== null ? manual : pathAlpha(st.d);
      fan.draw(a);
      fan.ghosts.forEach(function (g) { op(g.n, 0.55 * clamp01((st.d - firstPass(g.a)) * 8)); });
      aEl.textContent = fmtF(a, 2);
      bEl.textContent = fmtF(betaFor(a), 2);
      sync(a);
    }
    var timed = function () { manual = null; render(); };
    render();
    var go = steps(tl, st, timed);
    go.to({ zoom: 1, duration: 0.9 });            // ingresso: si allarga la vista
    go.label('s0');
    go.to({ say: 1 });
    go.fromTo({ d: 0 }, { d: L1, duration: 1.6 }, '<');
    go.label('s1');
    go.to({ say: 2 });
    go.fromTo({ d: L1 }, { d: L1 + L2, duration: 2.6 }, '<');
    go.label('s2');
    go.to({ say: 3 });
    go.fromTo({ d: L1 + L2 }, { d: LT, duration: 1.4 }, '<');
    go.label('s3');
  });

  // ═══ 10. Quale retta del ventaglio? ═══
  PSI.scene('pp-quale', function (el, tl) {
    var show = prepare(el);
    var fan = fanChart(el, FAN), c = fan.c;
    fan.ghosts.forEach(function (g) { op(g.n, 0.55); });
    var best = line(c.plot, C.sq, 3.4);
    c.lineFn(best, function (x) { return A_BEST * x + B_BEST; });
    var bestLab = text(c.top, c.X(X_HI) - 10, c.Y(c.hi) + 24, 'la retta dei minimi quadrati', 'pp-lab pp-red',
      { 'text-anchor': 'end' });

    // Grafico piccolo: f al variare di α.
    var apad = 0.08 * (A_HI - A_LO);
    var FA_MAX = Math.max(fAlpha(A_LO), fAlpha(A_HI));
    var m = chart(one(el, '.pp-mini'), {
      W: 360, H: 230, L: 48, R: 12, T: 10, B: 40, xLo: A_LO - apad, xHi: A_HI + apad,
      view: [0, FA_MAX * 1.12], xLabel: 'α', yLabel: '', xTarget: 5, yTarget: 3
    });
    text(m.top, m.o.L + 8, m.o.T + 14, 'f', 'pp-axis-label', {});
    var curve = svg('path', { fill: 'none', stroke: C.sq, 'stroke-width': 2.5 }, m.plot);
    var mDot = svg('circle', { r: 5.5, fill: C.beta, stroke: '#fff', 'stroke-width': 1.5 }, m.top);
    var mBest = svg('g', {}, m.top);
    setLine(line(mBest, C.sq, 1.4, '4 4'), m.X(A_BEST), m.Y(0), m.X(A_BEST), m.Y(fAlpha(A_BEST)));
    svg('circle', { cx: m.X(A_BEST), cy: m.Y(fAlpha(A_BEST)), r: 5.5, fill: C.sq, stroke: '#fff', 'stroke-width': 1.5 }, mBest);
    text(mBest, m.X(A_BEST), m.Y(FA_MAX * 0.45), 'il minimo', 'pp-lab pp-red', { 'text-anchor': 'middle' });

    var fEl = one(el, '.pp-f');
    var st = { a: ALPHA, tlo: ALPHA, thi: ALPHA, best: 0, eq: 0, say: 0 };
    function render() {
      show(st);
      fan.draw(st.a);
      op(best, st.best); op(bestLab, st.best); op(mBest, st.best);
      var d = '';
      for (var a = st.tlo; a < st.thi; a += (A_HI - A_LO) / 100) {
        d += (d ? 'L' : 'M') + m.X(a).toFixed(1) + ',' + m.Y(fAlpha(a)).toFixed(1);
      }
      if (st.thi > st.tlo) d += 'L' + m.X(st.thi).toFixed(1) + ',' + m.Y(fAlpha(st.thi)).toFixed(1);
      curve.setAttribute('d', d);
      mDot.setAttribute('cx', m.X(st.a)); mDot.setAttribute('cy', m.Y(fAlpha(st.a)));
      fEl.textContent = 'f = ' + fmtF(fAlpha(st.a), 2);
    }
    render();
    var go = steps(tl, st, render);
    go.label('s0');
    go.to({ say: 1 });
    go.fromTo({ a: ALPHA, tlo: ALPHA }, { a: A_LO, tlo: A_LO, duration: 1.1 }, '<');
    go.fromTo({ a: A_LO, thi: ALPHA }, { a: A_HI, thi: A_HI, duration: 2.2, ease: 'sine.inOut' });
    go.label('s1');
    go.to({ say: 2, eq: 1 });
    go.fromTo({ a: A_HI }, { a: A_BEST, duration: 1.4 }, '<');
    go.to({ best: 1, duration: 0.6 });
    go.label('s2');
  });
})();
