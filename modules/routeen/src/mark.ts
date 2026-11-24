/**
 * ROUTEEN's monogram (docs/BRAND.md §5), one family with AMAZEEN's A: an R whose counter is the sun and
 * whose leg sweeps out like the A's swash foot. On a 100 × 100 grid, filled nonzero (the sun's subpath
 * runs the other way, so it is cut out). The app bar, the icons and the logo files are all drawn from
 * this one path (`scripts/logo/build_app_marks.py` reads it from here).
 */
export const MARK_PATH = 'M14 4 H33 V92 H14 Z M33 4 H55 A28 28 0 0 1 55 60 H33 Z M47 54 H67 C72 70 80 84 98 92 H74 C64 84 55 70 47 54 Z M55 21 A11 11 0 0 0 55 43 A11 11 0 0 0 55 21 Z';
export const MARK_FILL_RULE: 'evenodd' | 'nonzero' = 'nonzero';
