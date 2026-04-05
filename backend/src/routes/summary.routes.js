// ============================================
// FutMatch - Post-Match Summary Routes
// ============================================
const { Router } = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireApproval } = require('../middleware/approved');

const router = Router();

router.use(authenticate, requireApproval);

// ---- Record match event (goal, assist, card, mvp) ----
router.post('/api/matches/:id/events', async (req, res) => {
  const { user_id, event_type, quantity } = req.body;

  const validTypes = ['goal', 'assist', 'yellow_card', 'red_card', 'mvp', 'save', 'tackle', 'error', 'dribble'];
  if (!validTypes.includes(event_type)) {
    return res.status(400).json({ error: 'Tipo de evento inválido.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO match_events (match_id, user_id, event_type, quantity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.id, user_id, event_type, quantity || 1]
    );

    res.status(201).json({ event: result.rows[0] });
  } catch (err) {
    console.error('POST event error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- Delete a match event ----
router.delete('/api/match-events/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM match_events WHERE id = $1', [req.params.id]);
    res.json({ message: 'Evento removido.' });
  } catch (err) {
    console.error('DELETE event error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- Group ranking (top scorers & assists) ----
router.get('/api/groups/:groupId/ranking', async (req, res) => {
  const { groupId } = req.params;

  try {
    // Top scorers (artilharia)
    const scorers = await db.query(
      `SELECT u.id, u.name, u.avatar_url, pp.display_name, pp.position,
              COALESCE(SUM(me.quantity), 0) as total_goals
       FROM match_events me
       JOIN matches m ON m.id = me.match_id
       JOIN users u ON u.id = me.user_id
       LEFT JOIN player_profiles pp ON pp.user_id = u.id
       WHERE m.group_id = $1 AND me.event_type = 'goal'
       GROUP BY u.id, u.name, u.avatar_url, pp.display_name, pp.position
       ORDER BY total_goals DESC
       LIMIT 20`,
      [groupId]
    );

    // Top assisters (garçom)
    const assisters = await db.query(
      `SELECT u.id, u.name, u.avatar_url, pp.display_name, pp.position,
              COALESCE(SUM(me.quantity), 0) as total_assists
       FROM match_events me
       JOIN matches m ON m.id = me.match_id
       JOIN users u ON u.id = me.user_id
       LEFT JOIN player_profiles pp ON pp.user_id = u.id
       WHERE m.group_id = $1 AND me.event_type = 'assist'
       GROUP BY u.id, u.name, u.avatar_url, pp.display_name, pp.position
       ORDER BY total_assists DESC
       LIMIT 20`,
      [groupId]
    );

    // MVP count
    const mvps = await db.query(
      `SELECT u.id, u.name, u.avatar_url, pp.display_name,
              COUNT(*) as mvp_count
       FROM match_events me
       JOIN matches m ON m.id = me.match_id
       JOIN users u ON u.id = me.user_id
       LEFT JOIN player_profiles pp ON pp.user_id = u.id
       WHERE m.group_id = $1 AND me.event_type = 'mvp'
       GROUP BY u.id, u.name, u.avatar_url, pp.display_name
       ORDER BY mvp_count DESC
       LIMIT 10`,
      [groupId]
    );

    res.json({
      ranking: {
        scorers: scorers.rows,
        assisters: assisters.rows,
        mvps: mvps.rows,
      },
    });
  } catch (err) {
    console.error('GET ranking error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router;
