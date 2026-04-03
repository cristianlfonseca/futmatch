-- ============================================
-- FutMatch - Initial Database Schema
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== USERS ==========
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_id   VARCHAR(255) UNIQUE NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  name        VARCHAR(255) NOT NULL,
  avatar_url  TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ========== PLAYER PROFILES ==========
CREATE TABLE player_profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name  VARCHAR(100) NOT NULL,
  birth_date    DATE,
  position      VARCHAR(20) CHECK (position IN (
                    'Goleiro','Zagueiro','Lateral','Meia','Atacante')),
  skill_level   SMALLINT CHECK (skill_level BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ========== GROUPS ==========
CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  owner_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE group_members (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id  UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  role      VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

-- ========== INVITES ==========
CREATE TABLE invites (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id     UUID REFERENCES groups(id) ON DELETE CASCADE,
  invited_by   UUID REFERENCES users(id),
  invited_user UUID REFERENCES users(id),
  status       VARCHAR(20) DEFAULT 'pending'
                 CHECK (status IN ('pending','accepted','declined')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, invited_user)
);

-- ========== MATCHES ==========
CREATE TABLE matches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,
  title       VARCHAR(100) DEFAULT 'Dia do Fut',
  match_date  TIMESTAMPTZ NOT NULL,
  status      VARCHAR(20) DEFAULT 'scheduled'
                CHECK (status IN ('scheduled','checkin','in_progress','finished')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE match_checkins (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id   UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  confirmed  BOOLEAN DEFAULT TRUE,
  team       SMALLINT,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (match_id, user_id)
);

-- ========== POST-MATCH STATS ==========
CREATE TABLE match_events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id   UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id),
  event_type VARCHAR(20) CHECK (event_type IN (
                 'goal','assist','yellow_card','red_card','mvp')),
  quantity   SMALLINT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== INDEXES ==========
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_matches_group ON matches(group_id);
CREATE INDEX idx_match_checkins_match ON match_checkins(match_id);
CREATE INDEX idx_match_events_match ON match_events(match_id);
CREATE INDEX idx_invites_invited_user ON invites(invited_user);
