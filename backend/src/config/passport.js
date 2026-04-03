// ============================================
// FutMatch - Google OAuth2 Strategy (Passport.js)
// ============================================
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3001/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const avatarUrl = profile.photos?.[0]?.value;

        // Upsert: create user if not exists, otherwise return existing
        const result = await db.query(
          `INSERT INTO users (google_id, email, name, avatar_url)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (google_id) 
           DO UPDATE SET 
             name = EXCLUDED.name,
             avatar_url = EXCLUDED.avatar_url
           RETURNING *`,
          [googleId, email, name, avatarUrl]
        );

        return done(null, result.rows[0]);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Serialize user to session (we use JWT, so this is minimal)
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0] || null);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
