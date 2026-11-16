/*
 * Slide scritta a mano: il minimo senza derivate (dopo la slide 10).
 *
 * h(c) = (c − 3)² + 5, costruita come una barra a due piani sopra il valore c:
 * sotto il resto (verde, sempre alto 5), sopra il quadrato (rosso, alto
 * (c − 3)², mai negativo). La punta della barra disegna la parabola.
 *
 * Quattro avanzamenti:
 *   1. il resto: la fascia verde alta 5 copre tutto l'asse;
 *   2. il quadrato: la barra rossa cresce sopra il pavimento e c va da 0 a 6;
 *   3. c torna a 3: la barra rossa sparisce, h(3) = 5;
 *   4. conclusione: h(c) ≥ 5 per ogni c, il minimo è 5 in c = 3.
 * Dopo l'ultimo il cursore resta in mano al docente.
 */
(function () {
  'use strict';

  var REST = 5, CENTER = 3;           // h(c) = (c − CENTER)² + REST
  var C_MIN = 0, C_MAX = 6;           // valori di c sul cursore
  var X_LO = -0.4, X_HI = 6.4, Y_MAX = 15;

  var W = 752, H = 420, L = 54, R = 16, T = 14, B = 40;
  var PW = W - L - R, PH = H - T - B;
  var BAR = 24;

  var X = function (c) { return L + (c - X_LO) / (X_HI - X_LO) * PW; };
  var Y = function (v) { return T + PH - v / Y_MAX * PH; };
  var square = function (c) { return (c - CENTER) * (c - CENTER); };
  var fmt = function (v, d) {
    return v.toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });
  };

  PSI.scene('senza-derivate', function (el, tl) {
    var root = PSI.q(el).one('.qr-svg');
    var svg = PSI.svg, text = PSI.text;
    var C_SQ = '#ed4335', C_REST = '#38aa57', C_BAND = '#e6f4ea',
        C_GRID = '#e5e7eb', C_AXIS = '#9ca3af', C_KEY = '#1f4e78';
    var refs = {};

    function line(x1, y1, x2, y2, stroke, width, dash) {
      return svg('line', {
        x1: x1, y1: y1, x2: x2, y2: y2, stroke: stroke,
        'stroke-width': width || 1, 'stroke-dasharray': dash || null
      }, root);
    }

    // ── Grafico, costruito una volta sola ──

    // Griglia orizzontale e tacche dell'asse verticale.
    [0, 5, 10, 15].forEach(function (v) {
      if (v) line(L, Y(v), W - R, Y(v), C_GRID, 1);
      text(root, L - 10, Y(v) + 5, String(v), 'qr-tick', { 'text-anchor': 'end' });
    });

    // Il resto: fascia verde alta 5 su tutto l'asse, con il bordo superiore.
    refs.band = svg('rect', { x: L, y: Y(REST), width: 0, height: Y(0) - Y(REST), fill: C_BAND }, root);
    refs.floor = line(L, Y(REST), L, Y(REST), C_REST, 2.5);
    // A sinistra, tra c = 0 e c = 3: la barra ci passa sopra solo mentre scorre.
    refs.bandLabel = text(root, X(0.45), Y(REST / 2) + 6, 'il resto: 5, per ogni c', 'qr-band-label', {});

    // La barra sopra c: sotto il resto (verde), sopra il quadrato (rosso).
    refs.barRest = svg('rect', { y: Y(REST), width: BAR, height: Y(0) - Y(REST), rx: 2, fill: C_REST }, root);
    refs.barSq = svg('rect', { width: BAR, height: 0, rx: 2, fill: C_SQ, 'fill-opacity': 0.9 }, root);
    refs.barRestLabel = text(root, 0, Y(REST / 2) + 6, '5', 'qr-bar-label', { 'text-anchor': 'middle' });

    // La traccia della punta della barra: la parabola.
    refs.trace = svg('path', {
      fill: 'none', stroke: C_SQ, 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
    }, root);

    // Assi.
    line(L, T + PH, W - R, T + PH, C_AXIS, 1.4);
    line(L, T, L, T + PH, C_AXIS, 1.4);
    refs.ticks = [];
    for (var c = C_MIN; c <= C_MAX; c++) {
      line(X(c), T + PH, X(c), T + PH + 5, C_AXIS, 1.4);
      refs.ticks.push(text(root, X(c), H - B + 21, String(c), 'qr-tick', { 'text-anchor': 'middle' }));
    }
    text(root, W - R, H - B + 21, 'c', 'qr-axis-label', { 'text-anchor': 'end' });
    text(root, L + 10, T + 16, 'h(c)', 'qr-axis-label', {});

    // Punta della barra ed etichetta del quadrato.
    refs.dot = svg('circle', { r: 6, fill: C_SQ, stroke: '#fff', 'stroke-width': 2 }, root);
    refs.sqLabel = text(root, 0, 0, '', 'qr-sq-label', {});

    // c = 3: il quadrato si annulla.
    refs.ring = svg('circle', {
      cx: X(CENTER), cy: Y(REST), r: 13, fill: 'none', stroke: C_KEY, 'stroke-width': 2.5
    }, root);
    refs.min1 = text(root, X(CENTER), Y(8.6), 'in c = 3 il quadrato vale 0', 'qr-min-label',
      { 'text-anchor': 'middle' });
    refs.min2 = text(root, X(CENTER), Y(6.9), 'h(3) = 5', 'qr-min-label', { 'text-anchor': 'middle' });

    // Conclusione, appoggiata sul pavimento.
    refs.floorLabel = text(root, W - R - 12, Y(REST) - 10, 'h(c) non scende mai sotto 5', 'qr-floor-label',
      { 'text-anchor': 'end' });

    // ── Stato e ridisegno ──
    var st = { band: 0, rest: 0, sq: 0, c: 0, trace: 0, min: 0, end: 0 };
    var one = function (sel) { return PSI.q(el).one(sel); };
    var slider = one('.qr-slider input');
    var notes = PSI.q(el).all('.qr-notes li');
    var ui = {
      c: one('.qr-c'),
      sq: one('.qr-v-sq'),
      h: one('.qr-v-h'),
      rowSq: one('.qr-row-sq'),
      rowRest: one('.qr-row-rest'),
      rowH: one('.qr-row-h'),
      partSq: one('.qr-formula .qr-sq'),
      partRest: one('.qr-formula .qr-rest'),
      end: one('.qr-end')
    };
    var dim = function (v) { return 0.3 + 0.7 * v; };
    var fadeIn = function (v) { return Math.max(0, Math.min(1, 2 * v - 1)); };

    function render() {
      var c = Math.max(C_MIN, Math.min(C_MAX, st.c));
      var s = square(c), top = REST + st.sq * s;

      // Il resto.
      refs.band.setAttribute('width', st.band * PW);
      refs.floor.setAttribute('x2', L + st.band * PW);
      refs.bandLabel.setAttribute('opacity', fadeIn(st.band));
      refs.barRest.setAttribute('x', X(c) - BAR / 2);
      refs.barRest.setAttribute('opacity', st.rest);
      refs.barRestLabel.setAttribute('x', X(c));
      refs.barRestLabel.setAttribute('opacity', st.rest);

      // Il quadrato, sopra il resto.
      refs.barSq.setAttribute('x', X(c) - BAR / 2);
      refs.barSq.setAttribute('y', Y(top));
      refs.barSq.setAttribute('height', Y(REST) - Y(top));
      refs.dot.setAttribute('cx', X(c));
      refs.dot.setAttribute('cy', Y(top));
      refs.dot.setAttribute('opacity', st.sq);

      // Etichetta del quadrato accanto alla parte rossa (dall'altro lato verso destra).
      var redPx = Y(REST) - Y(top);
      var right = c <= 4.5;
      refs.sqLabel.textContent = '(c − 3)² = ' + fmt(s, 2);
      refs.sqLabel.setAttribute('x', X(c) + (right ? 1 : -1) * (BAR / 2 + 8));
      refs.sqLabel.setAttribute('y', Y(top) + Math.min(redPx / 2, 60) + 6);
      refs.sqLabel.setAttribute('text-anchor', right ? 'start' : 'end');
      refs.sqLabel.setAttribute('opacity', redPx > 20 ? st.sq : 0);

      // La parabola fin dove è arrivata la punta.
      var d = '', upTo = Math.min(st.trace, C_MAX);
      if (upTo > C_MIN) {
        for (var x = C_MIN; x < upTo; x += 0.05) {
          d += (d ? 'L' : 'M') + X(x).toFixed(1) + ',' + Y(REST + square(x)).toFixed(1);
        }
        d += 'L' + X(upTo).toFixed(1) + ',' + Y(REST + square(upTo)).toFixed(1);
      }
      refs.trace.setAttribute('d', d);

      // c = 3 e conclusione.
      refs.ring.setAttribute('opacity', st.min);
      refs.min1.setAttribute('opacity', st.min);
      refs.min2.setAttribute('opacity', st.min);
      refs.ticks[CENTER - C_MIN].setAttribute('class', st.min > 0.5 ? 'qr-tick-on' : 'qr-tick');
      refs.floorLabel.setAttribute('opacity', st.end);

      // Formula e pannello.
      ui.partRest.style.setProperty('--on', st.rest);
      ui.partSq.style.setProperty('--on', st.sq);
      ui.c.textContent = fmt(c, 1);
      ui.sq.textContent = fmt(s, 2);
      ui.h.textContent = fmt(s + REST, 2);
      ui.rowRest.style.opacity = dim(st.rest);
      ui.rowSq.style.opacity = dim(st.sq);
      ui.rowH.style.opacity = dim(st.sq);
      ui.end.style.opacity = st.end;
      [st.rest, st.sq, st.min].forEach(function (v, i) {
        notes[i].classList.toggle('on', v > 0.5);
      });

      // Cursore allineato (anche quando lo muove la timeline).
      if (Math.abs(+slider.value - c) > 0.05) slider.value = c.toFixed(1);
    }

    slider.addEventListener('input', function () {
      st.c = +this.value;
      render();
    });
    slider.addEventListener('change', function () { this.blur(); });
    // Il cursore non deve lasciare che il tasto freccia cambi slide.
    slider.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
          e.key === 'ArrowUp' || e.key === 'ArrowDown') e.stopPropagation();
    });

    render();

    var step = function (vars) {
      return Object.assign({ duration: 0.8, ease: 'power2.inOut', onUpdate: render }, vars);
    };

    tl.addLabel('s0');
    // 1. Il resto: 5, uguale per ogni c.
    tl.to(st, step({ band: 1, rest: 1, duration: 1 }));
    tl.addLabel('s1');
    // 2. Il quadrato: cresce sopra il pavimento, poi c scorre da 0 a 6.
    tl.to(st, step({ sq: 1, duration: 0.7 }));
    tl.fromTo(st, { c: C_MIN, trace: C_MIN },
      step({ c: C_MAX, trace: C_MAX, duration: 2.8, ease: 'sine.inOut', immediateRender: false }));
    tl.addLabel('s2');
    // 3. c torna a 3: il quadrato sparisce.
    tl.fromTo(st, { c: C_MAX }, step({ c: CENTER, duration: 1.4, immediateRender: false }));
    tl.to(st, step({ min: 1, duration: 0.5 }));
    tl.addLabel('s3');
    // 4. Conclusione.
    tl.to(st, step({ end: 1, duration: 0.6 }));
    tl.addLabel('s4');
  });
})();
