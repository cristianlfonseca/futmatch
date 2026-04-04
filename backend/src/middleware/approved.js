// ============================================
// FutMatch - Approval Gate Middleware
// ============================================
const db = require('../config/db');

/**
 * Checks if the authenticated user has been approved (is_approved = true).
 * Must be used AFTER the authenticate middleware.
 * Returns 403 if user is not approved yet.
 */
async function requireApproval(req, res, next) {
  try {
    const result = await db.query(
      'SELECT is_approved FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    if (!result.rows[0].is_approved) {
      // Allow Superadmin to bypass the database approval flag
      if (process.env.SUPERADMIN_EMAIL && req.user.email === process.env.SUPERADMIN_EMAIL) {
        return next();
      }

      return res.status(403).json({
        error: 'Acesso não autorizado.',
        message: 'Sua conta está na lista de espera. Aguarde aprovação do administrador.',
        status: 'waiting_approval',
      });
    }

    next();
  } catch (err) {
    console.error('Approval check error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}

module.exports = { requireApproval };
