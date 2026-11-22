-- ETERNALL sync and licences. The server only ever sees opaque, encrypted records
-- (docs/PRIVACY.md §5–§8). A vault is identified by the SHA-256 of a secret the client derives
-- from the Vault Key; record ids are HMACs, so not even which imprints are used is visible.

CREATE TABLE licences (
  id           TEXT PRIMARY KEY,            -- random, never derived from the payer
  tier         TEXT NOT NULL,               -- 'patron'
  status       TEXT NOT NULL,               -- 'active' | 'past_due' | 'cancelled'
  period_end   TEXT NOT NULL,               -- ISO time the paid period ends
  provider_ref TEXT,                        -- the payment provider's subscription id (no email, no name)
  created_at   TEXT NOT NULL
);

CREATE TABLE claims (
  code_hash  TEXT PRIMARY KEY,              -- SHA-256 of the one-time claim code
  licence_id TEXT NOT NULL REFERENCES licences(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used_at    TEXT
);

CREATE TABLE vaults (
  id         TEXT PRIMARY KEY,              -- base64url(SHA-256(authSecret))
  seq        INTEGER NOT NULL DEFAULT 0,    -- last change number handed out for this vault
  licence_id TEXT REFERENCES licences(id),  -- the licence this sync vault is bound to
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX vaults_by_licence ON vaults (licence_id) WHERE licence_id IS NOT NULL;

CREATE TABLE records (
  vault_id   TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  rid        TEXT NOT NULL,                 -- opaque HMAC record id
  seq        INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  deleted    INTEGER NOT NULL DEFAULT 0,
  blob       TEXT,                          -- base64url(iv ‖ AES-GCM ciphertext); NULL for tombstones
  PRIMARY KEY (vault_id, rid)
);
CREATE INDEX records_by_seq ON records (vault_id, seq);
