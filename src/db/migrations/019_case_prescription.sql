-- The structured dental prescription.
--
-- The four clinic job-order sheets define roughly thirty clinical
-- properties — layering technique, occlusal design, FP classification,
-- pontic type, trim line and so on. Two alternatives were considered and
-- rejected: thirty nullable columns (unreadable, and most are null for
-- any given case), and continuing to flatten everything into the
-- `instructions` text (which is what the code did, and which forces a
-- technician to read prose to find out whether a crown wants a deep
-- fissure).
--
-- One JSONB column instead. The shape is not free-form: every key and
-- every value is validated against src/services/prescription.js before it
-- is written, so this is structured data that happens to be stored
-- flexibly, not a bag the client can put anything in.
--
-- Nullable with no default and no backfill: every existing order keeps
-- its current behaviour and renders from `instructions` exactly as before.
ALTER TABLE job_orders ADD COLUMN prescription JSONB;

-- Supports "every case with a deep-fissure occlusal design" and similar
-- operational questions without scanning the table. GIN is the right index
-- for containment queries over a document column.
CREATE INDEX idx_job_orders_prescription ON job_orders USING GIN (prescription jsonb_path_ops)
  WHERE prescription IS NOT NULL;
