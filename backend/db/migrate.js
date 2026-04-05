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

    // 2. Legacy check: If 'users' table exists but tracking is empty
    const usersCheck = await client.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users');
    `);
    const { rows: appliedRows } = await client.query('SELECT filename FROM _migrations');
    if (appliedRows.length === 0 && usersCheck.rows[0].exists) {
      console.log('📦 Legacy database detected. Marking existing files as applied.');
      for (const f of files) {
        await client.query(`INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`, [f]);
      }
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
