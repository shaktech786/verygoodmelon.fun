-- The Final Word (last_words) and The Awakening (first_words) feed word clouds
-- that every visitor sees. Submissions now go through /api/last-words and
-- /api/first-words, which filter abusive text and contact details, rate-limit
-- each client, and insert with the service role (which bypasses RLS).
--
-- This removes the browser's ability to write to these tables directly, so the
-- filter cannot be skipped by calling the REST API with the public anon key.
-- Reading stays public: the clouds are built from these rows.

DROP POLICY IF EXISTS "Anyone can insert last words" ON last_words;
DROP POLICY IF EXISTS "Anyone can insert first words" ON first_words;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON last_words FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON first_words FROM anon, authenticated;
