import type { ReactNode } from 'react';
import { AppBar, IntroNote } from '@eternall/kit';
import { routeen } from '../index';

export type RouteenPlace = 'loom' | 'cloth' | 'practice';

/**
 * ROUTEEN's own frame (docs/design/routeen.md §8; ADR 0013, ADR 0014), on the shared app bar: a
 * small shuttle for the way back ("Leave the loom"), the name over a woven selvedge rule, and the
 * places The loom · The cloth. A practice's page belongs to the loom.
 */
export function Chrome({ here, children }: { here: RouteenPlace; children: ReactNode }) {
  return (
    <div className="rc">
      <AppBar
        exit={{ label: routeen.brand.leaveLabel, ornament: <span className="rc-shuttle" aria-hidden="true" /> }}
        title={{ name: routeen.name, fn: routeen.functionLine }}
        places={[
          { label: 'The loom', short: 'Loom', to: '/', current: here === 'loom' ? 'page' : here === 'practice' ? true : undefined },
          { label: 'The cloth', short: 'Cloth', to: '/cloth', current: here === 'cloth' ? 'page' : undefined },
        ]}
      />
      <IntroNote />
      <div className="rc-body">{children}</div>
    </div>
  );
}
