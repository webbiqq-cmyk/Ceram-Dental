-- The core entity: one row per job order, whether it's a one-step job
-- (crowns, bridges, ...) or a veneer's two-step (demo, then final) job.
-- Veneer's two stages share ONE row rather than spawning a second order:
-- stage_type flips from 'demo' to 'final' and status resets to the start
-- of the pipeline once the demo is doctor-approved (see the workflow
-- service, not this migration, for that transition). That keeps one
-- order number, one file/message thread and one activity timeline for
-- the whole case instead of splitting it across two linked records.
CREATE TYPE job_type AS ENUM (
  'veneers', 'crowns', 'bridges', 'implant_crown', 'implant_bridge',
  'ortho_work', 'night_guard', 'bleaching_tray', 'essix_retainer',
  'surgical_guide', 'functional_mockup', 'other'
);

CREATE TYPE job_stage_type AS ENUM ('demo', 'final');

CREATE TYPE job_status AS ENUM (
  'submitted', 'pending_reception_review', 'rejected_by_reception', 'accepted_by_reception',
  'assigned_to_designer', 'in_design', 'design_done',
  'assigned_to_technician', 'in_production', 'production_done',
  'qc_pending', 'qc_rejected', 'qc_approved',
  'waiting_doctor_approval', 'doctor_rejected', 'doctor_approved',
  'ready_for_delivery', 'ready_for_pickup', 'delivered', 'completed'
);

CREATE TYPE delivery_method AS ENUM ('delivery', 'pickup');

CREATE SEQUENCE job_order_number_seq START 1001;

CREATE TABLE job_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT ('JO-' || nextval('job_order_number_seq')),

  clinic_id UUID REFERENCES clinics(id),
  dentist_user_id UUID NOT NULL REFERENCES users(id),
  patient_ref TEXT NOT NULL,

  job_type job_type NOT NULL,
  stage_type job_stage_type NOT NULL DEFAULT 'final', -- 'demo' only ever set for job_type='veneers'
  status job_status NOT NULL DEFAULT 'submitted',

  shade TEXT,
  instructions TEXT,

  -- Implant-only fields (src/controllers validates these are required
  -- when job_type is implant_crown/implant_bridge; kept nullable here
  -- since every other job_type leaves them empty rather than needing a
  -- separate implant_details table for four fields).
  scan_body TEXT,
  implant_system TEXT,
  abutment_size TEXT,
  abutment_availability TEXT,

  -- Current assignee per role — fast to query for "my orders" per
  -- dashboard. Full reassignment history lives in the `assignments`
  -- table (004), so overwriting these on reassignment loses nothing.
  assigned_designer_id UUID REFERENCES users(id),
  assigned_technician_id UUID REFERENCES users(id),
  assigned_qc_id UUID REFERENCES users(id),

  rejection_note TEXT, -- most recent rejection note (reception or doctor); full history in job_stage_history

  delivery_method delivery_method,
  delivered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_orders_dentist ON job_orders (dentist_user_id);
CREATE INDEX idx_job_orders_status ON job_orders (status);
CREATE INDEX idx_job_orders_designer ON job_orders (assigned_designer_id) WHERE assigned_designer_id IS NOT NULL;
CREATE INDEX idx_job_orders_technician ON job_orders (assigned_technician_id) WHERE assigned_technician_id IS NOT NULL;
CREATE INDEX idx_job_orders_qc ON job_orders (assigned_qc_id) WHERE assigned_qc_id IS NOT NULL;
