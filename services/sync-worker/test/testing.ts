import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import type { Db, Statement } from '@eternall/amazeen/sync/server/handler';

/** A real SQLite database shaped like D1, built from the real migration (pattern from AMAZEEN). */
export function createTestDb(migration = new URL('../migrations/0001_init.sql', import.meta.url)): Db & { raw: DatabaseSync } {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  raw.exec(readFileSync(migration, 'utf8'));
  const statement = (sql: string, params: unknown[] = []): Statement => ({
    bind: (...values) => statement(sql, values),
    first: async <T>() => (raw.prepare(sql).get(...(params as never[])) as T | undefined) ?? null,
    all: async <T>() => ({ results: raw.prepare(sql).all(...(params as never[])) as T[] }),
    run: async () => raw.prepare(sql).run(...(params as never[])),
  });
  return {
    raw,
    prepare: (sql) => statement(sql),
    async batch(statements) {
      raw.exec('BEGIN');
      try {
        const out: unknown[] = [];
        for (const s of statements) out.push(await s.run());
        raw.exec('COMMIT');
        return out;
      } catch (err) {
        raw.exec('ROLLBACK');
        throw err;
      }
    },
  };
}

export async function devKeys(): Promise<{ privateJwk: JsonWebKey; publicJwk: JsonWebKey }> {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  return { privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey), publicJwk: await crypto.subtle.exportKey('jwk', pair.publicKey) };
}
