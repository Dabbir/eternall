-- AMAZEEN sync: the server only ever sees opaque, encrypted records.
-- An account is identified by the SHA-256 of a secret that the client derives from the person's
-- sync key; the key itself, and the key that encrypts the records, never reach the server.

CREATE TABLE accounts (
  id         TEXT PRIMARY KEY,              -- base64url(SHA-256(authSecret))
  seq        INTEGER NOT NULL DEFAULT 0,    -- last change number handed out for this account
  created_at TEXT NOT NULL
);

CREATE TABLE records (
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  rid        TEXT NOT NULL,                 -- 'meta' or 'e:<entry id>'
  seq        INTEGER NOT NULL,              -- change number; clients pull "everything after N"
  updated_at TEXT NOT NULL,                 -- ISO time the client says it changed (last writer wins)
  deleted    INTEGER NOT NULL DEFAULT 0,    -- 1 = a tombstone (no blob)
  blob       TEXT,                          -- base64url(iv ‖ AES-GCM ciphertext); NULL for tombstones
  PRIMARY KEY (account_id, rid)
);

CREATE INDEX records_by_seq ON records (account_id, seq);
