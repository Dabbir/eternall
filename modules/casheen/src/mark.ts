/**
 * CASHEEN's monogram (docs/BRAND.md §5), one family with AMAZEEN's A: a Caslon-like C, its weight on the
 * left where the pen presses, over the bookkeeper's double rule that closes a total. On a 100 × 100 grid,
 * filled even-odd. The app bar, the icons and the logo files are all drawn from this one path
 * (`scripts/logo/build_app_marks.py` reads it from here).
 */
export const MARK_PATH = 'M78.34 17.22 A37 37 0 1 0 78.34 64.78 L69.05 56.61 A21 21 0 1 1 69.05 25.39 Z M14 86 H86 V90 H14 Z M14 94 H86 V98 H14 Z';
export const MARK_FILL_RULE: 'evenodd' | 'nonzero' = 'evenodd';
