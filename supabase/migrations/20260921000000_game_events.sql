-- Anonymous game usage events.
--
-- Deliberately has no visitor, session, IP, or device column: rows cannot be
-- linked to a person or to each other. An "open" and its matching "close" are
-- not connected either, so this only ever answers aggregate questions
-- (which games get opened, roughly how long people stay).

CREATE TABLE IF NOT EXISTS game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL CHECK (char_length(game_id) BETWEEN 1 AND 64),
  event TEXT NOT NULL CHECK (event IN ('open', 'close')),
  duration_seconds INTEGER CHECK (duration_seconds BETWEEN 0 AND 86400),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((event = 'close') = (duration_seconds IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_game_events_created_at ON game_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_events_game_id ON game_events(game_id);

ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record game events"
  ON game_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read game events"
  ON game_events FOR SELECT
  USING (true);

-- Aggregates for the public /analytics page, so the app never pulls raw rows.
CREATE OR REPLACE FUNCTION game_usage_summary(since TIMESTAMPTZ)
RETURNS TABLE (game_id TEXT, opens BIGINT, median_seconds INTEGER)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    e.game_id,
    count(*) FILTER (WHERE e.event = 'open') AS opens,
    (percentile_cont(0.5) WITHIN GROUP (ORDER BY e.duration_seconds)
      FILTER (WHERE e.event = 'close'))::INTEGER AS median_seconds
  FROM game_events e
  WHERE e.created_at >= since
  GROUP BY e.game_id
  ORDER BY opens DESC;
$$;

GRANT EXECUTE ON FUNCTION game_usage_summary(TIMESTAMPTZ) TO anon, authenticated;
