-- Disable only the known placeholder credentials; preserve accounts and history.
UPDATE users SET active = false WHERE password_hash = '$2a$12$MduyS1DG78OcHvfhntJH8O7MxBOnBINYk6EEvkCbkQxFaaFNe6ftu';
CREATE UNIQUE INDEX users_role_username_lower ON users(role, lower(username));
CREATE TABLE sessions (
  jti UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL, expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE app_records (
  collection TEXT NOT NULL, id TEXT NOT NULL, data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(collection, id)
);
CREATE INDEX app_records_created ON app_records(collection, created_at DESC, id);
CREATE INDEX app_records_owner ON app_records(collection, (data->>'ownerId'), created_at DESC);
CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, status_code INTEGER, body JSONB,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE INDEX idempotency_expiry ON idempotency_keys(expires_at);
CREATE INDEX orders_dentist_created ON job_orders(dentist_user_id, created_at DESC);
CREATE INDEX orders_designer_queue ON job_orders(assigned_designer_id, status, created_at DESC);
CREATE INDEX orders_technician_queue ON job_orders(assigned_technician_id, status, created_at DESC);
CREATE INDEX orders_qc_queue ON job_orders(assigned_qc_id, status, created_at DESC);
CREATE TABLE rate_limits(key TEXT PRIMARY KEY,hits INTEGER NOT NULL,reset_at TIMESTAMPTZ NOT NULL);
CREATE INDEX rate_limits_expiry ON rate_limits(reset_at);
