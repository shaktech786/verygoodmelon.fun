-- Enable Realtime for hard_choices_votes table
-- Required for the live voting feature in Hard Choices game
ALTER PUBLICATION supabase_realtime ADD TABLE hard_choices_votes;
