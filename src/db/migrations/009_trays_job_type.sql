ALTER TYPE job_type ADD VALUE IF NOT EXISTS 'trays';

-- Previously final QC sent every product to the doctor. Require packing
-- confirmation in QC before reception releases these existing cases.
WITH moved AS (
  UPDATE job_orders SET status = 'qc_pending', updated_at = now()
  WHERE stage_type = 'final' AND status IN ('waiting_doctor_approval', 'doctor_approved')
    AND assigned_qc_id IS NOT NULL
  RETURNING id, stage_type
)
INSERT INTO job_stage_history (job_order_id, stage_type, status, note)
SELECT id, stage_type, 'qc_pending', 'Workflow correction: confirm QC findings and packing before release.' FROM moved;

-- Old demo production queues must return to doctor review, never release.
WITH moved AS (
  UPDATE job_orders SET status = 'waiting_doctor_approval', updated_at = now()
  WHERE job_type = 'veneers' AND stage_type = 'demo'
    AND status IN ('design_done', 'assigned_to_technician', 'in_production', 'production_done', 'qc_pending', 'qc_rejected', 'qc_approved')
  RETURNING id, stage_type
)
INSERT INTO job_stage_history (job_order_id, stage_type, status, note)
SELECT id, stage_type, 'waiting_doctor_approval', 'Workflow correction: doctor must review demo/design before final production.' FROM moved;
