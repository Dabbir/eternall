import type { ReactNode } from 'react';
import { AppBar, IntroNote } from '@eternall/kit';
import { refrain } from '../index';

/**
 * REFRAIN's own frame (docs/design/refrain.md §Chrome; ADR 0011, ADR 0013): the head of a score, set
 * on the shared app bar. Five hairlines run under the bar; the way back is the score's end mark
 * ("Fine", with its double bar); the place is the first movement; the primary action is a marking.
 * A ritual's programme notes are the second movement, named under the bar.
 */
export function Chrome({ movement, children }: { movement: { no: string; name: string } | null; children: ReactNode }) {
  return (
    <div className="rc">
      <AppBar
        exit={{ label: refrain.brand.leaveLabel, ornament: <span className="rc-fine__bar" aria-hidden="true" /> }}
        title={{ name: refrain.name, fn: refrain.functionLine }}
        places={[{ label: 'I. The score', short: 'Score', to: '/', current: movement ? true : 'page' }]}
      />
      {movement && (
        <p className="rc-movement">
          <span className="rc-movement__no">{movement.no}</span> {movement.name}
        </p>
      )}
      <IntroNote />
      <div className="rc-body">{children}</div>
    </div>
  );
}
