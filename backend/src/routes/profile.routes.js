// ============================================
// FutMatch - Player Profile Routes
// ============================================
const { Router } = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireApproval } = require('../middleware/approved');

const router = Router();

// All profile routes require auth + approval
router.use(authenticate, requireApproval);

// ---- Get public profile of any user ----
router.get('/api/users/:id/profile', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.avatar_url,
              pp.display_name, pp.birth_date, pp.height, pp.weight, pp.dominant_foot, pp.position, 
              COALESCE(
                 (SELECT ROUND(AVG(rating)) FROM player_ratings WHERE rated_user_id = u.id),
                 pp.skill_level
              ) as skill_level
       FROM users u
       LEFT JOIN player_profiles pp ON pp.user_id = u.id
       WHERE u.id = $1`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error('GET /api/users/:id/profile error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- Get my profile ----
router.get('/api/profile', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT pp.*, u.email, u.name as google_name, u.avatar_url
       FROM player_profiles pp
       JOIN users u ON u.id = pp.user_id
       WHERE pp.user_id = $1`,
      [req.user.id]
    );

    if (!result.rows[0]) {
      return res.json({ profile: null, needs_setup: true });
    }

    res.json({ profile: result.rows[0], needs_setup: false });
  } catch (err) {
    console.error('GET /api/profile error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- Create / Update my profile ----
router.put('/api/profile', async (req, res) => {
  const { display_name, birth_date, position, skill_level, height, weight, dominant_foot } = req.body;

  // Validation
  const validPositions = ['Goleiro', 'Zagueiro', 'Lateral', 'Meia', 'Atacante'];
  if (!display_name || display_name.trim().length < 2) {
    return res.status(400).json({ error: 'Nome deve ter no mínimo 2 caracteres.' });
  }
  if (position && !validPositions.includes(position)) {
    return res.status(400).json({ error: 'Posição inválida.' });
  }
  if (skill_level && (skill_level < 1 || skill_level > 5)) {
    return res.status(400).json({ error: 'Nível deve ser entre 1 e 5.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO player_profiles (user_id, display_name, birth_date, position, skill_level, height, weight, dominant_foot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id)
       DO UPDATE SET
         display_name = EXCLUDED.display_name,
         birth_date = EXCLUDED.birth_date,
         position = EXCLUDED.position,
         skill_level = EXCLUDED.skill_level,
         height = EXCLUDED.height,
         weight = EXCLUDED.weight,
         dominant_foot = EXCLUDED.dominant_foot
       RETURNING *`,
      [
        req.user.id, 
        display_name.trim(), 
        birth_date || null, 
        position || null, 
        skill_level || null,
        height || null,
        weight || null,
        dominant_foot || null
      ]
    );

    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error('PUT /api/profile error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- Get user stats (Global & Group) ----
router.get('/api/profile/:userId/stats', async (req, res) => {
  const { userId } = req.params;
  const groupId = req.query.groupId; // Optional filter

  try {
    // Base player info (Skill level)
    const profile = await db.query('SELECT skill_level FROM player_profiles WHERE user_id = $1', [userId]);
    const skillLevel = profile.rows[0]?.skill_level || 3;

    // Total rating
    let ratingQuery = 'SELECT AVG(rating)::numeric(2,1) as avg_rating, COUNT(*) as vote_count FROM player_ratings WHERE rated_user_id = $1';
    let ratingParams = [userId];

    if (groupId) {
      ratingQuery = `
        SELECT AVG(pr.rating)::numeric(2,1) as avg_rating, COUNT(pr.*) as vote_count 
        FROM player_ratings pr
        JOIN matches m ON m.id = pr.match_id
        WHERE pr.rated_user_id = $1 AND m.group_id = $2
      `;
      ratingParams.push(groupId);
    }

    const ratings = await db.query(ratingQuery, ratingParams);

    // Total matches / goals / assists logic can be aggregated later if needed.
    // For now we aggregate the events table:
    let eventsQuery = 'SELECT event_type, SUM(quantity) as total FROM match_events WHERE user_id = $1';
    let eventsParams = [userId];
    if (groupId) {
      eventsQuery = `
        SELECT me.event_type, SUM(me.quantity) as total 
        FROM match_events me
        JOIN matches m ON m.id = me.match_id
        WHERE me.user_id = $1 AND m.group_id = $2
        GROUP BY me.event_type
      `;
      eventsParams.push(groupId);
    } else {
      eventsQuery += ' GROUP BY event_type';
    }

    const events = await db.query(eventsQuery, eventsParams);
    const getStat = (type) => parseInt(events.rows.find(e => e.event_type === type)?.total || 0, 10);

    const matchesCountQuery = groupId 
      ? `SELECT COUNT(*) as c FROM match_checkins mc JOIN matches m ON mc.match_id = m.id WHERE mc.user_id = $1 AND mc.confirmed = true AND m.group_id = $2`
      : `SELECT COUNT(*) as c FROM match_checkins WHERE user_id = $1 AND confirmed = true`;
    const matchesCount = await db.query(matchesCountQuery, eventsParams); // re-using params since it's [userId] or [userId, groupId]
    const numMatches = parseInt(matchesCount.rows[0].c, 10) || 1;

    res.json({
      skill_level: skillLevel,
      avg_rating: parseFloat(ratings.rows[0]?.avg_rating || 0),
      vote_count: parseInt(ratings.rows[0]?.vote_count || 0, 10),
      goals: getStat('goal'),
      assists: getStat('assist'),
      mvp_count: getStat('mvp'),
      matches_played: numMatches
    });
  } catch (err) {
    console.error('GET stats error:', err);
    res.status(500).json({ error: 'Erro ao buscar estatísticas.' });
  }
});

module.exports = router;
