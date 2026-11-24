import { render, screen } from '@testing-library/react';
import { copy } from '../copy';
import type { Practice } from '../practices';
import { SkyBand } from './SkyBand';

const p = (id: string, timeOfDay?: Practice['timeOfDay']): Practice => ({ id, name: `P ${id}`, why: '', cadence: { kind: 'daily' }, startedOn: '2026-01-01', pausedOn: null, ...(timeOfDay ? { timeOfDay } : {}) });
const groups = [
  { time: 'morning' as const, practices: [p('a', 'morning')] },
  { time: 'anytime' as const, practices: [p('b'), p('c')] },
];
const kinds: Record<string, 'target' | 'unlit' | 'minimum'> = { a: 'target', b: 'unlit', c: 'minimum' };

const band = (over: Partial<Parameters<typeof SkyBand>[0]> = {}) =>
  render(<SkyBand size="full" mode="normal" glow={1 / 3} groups={groups} kindOf={(id) => kinds[id]!} nameOf={(id) => `P ${id}`} sun={0.4} label={copy.sky.band(2, 3)} {...over} />);

it('names the sky in words and hides its bodies', () => {
  const { container } = band();
  expect(screen.getByRole('img', { name: copy.sky.band(2, 3) })).toBeInTheDocument();
  expect(container.querySelector('.rs-band__bodies')).toHaveAttribute('aria-hidden', 'true');
  expect(copy.sky.band(0, 0)).not.toMatch(/\d/);
});
it('draws one body per practice, in its kind, and the sun', () => {
  const { container } = band();
  const kindsDrawn = [...container.querySelectorAll('.rs-body[data-id]')].map((el) => [el.getAttribute('data-id'), el.getAttribute('data-kind')]);
  expect(kindsDrawn).toEqual([['a', 'target'], ['b', 'unlit'], ['c', 'minimum']]);
  expect(container.querySelector('.rs-body--sun')).not.toBeNull();
});
it('marks the just-lit body, and leaves out the sun when there is none', () => {
  const { container } = band({ justLit: 'c', sun: undefined });
  expect(container.querySelector('[data-id="c"]')).toHaveClass('is-lighting');
  expect(container.querySelector('[data-id="a"]')).not.toHaveClass('is-lighting');
  expect(container.querySelector('.rs-body--sun')).toBeNull();
});
it('names bodies only while there are twelve or fewer', () => {
  expect(band().container.querySelectorAll('.rs-body__name')).toHaveLength(3);
  const many = [{ time: 'anytime' as const, practices: Array.from({ length: 13 }, (_, i) => p(`x${i}`)) }];
  expect(band({ groups: many, kindOf: () => 'unlit' }).container.querySelectorAll('.rs-body__name')).toHaveLength(0);
});
