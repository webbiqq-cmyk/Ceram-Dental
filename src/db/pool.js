// Single shared connection pool for the workflow system's tables
// (job_orders and everything under src/db/migrations/). The rest of the
// app (team bios, shop, the existing simple case pipeline) stays on the
// in-memory models in src/models/ for now — this pool is scoped to the
// new Postgres-backed workflow feature, not a wholesale replacement.
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Loud and specific on purpose (same pattern as JWT_SECRET in
  // src/config/env.js) — a silent fallback here would mean job orders
  // quietly go nowhere instead of failing the request that needed them.
  console.warn('[db] DATABASE_URL is not set — the lab workflow system (job orders, assignments, chat, files) cannot function until it is.');
}

const pool = connectionString
  ? new Pool({
      connectionString,
      // Render's external Postgres endpoint requires TLS; it uses a
      // Render-managed cert chain that Node's default CA bundle doesn't
      // carry, so full chain verification fails even though the
      // connection is genuinely encrypted. This is the same trust model
      // Render's own docs recommend for external connections.
      ssl: { rejectUnauthorized: false }
    })
  : null;

function query(text, params) {
  if (!pool) return Promise.reject(new Error('DATABASE_URL is not set — see src/db/pool.js'));
  return pool.query(text, params);
}

// For multi-statement transactions (e.g. advancing a job order's status
// AND appending its job_stage_history row atomically) — checks a client
// out of the pool for the caller to COMMIT/ROLLBACK explicitly.
function getClient() {
  if (!pool) return Promise.reject(new Error('DATABASE_URL is not set — see src/db/pool.js'));
  return pool.connect();
}

module.exports = { pool, query, getClient };
