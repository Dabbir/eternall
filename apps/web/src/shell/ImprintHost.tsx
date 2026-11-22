import { Suspense, lazy, useMemo } from 'react';
import type { ImprintDefinition } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Icon } from '@eternall/ui';

/**
 * Hosts one imprint: scopes its theme with `data-imprint`, lazy-loads its UI chunk,
 * and shows its one-time first-contact hint (docs/DESIGN.md §1.3).
 */
export function ImprintHost({ def, path, search }: { def: ImprintDefinition; path: string; search: URLSearchParams }) {
  const App = useMemo(() => lazy(def.load), [def]);
  const house = useHouse();
  const introKey = `intro:${def.id}`;
  return (
    <div className="imprint" data-imprint={def.id}>
      {!house.isDismissed(introKey) && (
        <aside className="imprint-intro" role="note">
          <p>
            <strong>{def.name}</strong> · {def.intro}
          </p>
          <button type="button" className="imprint-intro__close" onClick={() => house.dismiss(introKey)} aria-label="Got it">
            <Icon name="close" size={14} />
          </button>
        </aside>
      )}
      <Suspense fallback={<div className="imprint-loading" role="status" aria-label={`Opening ${def.name}`} />}>
        <App path={path} search={search} />
      </Suspense>
    </div>
  );
}
