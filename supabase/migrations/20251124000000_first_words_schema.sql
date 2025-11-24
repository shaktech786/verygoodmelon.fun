-- Migration: First Words (First Breath) game schema
-- Table for storing user's first words after crossing over submissions

-- Create first_words table
CREATE TABLE IF NOT EXISTS first_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  words TEXT NOT NULL CHECK (char_length(words) <= 500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for recent submissions
CREATE INDEX IF NOT EXISTS idx_first_words_created ON first_words(created_at DESC);

-- Enable RLS
ALTER TABLE first_words ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read first words"
  ON first_words FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert first words"
  ON first_words FOR INSERT
  WITH CHECK (char_length(words) > 0 AND char_length(words) <= 500);
