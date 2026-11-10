/*
 * Avvio comune dei mazzi di slide (docs/settimana_NN/slides/index.html).
 *
 * Ogni slide è un'immagine della slide PowerPoint, generata da
 * scripts/pptx_to_deck.py: niente animazioni, niente codice nella slide.
 * Questo file aggiunge a reveal.js gli strumenti del corso PSI:
 *
 *   - lavagna.js: scrittura a mano libera dal tablet (?pen), proiettore che
 *     segue il tablet e viceversa (?proiettore), lavagna scura (W), note del
 *     relatore sul tablet, via Supabase Realtime Broadcast;
 *   - puntatore laser (L) e panoramica delle slide (R o Esc).
 *
 *   <head>   <script src="../../assets/slides/deck.js"></script>
 *   <body>   <div class="reveal"><div class="slides"> ... </div></div>
 *            <script>ADSSDeck.start();</script>
 *
 * I mazzi con qualche slide scritta a mano (cartella extra/, vedi
 * scripts/pptx_to_deck.py) caricano in più KaTeX, GSAP e QRious e chiamano
 * ADSSDeck.start({ extra: true }); così possono usare scene.js, le formule e
 * i sondaggi dal vivo (assets/slides/sondaggio.js).
 *
 * Carica reveal.js, supabase-js (e, se servono, KaTeX, GSAP e QRious) dalla
 * copia locale in assets/vendor (npm run vendor, esclusa da git), così le
 * slide funzionano anche in locale senza rete; dove la copia manca, come sul
 * sito pubblicato, ogni file ripiega sulla stessa versione dal CDN. Le
 * versioni stanno solo qui: lo script scripts/fetch_slides_vendor.sh le legge
 * da questo file.
 */
(function () {
  'use strict';

  var me = document.currentScript;
  var ASSETS = new URL('../', me.src).href; // .../docs/assets/
  var VENDOR = ASSETS + 'vendor/';
  var CDN = 'https://cdn.jsdelivr.net/npm/';
  var CSS = [
    'reveal.js@5.1.0/dist/reveal.css',
    'reveal.js@5.1.0/dist/theme/black.css'
  ];
  var JS = [
    'reveal.js@5.1.0/dist/reveal.js',
    '@supabase/supabase-js@2.48.1/dist/umd/supabase.js',
    'reveal.js@5.1.0/plugin/notes/notes.js' // vista del relatore: tasto S
  ];
  // Solo per i mazzi con slide scritte a mano (options.extra).
  var EXTRA_CSS = ['katex@0.18.9/dist/katex.min.css'];
  var EXTRA_JS = [
    'katex@0.18.9/dist/katex.min.js',
    'katex@0.18.9/dist/contrib/auto-render.min.js',
    'gsap@3.15.0/dist/gsap.min.js',
    'qrious@4.0.2/dist/qrious.min.js' // QR dei sondaggi
  ];

  // Canali Realtime e PIN propri di ADSS: il progetto Supabase è lo stesso di PSI.
  var LAVAGNA = { channelPrefix: 'adss-deck-', token: 'adss2627' };

  var last = me;
  function sheet(href, fallback) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    if (fallback) link.onerror = function () { link.onerror = null; link.href = fallback; };
    last.after(link);
    last = link;
  }
  CSS.forEach(function (path) { sheet(VENDOR + path, CDN + path); });
  sheet(ASSETS + 'slides/lavagna.css');
  sheet(ASSETS + 'slides/immagini.css');

  function script(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { s.remove(); reject(new Error(src)); };
      document.head.appendChild(s);
    });
  }

  function load(paths) {
    return paths.reduce(function (chain, path) {
      return chain.then(function () {
        return script(VENDOR + path).catch(function () {
          return script(CDN + path).catch(function (err) {
            // Senza Supabase le slide funzionano lo stesso, solo senza sincronizzazione
            if (path.indexOf('supabase') !== -1) {
              console.warn('ADSS: Supabase non raggiungibile:', err);
              return;
            }
            throw err;
          });
        });
      });
    }, Promise.resolve());
  }

  // Puntatore laser: un punto rosso luminoso segue il mouse al posto della
  // freccia e sparisce dopo un paio di secondi di immobilità. Tasto L: on/off.
  function laser() {
    if (/print-pdf/.test(location.search)) return;
    var style = document.createElement('style');
    style.textContent =
      'html.psi-laser, html.psi-laser * { cursor: none !important; }' +
      '.psi-laser-dot { position: fixed; left: 0; top: 0; z-index: 2147483647;' +
      ' width: 24px; height: 24px; margin: -12px 0 0 -12px; border-radius: 50%;' +
      ' pointer-events: none; opacity: 0; transition: opacity .3s;' +
      ' background: radial-gradient(circle, #fff 0 15%, #ff3030 35%, #e00000 70%);' +
      ' box-shadow: 0 0 8px 4px rgba(255,40,40,.9), 0 0 28px 14px rgba(255,0,0,.45); }' +
      '.psi-laser-dot.on { opacity: 1; transition: opacity .05s; }';
    document.head.appendChild(style);
    var dot = document.createElement('div');
    dot.className = 'psi-laser-dot';
    document.body.appendChild(dot);

    var enabled = true, timer;
    document.documentElement.classList.add('psi-laser');
    document.addEventListener('mousemove', function (e) {
      if (!enabled) return;
      dot.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
      dot.classList.add('on');
      clearTimeout(timer);
      timer = setTimeout(function () { dot.classList.remove('on'); }, 2000);
    });
    document.documentElement.addEventListener('mouseleave', function () { dot.classList.remove('on'); });
    return function toggle() {
      enabled = !enabled;
      document.documentElement.classList.toggle('psi-laser', enabled);
      if (!enabled) dot.classList.remove('on');
    };
  }

  // options.reveal: opzioni aggiuntive per Reveal.initialize;
  // options.extra: true se il mazzo ha slide scritte a mano (KaTeX + GSAP +
  //   scene.js + assets/slides/scenes.css), come i mazzi del corso PSI;
  // options.extraScripts: i file JS delle slide scritte a mano, caricati dopo
  //   scene.js e prima di buildScenes (possono chiamare PSI.scene);
  // options.onReady(deck): codice da eseguire quando reveal è pronto.
  function start(options) {
    options = Object.assign({}, LAVAGNA, options || {});
    var extra = !!options.extra;
    var extraScripts = options.extraScripts || [];
    var css = extra ? CSS.concat(EXTRA_CSS) : CSS;
    var js = extra ? JS.concat(EXTRA_JS) : JS;
    css.forEach(function (path) { sheet(VENDOR + path, CDN + path); });
    sheet(ASSETS + 'slides/lavagna.css');
    sheet(ASSETS + 'slides/immagini.css');
    if (extra) sheet(ASSETS + 'slides/scenes.css');

    return load(js).then(function () {
      var chain = script(ASSETS + 'slides/lavagna.js').catch(function () {});
      if (extra) {
        chain = chain.then(function () {
          return script(ASSETS + 'slides/scene.js').catch(function () {});
        }).then(function () {
          // Sondaggi dal vivo: configurazione + motore (si aggancia da solo a reveal).
          return script(ASSETS + 'sondaggi.js').catch(function () {});
        }).then(function () {
          return script(ASSETS + 'slides/sondaggio.js').catch(function () {});
        }).then(function () {
          return extraScripts.reduce(function (next, src) {
            return next.then(function () { return script(src); });
          }, Promise.resolve());
        });
      }
      return chain;
    }).then(function () {
      if (extra && window.renderMathInElement) {
        window.renderMathInElement(document.querySelector('.reveal .slides'), {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      }
      if (extra && window.PSI) window.PSI.buildScenes();
      Reveal.initialize(Object.assign({
        // Le immagini sono 16:9 come il canvas della lavagna (1280x720):
        // senza margine la slide riempie lo schermo e i tratti cadono al loro posto.
        width: 1280,
        height: 720,
        margin: 0,
        center: false,
        controls: true,
        progress: true,
        slideNumber: 'c/t',
        hash: true,
        transition: 'none',
        backgroundTransition: 'none',
        // Nell'export PDF ogni slide scritta a mano è una pagina sola, nello
        // stato finale (le slide immagine non hanno frammenti).
        pdfSeparateFragments: false,
        plugins: window.RevealNotes ? [RevealNotes] : []
      }, options.reveal));
      Reveal.on('ready', function () {
        if (extra && window.PSI) window.PSI.bindScenes(Reveal);
        Reveal.addKeyBinding({ keyCode: 82, key: 'R', description: 'Apri/chiudi la panoramica delle slide' }, function () {
          Reveal.toggleOverview();
        });
        var toggleLaser = laser();
        if (toggleLaser) {
          Reveal.addKeyBinding({ keyCode: 76, key: 'L', description: 'Attiva/disattiva il puntatore laser' }, toggleLaser);
        }
        if (window.PSILavagna) window.PSILavagna.bind(Reveal, options);
        if (options.onReady) options.onReady(Reveal);
      });
    });
  }

  window.ADSSDeck = { start: start };
})();
