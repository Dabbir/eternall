import { useMemo } from 'react';
import type { ImprintDefinition, ReadContext } from '@eternall/core';
import type { HousePage } from '../shell/router';
import { contributionContext } from './domain/lifeline';
import { InscriptionsView } from './inscriptions/InscriptionsView';
import { LifelineView } from './lifeline/LifelineView';
import { Onboarding } from './onboarding/Onboarding';
import { SettingsView } from './settings/SettingsView';

/** The house's own pages: the lifeline (or the welcome), inscriptions, settings. */
export function HousePages({ page, search, ctx, enabled }: { page: HousePage; search: URLSearchParams; ctx: ReadContext; enabled: readonly ImprintDefinition[] }) {
  const cctx = useMemo(() => contributionContext(ctx), [ctx]);
  return (
    <div className="house" data-imprint="house">
      {page === 'inscriptions' ? (
        <InscriptionsView search={search} />
      ) : page === 'settings' ? (
        <SettingsView enabled={enabled} />
      ) : page === 'begin' ? (
        <Onboarding startAt="name" enabled={enabled} />
      ) : ctx.profile && page !== 'welcome' ? (
        <LifelineView ctx={cctx} enabled={enabled} search={search} />
      ) : (
        <Onboarding enabled={enabled} />
      )}
    </div>
  );
}
