/** Shared text and validation helpers. Imprints build their own validators on top of these. */

export type FieldErrors<K extends string> = { [P in K]?: string | undefined };
export type Validation<T, K extends string> = { ok: true; value: T } | { ok: false; errors: FieldErrors<K> };

export const finish = <T, K extends string>(errors: FieldErrors<K>, value: () => T): Validation<T, K> =>
  Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: value() };

/** Removes control characters that have no business in user text, then trims. */
export function cleanText(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

export function requireText(raw: string, max: number, label: string): { value: string; error?: string } {
  const value = cleanText(raw);
  if (!value) return { value, error: `${label} can’t be empty.` };
  if (value.length > max) return { value, error: `${label} must be ${max} characters or fewer.` };
  return { value };
}

export function optionalText(raw: string, max: number, label: string): { value: string; error?: string } {
  const value = cleanText(raw);
  if (value.length > max) return { value, error: `${label} must be ${max.toLocaleString('en-GB')} characters or fewer.` };
  return { value };
}
