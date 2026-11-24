import type { ReactNode } from 'react';
import { AppBar, IntroNote } from '@eternall/kit';
import { copy } from '../copy';
import { routeen } from '../index';

export type RouteenPlace = 'today' | 'sky' | 'practice' | 'day';

/**
 * ROUTEEN's own frame (spec §4.9; ADR 0013, ADR 0014), on the shared app bar: the way back ("Leave"),
 * the name, and the places Today · Sky. A practice's page belongs to Today; a day's page to the Sky.
 */
export function Chrome({ here, children }: { here: RouteenPlace; children: ReactNode }) {
  return (
    <div className="rc">
      <AppBar
        exit={{ label: routeen.brand.leaveLabel, ornament: <span className="rs-sun" aria-hidden="true" /> }}
        title={{ name: routeen.name, fn: routeen.functionLine }}
        places={[
          { label: copy.places.today, to: '/', current: here === 'today' ? 'page' : here === 'practice' ? true : undefined },
          { label: copy.places.sky, to: '/sky', current: here === 'sky' ? 'page' : here === 'day' ? true : undefined },
        ]}
      />
      <IntroNote />
      <div className="rc-body">{children}</div>
    </div>
  );
}
