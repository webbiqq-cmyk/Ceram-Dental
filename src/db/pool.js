const { Pool } = require('pg');
const { AsyncLocalStorage } = require('node:async_hooks');
const { integer } = require('../config/env');
const context = new AsyncLocalStorage();
const connectionString = process.env.DATABASE_URL;
let pool = null;
if (connectionString) {
  const url = new URL(connectionString);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  // URL SSL flags must not silently override certificate verification.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  pool = new Pool({ connectionString: url.toString(),
    ssl: local ? false : { rejectUnauthorized: true, ...(process.env.DATABASE_CA_CERT ? { ca: process.env.DATABASE_CA_CERT } : {}) },
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
