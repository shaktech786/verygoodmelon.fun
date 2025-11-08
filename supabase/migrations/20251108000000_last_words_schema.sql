-- Migration: Last Words game schema
-- Table for storing user's last words submissions

-- Create last_words table
CREATE TABLE IF NOT EXISTS last_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  words TEXT NOT NULL CHECK (char_length(words) <= 500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for recent submissions
CREATE INDEX IF NOT EXISTS idx_last_words_created ON last_words(created_at DESC);

-- Enable RLS
ALTER TABLE last_words ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read last words"
  ON last_words FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert last words"
  ON last_words FOR INSERT
  WITH CHECK (char_length(words) > 0 AND char_length(words) <= 500);
