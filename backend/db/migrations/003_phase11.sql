-- Add max_players to matches
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS max_players SMALLINT DEFAULT 14;

-- Expand match_events CHECK constraint
ALTER TABLE match_events DROP CONSTRAINT IF EXISTS match_events_event_type_check;
ALTER TABLE match_events ADD CONSTRAINT match_events_event_type_check CHECK (event_type IN ('goal','assist','yellow_card','red_card','mvp', 'save', 'tackle', 'error', 'dribble'));
