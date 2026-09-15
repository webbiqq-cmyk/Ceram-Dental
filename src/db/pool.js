const { Pool, types } = require('pg');
const { AsyncLocalStorage } = require('node:async_hooks');

// A DATE column is a calendar day, not an instant. node-postgres decodes
// it into a JS Date at local midnight by default, which then serialises
// as a UTC timestamp — so a target date of the 18th can reach a browser
// west of UTC as "2026-09-17T21:00:00.000Z" and be read back as the 17th.
// Handing DATE back as the plain 'YYYY-MM-DD' text Postgres stored keeps
// it a calendar day end to end, and matches exactly what the in-memory
// store returns, so both backends agree.
types.setTypeParser(1082, value => value);
const { integer } = require('../config/env');
const context = new AsyncLocalStorage();
const connectionString = process.env.DATABASE_URL;
let pool = null;
if (connectionString) {
  const url = new URL(connectionString);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  // Render's private database endpoint uses its internal network without TLS.
  const renderInternal = process.env.RENDER === 'true' && /^dpg-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(url.hostname);
  // URL SSL flags must not silently override certificate verification.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  pool = new Pool({ connectionString: url.toString(),
    ssl: local || renderInternal ? false : { rejectUnauthorized: true, ...(process.env.DATABASE_CA_CERT ? { ca: process.env.DATABASE_CA_CERT } : {}) },
    max: integer('DB_POOL_MAX', 5, 1, 50), connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000, statement_timeout: 10000, idle_in_transaction_session_timeout: 15000,
    application_name: 'ceram-dental', allowExitOnIdle: true });
  pool.on('error', err => console.error('[db] idle connection error:', err.code || 'unknown'));
}
function query(text, params) {
  const client = context.getStore() || pool;
  if (!client) return Promise.reject(new Error('DATABASE_URL is not configured.'));
  return client.query(text, params);
}
function getClient() { return pool ? pool.connect() : Promise.reject(new Error('DATABASE_URL is not configured.')); }
async function transaction(fn) {
  if (context.getStore()) return fn();
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await context.run(client, fn);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally { client.release(); }
}
module.exports = { pool, query, getClient, transaction };
