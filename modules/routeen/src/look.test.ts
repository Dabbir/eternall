import { validateLookSpec } from '@eternall/core';
import { ROUTEEN_LOOKS } from './look';

describe('your cloth’s look', () => {
  it('keeps every cloth, accent and mode readable', () => {
    expect(validateLookSpec(ROUTEEN_LOOKS)).toEqual([]);
  });
  it('never touches the threads: dyes and patterns are not look tokens', () => {
    for (const p of Object.values(ROUTEEN_LOOKS.presets)) for (const k of Object.keys(p.light)) expect(k).not.toMatch(/^--dye-/);
  });
});
