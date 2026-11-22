import type { ImprintDefinition, ImprintId } from '@eternall/core';
import { envoi } from '@eternall/envoi';
import { folio } from '@eternall/folio';
import { almanack } from '@eternall/almanack';

/** Every imprint the house knows, in doors-menu order. Definitions are light; UIs load lazily. */
export const IMPRINTS: readonly ImprintDefinition[] = [envoi, folio, almanack];

export const IMPRINT_IDS: readonly ImprintId[] = IMPRINTS.map((d) => d.id);
export const imprintById = (id: ImprintId) => IMPRINTS.find((d) => d.id === id);
