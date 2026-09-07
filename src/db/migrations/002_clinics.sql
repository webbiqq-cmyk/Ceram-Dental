-- One clinic can have several doctor (dentist-role) logins; the case
-- pipeline today just concatenates "Dr. X — Clinic Y" into a free-text
-- string (src/models/case.model.js). Normalizing it here means job orders
-- can be filtered/reported on by clinic, and a clinic's contact details
-- (for delivery, billing) live in one place instead of copy-pasted per
-- order.
CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN clinic_id UUID REFERENCES clinics(id);
-- Only meaningful for role='dentist'; left nullable rather than a CHECK
-- tying it to the role, since a dentist could plausibly exist without a
-- clinic on file yet (e.g. an account created before intake is complete).

CREATE INDEX idx_users_clinic ON users (clinic_id) WHERE clinic_id IS NOT NULL;
