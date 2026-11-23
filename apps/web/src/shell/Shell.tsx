import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import type { ImprintDefinition, ImprintId, ReadContext } from '@eternall/core';
import { HouseProvider, type CapabilityId, type Capabilities, type House, type PrimaryAction } from '@eternall/kit';
import { useToast } from '@eternall/ui';
import { useVault, useVaultVersion } from '@eternall/vault';
import { IMPRINTS, IMPRINT_IDS, contributorsOf, imprintById } from '../registry';
import { migratePrologue } from '../house/domain/migrations';
import { INSCRIPTION_PATH, type Inscription } from '../house/domain/house';
import { HousePages } from '../house/HousePages';
import { DoorsMenu } from './DoorsMenu';
import { ImprintHost } from './ImprintHost';
import { Spine } from './Spine';

const CommandPalette = lazy(() => import('./CommandPalette').then((m) => ({ default: m.CommandPalette })));
import { useProfile, useSettings, useToday } from './hooks';
import { navigate, parseLocation, useHref } from './router';
import { useApplyTheme } from './theme';
import { useLock } from '../vault/lockContext';
import { detectImmersive } from '@eternall/stage';
import { usePatron } from '../vault/patron';
import { useReminders } from './reminders';
import { useDoorHead } from './doorHead';

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
  // The palette loads the first time it opens, then stays mounted.
  const [paletteUsed, setPaletteUsed] = useState(false);
  useEffect(() => {
    if (paletteOpen) setPaletteUsed(true);
  }, [paletteOpen]);
  useApplyTheme(settings.theme);

  const ctx: ReadContext = useMemo(() => ({ data: vault, today, profile }), [vault, today, profile, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const enabled = useMemo(() => IMPRINTS.filter((d) => !settings.hidden.includes(d.id)), [settings.hidden]);
  const contributors = useMemo(() => contributorsOf(enabled), [enabled]);
  // Retired PROLOGUE seasons become inscriptions, once each, including ones that arrive by sync.
  useEffect(() => {
    migratePrologue(vault, today);
  }, [vault, version, today]);
  const used = useMemo(() => enabled.filter((d) => d.hasData(ctx)), [enabled, ctx]);
  useReminders(contributors, ctx, settings.systemNotifications);
  const current = loc.kind === 'imprint' ? imprintById(loc.id) ?? null : null;

  // Focus mode: an imprint used on its own, with no lifeline yet, keeps the platform out of the way.
  const focus = current !== null && !profile && used.filter((d) => d.id !== current.id).length === 0;

  const providers = useMemo(() => {
    const out: Partial<Record<string, unknown>> = {};
    for (const d of contributors) Object.assign(out, d.provides?.({ ...ctx, navigate }) ?? {});
    return out;
  }, [contributors, ctx]);

  const others = useCallback((self: ImprintId | null) => contributors.filter((d) => d.id !== self), [contributors]);

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
      primaryAction: primary,
      leave: () => navigate('/'),
      lock: lockApi.lock,
      canLock: lockApi.canLock,
      openSearch: () => setPaletteOpen(true),
      notices: used.filter((d) => d.id !== def?.id && d.badge?.(ctx)).length,
    }),
    [today, profile, toast, providers, enabled, others, ctx, settings, updateSettings, patron.active, primary, lockApi, used],
  );

  const house = useMemo(() => makeHouse(current), [makeHouse, current]);

  useEffect(() => {
    document.title = current ? `${current.name} · ${current.functionLine}` : 'ETERNALL · Your life in weeks';
  }, [current]);
  useDoorHead(current);

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

  // An app is its own site (docs/adr/0011): no house spine or doors, only the app and its own chrome.
  const app = loc.kind === 'imprint' && current ? current : null;

  return (
    <HouseProvider value={house}>
      <div className={`shell ${app ? 'shell--app' : ''} ${focus ? 'is-focus' : ''}`} data-publication={publication}>
        <a className="skip-link" href="#main">Skip to content</a>
        {!app && (
          <Spine
            current={null}
            primary={primary}
            focus={false}
            onDoors={() => setDoorsOpen(true)}
            onSearch={() => setPaletteOpen(true)}
            badge={used.some((d) => d.badge?.(ctx))}
          />
        )}
        {!saveState.ok && (
          <div className="save-warning" role="alert">
            {saveState.reason === 'quota'
              ? `This device is out of space${app ? '' : ' for ETERNALL'}, so new changes aren’t being saved. Export a backup from Settings.`
              : 'This browser is blocking storage (private mode?), so changes will be lost when you close the tab.'}
          </div>
        )}
        <main id="main" className={`stage ${app ? 'stage--app' : ''}`} tabIndex={-1}>
          {app ? (
            <ImprintHost key={app.id} def={app} path={loc.kind === 'imprint' ? loc.path : '/'} search={loc.search} />
          ) : (
            <HousePages page={loc.kind === 'house' ? loc.page : ''} search={loc.search} ctx={ctx} enabled={enabled} />
          )}
        </main>
        {!app && <DoorsMenu open={doorsOpen} onClose={() => setDoorsOpen(false)} ctx={ctx} enabled={enabled} used={used} current={current} hasProfile={!!profile} />}
        {paletteUsed && (
          <Suspense fallback={null}>
            <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} ctx={ctx} enabled={enabled} current={app} />
          </Suspense>
        )}
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
