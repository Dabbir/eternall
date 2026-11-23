import type { ImprintDefinition } from '@eternall/core';
import { Button } from '@eternall/ui';
import { withApp } from './domain/apps';
import { useSettings } from '../shell/hooks';
import { navigate } from '../shell/router';

/**
 * An app that is switched off, reached by its address (an old bookmark, an installed shortcut).
 * It never opens on its own: the person turns it on here, or goes back (docs/adr/0013).
 */
export function AppOff({ def, enabled }: { def: ImprintDefinition; enabled: readonly ImprintDefinition[] }) {
  const [, updateSettings] = useSettings();
  return (
    <section className="app-off" aria-labelledby="app-off-title">
      <p className="eyebrow">{def.label}</p>
      <h1 id="app-off-title" className="display page-title">
        {def.name} is off.
      </h1>
      <p className="muted">
        {def.label} · {def.functionLine}. Turn it on to open it. Anything it kept is still in your vault.
      </p>
      <div className="app-off__actions">
        <Button variant="primary" onClick={() => updateSettings(withApp(enabled.map((d) => d.id), def.id, true))}>
          Turn on {def.name}
        </Button>
        <Button variant="ghost" onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/'))}>
          Back
        </Button>
      </div>
    </section>
  );
}
