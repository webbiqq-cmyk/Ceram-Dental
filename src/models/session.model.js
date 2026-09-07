const { pool, query } = require('../db/pool');
const sessions = new Map();
async function recordSession(s) {
  if(pool) { await query('DELETE FROM sessions WHERE user_id=$1 AND expires_at<=now()',[s.userId]); await query('INSERT INTO sessions(jti,user_id,data,expires_at) VALUES($1,$2,$3,$4)',[s.jti,s.userId,s,new Date(s.expiresAt)]); }
  else { for(const [id,r] of sessions)if(r.expiresAt<=Date.now())sessions.delete(id); if(sessions.size>=10000)throw Object.assign(new Error('Session capacity reached.'),{status:503}); sessions.set(s.jti,s); }
  return s;
}
async function isRevoked(jti) {
  if(pool) return !(await query('SELECT 1 FROM sessions WHERE jti=$1 AND expires_at>now()',[jti])).rowCount;
  return !sessions.has(jti) || sessions.get(jti).expiresAt<=Date.now();
}
async function revoke(jti) {
  if(pool)return (await query('DELETE FROM sessions WHERE jti=$1 RETURNING data',[jti])).rows[0]?.data || null;
  const s=sessions.get(jti); sessions.delete(jti); return s || null;
}
async function revokeForUser(userId) {
  if(pool)await query('DELETE FROM sessions WHERE user_id=$1',[userId]);
  else for(const [id,s] of sessions)if(s.userId===userId)sessions.delete(id);
}
async function listForUser(userId) { return pool ? (await query('SELECT data FROM sessions WHERE user_id=$1 AND expires_at>now() ORDER BY expires_at DESC LIMIT 100',[userId])).rows.map(r=>r.data) : [...sessions.values()].filter(s=>s.userId===userId && s.expiresAt>Date.now()); }
async function listAll() { return pool ? (await query('SELECT data FROM sessions WHERE expires_at>now() ORDER BY expires_at DESC LIMIT 1000')).rows.map(r=>r.data) : [...sessions.values()].filter(s=>s.expiresAt>Date.now()); }
module.exports={recordSession,isRevoked,revoke,revokeForUser,listForUser,listAll};
