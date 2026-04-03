// ============================================
// FutMatch - JWT Authentication Middleware
// ============================================
const jwt = require('jsonwebtoken');

/**
 * Verifies the JWT token from the Authorization header.
 * Attaches `req.user` with the decoded payload ({ id, email, is_approved }).
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

// Middleware para proteger rotas administrativas
function requireSuperadmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  if (req.user.email !== process.env.SUPERADMIN_EMAIL) {
    return res.status(403).json({ error: 'Acesso restrito' });
  }
  next();
}

module.exports = { authenticate, requireSuperadmin };
