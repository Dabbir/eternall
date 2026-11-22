import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import type { Db, Statement } from '../src/sync/server/handler';

/**
 * A real SQLite database shaped like Cloudflare D1, built from the real migration file, so server
 * tests exercise the actual SQL (including the ON CONFLICT ... WHERE last-writer-wins rule).
 * Test-only: it is never imported by the app or the Pages Function.
 */
export function createTestDb(): Db & { raw: DatabaseSync } {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  raw.exec(readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8'));

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
