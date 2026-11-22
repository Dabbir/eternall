#!/usr/bin/env python3
"""
Build AMAZEEN's logo files from source.

- The monogram is hand-drawn geometry (below): an editorial A with a swash foot and a
  four-point star as its counter (cut out with even-odd fill, so it works on any background).
- The wordmark and tagline are outlined from the app's own variable fonts
  (Fraunces Black for the wordmark, Newsreader Italic for the tagline), so the logo matches
  the UI and renders identically everywhere, with no font dependency.

Usage:  python3 scripts/logo/build_logo.py   (needs `pip install fonttools`; run `npm ci` first)
Writes: assets/logo/*.svg and public/favicon.svg, then (on macOS) the PNG app icons in public/ via `sips`.
"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]

# fontTools reads WOFF2 via the `brotli` module; fall back to a shim backed by Node's zlib.
try:
    import brotli  # noqa: F401
except ImportError:
    import importlib.util
    spec = importlib.util.spec_from_file_location('brotli', HERE / 'brotli_shim.py')
    sys.modules['brotli'] = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(sys.modules['brotli'])

from fontTools.pens.svgPathPen import SVGPathPen  # noqa: E402
from fontTools.pens.transformPen import TransformPen  # noqa: E402
from fontTools.ttLib import TTFont  # noqa: E402
from fontTools.varLib import instancer  # noqa: E402

INK, RED, IVORY, RED_ON_DARK = '#1b1814', '#d43a24', '#f2ede3', '#ff5a42'

# Monogram on a 100 × 65.3 grid (baseline at y = 65.3). Second subpath = star counter.
MARK = ('M0 65.3 C11.3 60.2 20.6 50.6 27.4 38.7 L50 0 L65.3 0 L100 65.3 L67.8 65.3 L59.9 49.2 L39.8 49.2 '
        'C35.6 49.2 31.6 52.8 30.8 57.1 C30.2 61 33.6 63.8 39.5 65.3 Z '
        'M52.5 17.5 L54.8 27 L62.1 29.9 L54.8 32.9 L52.5 42.4 L50.3 32.9 L42.9 29.9 L50.3 27 Z')
MARK_H = 65.3


def round_path(d: str) -> str:
    return re.sub(r'-?\d+\.\d+', lambda m: f'{float(m.group()):.1f}'.rstrip('0').rstrip('.'), d)


def outline(font_file: Path, text: str, axes: dict, size: float, tracking_em: float):
    font = instancer.instantiateVariableFont(TTFont(font_file), axes)
    scale = size / font['head'].unitsPerEm
    cmap, glyphs, hmtx = font.getBestCmap(), font.getGlyphSet(), font['hmtx']
    x, parts = 0.0, []
    for ch in text:
        name = cmap[ord(ch)]
        if ch != ' ':
            pen = SVGPathPen(glyphs)
            glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, 0)))
            parts.append(round_path(pen.getCommands()))
        x += hmtx[name][0] * scale + (tracking_em * size if ch != ' ' else 0)
    return ' '.join(parts), x - tracking_em * size


FONTS = ROOT / 'node_modules' / '@fontsource-variable'
WORD, WORD_W = outline(FONTS / 'fraunces/files/fraunces-latin-full-normal.woff2', 'AMAZEEN',
                       {'wght': 900, 'opsz': 144, 'SOFT': 30, 'WONK': 0}, 100, 0)  # cap height = 70
TAG, _ = outline(FONTS / 'newsreader/files/newsreader-latin-opsz-italic.woff2',
                 'The weekly magazine of your own life.', {'wght': 450, 'opsz': 24}, 100, 0)

MH = 86                      # monogram height ≈ 1.23 × cap height, sitting on the baseline
MS = MH / MARK_H
WX = 100 * MS + 18           # wordmark x: monogram width + gap
TAG_SCALE = 0.24
TAGLINE = 'The weekly magazine of your own life.'


def mark_path(fill: str, transform: str) -> str:
    return f'<path fill="{fill}" fill-rule="evenodd" transform="{transform}" d="{MARK}"/>'


def lockup_body(word_fill: str, mark_fill: str, tagline: bool) -> str:
    body = mark_path(mark_fill, f'translate(0 {-MH}) scale({MS:.4f})')
    body += f'<path fill="{word_fill}" transform="translate({WX:.1f} 0)" d="{WORD}"/>'
    if tagline:
        body += f'<path fill="{word_fill}" transform="translate({WX + 2:.1f} 34) scale({TAG_SCALE})" d="{TAG}"/>'
    return body


def lockup(word_fill: str, mark_fill: str, tagline: bool = True) -> str:
    w, h = WX + WORD_W + 12, (140 if tagline else 104)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -94 {w:.1f} {h}" role="img" '
            f'aria-label="AMAZEEN: {TAGLINE}"><title>AMAZEEN</title>{lockup_body(word_fill, mark_fill, tagline)}</svg>\n')


def mark(fill: str) -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 104 {MARK_H + 4}" role="img" aria-label="AMAZEEN">'
            f'<path fill="{fill}" fill-rule="evenodd" d="{MARK}"/></svg>\n')


def tile(bg: str, fg: str, rounded: bool = True, safe: float = 0.62) -> str:
    """Square icon. The monogram is optically centred: its visual mass sits right of its box centre."""
    w = 64 * safe
    s = w / 100
    x, y = (64 - w) / 2 - 0.6, (64 - MARK_H * s) / 2 + 0.6
    rx = ' rx="13"' if rounded else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64"{rx} fill="{bg}"/>'
            f'{mark_path(fg, f"translate({x:.2f} {y:.2f}) scale({s:.4f})")}</svg>\n')


def sheet() -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1648" height="1024" viewBox="0 0 1648 1024" role="img" aria-labelledby="t d">
<title id="t">AMAZEEN — {TAGLINE}</title>
<desc id="d">Primary lockup: vermilion A monogram with a four-point star counter, charcoal Fraunces wordmark and Newsreader italic tagline. Below: app icon, outlined tile and standalone monogram.</desc>
<rect width="1648" height="1024" fill="{IVORY}"/>
<g transform="translate(200 470) scale(1.92)">{lockup_body(INK, RED, True)}</g>
<g transform="translate(404 640)"><rect width="224" height="224" rx="46" fill="{RED}"/>{mark_path(IVORY, "translate(40 66) scale(1.42)")}</g>
<g transform="translate(712 640)"><rect x="1.5" y="1.5" width="221" height="221" rx="45" fill="none" stroke="{INK}" stroke-width="3"/>{mark_path(INK, "translate(40 66) scale(1.42)")}</g>
<g transform="translate(1020 640)">{mark_path(RED, "translate(20 66) scale(1.84)")}</g>
</svg>
'''


OUT = ROOT / 'assets' / 'logo'
OUT.mkdir(parents=True, exist_ok=True)
files = {
    OUT / 'amazeen-logo.svg': lockup(INK, RED),
    OUT / 'amazeen-logo-reversed.svg': lockup(IVORY, RED_ON_DARK),
    OUT / 'amazeen-wordmark.svg': lockup(INK, RED, tagline=False),
    OUT / 'amazeen-mark.svg': mark(RED),
    OUT / 'amazeen-icon.svg': tile(RED, IVORY),
    OUT / 'amazeen-icon-maskable.svg': tile(RED, IVORY, rounded=False, safe=0.5),   # Android adaptive icons crop to a circle
    OUT / 'amazeen-icon-square.svg': tile(RED, IVORY, rounded=False),                # iOS applies its own corner mask
    OUT / 'amazeen-logo-sheet.svg': sheet(),
    ROOT / 'public' / 'favicon.svg': tile(RED, IVORY),
}
for path, svg in files.items():
    path.write_text(svg)
    print(f'{path.relative_to(ROOT)}  {len(svg):,} bytes')

# Raster app icons (macOS `sips` renders SVG); elsewhere, export these four PNGs with any SVG renderer.
import shutil
import subprocess

if shutil.which('sips'):
    for src, out, size in [
        ('amazeen-icon.svg', 'icon-192.png', 192),
        ('amazeen-icon.svg', 'icon-512.png', 512),
        ('amazeen-icon-maskable.svg', 'icon-maskable-512.png', 512),
        ('amazeen-icon-square.svg', 'apple-touch-icon.png', 180),
    ]:
        subprocess.run(['sips', '-s', 'format', 'png', '-z', str(size), str(size), str(OUT / src),
                        '--out', str(ROOT / 'public' / out)], check=True, capture_output=True)
        print(f'public/{out}  {size}px')
