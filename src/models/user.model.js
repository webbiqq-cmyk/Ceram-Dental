// Auth users — one seeded account per portal for this demo/handoff phase.
// Passwords are never stored in plaintext, only bcrypt hashes; the actual
// demo credentials were generated randomly and handed to the client
// out-of-band (never committed to git). Real per-staff accounts can be
// added later with addUser() below without changing the auth flow at all.
const ROLES = ['admin', 'dentist', 'lab'];

const users = [
  {
    id: 'usr-admin-1',
    username: 'admin',
    // bcrypt hash of a randomly generated password — see project handoff notes
    passwordHash: '$2a$12$bTO9nkvBdN9p8TsZy3k1.OANN4S8lhNWxJ5sXluEC9bRkauOYq.hO',
    role: 'admin',
    name: 'Practice Admin',
    active: true
  },
  {
    id: 'usr-dentist-1',
    username: 'dentist',
    passwordHash: '$2a$12$L1KLx/A7iCRRovP9rM1mrOc0iajq64fTgbENc17lh04tX7IjQovaq',
    role: 'dentist',
    name: 'Dentist Portal',
    active: true
  },
  {
    id: 'usr-lab-1',
    username: 'lab',
    passwordHash: '$2a$12$rShw6/ZK4Bl8qNRVL0SPwe1/EpihClvryCO/H.KnBuwKqpA0gl.UC',
    role: 'lab',
    name: 'Lab Studio',
    active: true
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

module.exports = { ROLES, users, findByUsernameAndRole, findById, setPasswordHash };
