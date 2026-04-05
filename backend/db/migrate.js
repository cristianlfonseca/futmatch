// ============================================
// FutMatch - Database Migration Runner
// ============================================
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Sort alphabetically (001, 002, 003...)
      
    // 1. Create tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Legacy Healing Check
    // If the database has tables but migrations were skipped incorrectly, we heal the tracking table.
    const usersCheck = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')`);
    if (usersCheck.rows[0].exists) {
      await client.query(`INSERT INTO _migrations (filename) VALUES ('001_initial.sql') ON CONFLICT DO NOTHING`);
    }

    const skillCheck = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='group_users' AND column_name='skill_level'`);
    if (skillCheck.rows.length === 0) {
      // 002 hasn't actually run! Remove from tracking if it was falsely added
      await client.query(`DELETE FROM _migrations WHERE filename = '002_phase10.sql'`);
    } else {
      await client.query(`INSERT INTO _migrations (filename) VALUES ('002_phase10.sql') ON CONFLICT DO NOTHING`);
    }

    const waitlistCheck = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='match_checkins' AND column_name='is_waitlist'`);
    if (waitlistCheck.rows.length === 0) {
      // 003 hasn't actually run! Remove from tracking if it was falsely added
      await client.query(`DELETE FROM _migrations WHERE filename = '003_phase11.sql'`);
    } else {
      await client.query(`INSERT INTO _migrations (filename) VALUES ('003_phase11.sql') ON CONFLICT DO NOTHING`);
    }

    // 3. Re-select applied migrations
    const { rows: finalRows } = await client.query('SELECT filename FROM _migrations');
    const applied = new Set(finalRows.map(r => r.filename));

    console.log('🚀 Running migrations...');
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`⏩ Skipping ${file}... (already applied)`);
        continue;
      }
      console.log(`Applying ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log('✅ All migrations completed successfully!');
    client.release();
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
