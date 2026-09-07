// Tiny migration runner — no framework, matching the rest of this
// codebase's no-build-step, hand-rolled style. Applies every .sql file in
// migrations/ in filename order that hasn't already run, tracked in a
// schema_migrations table.
//
// Exposed two ways:
//   1. CLI: `npm run migrate` — for running it yourself against a DB this
//      machine can actually reach.
//   2. runMigrations(), called once from src/app.js on boot — because
//      this project's own sandbox tooling sits behind an egress proxy
//      that can't reach an external Postgres host on port 5432 at all
//      (confirmed directly: even a raw TCP connect times out), and the
//      managed query tool available here hit a persistent SSL handshake
//      error against this database. A deployed Node process (Vercel,
//      Render, your own machine) has normal outbound network access and
//      applies these the first time it boots with DATABASE_URL set —
//      idempotent and cheap to no-op on every boot after that.
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
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => pool.end())
    .catch(err => { console.error('[migrate]', err.message); pool.end().finally(() => process.exit(1)); });
}

module.exports = { runMigrations };
