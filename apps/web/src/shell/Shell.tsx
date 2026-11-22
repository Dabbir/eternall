import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ImprintDefinition, ImprintId, ReadContext } from '@eternall/core';
import { HouseProvider, type CapabilityId, type Capabilities, type House, type PrimaryAction } from '@eternall/kit';
import { useToast } from '@eternall/ui';
import { useVault, useVaultVersion } from '@eternall/vault';
import { IMPRINTS, IMPRINT_IDS, imprintById } from '../registry';
import { INSCRIPTION_PATH, type Inscription } from '../house/domain/house';
import { HousePages } from '../house/HousePages';
import { CommandPalette } from './CommandPalette';
import { DoorsMenu } from './DoorsMenu';
import { ImprintHost } from './ImprintHost';
import { Spine } from './Spine';
import { useProfile, useSettings, useToday } from './hooks';
import { navigate, parseLocation, useHref } from './router';
import { useApplyTheme } from './theme';
import { useLock } from '../vault/lockContext';
import { detectImmersive } from '@eternall/stage';
import { usePatron } from '../vault/patron';

export function Shell({ today: fixedToday }: { today?: string }) {
  const vault = useVault();
  const version = useVaultVersion();
  const href = useHref();
  const [pathname, query = ''] = href.split('?');
  const loc = parseLocation(pathname ?? '/', query, IMPRINT_IDS);
  const today = useToday(fixedToday);
  const profile = useProfile();
  const [settings, updateSettings] = useSettings();
  const toast = useToast();
  const lockApi = useLock();
  const patron = usePatron();
  const [primary, setPrimary] = useState<PrimaryAction | null>(null);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  useApplyTheme(settings.theme);

  const ctx: ReadContext = useMemo(() => ({ data: vault, today, profile }), [vault, today, profile, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const enabled = useMemo(() => IMPRINTS.filter((d) => !settings.hidden.includes(d.id)), [settings.hidden]);
  const used = useMemo(() => enabled.filter((d) => d.hasData(ctx)), [enabled, ctx]);
  const current = loc.kind === 'imprint' ? imprintById(loc.id) ?? null : null;

  // Focus mode: an imprint used on its own, with no lifeline yet, keeps the platform out of the way.
  const focus = current !== null && !profile && used.filter((d) => d.id !== current.id).length === 0;

  const providers = useMemo(() => {
    const out: Partial<Record<string, unknown>> = {};
    for (const d of enabled) Object.assign(out, d.provides?.({ ...ctx, navigate }) ?? {});
    return out;
  }, [enabled, ctx]);

  const others = useCallback((self: ImprintId | null) => enabled.filter((d) => d.id !== self), [enabled]);

  const makeHouse = useCallback(
    (def: ImprintDefinition | null): House => ({
      today,
      profile,
      imprint: def?.id ?? null,
      navigate,
      href: (sub) => `${def ? def.basePath.slice(0, -1) : ''}${sub.startsWith('/') ? sub : `/${sub}`}`,
      toast,
      setPrimaryAction: setPrimary,
      capability: <K extends CapabilityId>(id: K) => (providers[id] as Capabilities[K] | undefined) ?? null,
      isEnabled: (id) => enabled.some((d) => d.id === id),
      gather: {
        memories: () => [...houseMemories(ctx), ...others(def?.id ?? null).flatMap((d) => d.memories?.(ctx) ?? [])],
        facts: () => others(def?.id ?? null).flatMap((d) => d.almanacFacts?.(ctx) ?? []),
        redLetterDays: () => others(def?.id ?? null).flatMap((d) => d.redLetterDays?.(ctx) ?? []),
      },
      dismiss: (key) => {
        if (!settings.dismissed.includes(key)) updateSettings({ dismissed: [...settings.dismissed, key] });
      },
      isDismissed: (key) => settings.dismissed.includes(key),
      immersive: detectImmersive({ flatPages: settings.flatPages, licensed: import.meta.env.DEV || patron.active }),
    }),
    [today, profile, toast, providers, enabled, others, ctx, settings, updateSettings, patron.active],
  );

  const house = useMemo(() => makeHouse(current), [makeHouse, current]);

  useEffect(() => {
    document.title = current ? `${current.name} · ${current.functionLine}` : 'ETERNALL · Your life in weeks';
  }, [current]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        lockApi.lock();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lockApi]);

  const publication = current?.id ?? 'house';

  const saveState = vault.getSaveState();

  return (
    <HouseProvider value={house}>
      <div className={`shell ${focus ? 'is-focus' : ''}`} data-publication={publication}>
        <a className="skip-link" href="#main">Skip to content</a>
        <Spine
          current={current}
          primary={primary}
          focus={focus}
          onDoors={() => setDoorsOpen(true)}
          onSearch={() => setPaletteOpen(true)}
          badge={used.some((d) => d.badge?.(ctx))}
        />
        {!saveState.ok && (
          <div className="save-warning" role="alert">
            {saveState.reason === 'quota'
              ? 'This device is out of space for ETERNALL — new changes aren’t being saved. Export a backup from Settings.'
              : 'This browser is blocking storage (private mode?) — changes will be lost when you close the tab.'}
          </div>
        )}
        <main id="main" className="stage" tabIndex={-1}>
          {loc.kind === 'imprint' && current ? (
            <ImprintHost key={current.id} def={current} path={loc.path} search={loc.search} />
          ) : (
            <HousePages page={loc.kind === 'house' ? loc.page : ''} search={loc.search} ctx={ctx} enabled={enabled} />
          )}
        </main>
        <DoorsMenu open={doorsOpen} onClose={() => setDoorsOpen(false)} ctx={ctx} enabled={enabled} used={used} current={current} hasProfile={!!profile} />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} ctx={ctx} enabled={enabled} />
      </div>
    </HouseProvider>
  );
}

/** The house's own inscriptions, offered to imprints as memories. */
function houseMemories(ctx: ReadContext) {
  return ctx.data
    .collection<Inscription>(INSCRIPTION_PATH)
    .all()
    .map((i) => ({ imprint: 'house' as const, id: i.id, date: i.date, title: i.title, excerpt: i.body, tone: i.tone, href: `/inscriptions?open=${i.id}` }));
}
