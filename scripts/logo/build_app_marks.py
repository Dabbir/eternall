#!/usr/bin/env python3
"""
Build CASHEEN's and ROUTEEN's logo files, in one family with AMAZEEN's (modules/amazeen/scripts/logo).

- The monogram is read from the app's own `src/mark.ts`, the one path its app bar draws too.
- The wordmark and tagline are outlined from the fonts the app already self-hosts, so the logo
  matches the UI and renders the same everywhere, with no font dependency.

Usage:  python3 scripts/logo/build_app_marks.py   (needs `pip install fonttools`; run `npm ci` first)
Writes: modules/<id>/assets/logo/*.svg, apps/web/public/icons/<id>.svg, then (on macOS, via `sips`)
        apps/web/public/icons/<id>-{180,192,512}.png and <id>-maskable-512.png.
"""
import re
import shutil
import subprocess
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
FONTS = ROOT / 'node_modules' / '@fontsource'

APPS = [
    {
        'id': 'casheen', 'name': 'CASHEEN', 'tagline': 'Write it in one line.',
        'word': ('libre-caslon-text/files/libre-caslon-text-latin-700-normal.woff', 0.24),
        'tag': 'libre-caslon-text/files/libre-caslon-text-latin-400-italic.woff',
        # bookkeeper green on ledger paper; on dark, the light green over night ink
        'accent': '#2f5d3a', 'paper': '#eef1e4', 'ink': '#1d241c', 'accent_dark': '#8fc79b', 'ink_dark': '#111611',
    },
    {
        'id': 'routeen', 'name': 'ROUTEEN', 'tagline': 'A hard day still counts.',
        'word': ('young-serif/files/young-serif-latin-400-normal.woff', 0.06),
        'tag': 'work-sans/files/work-sans-latin-400-italic.woff',
        # amber on dawn paper; on dark, the light amber over the night
        'accent': '#9a5a14', 'paper': '#f8efe8', 'ink': '#27201f', 'accent_dark': '#f0b968', 'ink_dark': '#1a1618',
    },
]


def round_path(d: str) -> str:
    return re.sub(r'-?\d+\.\d+', lambda m: f'{float(m.group()):.1f}'.rstrip('0').rstrip('.'), d)


def outline(font_file: Path, text: str, size: float, tracking_em: float):
    """Text as one SVG path on a baseline at y = 0; returns (path, width, cap height)."""
    font = TTFont(font_file)
    upm = font['head'].unitsPerEm
    scale = size / upm
    cmap, glyphs, hmtx = font.getBestCmap(), font.getGlyphSet(), font['hmtx']
    x, parts = 0.0, []
    for ch in text:
        name = cmap[ord(ch)]
        if ch != ' ':
            pen = SVGPathPen(glyphs)
            glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, 0)))
            parts.append(round_path(pen.getCommands()))
        x += hmtx[name][0] * scale + (tracking_em * size if ch != ' ' else 0)
    cap = getattr(font['OS/2'], 'sCapHeight', 0) or 0.7 * upm
    return ' '.join(parts), x - tracking_em * size, cap * scale


def read_mark(app_id: str):
    src = (ROOT / 'modules' / app_id / 'src' / 'mark.ts').read_text()
    path = re.search(r"MARK_PATH = '([^']+)'", src).group(1)
    rule = re.search(r"MARK_FILL_RULE[^=]*= '(\w+)'", src).group(1)
    return path, rule


def build(app: dict) -> None:
    app_id = app['id']
    mark, rule = read_mark(app_id)
    word, word_w, cap = outline(FONTS / app['word'][0], app['name'], 100, app['word'][1])
    tag, _, _ = outline(FONTS / app['tag'], app['tagline'], 100, 0)

    mh = cap * 1.55                    # a square monogram needs more height than the wide A to weigh the same
    ms = mh / 100
    wx = 100 * ms + 18
    tag_scale = 0.24

    def mark_path(fill: str, transform: str) -> str:
        return f'<path fill="{fill}" fill-rule="{rule}" transform="{transform}" d="{mark}"/>'

    def lockup(word_fill: str, mark_fill: str, tagline: bool = True) -> str:
        body = mark_path(mark_fill, f'translate(0 {-mh:.1f}) scale({ms:.4f})')
        body += f'<path fill="{word_fill}" transform="translate({wx:.1f} 0)" d="{word}"/>'
        if tagline:
            body += f'<path fill="{word_fill}" transform="translate({wx + 2:.1f} 34) scale({tag_scale})" d="{tag}"/>'
        w, h = wx + word_w + 12, (mh + 54 if tagline else mh + 18)
        label = f'{app["name"]}: {app["tagline"]}' if tagline else app['name']
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 {-mh - 8:.1f} {w:.1f} {h:.1f}" role="img" '
                f'aria-label="{label}"><title>{app["name"]}</title>{body}</svg>\n')

    def standalone(fill: str) -> str:
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 104 104" role="img" aria-label="{app["name"]}">'
                f'<path fill="{fill}" fill-rule="{rule}" d="{mark}"/></svg>\n')

    def tile(rounded: bool = True, safe: float = 0.62) -> str:
        """Square icon, the monogram centred on a tile of the app's accent (as AMAZEEN's)."""
        w = 64 * safe
        s = w / 100
        x = y = (64 - w) / 2
        rx = ' rx="13"' if rounded else ''
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>{app["name"]}</title>'
                f'<rect width="64" height="64"{rx} fill="{app["accent"]}"/>'
                f'{mark_path(app["paper"], f"translate({x:.2f} {y:.2f}) scale({s:.4f})")}</svg>\n')

    out = ROOT / 'modules' / app_id / 'assets' / 'logo'
    out.mkdir(parents=True, exist_ok=True)
    icons = ROOT / 'apps' / 'web' / 'public' / 'icons'
    files = {
        out / f'{app_id}-logo.svg': lockup(app['ink'], app['accent']),
        out / f'{app_id}-logo-reversed.svg': lockup(app['paper'], app['accent_dark']),
        out / f'{app_id}-wordmark.svg': lockup(app['ink'], app['accent'], tagline=False),
        out / f'{app_id}-mark.svg': standalone(app['accent']),
        out / f'{app_id}-icon.svg': tile(),
        out / f'{app_id}-icon-maskable.svg': tile(rounded=False, safe=0.5),  # Android adaptive icons crop to a circle
        out / f'{app_id}-icon-square.svg': tile(rounded=False),              # iOS applies its own corner mask
        icons / f'{app_id}.svg': tile(),
    }
    for path, svg in files.items():
        path.write_text(svg)
        print(f'{path.relative_to(ROOT)}  {len(svg):,} bytes')

    # Raster app icons (macOS `sips` renders SVG); elsewhere, export these with any SVG renderer.
    if shutil.which('sips'):
        for src, dst, size in [
            (f'{app_id}-icon-square.svg', f'{app_id}-180.png', 180),
            (f'{app_id}-icon.svg', f'{app_id}-192.png', 192),
            (f'{app_id}-icon.svg', f'{app_id}-512.png', 512),
            (f'{app_id}-icon-maskable.svg', f'{app_id}-maskable-512.png', 512),
        ]:
            subprocess.run(['sips', '-s', 'format', 'png', '-z', str(size), str(size), str(out / src), '--out', str(icons / dst)],
                           check=True, capture_output=True)
            print(f'apps/web/public/icons/{dst}  {size}px')


for app in APPS:
    build(app)
