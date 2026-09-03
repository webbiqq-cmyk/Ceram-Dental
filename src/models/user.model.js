// Auth users — one seeded account per role for this demo/handoff phase,
// plus full CRUD so Admin can create real named staff accounts once the
// clinic is ready to move off the shared demo logins. Passwords are never
// stored in plaintext, only bcrypt hashes; the actual demo credentials
// were generated randomly and handed to the client out-of-band (never
// committed to git).
const crypto = require('crypto');

const ROLES = ['admin', 'dentist', 'lab'];

const users = [
  {
    id: 'usr-admin-1',
    username: 'admin',
    // bcrypt hash of a randomly generated password — see project handoff notes
    passwordHash: '$2a$12$bTO9nkvBdN9p8TsZy3k1.OANN4S8lhNWxJ5sXluEC9bRkauOYq.hO',
    role: 'admin',
    name: 'Practice Admin',
    active: true,
    createdAt: new Date()
  },
  {
    id: 'usr-dentist-1',
    username: 'dentist',
    passwordHash: '$2a$12$L1KLx/A7iCRRovP9rM1mrOc0iajq64fTgbENc17lh04tX7IjQovaq',
    role: 'dentist',
    name: 'Dentist Portal',
    active: true,
    createdAt: new Date()
  },
  {
    id: 'usr-lab-1',
    username: 'lab',
    passwordHash: '$2a$12$rShw6/ZK4Bl8qNRVL0SPwe1/EpihClvryCO/H.KnBuwKqpA0gl.UC',
    role: 'lab',
    name: 'Lab Studio',
    active: true,
    createdAt: new Date()
  }
];

function findByUsernameAndRole(username, role) {
  const u = String(username || '').trim().toLowerCase();
  return users.find(x => x.username.toLowerCase() === u && x.role === role && x.active) || null;
}

function findById(id) {
  return users.find(x => x.id === id) || null;
}

function setPasswordHash(id, passwordHash) {
  const u = findById(id);
  if (!u) return null;
  u.passwordHash = passwordHash;
  return u;
}

function publicView(u) {
  return { id: u.id, username: u.username, role: u.role, name: u.name, active: u.active, createdAt: u.createdAt };
}

function list() { return users.map(publicView); }

function createUser({ username, passwordHash, role, name }) {
  const uname = String(username || '').trim();
  if (!uname || !ROLES.includes(role) || !passwordHash) return null;
  if (users.some(x => x.username.toLowerCase() === uname.toLowerCase() && x.role === role)) return null; // no duplicate username within a role
  const u = { id: 'usr-' + crypto.randomUUID(), username: uname, passwordHash, role, name: name || uname, active: true, createdAt: new Date() };
  users.push(u);
  return publicView(u);
}

function countActiveAdmins() { return users.filter(u => u.role === 'admin' && u.active).length; }

function setActive(id, active) {
  const u = findById(id);
  if (!u) return { error: 'Unknown account.' };
  if (!active && u.role === 'admin' && countActiveAdmins() <= 1) {
    return { error: 'Cannot deactivate the last remaining admin account.' };
  }
  u.active = !!active;
  return { user: publicView(u) };
}

function updateName(id, name) {
  const u = findById(id);
  if (!u) return null;
  if (name != null && String(name).trim()) u.name = String(name).trim();
  return publicView(u);
}

function removeUser(id) {
  const u = findById(id);
  if (!u) return { error: 'Unknown account.' };
  if (u.role === 'admin' && countActiveAdmins() <= 1 && u.active) {
    return { error: 'Cannot delete the last remaining admin account.' };
  }
  const i = users.findIndex(x => x.id === id);
  users.splice(i, 1);
  return { ok: true };
}

module.exports = {
  ROLES, users, findByUsernameAndRole, findById, setPasswordHash,
  list, createUser, setActive, updateName, removeUser, publicView
};
