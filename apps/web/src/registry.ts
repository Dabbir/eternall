import type { Contributor, HouseSection, ImprintDefinition, ImprintId } from '@eternall/core';
import { amazeen } from '@eternall/amazeen';
import { refrain } from '@eternall/refrain';
import { casheen } from '@eternall/casheen';
import { chaptersSection } from './house/chapters/section';
import { almanacSection } from './house/almanac/section';

/** The apps, each its own door (docs/adr/0011, 0012). Definitions are light; UIs load lazily. */
export const IMPRINTS: readonly ImprintDefinition[] = [amazeen, casheen, refrain];

/** Parts of the house that keep records and contribute like apps do (once FOLIO and ALMANACK). */
export const HOUSE_SECTIONS: readonly HouseSection[] = [chaptersSection, almanacSection];

export const IMPRINT_IDS: readonly ImprintId[] = IMPRINTS.map((d) => d.id);
export const imprintById = (id: ImprintId) => IMPRINTS.find((d) => d.id === id);

/** Everything that contributes to the lifeline, week panel, search and almanac. */
export const contributorsOf = (enabled: readonly ImprintDefinition[]): readonly Contributor[] => [...HOUSE_SECTIONS, ...enabled];
