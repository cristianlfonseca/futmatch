const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireSuperadmin } = require('../middleware/auth');

// GET /api/admin/users
// Retorna todos os usuários para o dashboard de admin (ordena pendentes primeiro)
router.get('/users', authenticate, requireSuperadmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, name, avatar_url, is_approved, created_at 
       FROM users 
       ORDER BY is_approved ASC, created_at DESC`
    );
    res.json({ users: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// PATCH /api/admin/users/:id/status
// Altera o status is_approved do usuário (Aprovar/Bloquear)
router.patch('/users/:id/status', authenticate, requireSuperadmin, async (req, res) => {
  const { id } = req.params;
  const { is_approved } = req.body; // true ou false
  
  try {
    const { rows } = await pool.query(
      'UPDATE users SET is_approved = $1 WHERE id = $2 RETURNING id, email, is_approved',
      [is_approved, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ message: 'Status atualizado com sucesso', user: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar status do usuário' });
  }
});

module.exports = router;
