-- Extends the existing three-role login system (admin/dentist/lab, see
-- src/models/user.model.js) with the four lab-side roles the workflow
-- engine needs. Modeled as a Postgres ENUM rather than a separate `roles`
-- table: the role set is small and fixed (adding a role is a schema
-- change either way, not data entry), so an enum keeps every join a plain
-- foreign key to `users` instead of a needless extra hop through a roles
-- table for six rows that never change. 'lab' is kept (not removed) so
-- the existing Lab Studio kanban (src/models/case.model.js) keeps working
-- unmodified while the new workflow tables are built out alongside it.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM (
  'admin', 'dentist', 'lab',
  'receptionist', 'designer', 'technician', 'qc'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Mirrors user.model.js's own rule: a username is only unique within
  -- its role, not globally (so 'dentist' can exist as both a dentist
  -- login and, separately, a receptionist login without colliding).
  UNIQUE (username, role)
);

CREATE INDEX idx_users_role ON users (role) WHERE active;
