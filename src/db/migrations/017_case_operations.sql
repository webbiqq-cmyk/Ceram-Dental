-- Operational fields the lab needs to run a floor rather than just record
-- one: how urgent a case is, when it's expected, and why a case has stopped
-- moving. All additive and all nullable/defaulted, so existing rows keep
-- their exact current meaning: a case with no priority set reads as
-- 'normal', a case with no due date is simply undated, and nothing is
-- blocked until someone blocks it.

-- Three levels, not five. Reception and admin need to say "this one first"
-- and "this one now"; anything finer stops being read and starts being
-- ignored.
CREATE TYPE job_priority AS ENUM ('normal', 'priority', 'urgent');

ALTER TABLE job_orders
  ADD COLUMN priority job_priority NOT NULL DEFAULT 'normal',
  -- What the clinic asked for / what the lab is working to. Deliberately
  -- named "target" in the UI, not "promised": Ceram's business rules don't
  -- guarantee a date, and a date the software presents as a guarantee is a
  -- complaint waiting to happen.
  ADD COLUMN target_date DATE,
  -- Set together, cleared together, by the block/resume transitions in
  -- workflow.service.js. blocked_from records the status to return the case
  -- to on resume, so resuming can't silently teleport a case forward.
  ADD COLUMN blocked_reason TEXT,
  ADD COLUMN blocked_at TIMESTAMPTZ,
  ADD COLUMN blocked_by UUID REFERENCES users(id),
  ADD COLUMN blocked_from job_status,
  -- When the case entered the status it is in right now. updated_at moves
  -- on every write (a note, a file, a priority change), so it can't answer
  -- "how long has this been sitting in Design?" — this can, and it's a
  -- stored timestamp rather than a scan of job_stage_history because every
  -- queue row needs it and history is unbounded per case.
  ADD COLUMN stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill from the timeline the system already has, so time-in-stage is
-- correct for existing cases from day one instead of resetting them all to
-- "just arrived".
UPDATE job_orders o
SET stage_entered_at = COALESCE((
  SELECT max(h.created_at) FROM job_stage_history h
  WHERE h.job_order_id = o.id AND h.status = o.status
), o.updated_at, o.created_at);

CREATE INDEX idx_job_orders_priority ON job_orders (priority) WHERE priority <> 'normal';
CREATE INDEX idx_job_orders_target ON job_orders (target_date) WHERE target_date IS NOT NULL;

-- The single most dangerous gap in a shared case thread: a technician's
-- "the doctor's scan is unusable again" and a message to that same doctor
-- currently look identical to the database. Internal messages are hidden
-- from dentists in the query layer (see jobOrders.repo.js listMessages),
-- not just in the UI.
ALTER TABLE case_messages ADD COLUMN internal BOOLEAN NOT NULL DEFAULT false;
