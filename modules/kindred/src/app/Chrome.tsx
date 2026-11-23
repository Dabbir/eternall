import type { ReactNode } from 'react';
import { AppBar, IntroNote } from '@eternall/kit';
import { kindred } from '../index';

export type KindredPlace = 'file' | 'sky' | 'person';

/**
 * KINDRED's own frame (docs/design/kindred.md §Chrome; ADR 0011, ADR 0013): the face of a card
 * cabinet, set on the shared app bar. The name sits on a brass label plate; the places are drawer
 * fronts with brass pulls (the open one pulled out); the primary action is a letterpress block. A
 * person's card belongs to the card file, so that drawer stays out while one is open.
 */
export function Chrome({ here, children }: { here: KindredPlace; children: ReactNode }) {
  const open = here === 'person' ? 'file' : here;
  const current = (p: 'file' | 'sky') => (here === p ? ('page' as const) : open === p ? true : undefined);
  return (
    <div className="kc">
      <AppBar
        exit={{ label: kindred.brand.leaveLabel, ornament: <span className="kc-arrow" aria-hidden="true">←</span> }}
        title={{ name: kindred.name, fn: kindred.functionLine }}
        places={[
          { label: 'Card file', short: 'Cards', to: '/', current: current('file') },
          { label: 'Constellation', short: 'Sky', to: '/sky', current: current('sky') },
        ]}
      />
      <IntroNote />
      <div className="kc-body">{children}</div>
    </div>
  );
}
