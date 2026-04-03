-- Add physical attributes to player profiles
ALTER TABLE player_profiles
  ADD COLUMN IF NOT EXISTS height NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS dominant_foot VARCHAR(10) CHECK (dominant_foot IN ('Direito', 'Esquerdo', 'Ambidestro'));

-- Create player ratings table for post-match peer voting
CREATE TABLE IF NOT EXISTS player_ratings (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id       UUID REFERENCES matches(id) ON DELETE CASCADE,
  rater_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  rated_user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  rating         NUMERIC(2,1) CHECK (rating BETWEEN 0 AND 5),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (match_id, rater_id, rated_user_id)
);
