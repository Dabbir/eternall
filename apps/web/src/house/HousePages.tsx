import { lazy, Suspense, useMemo } from 'react';
import type { ImprintDefinition, ReadContext } from '@eternall/core';
import type { HousePage } from '../shell/router';
import { contributionContext } from './domain/lifeline';
import { LifelineView } from './lifeline/LifelineView';
import { contributorsOf } from '../registry';

// Everything but the lifeline loads on demand, keeping the shell's first load small (DESIGN.md §7).
const InscriptionsView = lazy(() => import('./inscriptions/InscriptionsView').then((m) => ({ default: m.InscriptionsView })));
const Onboarding = lazy(() => import('./onboarding/Onboarding').then((m) => ({ default: m.Onboarding })));
const SettingsView = lazy(() => import('./settings/SettingsView').then((m) => ({ default: m.SettingsView })));
const ChaptersView = lazy(() => import('./chapters/ChaptersView').then((m) => ({ default: m.ChaptersView })));
const AlmanacView = lazy(() => import('./almanac/AlmanacView').then((m) => ({ default: m.AlmanacView })));
const PatronPage = lazy(() => import('./patron/PatronPage').then((m) => ({ default: m.PatronPage })));

/** The house's own pages: the lifeline (or the welcome), inscriptions, chapters, almanac, settings, Patron. */
export function HousePages({ page, search, ctx, enabled }: { page: HousePage; search: URLSearchParams; ctx: ReadContext; enabled: readonly ImprintDefinition[] }) {
  const cctx = useMemo(() => contributionContext(ctx), [ctx]);
  return (
    <div className="house" data-imprint="house">
      <Suspense
        fallback={
          <p className="house-loading muted" role="status">
            Opening…
          </p>
        }
      >
        {page === 'inscriptions' ? (
          <InscriptionsView search={search} />
        ) : page === 'chapters' ? (
          <ChaptersView search={search} />
        ) : page === 'almanac' ? (
          <AlmanacView />
        ) : page === 'settings' ? (
          <SettingsView enabled={enabled} />
        ) : page === 'patron' ? (
          <PatronPage search={search} />
        ) : page === 'begin' ? (
          <Onboarding startAt="name" enabled={enabled} />
        ) : ctx.profile && page !== 'welcome' ? (
          <LifelineView ctx={cctx} enabled={enabled} contributors={contributorsOf(enabled)} search={search} />
        ) : (
          <Onboarding enabled={enabled} />
        )}
      </Suspense>
    </div>
  );
}
