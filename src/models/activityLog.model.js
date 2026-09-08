const records = require('../db/records');
const { nextId } = require('../utils/ids');
const { pool, query } = require('../db/pool');
records.register('activity');

// Structured audit trail. On Postgres every call lands in `audit_logs`
// (migration 010) with who / role / action / resource / ip / session; the
// in-memory `activity` record is kept for the zero-setup demo and for the
// existing Admin → Activity screen.
async function log({ role, username, name, action, detail, ip, sessionId, userId, resourceType, resourceId, meta } = {}) {
  const at = new Date();
  const row = {
    id: nextId('activity', 'ACT-'),
    role: role || null, username: username || null, name: name || username || null,
    action, detail: detail || '', ip: ip || null, sessionId: sessionId || null,
    resourceType: resourceType || null, resourceId: resourceId || (detail || null), at
  };
  try {
    await records.insert('activity', row);
  } catch { /* capacity / dup — never let audit failure break the request */ }
  if (pool) {
    try {
      await query(
        `INSERT INTO audit_logs (user_id, username, role, action, resource_type, resource_id, ip, session_id, meta, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [ /^[0-9a-f-]{36}$/i.test(userId || '') ? userId : null, username || null, role || null, action || '',
          resourceType || null, resourceId || (detail || null), ip || null, sessionId || null,
          JSON.stringify(meta || {}), at ]
      );
    } catch (e) { console.error('[audit] write failed:', e.code || e.message); }
  }
  return row;
}

async function list({ username, role, from, to, limit = 200 } = {}) {
  if (pool) {
    const { rows } = await query(
      `SELECT username, role, action, resource_id AS detail, ip, session_id, created_at AS at
         FROM audit_logs
        WHERE ($1::text IS NULL OR username = $1)
          AND ($2::text IS NULL OR role = $2)
          AND ($3::timestamptz IS NULL OR created_at >= $3)
          AND ($4::timestamptz IS NULL OR created_at <= $4)
        ORDER BY created_at DESC
        LIMIT $5`,
      [username || null, role || null, from || null, to || null, Math.min(Number(limit) || 200, 1000)]
    );
    return rows;
  }
  return (await records.list('activity', { limit: Math.min(Number(limit) || 200, 1000) }))
    .filter(e => (!username || e.username === username) && (!role || e.role === role)
      && (!from || new Date(e.at) >= new Date(from)) && (!to || new Date(e.at) <= new Date(to)));
}

module.exports = { log, list };
