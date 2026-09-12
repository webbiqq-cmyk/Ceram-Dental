-- Same per-role uniqueness already enforced on username (007), now for
-- email too — a real DB constraint so concurrent signups can't race past an
-- application-level check-then-insert and land two accounts on one email.
-- Partial (WHERE email <> '') so the many seeded/staff accounts with no
-- email on file don't collide with each other on ''.
CREATE UNIQUE INDEX IF NOT EXISTS users_role_email_lower ON users(role, lower(email)) WHERE email IS NOT NULL AND email <> '';
