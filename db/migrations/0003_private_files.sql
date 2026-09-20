-- Private files (Design Briefs, look snapshots) for deployments with no object storage.
--
-- Serverless filesystems are read-only, so the local-file fallback cannot work there. When
-- SPACES_* is not configured these bytes live here instead, still behind the access gate and
-- still served only through short-lived signed URLs (SPEC §9).

CREATE TABLE IF NOT EXISTS private_files (
  key TEXT PRIMARY KEY,
  content BYTEA NOT NULL,
  content_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS private_files_created_idx ON private_files (created_at DESC);
