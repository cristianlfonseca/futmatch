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
      
    console.log('🚀 Running migrations...');
    for (const file of files) {
      console.log(`Applying ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
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
