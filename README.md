# ADSS 26-27

Slide del secondo e del terzo modulo del corso «Analisi dei dati sperimentali e statistica», anno accademico 2026-2027. Corso di laurea in Ingegneria Gestionale, Università Carlo Cattaneo – LIUC.

**Sito:** <https://qwertyjacob.github.io/adss_2627/>

Avvisi, file Excel e dati per le esercitazioni sono sull'[Aula Virtuale del corso](https://ecorsi.liuc.it/course/view.php?id=18767).

## Come sono fatte le slide

Le slide nascono in PowerPoint. Ogni slide diventa un'immagine e ogni lezione un mazzo [reveal.js](https://revealjs.com) di sole immagini, in `docs/settimana_NN/slides/`. Non ci sono animazioni. Il mazzo aggiunge gli strumenti delle slide del corso di Probabilità e Statistica ([PSI-VA-2627](https://github.com/QwertyJacob/PSI-VA-2627)):

- panoramica delle slide (**R** o **Esc**), schermo intero (**F**), puntatore laser (**L**), vista del relatore (**S**);
- scrittura a mano libera dal tablet, con il proiettore che segue il tablet e viceversa, e la lavagna scura (**W**). La sincronizzazione passa per Supabase Realtime.

## Struttura

```text
docs/index.md                    home page (l'elenco delle lezioni è generato)
docs/settimana_NN/slides/        un mazzo per lezione, generato: non modificarlo a mano
  index.html                     il mazzo
  img/NN-<hash>.webp             una immagine per slide (2560x1440)
  sorgente.json                  da quale pptx viene il mazzo
docs/assets/slides/
  deck.js                        avvio comune: reveal.js, supabase-js, laser, panoramica
  lavagna.js, lavagna.css        lavagna e sincronizzazione (copia da PSI-VA-2627)
  immagini.css                   impaginazione delle slide immagine
scripts/
  pptx_to_deck.py                pptx -> mazzo di immagini
  test_lavagna.mjs               test della lavagna nel browser (Playwright)
  fetch_slides_vendor.sh         copia locale di reveal.js e supabase-js
mkdocs.yml                       configurazione del sito (MkDocs Material)
```

## Aggiornare un mazzo

```bash
uv run scripts/pptx_to_deck.py percorso/L07_slide.pptx --lezione 7 --data 2026-11-17
```

Lo script disegna le slide con LibreOffice e `pdftoppm` (pacchetto poppler-utils). Con `--pdf FILE.pdf` usa invece un PDF esportato da PowerPoint dallo stesso pptx, che riproduce esattamente l'impaginazione di PowerPoint. Le note del relatore del pptx compaiono sul tablet. Se il pptx non è cambiato, lo script non rifà nulla. Le immagini hanno l'hash del contenuto nel nome: git vede solo le slide cambiate e il browser non mostra versioni vecchie.

## In locale

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements-docs.txt
npm run vendor                                   # reveal.js e supabase-js in locale
.venv/bin/mkdocs serve -a 0.0.0.0:8001           # http://localhost:8001/adss_2627/
npm install && npm run test:lavagna              # test della lavagna (serve la rete)
```

## Pubblicazione

A ogni push su `main` che tocca `docs/` o `mkdocs.yml`, il workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) costruisce il sito (`mkdocs build --strict`) e lo pubblica su GitHub Pages.

## Licenza

Le slide sono di Luca Mari e Jesus Cevallos e sono distribuite con licenza [Creative Commons Attribuzione – Non commerciale – Condividi allo stesso modo 4.0 Internazionale](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.it).
