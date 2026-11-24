import { createContext, useContext } from 'react';
import type { Look } from '@eternall/core';

/** CASHEEN's look, read once by the app and shared with its pages. */
export const CasheenLookContext = createContext<{ look: Look; setLook(look: Look): void } | null>(null);
export function useCasheenLook() {
  const v = useContext(CasheenLookContext);
  if (!v) throw new Error('useCasheenLook must be used inside CasheenApp');
  return v;
}
