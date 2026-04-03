// ============================================
// FutMatch - Match Routes
// ============================================
const { Router } = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireApproval } = require('../middleware/approved');
const { balanceTeams } = require('../services/teamBalancer');

const router = Router();

router.use(authenticate, requireApproval);

// ---- Create a match ("Dia do Fut") ----
router.post('/api/groups/:groupId/matches', async (req, res) => {
  const { groupId } = req.params;
  const { title, match_date, max_players } = req.body;

  try {
    // Must be owner or admin
    const memberCheck = await db.query(
      "SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2 AND role IN ('owner', 'admin')",
      [groupId, req.user.id]
    );
    if (!memberCheck.rows[0]) {
      return res.status(403).json({ error: 'Apenas dono ou admin pode criar partidas.' });
    }

    if (!match_date) {
      return res.status(400).json({ error: 'Data da partida é obrigatória.' });
    }

    const result = await db.query(
      `INSERT INTO matches (group_id, title, match_date, max_players)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [groupId, title?.trim() || 'Dia do Fut', match_date, max_players || 14]
    );

    res.status(201).json({ match: result.rows[0] });
  } catch (err) {
    console.error('POST matches error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- List matches for a group ----
router.get('/api/groups/:groupId/matches', async (req, res) => {
  const { groupId } = req.params;

  try {
    const memberCheck = await db.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, req.user.id]
    );
    if (!memberCheck.rows[0]) {
      return res.status(403).json({ error: 'Você não é membro deste grupo.' });
    }

    const result = await db.query(
      `SELECT m.*,
              (SELECT COUNT(*) FROM match_checkins WHERE match_id = m.id AND confirmed = true) as confirmed_count
       FROM matches m
       WHERE m.group_id = $1
       ORDER BY m.match_date DESC`,
      [groupId]
    );

    res.json({ matches: result.rows });
  } catch (err) {
    console.error('GET matches error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- Get match details ----
router.get('/api/matches/:id', async (req, res) => {
  try {
    const matchResult = await db.query('SELECT * FROM matches WHERE id = $1', [req.params.id]);
    if (!matchResult.rows[0]) {
      return res.status(404).json({ error: 'Partida não encontrada.' });
    }

    const match = matchResult.rows[0];

    // Check membership
    const memberCheck = await db.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [match.group_id, req.user.id]
    );
    if (!memberCheck.rows[0]) {
      return res.status(403).json({ error: 'Você não é membro deste grupo.' });
    }

    // Get check-ins with player info
    const checkinsResult = await db.query(
      `SELECT mc.*, u.name, u.avatar_url,
              pp.display_name, pp.position, pp.skill_level
       FROM match_checkins mc
       JOIN users u ON u.id = mc.user_id
       LEFT JOIN player_profiles pp ON pp.user_id = u.id
       WHERE mc.match_id = $1
       ORDER BY mc.checked_at ASC`,
      [req.params.id]
    );

    // Get match events (goals, assists, etc)
    const eventsResult = await db.query(
      `SELECT me.*, u.name, pp.display_name
       FROM match_events me
       JOIN users u ON u.id = me.user_id
       LEFT JOIN player_profiles pp ON pp.user_id = u.id
       WHERE me.match_id = $1
       ORDER BY me.created_at ASC`,
      [req.params.id]
    );

    res.json({
      match,
      checkins: checkinsResult.rows,
      events: eventsResult.rows,
      my_role: memberCheck.rows[0].role,
    });
  } catch (err) {
    console.error('GET /api/matches/:id error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- Check-in / Check-out ----
router.post('/api/matches/:id/checkin', async (req, res) => {
  try {
    const match = await db.query('SELECT * FROM matches WHERE id = $1', [req.params.id]);
    if (!match.rows[0]) {
      return res.status(404).json({ error: 'Partida não encontrada.' });
    }

    // Check membership
    const memberCheck = await db.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [match.rows[0].group_id, req.user.id]
    );
    if (!memberCheck.rows[0]) {
      return res.status(403).json({ error: 'Você não é membro deste grupo.' });
    }

    const maxPlayers = match.rows[0].max_players || 14;
    const countCheck = await db.query('SELECT COUNT(*) as c FROM match_checkins WHERE match_id = $1 AND confirmed = true', [req.params.id]);
    const currentConfirmed = parseInt(countCheck.rows[0].c, 10);

    // Toggle check-in logic
    const existing = await db.query(
      'SELECT * FROM match_checkins WHERE match_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (existing.rows[0]) {
      const isCurrentlyConfirmed = existing.rows[0].confirmed;
      const isCurrentlyWaitlist = existing.rows[0].is_waitlist;
      
      let newConfirmed = false;
      let newWaitlist = false;

      if (isCurrentlyConfirmed || isCurrentlyWaitlist) {
        // Cancel everything
        newConfirmed = false;
        newWaitlist = false;

        // Auto-promote if someone frees a spot
        if (isCurrentlyConfirmed) {
          const firstWaitlist = await db.query(
            'SELECT id FROM match_checkins WHERE match_id = $1 AND is_waitlist = true ORDER BY checked_at ASC LIMIT 1',
            [req.params.id]
          );
          if (firstWaitlist.rows[0]) {
            await db.query('UPDATE match_checkins SET is_waitlist = false, confirmed = true WHERE id = $1', [firstWaitlist.rows[0].id]);
          }
        }
      } else {
        // Check in again
        if (currentConfirmed >= maxPlayers) {
          newWaitlist = true;
        } else {
          newConfirmed = true;
        }
      }

      await db.query(
        'UPDATE match_checkins SET confirmed = $1, is_waitlist = $2, checked_at = NOW() WHERE id = $3',
        [newConfirmed, newWaitlist, existing.rows[0].id]
      );
      
      res.json({ 
        confirmed: newConfirmed, 
        is_waitlist: newWaitlist,
        message: newConfirmed ? 'Presença confirmada!' : (newWaitlist ? 'Na lista de espera.' : 'Presença cancelada.') 
      });

    } else {
      let isWaitlist = false;
      let isConfirmed = true;
      if (currentConfirmed >= maxPlayers) {
        isWaitlist = true;
        isConfirmed = false;
      }

      await db.query(
        'INSERT INTO match_checkins (match_id, user_id, confirmed, is_waitlist) VALUES ($1, $2, $3, $4)',
        [req.params.id, req.user.id, isConfirmed, isWaitlist]
      );
      res.json({ 
        confirmed: isConfirmed, 
        is_waitlist: isWaitlist,
        message: isConfirmed ? 'Presença confirmada!' : 'Na lista de espera.' 
      });
    }
  } catch (err) {
    console.error('POST checkin error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- Auto-balance teams ----
router.post('/api/matches/:id/balance-teams', async (req, res) => {
  const { num_teams } = req.body;

  try {
    const match = await db.query('SELECT * FROM matches WHERE id = $1', [req.params.id]);
    if (!match.rows[0]) {
      return res.status(404).json({ error: 'Partida não encontrada.' });
    }

    // Get confirmed players with profiles
    const players = await db.query(
      `SELECT mc.id as checkin_id, mc.user_id,
              u.name, pp.display_name, pp.position, pp.skill_level
       FROM match_checkins mc
       JOIN users u ON u.id = mc.user_id
       LEFT JOIN player_profiles pp ON pp.user_id = u.id
       WHERE mc.match_id = $1 AND mc.confirmed = true`,
      [req.params.id]
    );

    const teams = balanceTeams(players.rows, num_teams || 2);

    // Save team assignments
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      for (const [teamIdx, team] of teams.entries()) {
        for (const player of team) {
          await client.query(
            'UPDATE match_checkins SET team = $1 WHERE id = $2',
            [teamIdx + 1, player.checkin_id]
          );
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ teams });
  } catch (err) {
    console.error('POST balance-teams error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- Update team assignment (drag & drop) ----
router.patch('/api/matches/:matchId/checkins/:checkinId/team', async (req, res) => {
  const { team } = req.body;

  try {
    await db.query(
      'UPDATE match_checkins SET team = $1 WHERE id = $2',
      [team, req.params.checkinId]
    );
    res.json({ message: 'Time atualizado.' });
  } catch (err) {
    console.error('PATCH team error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- Submit peer ratings ----
router.post('/api/matches/:id/rate', async (req, res) => {
  const { ratings } = req.body; // [{ rated_user_id, rating }]
  const matchId = req.params.id;

  try {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      for (const r of ratings) {
        if (!r.rating || r.rating < 0 || r.rating > 5) continue;
        await client.query(
          `INSERT INTO player_ratings (match_id, rater_id, rated_user_id, rating)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (match_id, rater_id, rated_user_id)
           DO UPDATE SET rating = EXCLUDED.rating`,
          [matchId, req.user.id, r.rated_user_id, r.rating]
        );
      }
      await client.query('COMMIT');
      res.json({ message: 'Avaliações salvas com sucesso.' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('POST /rate error:', err);
    res.status(500).json({ error: 'Erro ao salvar avaliações.' });
  }
});

// ---- Start match ----
router.post('/api/matches/:id/start', async (req, res) => {
  const matchId = req.params.id;
  try {
    const memberCheck = await db.query(
      "SELECT role FROM group_members gm JOIN matches m ON m.group_id = gm.group_id WHERE m.id = $1 AND gm.user_id = $2 AND gm.role IN ('owner', 'admin')",
      [matchId, req.user.id]
    );
    if (!memberCheck.rows[0]) {
      return res.status(403).json({ error: 'Apenas dono ou admin pode iniciar a partida.' });
    }
    await db.query("UPDATE matches SET status = 'in_progress' WHERE id = $1", [matchId]);
    res.json({ message: 'Partida iniciada!' });
  } catch (err) {
    console.error('POST /start error:', err);
    res.status(500).json({ error: 'Erro ao iniciar partida.' });
  }
});

// ---- Finish match and compute Highlights ----
router.post('/api/matches/:id/finish', async (req, res) => {
  const matchId = req.params.id;

  try {
    const memberCheck = await db.query(
      "SELECT role FROM group_members gm JOIN matches m ON m.group_id = gm.group_id WHERE m.id = $1 AND gm.user_id = $2 AND gm.role IN ('owner', 'admin')",
      [matchId, req.user.id]
    );
    if (!memberCheck.rows[0]) {
      return res.status(403).json({ error: 'Apenas dono ou admin pode finalizar a partida.' });
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Mark as finished
      await client.query("UPDATE matches SET status = 'finished' WHERE id = $1", [matchId]);

      // Calculate CRAQUE (MVP) - highest rating in this match
      const mvpResult = await client.query(`
        SELECT rated_user_id, AVG(rating) as avg_rating 
        FROM player_ratings 
        WHERE match_id = $1 
        GROUP BY rated_user_id 
        ORDER BY avg_rating DESC 
        LIMIT 1
      `, [matchId]);

      if (mvpResult.rows[0]) {
        // Insert MVP event
        await client.query(`
          INSERT INTO match_events (match_id, user_id, event_type, quantity)
          VALUES ($1, $2, 'mvp', 1)
        `, [matchId, mvpResult.rows[0].rated_user_id]);
      }

      await client.query('COMMIT');
      res.json({ message: 'Partida finalizada! Destaques calculados.', mvp: mvpResult.rows[0] || null });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('POST /finish error:', err);
    res.status(500).json({ error: 'Erro ao finalizar partida.' });
  }
});

module.exports = router;
