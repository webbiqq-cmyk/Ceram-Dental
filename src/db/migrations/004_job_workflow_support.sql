-- Full append-only timeline for a job order: every stage/status change,
-- who made it, and an optional note. This is the "status history /
-- activity log" for a specific case (requirement #11) — separate from
-- the general admin audit trail (activity_log below), which logs account
-- and settings changes, not case workflow.
CREATE TABLE job_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id UUID NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  stage_type job_stage_type NOT NULL,
  status job_status NOT NULL,
  actor_id UUID REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_stage_history_order ON job_stage_history (job_order_id, created_at);

-- Who's been assigned to a job order over time, per role — kept distinct
-- from job_orders' assigned_* columns (which only hold the *current*
-- assignee) so reassignment has a real audit trail: who had it before,
-- when it moved, and who moved it.
CREATE TYPE assignment_role AS ENUM ('designer', 'technician', 'qc');

CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id UUID NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  role assignment_role NOT NULL,
  assigned_to UUID NOT NULL REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMPTZ
);
CREATE INDEX idx_assignments_order ON assignments (job_order_id);
CREATE INDEX idx_assignments_current ON assignments (assigned_to, role) WHERE unassigned_at IS NULL;

-- Scans, photos, design files, QC photos and instruction attachments.
-- Stores the Cloudinary result (same signed-upload pattern already used
-- for product/team images in src/controllers/uploads.controller.js,
-- extended to a per-case folder) rather than the file bytes themselves.
CREATE TYPE case_file_category AS ENUM ('scan', 'photo', 'design_file', 'qc_photo', 'instruction', 'other');

CREATE TABLE case_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id UUID NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  stage_type job_stage_type NOT NULL,
  category case_file_category NOT NULL,
  url TEXT NOT NULL,
  public_id TEXT NOT NULL, -- Cloudinary public_id, needed to delete/replace later
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_case_files_order ON case_files (job_order_id);

-- Case-scoped chat, primarily doctor <-> designer but not restricted to
-- just those two roles at the schema level (any user tied to the order
-- can post; the API layer decides who's allowed to see/post per case).
CREATE TABLE case_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id UUID NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);
CREATE INDEX idx_case_messages_order ON case_messages (job_order_id, created_at);

-- The two gated human decisions in the workflow: reception's accept/
-- reject and the doctor's approve/reject. Kept as their own table (distinct
-- from the general job_stage_history timeline) so "every doctor rejection
-- this month" or "reception's average review time" is a plain query
-- instead of filtering free-text notes out of the full history log.
CREATE TYPE decision_type AS ENUM ('reception_review', 'doctor_approval');
CREATE TYPE decision_outcome AS ENUM ('accepted', 'rejected', 'approved');

CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id UUID NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  stage_type job_stage_type NOT NULL,
  decision_type decision_type NOT NULL,
  outcome decision_outcome NOT NULL,
  decided_by UUID NOT NULL REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_approvals_order ON approvals (job_order_id);

-- General admin audit trail — same shape as the existing in-memory
-- src/models/activityLog.model.js (role/username/name/action/detail),
-- given a real table so it survives restarts too. Wiring the admin
-- controllers to write here instead of the in-memory array is a
-- follow-on step, not part of this migration.
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT,
  username TEXT,
  name TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_log_created ON activity_log (created_at DESC);
