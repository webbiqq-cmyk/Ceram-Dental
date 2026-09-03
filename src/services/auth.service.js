const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, SESSION_TTL_HOURS } = require('../config/env');
const userModel = require('../models/user.model');

// Verifies credentials scoped to one role — a correct password for the
// dentist account does nothing on the admin login, and vice versa, because
// the lookup itself is role-scoped, not just the resulting token.
async function login(username, password, role) {
  const user = userModel.findByUsernameAndRole(username, role);
  // Run bcrypt.compare against a fixed dummy hash even when no user was
  // found, so a login attempt for a username that doesn't exist takes
  // about as long as one for a real username with a wrong password —
  // without this, response-time differences let an attacker enumerate
  // valid usernames.
  const hash = user ? user.passwordHash : '$2a$12$C6UzMDM.H6dfI/f/IKcEeOO1u.5NPEK5r7YBMU4T5V.a1F1a1a1a1u';
  const ok = await bcrypt.compare(String(password || ''), hash);
  if (!user || !ok) return null;
  return user;
}

function issueToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: SESSION_TTL_HOURS + 'h' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

async function hashPassword(plain) {
  return bcrypt.hash(String(plain), 12);
}

module.exports = { login, issueToken, verifyToken, hashPassword, SESSION_TTL_HOURS };
