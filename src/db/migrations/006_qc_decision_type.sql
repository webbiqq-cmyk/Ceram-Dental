-- Phase 0 only anticipated two gated decisions (reception, doctor) for
-- the approvals table; QC's own approve/reject is exactly the same kind
-- of gated decision and belongs in the same table, not bolted on
-- elsewhere. Adding the value rather than editing 004 — that migration
-- may already be applied somewhere, and migrations are never edited
-- after the fact.
ALTER TYPE decision_type ADD VALUE 'qc_review';
