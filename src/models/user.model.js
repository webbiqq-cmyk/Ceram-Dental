const crypto = require('node:crypto');
const db = require('../db/pool');
const records = require('../db/records');
const { transaction } = records;
const ROLES = ['admin', 'dentist', 'lab', 'receptionist', 'designer', 'technician', 'qc', 'lab_manager', 'dispatch', 'in_house_dentist'];
// Logical groupings used by access-control middleware. 'lab' is the existing
// Lab-Studio overview role and is treated as a lab_manager.
const ROLE_GROUPS = {
  ADMIN: ['admin'],
  DENTIST: ['dentist', 'in_house_dentist'],
  LAB: ['lab', 'lab_manager', 'receptionist', 'designer', 'technician', 'qc', 'dispatch'],
  LAB_STATION: ['receptionist', 'designer', 'technician', 'qc', 'dispatch'],
  LAB_MANAGE: ['admin', 'lab', 'lab_manager']
};

// In-memory seed — used only when DATABASE_URL isn't set (demo / zero-setup
// dev). Production runs off Postgres, seeded by migrations 001/005, and
// this array stays empty there. Without these rows the lab workflow can't
// function offline: reception's assignment roster (GET /api/staff) comes
// from user.model.list(), and workflow.service.checkAssignee() validates
// the chosen designer/technician/qc against user.model.findById(). The
// three portal logins (admin/dentist/lab) are here too so Admin → Accounts
// isn't blank. The workflow-role ids/hashes mirror 005_seed_workflow_users.
const now = () => new Date();
const users = db.pool ? [] : [
  { id: 'usr-admin-1', username: 'admin', passwordHash: '$2a$12$bTO9nkvBdN9p8TsZy3k1.OANN4S8lhNWxJ5sXluEC9bRkauOYq.hO', role: 'admin', name: 'Practice Admin', active: true, createdAt: now() },
  { id: 'usr-admin-ceram', username: 'ceram', passwordHash: '$2a$12$QKGAleewP5/TYO2Ik2mY/uSMK9uu52/2TE9xkqnG6O0gnwqOXtpg.', role: 'admin', name: 'Ceram Demo Admin', active: true, createdAt: now() },
  { id: 'usr-dentist-1', username: 'dentist', passwordHash: '$2a$12$L1KLx/A7iCRRovP9rM1mrOc0iajq64fTgbENc17lh04tX7IjQovaq', role: 'dentist', name: 'Dentist Portal', active: true, createdAt: now() },
  { id: 'usr-lab-1', username: 'lab', passwordHash: '$2a$12$rShw6/ZK4Bl8qNRVL0SPwe1/EpihClvryCO/H.KnBuwKqpA0gl.UC', role: 'lab', name: 'Lab Studio', active: true, createdAt: now() },
  { id: '00000000-0000-0000-0000-000000000010', username: 'dentist-haddad', passwordHash: '$2a$12$MduyS1DG78OcHvfhntJH8O7MxBOnBINYk6EEvkCbkQxFaaFNe6ftu', role: 'dentist', name: 'Dr. R. Haddad', active: true, createdAt: now() },
  { id: '00000000-0000-0000-0000-000000000011', username: 'receptionist', passwordHash: '$2a$12$MduyS1DG78OcHvfhntJH8O7MxBOnBINYk6EEvkCbkQxFaaFNe6ftu', role: 'receptionist', name: 'Reception Desk', active: true, createdAt: now() },
  { id: '00000000-0000-0000-0000-000000000012', username: 'qc', passwordHash: '$2a$12$MduyS1DG78OcHvfhntJH8O7MxBOnBINYk6EEvkCbkQxFaaFNe6ftu', role: 'qc', name: 'Quality Desk', active: true, createdAt: now() },
  { id: '00000000-0000-0000-0000-000000000020', username: 'rana', passwordHash: '$2a$12$MduyS1DG78OcHvfhntJH8O7MxBOnBINYk6EEvkCbkQxFaaFNe6ftu', role: 'designer', name: 'Rana', active: true, createdAt: now() },
  { id: '00000000-0000-0000-0000-000000000021', username: 'omar', passwordHash: '$2a$12$MduyS1DG78OcHvfhntJH8O7MxBOnBINYk6EEvkCbkQxFaaFNe6ftu', role: 'designer', name: 'Omar', active: true, createdAt: now() },
  { id: '00000000-0000-0000-0000-000000000030', username: 'malvin', passwordHash: '$2a$12$MduyS1DG78OcHvfhntJH8O7MxBOnBINYk6EEvkCbkQxFaaFNe6ftu', role: 'technician', name: 'Malvin', active: true, createdAt: now() },
  { id: '00000000-0000-0000-0000-000000000031', username: 'layla', passwordHash: '$2a$12$MduyS1DG78OcHvfhntJH8O7MxBOnBINYk6EEvkCbkQxFaaFNe6ftu', role: 'technician', name: 'Layla', active: true, createdAt: now() }
];
function publicView(u) { return u && { id:u.id, username:u.username, role:u.role, name:u.name, active:u.active, createdAt:u.createdAt }; }
function decode(u) { return u && { ...u, passwordHash:u.password_hash, createdAt:u.created_at, phone:u.phone, email:u.email, accountType:u.account_type, company:u.company }; }
async function findById(id) {
  if (!db.pool) return users.find(u=>u.id===id) || null;
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) return null;
  return decode((await db.query('SELECT * FROM users WHERE id=$1',[id])).rows[0]);
}
async function findByUsernameAndRole(username,role) {
  if (!db.pool) return users.find(u=>u.active && u.role===role && u.username.toLowerCase()===String(username).toLowerCase()) || null;
  return decode((await db.query('SELECT * FROM users WHERE lower(username)=lower($1) AND role=$2 AND active',[username,role])).rows[0]);
}
async function list() { return db.pool ? (await db.query('SELECT id,username,role,name,active,created_at FROM users ORDER BY name LIMIT 1000')).rows.map(decode).map(publicView) : users.map(publicView); }
async function createUser({username,passwordHash,role,name,phone,email,accountType,company}) {
  username=String(username || '').trim();
  if (!username || !ROLES.includes(role) || !passwordHash) return null;
  const u={id:crypto.randomUUID(),username,passwordHash,role,name:name || username,phone:phone||'',email:email||'',accountType:accountType||'',company:company||'',active:true,createdAt:new Date()};
  if (!db.pool) { if(users.some(x=>x.role===role && x.username.toLowerCase()===username.toLowerCase())) return null; users.push(u); return publicView(u); }
  const {rows}=await db.query('INSERT INTO users(id,username,password_hash,role,name) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING *',[u.id,username,passwordHash,role,u.name]);
  if (!rows[0]) return null;
  // Profile fields live in the durable record store so signup works against
  // databases that have not yet applied migration 008.
  await records.put('user_profiles',{id:u.id,phone:u.phone,email:u.email,accountType:u.accountType,company:u.company});
  return publicView({...decode(rows[0]),...u});
}
async function revokeSessions(id) { await require('./session.model').revokeForUser(id); }
async function setPasswordHash(id,hash) {
  return transaction(async()=>{ const u=await findById(id); if(!u)return null;
    if(db.pool) await db.query('UPDATE users SET password_hash=$2 WHERE id=$1',[id,hash]); else u.passwordHash=hash;
    await revokeSessions(id); return publicView(u);
  });
}
async function setActive(id,active) {
  return transaction(async()=>{
    if(db.pool) await db.query('SELECT pg_advisory_xact_lock(71320409)');
    const u=await findById(id); if(!u)return {error:'Unknown account.'};
    const admins=db.pool ? Number((await db.query("SELECT count(*) FROM users WHERE role='admin' AND active")).rows[0].count) : users.filter(x=>x.role==='admin' && x.active).length;
    if(!active && u.active && u.role==='admin' && admins<=1)return {error:'Cannot deactivate the last remaining admin account.'};
    if(db.pool)await db.query('UPDATE users SET active=$2 WHERE id=$1',[id,active]); else u.active=active;
    if(!active)await revokeSessions(id);
    return {user:publicView({...u,active})};
  });
}
// Login tracking / soft lockout (Postgres only; in-memory demo skips it).
// Locks for 15 min after 8 consecutive failures.
async function recordLoginResult(id, { success, ip }) {
  if (!db.pool || !/^[0-9a-f-]{36}$/i.test(id || '')) return;
  if (success) {
    await db.query('UPDATE users SET last_login_at=now(), last_login_ip=$2, failed_login_count=0, locked_until=NULL WHERE id=$1', [id, ip || null]);
  } else {
    await db.query(
      `UPDATE users SET failed_login_count = failed_login_count + 1,
         locked_until = CASE WHEN failed_login_count + 1 >= 8 THEN now() + interval '15 minutes' ELSE locked_until END
       WHERE id=$1`, [id]);
  }
}
async function isLocked(id) {
  if (!db.pool || !/^[0-9a-f-]{36}$/i.test(id || '')) return false;
  const { rows } = await db.query('SELECT locked_until FROM users WHERE id=$1', [id]);
  return !!(rows[0]?.locked_until && new Date(rows[0].locked_until) > new Date());
}
async function updateName(id,name) {
  const u=await findById(id); if(!u)return null;
  if(db.pool)await db.query('UPDATE users SET name=$2 WHERE id=$1',[id,name]); else u.name=name;
  return publicView({...u,name});
}
// Retain referenced identities for clinical audit history; remove access instead.
async function removeUser(id) { const result=await setActive(id,false); return result.error ? result : {ok:true}; }
async function findByEmailAndRole(email, role) {
  email = String(email || '').trim().toLowerCase();
  if (!email) return null;
  if (!db.pool) return users.find(u => u.active && u.role === role && String(u.email || '').toLowerCase() === email) || null;
  return decode((await db.query('SELECT * FROM users WHERE lower(email)=$1 AND role=$2 AND active LIMIT 1', [email, role])).rows[0]);
}
module.exports={ROLES,ROLE_GROUPS,users,publicView,findById,findByUsernameAndRole,findByEmailAndRole,list,createUser,setPasswordHash,setActive,updateName,removeUser,recordLoginResult,isLocked};
