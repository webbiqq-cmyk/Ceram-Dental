-- Production hardening: extra roles, a permissions matrix, structured audit
-- logging, tracked file references, and per-user login/MFA fields. Additive
-- only — nothing here changes existing rows or breaks the current app, which
-- keeps using the user_role enum as its role source.

-- 1. Granular permissions. The enum still gates routes; this table lets a
--    later release grant/revoke finer capabilities without a schema change.
CREATE TABLE IF NOT EXISTS permissions (
  code        TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role            user_role NOT NULL,
  permission_code TEXT NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role, permission_code)
);

INSERT INTO permissions (code, description) VALUES
  ('case.create',        'Create a case / job order'),
  ('case.view.own',      'View cases the user owns or is assigned to'),
  ('case.view.all',      'View every case'),
  ('case.assign',        'Assign a case to staff'),
  ('case.advance',       'Move a case to the next production stage'),
  ('case.approve',       'Approve a demo / design'),
  ('case.reject',        'Reject / request changes on a case'),
  ('qc.record',          'Record QC findings and decisions'),
  ('dispatch.manage',    'Manage pickup / delivery and completion'),
  ('file.upload',        'Upload case files'),
  ('file.view',          'View protected case files'),
  ('user.manage',        'Create / deactivate accounts'),
  ('permission.manage',  'Change roles and permissions'),
  ('audit.view',         'View audit logs'),
  ('settings.manage',    'Change practice settings')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role, permission_code) VALUES
  ('admin','case.view.all'),('admin','case.assign'),('admin','user.manage'),
  ('admin','permission.manage'),('admin','audit.view'),('admin','settings.manage'),
  ('admin','file.view'),('admin','dispatch.manage'),
  ('dentist','case.create'),('dentist','case.view.own'),('dentist','case.approve'),
  ('dentist','case.reject'),('dentist','file.upload'),('dentist','file.view'),
  ('in_house_dentist','case.create'),('in_house_dentist','case.view.own'),
  ('in_house_dentist','case.approve'),('in_house_dentist','case.reject'),
  ('in_house_dentist','file.upload'),('in_house_dentist','file.view'),
  ('lab','case.view.all'),('lab','case.assign'),('lab','case.advance'),('lab','file.view'),
  ('lab_manager','case.view.all'),('lab_manager','case.assign'),('lab_manager','case.advance'),
  ('lab_manager','dispatch.manage'),('lab_manager','file.view'),
  ('receptionist','case.view.all'),('receptionist','case.assign'),
  ('receptionist','dispatch.manage'),('receptionist','file.view'),
  ('designer','case.view.own'),('designer','case.advance'),('designer','file.upload'),('designer','file.view'),
  ('technician','case.view.own'),('technician','case.advance'),('technician','file.upload'),('technician','file.view'),
  ('qc','case.view.own'),('qc','qc.record'),('qc','file.upload'),('qc','file.view'),
  ('dispatch','case.view.all'),('dispatch','dispatch.manage')
ON CONFLICT DO NOTHING;

-- 2. Structured audit log (replaces the free-text `activity` app_record on
--    Postgres). One row per sensitive action, with who / role / what /
--    which resource / when / from where / which session.
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  username      TEXT,
  role          TEXT,
  action        TEXT NOT NULL,
  resource_type TEXT,
  resource_id   TEXT,
  ip            TEXT,
  session_id    TEXT,
  meta          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_created   ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user      ON audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_resource  ON audit_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS audit_logs_action    ON audit_logs (action, created_at DESC);

-- 3. Tracked file references — so the backend can authorise access to a
--    protected Cloudinary asset (private/authenticated delivery) instead of
--    treating case files as public URLs.
CREATE TABLE IF NOT EXISTS file_references (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type        TEXT NOT NULL,           -- 'job_order' | 'case' | 'product' | 'team'
  resource_id          TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  resource_kind        TEXT,                    -- 'image' | 'raw' | 'video'
  access_mode          TEXT NOT NULL DEFAULT 'authenticated',  -- 'authenticated' | 'public'
  category             TEXT,                    -- 'scan' | 'photo' | 'design' | 'qc'
  stage_type           TEXT,
  bytes                INTEGER,
  uploaded_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS file_references_resource ON file_references (resource_type, resource_id, created_at DESC);

-- 4. First-class messages + notifications (were generic app_records).
CREATE TABLE IF NOT EXISTS case_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id UUID REFERENCES job_orders(id) ON DELETE CASCADE,
  case_ref     TEXT,
  author_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  author_role  TEXT,
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS case_messages_order ON case_messages (job_order_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role        TEXT NOT NULL,
  owner_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT,
  title       TEXT NOT NULL,
  body        TEXT,
  related_id  TEXT,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_role ON notifications (role, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_owner ON notifications (owner_id, read, created_at DESC);

-- 5. Per-user login hardening + MFA-ready columns.
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled        BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret         TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at      TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip      TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until       TIMESTAMPTZ;

-- 6. Password reset tokens (hashes only).
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        user_role NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_reset_user ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS password_reset_expiry ON password_reset_tokens (expires_at);
