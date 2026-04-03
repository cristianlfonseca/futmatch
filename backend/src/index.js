// ============================================
// FutMatch - Express Server Entry Point
// ============================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('./config/passport');

// Route imports
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const groupsRoutes = require('./routes/groups.routes');
const invitesRoutes = require('./routes/invites.routes');
const matchesRoutes = require('./routes/matches.routes');
const summaryRoutes = require('./routes/summary.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// ---- Global Middleware ----
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(passport.initialize());

// ---- Health Check ----
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'futmatch-api', timestamp: new Date().toISOString() });
});

// ---- Routes ----
app.use(authRoutes);
app.use(profileRoutes);
app.use(groupsRoutes);
app.use(invitesRoutes);
app.use(matchesRoutes);
app.use(summaryRoutes);
app.use('/api/admin', adminRoutes);

// ---- 404 Handler ----
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// ---- Global Error Handler ----
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

// ---- Start Server ----
app.listen(PORT, () => {
  console.log(`\n⚽ FutMatch API running at http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Google Auth: http://localhost:${PORT}/auth/google\n`);
});

module.exports = app;
