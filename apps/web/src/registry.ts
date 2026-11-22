import type { ImprintDefinition, ImprintId } from '@eternall/core';
import { amazeen } from '@eternall/amazeen';
import { envoi } from '@eternall/envoi';
import { folio } from '@eternall/folio';
import { almanack } from '@eternall/almanack';
import { refrain } from '@eternall/refrain';
import { prologue } from '@eternall/prologue';
import { kindred } from '@eternall/kindred';
import { marginalia } from '@eternall/marginalia';

/** Every imprint the house knows, in doors-menu order. Definitions are light; UIs load lazily. */
export const IMPRINTS: readonly ImprintDefinition[] = [amazeen, envoi, folio, almanack, refrain, prologue, kindred, marginalia];

export const IMPRINT_IDS: readonly ImprintId[] = IMPRINTS.map((d) => d.id);
export const imprintById = (id: ImprintId) => IMPRINTS.find((d) => d.id === id);
