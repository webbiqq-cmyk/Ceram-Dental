-- One-time production cleanup, explicitly requested: this is a real
-- clinic's live database, not the demo — every account, job order, and
-- catalog entry created while building/testing this out gets removed,
-- keeping only the real admin login(s) already in place (see
-- auth.controller.js's admin bootstrap — that's how the one that exists
-- was created). Nothing here touches app configuration (permissions,
-- role_permissions, schema_migrations) or ephemeral infra state
-- (rate_limits, idempotency_keys) — only user-created/seeded content.
--
-- Order matters for foreign keys: job_orders first (job_stage_history,
-- assignments, case_files, approvals and case_messages all cascade from
-- it — see migration 004), then the non-admin users those orders
-- pointed to, then clinics (no longer referenced by either), then the
-- schemaless app_records store (team, products, and anything else in
-- it) and the dedicated file_references/audit_logs tables.
DELETE FROM job_orders;
DELETE FROM users WHERE role <> 'admin';
DELETE FROM clinics;
DELETE FROM app_records;
DELETE FROM file_references;
DELETE FROM audit_logs;
