import { render } from '@testing-library/react';
import { BodyIcon, type BodyKind } from './Body';

const KINDS: BodyKind[] = ['unlit', 'minimum', 'target', 'more', 'rest', 'sun'];
const draw = (kind: BodyKind) => render(<BodyIcon kind={kind} />).container;

it('draws a distinct shape for each kind, hidden from screen readers', () => {
  const marks = KINDS.map((k) => draw(k).innerHTML);
  expect(new Set(marks).size).toBe(KINDS.length);
  for (const k of KINDS) expect(draw(k).querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
});
it('gives More its rays and Minimum its half', () => {
  expect(draw('more').querySelectorAll('line')).toHaveLength(8);
  expect(draw('minimum').querySelector('path')).not.toBeNull();
  expect(draw('target').querySelectorAll('line')).toHaveLength(0);
});
