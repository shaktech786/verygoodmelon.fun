-- Migration: Timeless Minds game schema
-- Tables for storing thinkers, conversations, and chat history

-- Create thinkers table to store the 50 historical thinkers
CREATE TABLE IF NOT EXISTS thinkers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  era TEXT NOT NULL,
  field TEXT NOT NULL,
  culture TEXT NOT NULL,
  bio TEXT NOT NULL,
  conversation_style TEXT NOT NULL,
  core_beliefs JSONB NOT NULL DEFAULT '[]',
  opening_line TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for searching thinkers
CREATE INDEX IF NOT EXISTS idx_thinkers_field ON thinkers(field);
CREATE INDEX IF NOT EXISTS idx_thinkers_era ON thinkers(era);
CREATE INDEX IF NOT EXISTS idx_thinkers_name ON thinkers(name);

-- Create conversations table for tracking user sessions
CREATE TABLE IF NOT EXISTS timeless_minds_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thinker_id TEXT NOT NULL REFERENCES thinkers(id) ON DELETE CASCADE,
  session_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_thinker ON timeless_minds_conversations(thinker_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON timeless_minds_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_started ON timeless_minds_conversations(started_at DESC);

-- Create chat messages table for storing conversation history
CREATE TABLE IF NOT EXISTS timeless_minds_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES timeless_minds_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'thinker')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON timeless_minds_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON timeless_minds_messages(created_at DESC);

-- Enable RLS for all tables
ALTER TABLE thinkers ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeless_minds_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeless_minds_messages ENABLE ROW LEVEL SECURITY;

-- Thinkers policies (public read, admin write)
CREATE POLICY "Anyone can read thinkers"
  ON thinkers FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert thinkers"
  ON thinkers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update thinkers"
  ON thinkers FOR UPDATE
  USING (true);

-- Conversations policies (users can create and read their own)
CREATE POLICY "Anyone can read conversations"
  ON timeless_minds_conversations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert conversations"
  ON timeless_minds_conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update conversations"
  ON timeless_minds_conversations FOR UPDATE
  USING (true);

-- Messages policies (users can create and read)
CREATE POLICY "Anyone can read messages"
  ON timeless_minds_messages FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert messages"
  ON timeless_minds_messages FOR INSERT
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for thinkers table
CREATE TRIGGER update_thinkers_updated_at
  BEFORE UPDATE ON thinkers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
