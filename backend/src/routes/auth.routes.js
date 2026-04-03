// ============================================
// FutMatch - Authentication Routes
// ============================================
const { Router } = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = Router();

// ---- Google OAuth: Redirect to Google consent screen ----
router.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// ---- Google OAuth: Callback (exchange code for user info) ----
router.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=auth_failed`,
  }),
  (req, res) => {
    // Generate JWT with user info
    const payload = {
      id: req.user.id,
      email: req.user.email,
      is_approved: req.user.is_approved,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    // Redirect to frontend with token
    res.redirect(`${process.env.CLIENT_URL}/callback?token=${token}`);
  }
);

// ---- Get current authenticated user ----
router.get('/auth/me', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.name, u.avatar_url, u.is_approved, u.created_at,
              pp.display_name, pp.birth_date, pp.position, pp.skill_level
       FROM users u
       LEFT JOIN player_profiles pp ON pp.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const user = result.rows[0];
    const isSuperadmin = user.email === process.env.SUPERADMIN_EMAIL;

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      is_approved: user.is_approved,
      is_superadmin: isSuperadmin,
      created_at: user.created_at,
      profile: user.display_name
        ? {
            display_name: user.display_name,
            birth_date: user.birth_date,
            position: user.position,
            skill_level: user.skill_level,
          }
        : null,
    });
  } catch (err) {
    console.error('GET /auth/me error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router;
