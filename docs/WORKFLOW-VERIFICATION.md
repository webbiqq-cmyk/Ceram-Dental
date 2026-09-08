# Workflow correction verification

Local changes only. No commit, push, deployment or production data changes.

## Changed files

- `src/services/workflow.service.js`: veneer review before production, design lock, one-step completion without doctor approval, intake confirmation, optional direct technician assignment, QC findings and packing audit records.
- `src/controllers/orders.controller.js`: passes intake checks, direct assignment and packing confirmation to the workflow.
- `src/controllers/uploads.controller.js`: enforces the approved veneer file lock before signing uploads; receipt registration checks the lock again.
- `src/db/jobOrders.memory.js`: assignment isolation in authenticated development and corrected designer queue.
- `src/db/migrations/009_trays_job_type.sql`: trays enum and conversion of obsolete workflow queues with history entries.
- `src/models/case.model.js`: original one-step case pipeline skips doctor review after design.
- `public/js/utils/workflow.js`: corrected status labels, stage trackers and trays option.
- `public/js/components/caseUpload.js`: scan extensions and stage/category metadata for upload authorization.
- `public/js/components/orderDetail.js`: case files, notes, tracking and polling chat.
- `public/js/pages/portal.js`: doctor case details and veneer-only approval actions with lock notice.
- `public/js/pages/designer.js`: demo review submission, approved handoff, file lock and chat refresh.
- `public/js/pages/reception.js`: intake confirmations, direct production option, full paginated active list and delivery actions.
- `public/js/pages/technician.js`: active production queue and access to requirements/files/notes.
- `public/js/pages/qc.js`: optional evidence uploads, findings, packing gate and reception handoff.
- `public/js/pages/admin.js`, `public/js/pages/admin/orders.js`: lab job tracking and details in the admin panel.
- `test/hardening.test.js`: corrected authenticated API flows and regression coverage.
- `README.md`: current workflow documentation.

Unrelated concurrent edits to home/about and styles were not made or reverted by this workflow change.

## Verified locally

- API suite: 65 passed, 0 failed, 1 skipped. Covers authenticated roles, assignment rejection and concurrency, reception rejection notes, all twelve one-step job types, direct technician intake, veneer demo rejection/approval, locked upload registration, blocked second doctor decision, QC rejection/rework, packing checks, delivery and completion.
- Syntax checks: 157 JavaScript files passed.
- Render smoke checks with mocked data: designer demo/final actions, reception checks/direct assignment/release, QC copy/actions, doctor approval filtering/details, admin job tracking.
- `git diff --check` passed.

## Pending before release

- PostgreSQL integration test and migration execution: no test database configured. The suite deliberately skips its database persistence test.
- Real browser interaction and responsive visual checks: Chrome cannot launch because `libnspr4.so` is unavailable. Render smoke checks do not replace browser verification.
- Signed upload/download end to end: Cloudinary credentials and a size-limited authenticated case preset are not configured locally.
- Production deployment and deployed commit verification: intentionally not performed.
- Admin policy exceptions and editable job-type/workflow configuration do not exist in the current system; job types and transitions remain code-managed. The admin panel now provides job tracking, while existing account/role controls remain intact.
- Production step checklists remain draft UI state; production handoffs, QC decisions/findings/packing and case history are persisted. Payment confirmation records a staff check, not payment processing or reconciliation.
- The older case pipeline remains alongside job orders. Existing non-veneer legacy cases already awaiting approval need review before release; new one-step cases skip that stage.
