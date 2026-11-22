/**
 * The recovery key (from AMAZEEN's sync key, docs/PRIVACY.md §2): 128 random bits shown as seven
 * groups of four characters, e.g. `K7QF-2M9T-…`.
 *
 * Alphabet is Crockford base32 (no I, L, O or U), so it survives being read aloud or typed from
 * a printout; typed look-alikes (O→0, I/L→1) are forgiven. The last two characters are a checksum
 * that catches typos before they turn into a confusing "wrong key" later. The checksum is for typos
 * only; the security is the 128 bits of randomness.
 */
import type { Bytes } from './crypto';


const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const KEY_BYTES = 16;
const DATA_CHARS = 26; // 26 × 5 = 130 bits: 128 of key + 2 spare bits that must be zero
const CHECK_CHARS = 2;
export const KEY_CHARS = DATA_CHARS + CHECK_CHARS;

export type KeyParseResult = { ok: true; bytes: Bytes } | { ok: false; reason: 'empty' | 'length' | 'characters' | 'checksum' };

function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function decodeBase32(text: string): Bytes | null {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of text) {
    const index = ALPHABET.indexOf(ch);
    if (index < 0) return null;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  // Canonical form: whatever bits are left over must be zero.
  if (bits > 0 && (value & ((1 << bits) - 1)) !== 0) return null;
  return Uint8Array.from(out);
}

/** 10-bit Fletcher-style checksum over the data characters → two base32 characters. */
function checksum(data: string): string {
  let a = 1;
  let b = 0;
  for (const ch of data) {
    a = (a + ALPHABET.indexOf(ch) + 1) % 1021;
    b = (b + a) % 1021;
  }
  const n = (a ^ (b << 1)) & 1023;
  return `${ALPHABET[n >> 5]}${ALPHABET[n & 31]}`;
}

/** Group as `XXXX-XXXX-…` for display. */
export function formatKey(compact: string): string {
  return compact.match(/.{1,4}/gu)?.join('-') ?? compact;
}

/** The display text for a key's bytes: what the person writes down and types on another device. */
export function keyText(bytes: Uint8Array): string {
  const data = encodeBase32(bytes);
  return formatKey(data + checksum(data));
}

/** A fresh key, as `[bytes, display text]`. */
export function generateKey(random: (n: number) => Bytes = (n) => crypto.getRandomValues(new Uint8Array(n))): { bytes: Bytes; text: string } {
  const bytes = random(KEY_BYTES);
  return { bytes, text: keyText(bytes) };
}

/** Parse what a person typed or pasted. Spaces, dashes and case don't matter. */
export function parseKey(input: string): KeyParseResult {
  const compact = input
    .toUpperCase()
    .replace(/[\s\-–—]/gu, '')
    .replace(/O/gu, '0')
    .replace(/[IL]/gu, '1');
  if (compact === '') return { ok: false, reason: 'empty' };
  if (compact.length !== KEY_CHARS) return { ok: false, reason: 'length' };
  if ([...compact].some((ch) => !ALPHABET.includes(ch))) return { ok: false, reason: 'characters' };
  const data = compact.slice(0, DATA_CHARS);
  if (checksum(data) !== compact.slice(DATA_CHARS)) return { ok: false, reason: 'checksum' };
  const bytes = decodeBase32(data);
  if (!bytes || bytes.length !== KEY_BYTES) return { ok: false, reason: 'checksum' };
  return { ok: true, bytes };
}

export const KEY_PROBLEMS: Record<Exclude<KeyParseResult, { ok: true }>['reason'], string> = {
  empty: 'Enter your recovery key.',
  length: `A recovery key has ${KEY_CHARS} characters (seven groups of four). Check for a missing or extra one.`,
  characters: 'A recovery key uses only letters and numbers. Check for a stray symbol.',
  checksum: 'That key doesn’t look right. One character is probably mistyped.',
};
