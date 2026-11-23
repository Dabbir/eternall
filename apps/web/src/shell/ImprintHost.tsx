import { Suspense, lazy, useMemo } from 'react';
import type { ImprintDefinition } from '@eternall/core';

/**
 * Hosts one app: lazy-loads its UI chunk. Its theme is scoped on `<body data-imprint>`
 * (doorHead.ts); its first-contact note is rendered by its own chrome (kit `IntroNote`).
 */
export function ImprintHost({ def, path, search }: { def: ImprintDefinition; path: string; search: URLSearchParams }) {
  const App = useMemo(() => lazy(def.load), [def]);
  return (
    <div className="imprint">
      <Suspense fallback={<div className="imprint-loading" role="status" aria-label={`Opening ${def.name}`} />}>
        <App path={path} search={search} />
      </Suspense>
    </div>
  );
}
