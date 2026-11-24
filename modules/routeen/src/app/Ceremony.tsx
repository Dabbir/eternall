import type { Dye, Pattern } from '../practices';

/**
 * ROUTEEN's full-screen moment (docs/design/routeen.md §6): **Woven**. The shuttle crosses the
 * screen and today's row tightens into place, in the practice's own thread. Played through
 * `house.ceremony`: decorative, brief (700ms) and skipped under reduced motion.
 */
export function Woven({ name, dye, pattern, all }: { name: string; dye: Dye; pattern: Pattern; all: boolean }) {
  return (
    <div className="rr-woven">
      <div className="rr-woven__cloth" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className={`rt-stitch rt-stitch--woven rt-dye--${dye} rt-pattern--${pattern}`} style={{ ['--i' as string]: i }} />
        ))}
        <span className="rr-woven__shuttle" />
      </div>
      <p className="rr-woven__name">
        <strong>{name}</strong> · woven{all ? ' · every thread today' : ''}
      </p>
    </div>
  );
}
