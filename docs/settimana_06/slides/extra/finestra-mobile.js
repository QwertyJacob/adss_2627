/*
 * Slide scritta a mano: la finestra della media mobile (dopo la slide 16).
 *
 * Ritardi giornalieri dei treni alla stazione di Gallarate, 1 maggio – 31 luglio
 * 2024: la stessa serie della challenge della lezione (file
 * ritardi_treni_gallarate.xlsx, foglio «Gallarate_2024», righe 122–213).
 * Il cursore cambia l'ampiezza k della finestra; i tre numeri nel pannello e
 * la curva rossa si ricalcolano dai dati, così la slide non può mentire.
 *
 * Tre avanzamenti: serie grezza, poi k = 7, poi k = 30. Dopo l'ultimo il
 * cursore resta in mano al docente.
 */
(function () {
  'use strict';

  // 92 giorni, dal 1 maggio al 31 luglio 2024; indice 40 = 10 giugno.
  var DAYS = [
    284, 874, 1126, 328, 270, 631, 789, 1146, 882, 591, 394, 365, 684, 667,
    1183, 995, 752, 1329, 309, 977, 665, 589, 757, 593, 456, 317, 611, 585,
    601, 787, 592, 480, 315, 546, 623, 504, 605, 467, 223, 268, 1598, 557,
    547, 461, 451, 426, 26, 621, 503, 449, 440, 685, 367, 352, 421, 454, 464,
    478, 484, 335, 265, 448, 409, 510, 590, 504, 450, 336, 419, 466, 399, 740,
    514, 545, 301, 435, 559, 450, 549, 531, 249, 183, 607, 505, 878, 632, 627,
    448, 434, 535, 492, 589
  ];
  var PEAK = 40;                 // 10 giugno 2024
  var MONTHS = [[0, '1 mag'], [31, '1 giu'], [61, '1 lug']];
  var Y_MAX = 1700;

  var W = 740, H = 430, L = 58, R = 14, T = 16, B = 40;
  var PW = W - L - R, PH = H - T - B;

  var X = function (i) { return L + i / (DAYS.length - 1) * PW; };
  var Y = function (v) { return T + PH - v / Y_MAX * PH; };
  var fmtInt = function (v) { return Math.round(v).toLocaleString('it-IT'); };

  // Media mobile non centrata: la finestra finisce al giorno j.
  function movingAverage(k) {
    var out = [], sum = 0, i;
    for (i = 0; i < DAYS.length; i++) {
      sum += DAYS[i];
      if (i >= k) sum -= DAYS[i - k];
      out.push(i >= k - 1 ? sum / k : null);
    }
    return out;
  }
  function jumps(series) {
    var s = 0, n = 0, i;
    for (i = 1; i < series.length; i++) {
      if (series[i] === null || series[i - 1] === null) continue;
      s += Math.abs(series[i] - series[i - 1]);
      n++;
    }
    return n ? s / n : 0;
  }

  // Numeri di riferimento (k = 1): servono per le barre, che si accorciano.
  var RAW_JUMPS = jumps(DAYS);
  var RAW_MAX = Math.max.apply(null, DAYS);

  PSI.scene('finestra-mobile', function (el, tl) {
    var root = PSI.q(el).one('.fm-svg');
    var svg = PSI.svg, text = PSI.text;
    var C_RAW = '#4684f1', C_MA = '#ed4335', C_GRID = '#e5e7eb', C_AXIS = '#9ca3af';
    var refs = {};

    // ── Grafico, costruito una volta sola ──
    function line(x1, y1, x2, y2, stroke, width, dash) {
      return svg('line', {
        x1: x1, y1: y1, x2: x2, y2: y2, stroke: stroke,
        'stroke-width': width || 1, 'stroke-dasharray': dash || null
      }, root);
    }

    // Griglia orizzontale e tacche dell'asse y.
    [0, 500, 1000, 1500].forEach(function (v) {
      line(L, Y(v), W - R, Y(v), C_GRID, 1);
      text(root, L - 10, Y(v) + 4, fmtInt(v), 'fm-tick', { 'text-anchor': 'end' });
    });
    // Mesi: linea verticale tenue ed etichetta.
    MONTHS.forEach(function (m) {
      line(X(m[0]), T, X(m[0]), T + PH, C_GRID, 1);
      text(root, X(m[0]), H - B + 18, m[1], 'fm-tick', { 'text-anchor': 'middle' });
    });
    // Assi.
    line(L, T + PH, W - R, T + PH, C_AXIS, 1.4);
    line(L, T, L, T + PH, C_AXIS, 1.4);
    text(root, L - 46, T + PH / 2, 'minuti', 'fm-axis-label', {
      'text-anchor': 'middle', transform: 'rotate(-90 ' + (L - 46) + ' ' + (T + PH / 2) + ')'
    });
    text(root, W - R, H - 8, '2024', 'fm-axis-label', { 'text-anchor': 'end' });

    // Giorno di riferimento: 10 giugno.
    refs.guide = line(X(PEAK), T, X(PEAK), T + PH, '#d1d5db', 1.4, '5 5');

    // Finestra che produce il punto del 10 giugno.
    refs.band = svg('rect', {
      x: X(PEAK) - 4, y: T, width: 8, height: PH,
      fill: 'rgba(70,132,241,0.16)', stroke: 'rgba(31,78,120,0.35)', 'stroke-width': 1
    }, root);
    refs.bandLabel = text(root, X(PEAK) - 8, T + 16, '', 'fm-band-label', { 'text-anchor': 'end' });

    // Serie grezza.
    svg('polyline', {
      points: DAYS.map(function (v, i) { return X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' '),
      fill: 'none', stroke: C_RAW, 'stroke-width': 1.5, 'stroke-linejoin': 'round',
      'stroke-opacity': 0.85
    }, root);

    // Punto grezzo massimo (10 giugno).
    svg('circle', { cx: X(PEAK), cy: Y(DAYS[PEAK]), r: 3.6, fill: C_RAW }, root);
    text(root, X(PEAK) + 8, Y(DAYS[PEAK]) - 8, fmtInt(DAYS[PEAK]) + ' minuti', 'fm-tick', {});

    // Media mobile.
    refs.ma = svg('path', { fill: 'none', stroke: C_MA, 'stroke-width': 2.8, 'stroke-linejoin': 'round' }, root);
    refs.dot = svg('circle', { cx: X(PEAK), cy: Y(DAYS[PEAK]), r: 5.5, fill: C_MA, stroke: '#fff', 'stroke-width': 2 }, root);
    refs.dotLabel = text(root, X(PEAK) - 12, Y(DAYS[PEAK]) + 20, '', 'fm-dot-label', { 'text-anchor': 'end' });

    // Legenda.
    var lg = T + PH - 10;
    svg('rect', { x: L + 14, y: lg - 22, width: 16, height: 3, rx: 1.5, fill: C_RAW }, root);
    text(root, L + 36, lg - 15, 'ritardi di ogni giorno', 'fm-legend', {});
    refs.legSwatch = svg('rect', { x: L + 196, y: lg - 22, width: 16, height: 3, rx: 1.5, fill: C_MA }, root);
    refs.legLabel = text(root, L + 218, lg - 15, '', 'fm-legend', {});

    // ── Stato e ridisegno ──
    var st = { k: 1 };
    var notes = PSI.q(el).all('.fm-notes li');
    var kEl = PSI.q(el).one('.fm-k');
    var out = {
      jumps: PSI.q(el).one('.fm-r1'),
      max: PSI.q(el).one('.fm-r2'),
      weight: PSI.q(el).one('.fm-r3')
    };
    var bars = {
      jumps: PSI.q(el).one('.fm-b1'),
      max: PSI.q(el).one('.fm-b2'),
      weight: PSI.q(el).one('.fm-b3')
    };

    function drawMa(k) {
      var ma = movingAverage(k);
      if (k === 1) {
        refs.ma.setAttribute('d', '');
        refs.dot.setAttribute('r', 0);
        refs.dotLabel.textContent = '';
        return ma;
      }
      var d = '', started = false;
      ma.forEach(function (v, i) {
        if (v === null) return;
        d += (started ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1);
        started = true;
      });
      refs.ma.setAttribute('d', d);
      var at = ma[PEAK];
      refs.dot.setAttribute('r', 5.5);
      refs.dot.setAttribute('cx', X(PEAK));
      refs.dot.setAttribute('cy', Y(at));
      refs.dotLabel.textContent = fmtInt(at) + ' minuti';
      return ma;
    }

    function render() {
      var k = Math.max(1, Math.min(30, Math.round(st.k)));
      var ma = drawMa(k);

      // Banda della finestra: gli ultimi k giorni fino al 10 giugno.
      var from = Math.max(0, PEAK - k + 1);
      refs.band.setAttribute('x', X(from));
      refs.band.setAttribute('width', Math.max(3, X(PEAK) - X(from)));
      refs.bandLabel.textContent = k === 1 ? '1 giorno' : k + ' giorni';
      refs.bandLabel.setAttribute('x', X(from) - 6);

      // Numeri del pannello.
      var series = k === 1 ? DAYS : ma;
      var j = jumps(series);
      var top = Math.max.apply(null, series.filter(function (v) { return v !== null; }));
      kEl.textContent = k;
      out.jumps.textContent = fmtInt(j) + ' min';
      out.max.textContent = fmtInt(top) + ' min';
      out.weight.textContent = Math.round(100 / k) + '%';
      bars.jumps.style.setProperty('--w', Math.max(2, j / RAW_JUMPS * 100) + '%');
      bars.max.style.setProperty('--w', Math.max(2, top / RAW_MAX * 100) + '%');
      bars.weight.style.setProperty('--w', Math.max(2, 100 / k) + '%');

      // Legenda e note.
      refs.legSwatch.setAttribute('opacity', k === 1 ? 0 : 1);
      refs.legLabel.textContent = k === 1 ? '' : 'media mobile su ' + k + ' giorni';
      refs.legLabel.setAttribute('x', k === 1 ? 0 : L + 218);
      var regime = k <= 4 ? 0 : k <= 9 ? 1 : 2;
      notes.forEach(function (li, i) { li.classList.toggle('on', i === regime); });

      // Cursore allineato (anche quando lo muove la timeline).
      var slider = PSI.q(el).one('.fm-slider input');
      if (slider && +slider.value !== k) slider.value = k;
    }

    var slider = PSI.q(el).one('.fm-slider input');
    slider.addEventListener('input', function () {
      st.k = +this.value;
      render();
    });
    slider.addEventListener('change', function () { this.blur(); });
    // Il cursore non deve lasciare che il tasto freccia cambi slide.
    slider.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
          e.key === 'ArrowUp' || e.key === 'ArrowDown') e.stopPropagation();
    });

    render();

    // Tre avanzamenti: serie grezza, k = 7, k = 30.
    tl.to(st, { k: 7, duration: 0.9, ease: 'power2.inOut', onUpdate: render });
    tl.addLabel('s1');
    tl.to(st, { k: 30, duration: 0.9, ease: 'power2.inOut', onUpdate: render });
    tl.addLabel('s2');
  });
})();
