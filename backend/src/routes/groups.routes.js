// ============================================
// FutMatch - Group Management Routes
// ============================================
const { Router } = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireApproval } = require('../middleware/approved');

const router = Router();

router.use(authenticate, requireApproval);

// ---- List my groups ----
router.get('/api/groups', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT g.*, gm.role,
              (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );

    res.json({ groups: result.rows });
  } catch (err) {
    console.error('GET /api/groups error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- Create a group ----
router.post('/api/groups', async (req, res) => {
  const { name, description } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Nome do grupo deve ter no mínimo 2 caracteres.' });
  }

  try {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Create group
      const groupResult = await client.query(
        `INSERT INTO groups (name, description, owner_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name.trim(), description?.trim() || null, req.user.id]
      );

      const group = groupResult.rows[0];

      // Add owner as member with 'owner' role
      await client.query(
        `INSERT INTO group_members (group_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [group.id, req.user.id]
      );

      await client.query('COMMIT');
      res.status(201).json({ group });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('POST /api/groups error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- Get single group (with members) ----
router.get('/api/groups/:id', async (req, res) => {
  try {
    // Verify user is a member
    const memberCheck = await db.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (!memberCheck.rows[0]) {
      return res.status(403).json({ error: 'Você não é membro deste grupo.' });
    }

    const groupResult = await db.query(
      'SELECT * FROM groups WHERE id = $1',
      [req.params.id]
    );

    if (!groupResult.rows[0]) {
      return res.status(404).json({ error: 'Grupo não encontrado.' });
    }

    const membersResult = await db.query(
      `SELECT gm.role, gm.joined_at,
              u.id as user_id, u.name, u.email, u.avatar_url,
              pp.display_name, pp.position, pp.skill_level
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       LEFT JOIN player_profiles pp ON pp.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at ASC`,
      [req.params.id]
    );

    res.json({
      group: groupResult.rows[0],
      members: membersResult.rows,
      my_role: memberCheck.rows[0].role,
    });
  } catch (err) {
    console.error('GET /api/groups/:id error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- Update group ----
router.put('/api/groups/:id', async (req, res) => {
  const { name, description } = req.body;

  try {
    // Only owner/admin can update
    const memberCheck = await db.query(
      "SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2 AND role IN ('owner', 'admin')",
      [req.params.id, req.user.id]
    );

    if (!memberCheck.rows[0]) {
      return res.status(403).json({ error: 'Apenas o dono ou admin pode editar o grupo.' });
    }

    const result = await db.query(
      `UPDATE groups SET
         name = COALESCE($1, name),
         description = COALESCE($2, description)
       WHERE id = $3
       RETURNING *`,
      [name?.trim(), description?.trim(), req.params.id]
    );

    res.json({ group: result.rows[0] });
  } catch (err) {
    console.error('PUT /api/groups/:id error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- Delete group ----
router.delete('/api/groups/:id', async (req, res) => {
  try {
    // Only owner can delete
    const memberCheck = await db.query(
      "SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = 'owner'",
      [req.params.id, req.user.id]
    );

    if (!memberCheck.rows[0]) {
      return res.status(403).json({ error: 'Apenas o dono pode deletar o grupo.' });
    }

    await db.query('DELETE FROM groups WHERE id = $1', [req.params.id]);
    res.json({ message: 'Grupo deletado com sucesso.' });
  } catch (err) {
    console.error('DELETE /api/groups/:id error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- Update member role ----
router.patch('/api/groups/:id/members/:userId/role', async (req, res) => {
  const { role } = req.body;
  const { id: groupId, userId } = req.params;

  try {
    // Only owner can change roles
    const ownerCheck = await db.query(
      "SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = 'owner'",
      [groupId, req.user.id]
    );

    if (!ownerCheck.rows[0]) {
      return res.status(403).json({ error: 'Apenas o dono pode alterar cargos.' });
    }

    await db.query(
      'UPDATE group_members SET role = $1 WHERE group_id = $2 AND user_id = $3',
      [role, groupId, userId]
    );

    res.json({ message: 'Cargo atualizado com sucesso.' });
  } catch (err) {
    console.error('PATCH /api/groups/:id/members/:userId/role error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ---- Join group via Invite Link ----
router.post('/api/groups/:id/join', async (req, res) => {
  const { id: groupId } = req.params;
  try {
    // Check if group exists
    const groupCheck = await db.query('SELECT * FROM groups WHERE id = $1', [groupId]);
    if (!groupCheck.rows[0]) {
      return res.status(404).json({ error: 'Grupo não encontrado.' });
    }

    // Insert as member (ignore if already member using ON CONFLICT DO NOTHING)
    await db.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'member')
       ON CONFLICT (group_id, user_id) DO NOTHING`,
      [groupId, req.user.id]
    );

    res.json({ message: 'Entrou no grupo com sucesso!', group: groupCheck.rows[0] });
  } catch (err) {
    console.error('POST /api/groups/:id/join error:', err);
    res.status(500).json({ error: 'Erro interno ao entrar no grupo.' });
  }
});

module.exports = router;
