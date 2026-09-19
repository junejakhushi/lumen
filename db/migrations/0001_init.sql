-- Lumen MVP — initial schema
-- Requires TimescaleDB extension on the target database.

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Pieces from the asset pipeline
CREATE TABLE IF NOT EXISTS pieces (
  id TEXT PRIMARY KEY,
  manifest JSONB NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  name TEXT,
  collection TEXT CHECK (collection IS NULL OR collection IN ('Heirloom', 'Fine', 'Playful')),
  type TEXT NOT NULL CHECK (type IN ('bracelet', 'ring', 'tops', 'unknown'))
);

-- Access codes for the client gate
CREATE TABLE IF NOT EXISTS access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash TEXT NOT NULL,
  label TEXT,
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Try-on sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device TEXT,
  access_code_id UUID REFERENCES access_codes(id)
);

-- Events hypertable (view, ar_start, ar_stop, customise, snapshot, book_start, book_submit)
CREATE TABLE IF NOT EXISTS events (
  time TIMESTAMPTZ NOT NULL,
  session_id UUID NOT NULL REFERENCES sessions(id),
  piece_id TEXT REFERENCES pieces(id),
  type TEXT NOT NULL,
  payload JSONB
);
SELECT create_hypertable('events', 'time', if_not_exists => TRUE);

-- Quotes hypertable (logged on every price calculation)
CREATE TABLE IF NOT EXISTS quotes (
  time TIMESTAMPTZ NOT NULL,
  session_id UUID NOT NULL REFERENCES sessions(id),
  piece_id TEXT NOT NULL REFERENCES pieces(id),
  config JSONB NOT NULL,
  breakdown JSONB NOT NULL,
  total INTEGER NOT NULL
);
SELECT create_hypertable('quotes', 'time', if_not_exists => TRUE);

-- Bookings (consultation appointments)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_start TIMESTAMPTZ NOT NULL UNIQUE,
  visit_type TEXT NOT NULL CHECK (visit_type IN ('in-studio', 'video')),
  client JSONB NOT NULL,
  looks JSONB NOT NULL DEFAULT '[]'::jsonb,
  brief_key TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'completed', 'no-show')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Gold rates hypertable (daily rate entry by the atelier)
CREATE TABLE IF NOT EXISTS gold_rates (
  time TIMESTAMPTZ NOT NULL DEFAULT now(),
  rate24 NUMERIC(12,2) NOT NULL,
  pt NUMERIC(12,2),
  set_by TEXT
);
SELECT create_hypertable('gold_rates', 'time', if_not_exists => TRUE);

-- Session reports (analysed try-on sessions)
CREATE TABLE IF NOT EXISTS session_reports (
  session_id UUID PRIMARY KEY REFERENCES sessions(id),
  built_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  report JSONB NOT NULL,
  interest_score NUMERIC(8,2) NOT NULL DEFAULT 0
);

-- Continuous aggregates

CREATE MATERIALIZED VIEW IF NOT EXISTS daily_ar_seconds_per_piece
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', time) AS bucket,
  piece_id,
  SUM((payload->>'seconds')::numeric) AS total_ar_seconds
FROM events
WHERE type = 'ar_stop' AND piece_id IS NOT NULL
GROUP BY bucket, piece_id
WITH NO DATA;

CREATE MATERIALIZED VIEW IF NOT EXISTS daily_quotes_by_collection
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', q.time) AS bucket,
  p.collection,
  COUNT(*) AS quote_count,
  AVG(q.total) AS avg_total
FROM quotes q
JOIN pieces p ON p.id = q.piece_id
GROUP BY bucket, p.collection
WITH NO DATA;
