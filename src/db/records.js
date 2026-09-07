// Small JSONB repository for the legacy business entities. Each entity is a
// separate indexed row; updates lock only that row, not a whole database snapshot.
const db = require('./pool');
const { AsyncLocalStorage } = require('node:async_hooks');
const memory = new Map();
const context = new AsyncLocalStorage();
let pending = Promise.resolve();
function collection(name) { if (!memory.has(name)) memory.set(name, new Map()); return memory.get(name); }
function register(name, seed = []) { if (!db.pool && (!memory.has(name) || memory.get(name).size===0)) memory.set(name, new Map(seed.map(r => [r.id, structuredClone(r)]))); }
async function transaction(fn) {
  if (db.pool) return db.transaction(fn);
  if (context.getStore()) return fn();
  const before = pending;
  let release;
  pending = new Promise(r => { release = r; });
  await before;
  const snapshot = structuredClone(memory);
  try { return await context.run(true, fn); }
  catch (err) { memory.clear(); for (const [k, v] of snapshot) memory.set(k, v); throw err; }
  finally { release(); }
}
async function get(name, id, lock = false) {
  if (!db.pool) return structuredClone(collection(name).get(id) || null);
  const { rows } = await db.query('SELECT data FROM app_records WHERE collection=$1 AND id=$2' + (lock ? ' FOR UPDATE' : ''), [name, id]);
  return rows[0]?.data || null;
}
async function list(name, { limit = 200, offset = 0, ownerId } = {}) {
  limit = Math.min(10001, Math.max(1, Number(limit) || 200));
  offset = Math.max(0, Math.floor(Number(offset) || 0));
  if (!db.pool) return [...collection(name).values()].reverse().filter(r => ownerId === undefined || r.ownerId === ownerId).slice(offset, offset + limit).map(r => structuredClone(r));
  const params = [name, limit, offset];
  const owner = ownerId === undefined ? '' : " AND data->>'ownerId'=$4";
  if (ownerId !== undefined) params.push(ownerId);
  const { rows } = await db.query(`SELECT data FROM app_records WHERE collection=$1${owner} ORDER BY created_at DESC,id LIMIT $2 OFFSET $3`, params);
  return rows.map(r => r.data);
}
async function put(name, record) {
  if (!db.pool) {
    const rows = collection(name);
    if (!rows.has(record.id) && rows.size >= 10000) throw Object.assign(new Error('Development storage is full; configure PostgreSQL.'), { status: 503 });
    rows.set(record.id, structuredClone(record));
    return record;
  }
  await db.query('INSERT INTO app_records(collection,id,data) VALUES($1,$2,$3) ON CONFLICT(collection,id) DO UPDATE SET data=EXCLUDED.data', [name, record.id, record]);
  return record;
}
async function insert(name, record) {
  if (!db.pool) { if (collection(name).has(record.id)) throw Object.assign(new Error('Record already exists.'), { status: 409 }); return put(name, record); }
  await db.query('INSERT INTO app_records(collection,id,data) VALUES($1,$2,$3)', [name, record.id, record]); return record;
}
async function update(name, id, mutate) {
  return transaction(async () => { const row = await get(name, id, true); if (!row) return null; const result = await mutate(row); if (result === null) return null; return put(name, row); });
}
async function remove(name, id) {
  if (!db.pool) return collection(name).delete(id);
  return (await db.query('DELETE FROM app_records WHERE collection=$1 AND id=$2', [name,id])).rowCount > 0;
}
module.exports = { register, get, list, put, insert, update, remove, transaction, memory };
