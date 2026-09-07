const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function appliedMigrations(client) {
  const { rows } = await client.query('SELECT filename FROM schema_migrations');
  return new Set(rows.map(r => r.filename));
}

async function runMigrations() {
  if (!pool) throw new Error('DATABASE_URL is not set — nothing to migrate against.');
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(71320408)');
    await ensureMigrationsTable(client);
    const applied = await appliedMigrations(client);
    const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log('[migrate] applying', file);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        ran++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error('migration failed on ' + file + ': ' + err.message);
      }
    }
    console.log(ran ? `[migrate] applied ${ran} migration(s).` : '[migrate] already up to date.');
    return ran;
  } finally {
    await client.query('SELECT pg_advisory_unlock(71320408)').catch(() => {});
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => pool.end())
    .catch(err => { console.error('[migrate]', err.message); pool.end().finally(() => process.exit(1)); });
}

module.exports = { runMigrations };
