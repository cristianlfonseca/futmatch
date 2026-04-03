// ============================================
// FutMatch - Invite Routes
// ============================================
const { Router } = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireApproval } = require('../middleware/approved');

const router = Router();

router.use(authenticate, requireApproval);

// ---- Search users to invite (by name or email) ----
router.get('/api/users/search', async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    return res.json({ users: [] });
  }

  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, pp.display_name, pp.position
       FROM users u
       LEFT JOIN player_profiles pp ON pp.user_id = u.id
       WHERE u.is_approved = true
         AND u.id != $1
         AND (u.name ILIKE $2 OR u.email ILIKE $2 OR pp.display_name ILIKE $2)
       LIMIT 10`,
      [req.user.id, `%${q.trim()}%`]
    );

    res.json({ users: result.rows });
  } catch (err) {
    console.error('GET /api/users/search error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- Send invite ----
router.post('/api/groups/:groupId/invite', async (req, res) => {
  const { groupId } = req.params;
  const { user_id } = req.body;

  try {
    // Check if sender is member of the group
    const memberCheck = await db.query(
      "SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2 AND role IN ('owner', 'admin')",
      [groupId, req.user.id]
    );

    if (!memberCheck.rows[0]) {
      return res.status(403).json({ error: 'Apenas dono ou admin pode convidar.' });
    }

    // Check if target user exists
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (!userCheck.rows[0]) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Check if already a member
    const alreadyMember = await db.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, user_id]
    );
    if (alreadyMember.rows[0]) {
      return res.status(400).json({ error: 'Usuário já é membro do grupo.' });
    }

    // Create or update invite
    const result = await db.query(
      `INSERT INTO invites (group_id, invited_by, invited_user, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (group_id, invited_user)
       DO UPDATE SET status = 'pending', created_at = NOW()
       RETURNING *`,
      [groupId, req.user.id, user_id]
    );

    res.status(201).json({ invite: result.rows[0] });
  } catch (err) {
    console.error('POST /api/groups/:groupId/invite error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- List my pending invites ----
router.get('/api/invites', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT i.*, g.name as group_name, g.description as group_description,
              u.name as invited_by_name, u.avatar_url as invited_by_avatar
       FROM invites i
       JOIN groups g ON g.id = i.group_id
       JOIN users u ON u.id = i.invited_by
       WHERE i.invited_user = $1 AND i.status = 'pending'
       ORDER BY i.created_at DESC`,
      [req.user.id]
    );

    res.json({ invites: result.rows });
  } catch (err) {
    console.error('GET /api/invites error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- Accept or decline invite ----
router.patch('/api/invites/:id', async (req, res) => {
  const { status } = req.body; // 'accepted' | 'declined'

  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Status deve ser "accepted" ou "declined".' });
  }

  try {
    // Find the invite
    const inviteResult = await db.query(
      "SELECT * FROM invites WHERE id = $1 AND invited_user = $2 AND status = 'pending'",
      [req.params.id, req.user.id]
    );

    if (!inviteResult.rows[0]) {
      return res.status(404).json({ error: 'Convite não encontrado ou já respondido.' });
    }

    const invite = inviteResult.rows[0];
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Update invite status
      await client.query(
        'UPDATE invites SET status = $1 WHERE id = $2',
        [status, invite.id]
      );

      // If accepted, add to group members
      if (status === 'accepted') {
        await client.query(
          `INSERT INTO group_members (group_id, user_id, role)
           VALUES ($1, $2, 'member')
           ON CONFLICT (group_id, user_id) DO NOTHING`,
          [invite.group_id, req.user.id]
        );
      }

      await client.query('COMMIT');
      res.json({ message: status === 'accepted' ? 'Convite aceito!' : 'Convite recusado.' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('PATCH /api/invites/:id error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router;
