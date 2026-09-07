-- Seed data for the new lab-workflow roles. This matters right now for a
-- reason specific to this project's current state: login is disabled
-- site-wide (src/middleware/auth.js), so every request reaching these
-- routes carries a synthetic "open" session, not a real logged-in user —
-- yet job_orders.dentist_user_id and friends are real NOT NULL foreign
-- keys into this table. src/services/workflow.service.js's
-- resolveActorId() maps each role to exactly one of these seeded rows
-- while auth stays open, so "who submitted/actioned this order" always
-- resolves to a real row instead of failing the FK constraint.
--
-- Designer/technician are seeded with more than one person each because
-- assignment (who is this specific order's designer) is a real per-order
-- choice the UI needs a roster for (GET /api/staff?role=designer) — it is
-- NOT the same thing as "who is acting," which stays the shared
-- placeholder identity above until real per-person login exists.
--
-- Every account below shares the placeholder password ChangeMe123! — it
-- is never checked while login is disabled, but reset it (POST
-- /api/auth/:role/change-password) before ever setting REQUIRE_LOGIN=true.
INSERT INTO clinics (id, name, phone, email, address) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Bright Smile Clinic', '+973 3900 1122', 'hello@brightsmile.example', 'Manama, Bahrain')
ON CONFLICT (id) DO NOTHING;

-- One shared identity per single-person role (the "who is acting" resolver).
INSERT INTO users (id, username, password_hash, role, name, clinic_id) VALUES
  ('00000000-0000-0000-0000-000000000010', 'dentist',      '$2a$12$MduyS1DG78OcHvfhntJH8O7MxBOnBINYk6EEvkCbkQxFaaFNe6ftu', 'dentist',      'Dr. R. Haddad', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000011', 'receptionist', '$2a$12$MduyS1DG78OcHvfhntJH8O7MxBOnBINYk6EEvkCbkQxFaaFNe6ftu', 'receptionist', 'Reception Desk', NULL),
  ('00000000-0000-0000-0000-000000000012', 'qc',           '$2a$12$MduyS1DG78OcHvfhntJH8O7MxBOnBINYk6EEvkCbkQxFaaFNe6ftu', 'qc',           'Quality Desk', NULL)
ON CONFLICT (id) DO NOTHING;

-- A real roster for the two multi-person roles.
INSERT INTO users (id, username, password_hash, role, name) VALUES
  ('00000000-0000-0000-0000-000000000020', 'rana',   '$2a$12$MduyS1DG78OcHvfhntJH8O7MxBOnBINYk6EEvkCbkQxFaaFNe6ftu', 'designer',   'Rana'),
  ('00000000-0000-0000-0000-000000000021', 'omar',   '$2a$12$MduyS1DG78OcHvfhntJH8O7MxBOnBINYk6EEvkCbkQxFaaFNe6ftu', 'designer',   'Omar'),
  ('00000000-0000-0000-0000-000000000030', 'malvin', '$2a$12$MduyS1DG78OcHvfhntJH8O7MxBOnBINYk6EEvkCbkQxFaaFNe6ftu', 'technician', 'Malvin'),
  ('00000000-0000-0000-0000-000000000031', 'layla',  '$2a$12$MduyS1DG78OcHvfhntJH8O7MxBOnBINYk6EEvkCbkQxFaaFNe6ftu', 'technician', 'Layla')
ON CONFLICT (id) DO NOTHING;
