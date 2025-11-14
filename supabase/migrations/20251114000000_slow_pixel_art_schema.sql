-- Migration: Slow Pixel Art game schema
-- Table for storing collaborative pixel art canvas

-- Create slow_pixel_art table
CREATE TABLE IF NOT EXISTS slow_pixel_art (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  x INTEGER NOT NULL CHECK (x >= 0 AND x < 32),
  y INTEGER NOT NULL CHECK (y >= 0 AND y < 32),
  color VARCHAR(7) NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint on (x, y) to prevent duplicate pixels
-- We'll use ON CONFLICT to update existing pixels
CREATE UNIQUE INDEX IF NOT EXISTS idx_slow_pixel_art_position ON slow_pixel_art(x, y);

-- Create index for recent activity
CREATE INDEX IF NOT EXISTS idx_slow_pixel_art_created ON slow_pixel_art(created_at DESC);

-- Enable RLS
ALTER TABLE slow_pixel_art ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read pixels"
  ON slow_pixel_art FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert pixels"
  ON slow_pixel_art FOR INSERT
  WITH CHECK (
    x >= 0 AND x < 32 AND
    y >= 0 AND y < 32 AND
    color ~ '^#[0-9A-Fa-f]{6}$'
  );

-- Allow updates to handle pixel overwrites
CREATE POLICY "Anyone can update pixels"
  ON slow_pixel_art FOR UPDATE
  USING (true)
  WITH CHECK (
    x >= 0 AND x < 32 AND
    y >= 0 AND y < 32 AND
    color ~ '^#[0-9A-Fa-f]{6}$'
  );

-- Function to upsert pixels (insert or update if position exists)
CREATE OR REPLACE FUNCTION upsert_pixel(p_x INTEGER, p_y INTEGER, p_color VARCHAR(7))
RETURNS VOID AS $$
BEGIN
  INSERT INTO slow_pixel_art (x, y, color)
  VALUES (p_x, p_y, p_color)
  ON CONFLICT (x, y)
  DO UPDATE SET color = p_color, created_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION upsert_pixel TO anon, authenticated;
