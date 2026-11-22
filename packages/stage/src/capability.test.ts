import { detectImmersive } from './capability';

describe('detectImmersive', () => {
  it('respects flat pages first, then reduced motion', () => {
    expect(detectImmersive({ flatPages: true })).toEqual({ allowed: false, reason: 'flat-pages' });
    const mm = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    expect(detectImmersive({ flatPages: false }).reason).toBe('reduced-motion');
    window.matchMedia = mm;
  });
  it('needs WebGL2 (absent in jsdom)', () => {
    expect(detectImmersive({ flatPages: false }).reason).toBe('no-webgl');
  });
});
