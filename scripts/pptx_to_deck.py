# /// script
# requires-python = ">=3.10"
# dependencies = ["python-pptx>=1.0", "pillow>=10"]
# ///
"""Trasforma un file PowerPoint in un mazzo di slide del sito: una immagine per slide.

    uv run scripts/pptx_to_deck.py SORGENTE.pptx --lezione 6 [--data 2026-11-10]
                                   [--pdf ESPORTATO.pdf] [--titolo "..."] [--forza]

Scrive docs/settimana_NN/slides/:
  index.html      il mazzo reveal.js (runtime comune in docs/assets/slides/);
  img/*.webp      una immagine per slide visibile, 2560x1440, WebP senza perdita;
                  il nome contiene l'hash del contenuto, così il browser non
                  tiene in cache una slide vecchia e git vede solo le slide cambiate;
  sorgente.json   da quale pptx viene il mazzo (hash, titolo, data, numero di slide).
Poi rigenera l'elenco delle lezioni nella home page (docs/index.md).

Le slide si disegnano con LibreOffice (pptx -> PDF) e pdftoppm (PDF -> PNG).
Con --pdf si usa invece un PDF già esportato da PowerPoint (File > Esporta > PDF),
che riproduce esattamente l'impaginazione di PowerPoint.
Le note del relatore del pptx diventano le note che lavagna.js mostra sul tablet.
Se il pptx (e l'eventuale PDF) non sono cambiati dall'ultima volta, non rifà nulla.

Slide scritte a mano (HTML + JavaScript), come quelle del corso PSI, dentro un
mazzo altrimenti fatto di immagini: stanno in docs/settimana_NN/slides/extra/
e si dichiarano in extra/slides.json, per esempio

    {"insert": [{"after": 16, "html": "finestra.html",
                 "css": ["finestra.css"], "js": ["finestra.js"]}]}

Il mazzo viene rigenerato anche quando cambia uno di questi file, e il frammento
HTML viene inserito dopo la slide del pptx indicata (contando le slide visibili
da 1). Il CSS e il JS dichiarati sono aggiunti a index.html; il JS può usare
`PSI.scene` come nei mazzi del corso PSI (scene.js, KaTeX e GSAP sono caricati
solo per i mazzi che hanno slide scritte a mano).

Serve LibreOffice (anche come snap) e poppler-utils (pdftoppm).
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import html
import io
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

REPO = Path(__file__).resolve().parents[1]
DOCS = REPO / "docs"
# Cartella di lavoro non nascosta dentro la home: LibreOffice in snap non vede /tmp.
WORK = REPO / "_render"
# Cambia quando cambia il formato dell'index.html: rigenera il mazzo anche se il
# pptx non è cambiato. Le immagini restano quelle già in img/ (sono funzione del
# pptx): per rifarle comunque, usa --forza o cancella la cartella img/.
FORMATO = 2
W, H = 2560, 1440

MODULI = {
    2: ("Modulo 2", "Serie storiche, regressione, controllo di processo", range(6, 11)),
    3: ("Modulo 3", "Probabilità", range(11, 16)),
}
GIORNI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"]
INIZIO, FINE = "<!-- lezioni:inizio -->", "<!-- lezioni:fine -->"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def deck_dir(lezione: int) -> Path:
    return DOCS / f"settimana_{lezione:02d}" / "slides"

# ── slide scritte a mano (HTML + JS) accanto alle slide immagine ────────────

def read_extra(out: Path) -> list[dict]:
    """Le slide HTML dichiarate in extra/slides.json, con il testo già letto."""
    manifest = out / "extra" / "slides.json"
    if not manifest.exists():
        return []
    specs = json.loads(manifest.read_text())
    extra = []
    for n, spec in enumerate(specs.get("insert", []), 1):
        base = out / "extra"
        html_path = base / spec["html"]
        files = [html_path] + [base / f for f in spec.get("css", []) + spec.get("js", [])]
        for path in files:
            if not path.is_file():
                sys.exit(f"{manifest}: manca {path.relative_to(out)}")
        extra.append({
            "after": int(spec["after"]),
            "html": html_path.read_text().strip(),
            "css": list(spec.get("css", [])),
            "js": list(spec.get("js", [])),
            "files": files,
            "n": n,
        })
    return extra

def extra_digest(extra: list[dict]) -> str:
    h = hashlib.sha256()
    for e in extra:
        for path in e["files"]:
            h.update(path.name.encode())
            h.update(sha256(path).encode())
    return h.hexdigest() if extra else ""


# ── lettura del pptx ────────────────────────────────────────────────────────

def shape_texts(shapes):
    for sh in shapes:
        if sh.shape_type == MSO_SHAPE_TYPE.GROUP:
            yield from shape_texts(sh.shapes)
        elif getattr(sh, "has_text_frame", False) and sh.has_text_frame:
            yield sh.top or 0, sh.left or 0, sh.text_frame.text
        elif getattr(sh, "has_table", False) and sh.has_table:
            cells = [c.text for row in sh.table.rows for c in row.cells]
            yield sh.top or 0, sh.left or 0, " ".join(cells)


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\x0b", " ")).strip()


def read_pptx(path: Path):
    prs = Presentation(str(path))
    ratio = prs.slide_width / prs.slide_height
    slides = []
    for slide in prs.slides:
        if slide._element.get("show") == "0":  # slide nascosta: non va nel PDF
            continue
        parts = sorted(shape_texts(slide.shapes), key=lambda t: (t[0], t[1]))
        text = clean(" · ".join(t for _, _, t in parts if t.strip()))
        notes = ""
        if slide.has_notes_slide and slide.notes_slide.notes_text_frame is not None:
            notes = slide.notes_slide.notes_text_frame.text.strip()
        slides.append({"text": text, "notes": notes})
    return slides, ratio


def find_title(slides) -> str:
    first = slides[0]["text"] if slides else ""
    m = re.search(r"Lezione\s+\d+\s*[·:\-–]\s*[^·]+", first)
    return clean(m.group(0)) if m else clean(first.split("·")[0])


def topic(title: str) -> str:
    m = re.match(r"Lezione\s+\d+\s*[·:\-–]\s*(.+)", title)
    return m.group(1).strip() if m else title


# ── disegno delle slide ─────────────────────────────────────────────────────

def libreoffice() -> str:
    for name in ("soffice", "libreoffice", "/snap/bin/libreoffice"):
        exe = shutil.which(name)
        if exe:
            return exe
    sys.exit("LibreOffice non trovato (né soffice né libreoffice nel PATH).")


def pptx_to_pdf(pptx: Path, tmp: Path) -> Path:
    src = tmp / "sorgente.pptx"
    shutil.copyfile(pptx, src)
    # Profilo separato: funziona anche con LibreOffice già aperto sul desktop.
    profile = WORK / "profilo-libreoffice"
    cmd = [libreoffice(), f"-env:UserInstallation={profile.as_uri()}", "--headless",
           "--convert-to", "pdf", "--outdir", str(tmp), str(src)]
    subprocess.run(cmd, check=True, capture_output=True, timeout=600)
    pdf = tmp / "sorgente.pdf"
    if not pdf.exists():
        sys.exit("LibreOffice non ha prodotto il PDF.")
    return pdf


def pdf_to_pngs(pdf: Path, tmp: Path) -> list[Path]:
    if not shutil.which("pdftoppm"):
        sys.exit("pdftoppm non trovato: installa poppler-utils.")
    subprocess.run(["pdftoppm", "-png", "-scale-to-x", str(W), "-scale-to-y", "-1",
                    str(pdf), str(tmp / "p")], check=True, timeout=600)
    return sorted(tmp.glob("p-*.png"), key=lambda p: int(p.stem.split("-")[1]))


def to_webp(png: Path) -> bytes:
    im = Image.open(png).convert("RGB")
    if abs(im.width / im.height - W / H) < 0.01:  # 16:9, al pixel di arrotondamento
        im = im.resize((W, H), Image.LANCZOS) if im.size != (W, H) else im
    else:  # slide non 16:9: la si centra su fondo bianco
        im.thumbnail((W, H), Image.LANCZOS)
        canvas = Image.new("RGB", (W, H), "white")
        canvas.paste(im, ((W - im.width) // 2, (H - im.height) // 2))
        im = canvas
    buf = io.BytesIO()
    im.save(buf, "WEBP", lossless=True, method=4)
    return buf.getvalue()


# ── scrittura del mazzo ─────────────────────────────────────────────────────

PAGE = """<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title_html}</title>
  <link rel="icon" href="data:,">
  <!-- Generato da scripts/pptx_to_deck.py a partire da {source}: non modificare a mano. -->
  <script src="../../assets/slides/deck.js"></script>
{extra_css}
</head>
<body>
  <div class="reveal"><div class="slides">
{sections}
  </div></div>
  <script>{start_js}</script>
</body>
</html>
"""


def section(img: str, slide: dict) -> str:
    alt = slide["text"] or "slide"
    if len(alt) > 600:
        alt = alt[:597].rstrip() + "…"
    out = f'    <section class="slide-img"><img src="img/{img}" width="1280" height="720" alt="{html.escape(alt)}">'
    if slide["notes"]:
        notes = "<br>".join(html.escape(line) for line in slide["notes"].splitlines())
        out += f'\n      <aside class="notes">{notes}</aside>\n    '
    return out + "</section>"


def build(args) -> None:
    pptx = Path(args.pptx).resolve()
    pdf_in = Path(args.pdf).resolve() if args.pdf else None
    out = deck_dir(args.lezione)
    meta_path = out / "sorgente.json"
    old = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    extra = read_extra(out)

    meta = {
        "lezione": args.lezione,
        "pptx": pptx.name,
        "sha256": sha256(pptx),
        "pdf_sha256": sha256(pdf_in) if pdf_in else None,
        "motore": "pdf di PowerPoint" if pdf_in else "LibreOffice",
        "formato": FORMATO,
        "extra": extra_digest(extra),
    }
    same = all(old.get(k) == v for k, v in meta.items())
    date = args.data or old.get("data")
    if same and not args.forza:
        if date != old.get("data") or (args.titolo and args.titolo != old.get("titolo")):
            old["data"] = date
            old["titolo"] = args.titolo or old["titolo"]
            old["argomento"] = topic(old["titolo"])
            meta_path.write_text(json.dumps(old, ensure_ascii=False, indent=2) + "\n")
        print(f"lezione {args.lezione}: invariata ({pptx.name})")
        return

    slides, ratio = read_pptx(pptx)
    if abs(ratio - 16 / 9) > 0.01:
        print(f"attenzione: {pptx.name} non è 16:9 (rapporto {ratio:.3f}); le slide avranno bande bianche.")
    title = args.titolo or find_title(slides)
    for e in extra:
        if not 1 <= e["after"] <= len(slides):
            sys.exit(f"extra/slides.json: «after» {e['after']} non è una slide di {pptx.name} "
                     f"(1-{len(slides)}).")

    imgdir = out / "img"
    imgdir.mkdir(parents=True, exist_ok=True)
    # Cambiata solo una slide scritta a mano o il formato dell'HTML (FORMATO):
    # le immagini restano quelle di prima, così non si ridisegna tutto il mazzo
    # (e git non vede slide cambiate). Compatibile con LibreOffice non disponibile.
    keep = old.get("immagini") or []
    reuse = (not args.forza and len(keep) == len(slides)
             and all((imgdir / n).is_file() for n in keep)
             and all(old.get(k) == v for k, v in meta.items() if k not in ("extra", "formato")))
    if reuse:
        names = keep
        changed = 0
        stale = []
        print(f"lezione {args.lezione}: immagini invariate, aggiorno solo le slide scritte a mano")
    else:
        WORK.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=WORK) as t:
            tmp = Path(t)
            pdf = pdf_in or pptx_to_pdf(pptx, tmp)
            pngs = pdf_to_pngs(pdf, tmp)
            if len(pngs) != len(slides):
                sys.exit(f"{pptx.name}: {len(slides)} slide visibili nel pptx ma {len(pngs)} pagine nel PDF. "
                         "Se il PDF viene da PowerPoint, riesportalo dal pptx attuale.")
            names = []
            for i, png in enumerate(pngs, 1):
                data = to_webp(png)
                name = f"{i:02d}-{hashlib.sha256(data).hexdigest()[:10]}.webp"
                if not (imgdir / name).exists():
                    (imgdir / name).write_bytes(data)
                names.append(name)
        stale = [p for p in imgdir.iterdir() if p.name not in names]
        for p in stale:
            p.unlink()
        changed = sum(1 for n in names if n not in keep)

    # Le slide immagine del pptx, con i frammenti HTML inseriti dopo quelle indicate.
    extra_by_after = {}
    for e in extra:
        extra_by_after.setdefault(e["after"], []).append(e)
    chunks = []
    for i, (name, slide) in enumerate(zip(names, slides), 1):
        chunks.append(section(name, slide))
        chunks += [e["html"] for e in extra_by_after.get(i, [])]
    sections = "\n".join(chunks)
    scripts = ", ".join(f'"extra/{html.escape(f)}"' for e in extra for f in e["js"])
    page = PAGE.format(
        title_html=html.escape(f"ADSS 26/27 — {title}"),
        source=html.escape(pptx.name),
        sections=sections,
        extra_css="".join(f'  <link rel="stylesheet" href="extra/{html.escape(f)}">\n'
                          for e in extra for f in e["css"]).rstrip("\n"),
        start_js=(f'ADSSDeck.start({{ extra: true, extraScripts: [{scripts}] }});'
                  if extra else "ADSSDeck.start();"),
    )
    (out / "index.html").write_text(page)

    meta.update({"titolo": title, "argomento": topic(title), "data": date,
                 "slide": len(names) + len(extra), "immagini": names})
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n")
    print(f"lezione {args.lezione}: {len(names)} slide"
          f"{f' + {len(extra)} scritte a mano' if extra else ''} "
          f"({changed} nuove o cambiate, {len(stale)} immagini tolte), motore: {meta['motore']}")


# ── home page ───────────────────────────────────────────────────────────────

def format_date(iso: str | None) -> str:
    if not iso:
        return ""
    d = dt.date.fromisoformat(iso)
    return f"{GIORNI[d.weekday()]} {d:%d/%m/%Y}"


def update_home() -> None:
    decks = []
    for meta_path in sorted(DOCS.glob("settimana_*/slides/sorgente.json")):
        decks.append(json.loads(meta_path.read_text()))
    lines = []
    for n, (name, subject, lessons) in MODULI.items():
        rows = [d for d in decks if d["lezione"] in lessons]
        if not rows:
            continue
        lines += [f"## {name} · {subject}", "",
                  "| Lezione | Data | Argomento | Slide |", "|:-:|---|---|---|"]
        for d in sorted(rows, key=lambda d: d["lezione"]):
            link = f"settimana_{d['lezione']:02d}/slides/index.html"
            lines.append(f"| {d['lezione']} | {format_date(d.get('data'))} | {d['argomento']} "
                         f"| [Apri le slide]({link}) ({d['slide']}) |")
        lines.append("")
    home = DOCS / "index.md"
    text = home.read_text()
    a, b = text.index(INIZIO) + len(INIZIO), text.index(FINE)
    new = text[:a] + "\n" + "\n".join(lines) + "\n" + text[b:]
    if new != text:
        home.write_text(new)
        print("home page: elenco delle lezioni aggiornato")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pptx", nargs="?", help="file .pptx da pubblicare")
    ap.add_argument("--lezione", type=int, help="numero della lezione nel syllabus (6-15)")
    ap.add_argument("--data", help="data della lezione, AAAA-MM-GG")
    ap.add_argument("--pdf", help="PDF esportato da PowerPoint dallo stesso pptx (al posto di LibreOffice)")
    ap.add_argument("--titolo", help="titolo del mazzo (di norma letto dalla prima slide)")
    ap.add_argument("--forza", action="store_true", help="rigenera anche se il pptx non è cambiato")
    ap.add_argument("--solo-home", action="store_true", help="rigenera solo l'elenco nella home page")
    args = ap.parse_args()
    if not args.solo_home:
        if not args.pptx or args.lezione is None:
            ap.error("servono il file pptx e --lezione")
        build(args)
    update_home()


if __name__ == "__main__":
    main()
