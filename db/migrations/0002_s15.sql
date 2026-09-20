-- S1.5 — booking detail, session linkage, and session revocation (SPEC §5.6–5.8, §9)

-- Atelier notes on a consultation, and the try-on session it came from.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id);

-- Session reports are built from the event stream, always filtered by session.
CREATE INDEX IF NOT EXISTS events_session_time_idx ON events (session_id, time DESC);
CREATE INDEX IF NOT EXISTS quotes_session_time_idx ON quotes (session_id, time DESC);

-- Bookings are read by day in the dashboard.
CREATE INDEX IF NOT EXISTS bookings_slot_start_idx ON bookings (slot_start);

-- "Revoke all sessions" has to invalidate cookies that were already issued. Sessions
-- carry the time they were created; the middleware rejects any older than this epoch.
CREATE TABLE IF NOT EXISTS security_epoch (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  revoked_before TIMESTAMPTZ NOT NULL DEFAULT to_timestamp(0),
  set_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO security_epoch (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- A session is closed once its report has been built; the idle sweep needs to find the
-- ones that are still open, cheaply.
CREATE INDEX IF NOT EXISTS sessions_started_idx ON sessions (started_at DESC);
