-- Migration: Hope Daily game schema
-- Tables for tracking daily word prompts and user submissions

-- Create hope_daily_words table for daily word prompts
CREATE TABLE IF NOT EXISTS hope_daily_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  date DATE NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for date lookup
CREATE INDEX IF NOT EXISTS idx_hope_daily_date ON hope_daily_words(date DESC);

-- Create hope_daily_submissions table for user commentary
CREATE TABLE IF NOT EXISTS hope_daily_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id UUID NOT NULL REFERENCES hope_daily_words(id) ON DELETE CASCADE,
  commentary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for submissions
CREATE INDEX IF NOT EXISTS idx_hope_submissions_word ON hope_daily_submissions(word_id);
CREATE INDEX IF NOT EXISTS idx_hope_submissions_created ON hope_daily_submissions(created_at DESC);

-- Enable RLS
ALTER TABLE hope_daily_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE hope_daily_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for hope_daily_words
CREATE POLICY "Anyone can read daily words"
  ON hope_daily_words FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert words"
  ON hope_daily_words FOR INSERT
  WITH CHECK (true);

-- Policies for submissions
CREATE POLICY "Anyone can read submissions"
  ON hope_daily_submissions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert submissions"
  ON hope_daily_submissions FOR INSERT
  WITH CHECK (true);
