-- User-submitted thoughts for the /thoughts section.
-- Submissions require moderation before they become visible.

CREATE TABLE user_thoughts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 20 AND 2000),
  theme TEXT NOT NULL CHECK (theme IN ('patience', 'wonder', 'impermanence', 'creativity', 'rest', 'connection', 'perspective')),
  author_name TEXT CHECK (char_length(author_name) <= 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ
);

-- RLS: anyone can insert, only approved thoughts are readable by anon
ALTER TABLE user_thoughts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit thoughts" ON user_thoughts
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Only approved thoughts are visible" ON user_thoughts
  FOR SELECT TO anon USING (status = 'approved');
