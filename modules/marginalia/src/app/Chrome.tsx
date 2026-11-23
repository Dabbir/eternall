import type { ReactNode } from 'react';
import { AppBar, IntroNote } from '@eternall/kit';
import { marginalia } from '../index';

export type MarginaliaPlace = 'catalogue' | 'underlines' | 'work';

/**
 * MARGINALIA's own frame (docs/design/marginalia.md §Chrome; ADR 0011, ADR 0013), set on the shared
 * app bar: a ribbon bookmark is the way back ("Back to the stacks"), the name is typed on a catalogue
 * card, the places are pencilled (the current one ringed by hand), and the primary action is typed in
 * brackets. A work's page is a card from the catalogue, so Catalogue stays ringed while one is open.
 */
export function Chrome({ here, children }: { here: MarginaliaPlace; children: ReactNode }) {
  return (
    <div className="mc">
      <AppBar
        exit={{ label: marginalia.brand.leaveLabel, ornament: <span className="mm-ribbon" aria-hidden="true" /> }}
        title={{ name: marginalia.name, fn: `${marginalia.functionLine}.`, ornament: <span className="mc-call" aria-hidden="true">028.8</span> }}
        places={[
          { label: 'Catalogue', to: '/', current: here === 'catalogue' ? 'page' : here === 'work' ? true : undefined },
          { label: 'Every underline', short: 'Underlines', to: '/underlines', current: here === 'underlines' ? 'page' : undefined },
        ]}
      />
      <IntroNote />
      <div className="mc-body">{children}</div>
    </div>
  );
}
