-- Migration: Add Hard Choices votes and site visits tracking
-- Run this in Supabase SQL Editor

-- Create hard_choices_votes table for tracking dilemma votes
CREATE TABLE IF NOT EXISTS hard_choices_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dilemma_id TEXT NOT NULL,
  choice TEXT NOT NULL CHECK (choice IN ('A', 'B')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for hard_choices_votes
CREATE INDEX IF NOT EXISTS idx_hard_choices_dilemma_id ON hard_choices_votes(dilemma_id);
CREATE INDEX IF NOT EXISTS idx_hard_choices_dilemma_choice ON hard_choices_votes(dilemma_id, choice);

-- Enable RLS for hard_choices_votes
ALTER TABLE hard_choices_votes ENABLE ROW LEVEL SECURITY;

-- Hard choices votes policies
CREATE POLICY "Anyone can read hard choices votes"
  ON hard_choices_votes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert hard choices votes"
  ON hard_choices_votes FOR INSERT
  WITH CHECK (true);

-- Create site_visits table for tracking total site visits
CREATE TABLE IF NOT EXISTS site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for site_visits
CREATE INDEX IF NOT EXISTS idx_site_visits_visited_at ON site_visits(visited_at DESC);

-- Enable RLS for site_visits
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;

-- Site visits policies
CREATE POLICY "Anyone can read site visits count"
  ON site_visits FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert site visits"
  ON site_visits FOR INSERT
  WITH CHECK (true);
