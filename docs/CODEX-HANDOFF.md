# Codex handoff — pick up from here

Everything below is **local only**. Nothing pushed, nothing deployed.

## Where things stand

`main` now contains, merged and verified together:

| Commit | What |
|---|---|
| `4daed72` | Home & About UI polish (separate session — see "UI changes" below) |
| `bf81119` | Your lab workflow redesign (as you left it) |
| `c37de80` | Two follow-up fixes to your work (see "Fixes already applied") |
| `f3547fa` | Merge commit |

Branch `workflow-redesign` still exists at `c37de80` — safe to delete once you're happy with `main`.

### Verified on the merged tree
- `npm test` → 68 pass, 0 fail, 1 skipped (`test/helpers/persistenceChild.js` — Postgres, no DB).
- Browser flows, all green, no console errors:
  - Veneer: wizard → reception accept (+designer) → designer demo → **portal reject w/ note** → designer revise → **portal approve w/ lock ack** → designer handoff → technician checklist → QC findings+packing → reception pickup → complete.
  - One-step crown: wizard → reception accept **direct-to-technician** → production → QC → complete.
- All workspace routes render at 1280px and 390px, no horizontal overflow.
- Admin renders on its own page with its own nav — no lab sidebar, no `#/admin` entry in the lab workspace.

### Fixes already applied (commit `c37de80`)
1. `public/js/pages/newOrder.js` — the wizard never closed its
   `<ol class="workspace-steps">`, so the step heading and job-type grid
   became flex children of the horizontal stepper and collapsed to ~350px.
   Added the missing `</ol>`.
2. `public/css/workspace.css` — stat-card numbers used the Cormorant accent
   face, where a lone `0` reads as `O`. Switched to the display sans with
   `font-variant-numeric: tabular-nums`.

### Also landed after the merge

- **Administration adopted the shared workspace shell** — its own light
  sidebar (CERAM / Administration + the 14 admin tabs with badges),
  workspace page-head, workspace-styled overview stat cards. Still a
  separate surface with its own nav; only the layout is shared.
  (`workspace.js`, `admin.js`, `admin/overview.js`, `workspace.css`.)
- **Lab Studio role picker + sign-in gate.** `#/studio` now shows a
  role picker (Lab manager / Reception / Design / Production / Quality
  inspection) → a per-role sign-in screen → the station. New UI state
  `UI.labRole` (`''` | `'manager'` | a station route) and `UI.labRolePick`.
  `router.js` gates the four station routes: no `labRole` → `#/studio`;
  a station role only opens its own station; the manager opens all.
  **The sign-in is visual only — the submit handler accepts anything**
  (`studio.js` `#labSigninForm`). TODO for you: check the username/password
  against the admin-managed staff accounts (there is already an
  `accounts` admin tab + `authGate.js`); on success set `UI.labRole` and
  persist a real session instead of the in-memory flag. Until then the
  gate is a UX flow, not a security boundary.

## What is still open

### 1. Postgres — migration 009 + persistence (blocked: no DB configured)
- `src/db/migrations/009_trays_job_type.sql` has not been run anywhere.
- `test/helpers/persistenceChild.js` is skipped by the suite for the same
  reason.
- Action when a database is available: run all migrations in order, run the
  full suite with `DATABASE_URL` set, confirm the persistence test passes,
  and re-run the two browser flows above against the Postgres-backed server
  (not just in-memory).

### 2. Cloudinary signed upload/download E2E (blocked: no credentials)
- `src/controllers/uploads.controller.js` enforces the approved-veneer file
  lock before signing an upload, and again at receipt registration. Only the
  code path is exercised locally; no real signed upload/download has run.
- Action with credentials + a size-limited authenticated case preset:
  upload a scan on a demo case, confirm it lands, approve the demo, confirm
  further uploads to that case are refused (lock), confirm QC evidence
  upload still works during final inspection.

### 3. Production-step checklists are draft UI state
- The per-step ticks on `/technician` (and the checklist on `/qc`) live in
  module memory (`PROGRESS` / `CHECKED`), not the database. Handoffs, QC
  decisions, findings, packing confirmation and case history **are**
  persisted; the intermediate ticks are not.
- Decide: is per-step persistence required, or is "all steps done → handoff"
  enough? If required, add a `job_order_steps` table + endpoints and load
  state in `renderTechnician` / `renderQC`.

### 4. Legacy case pipeline still coexists with job orders
- `src/models/case.model.js` — the original one-step case pipeline now skips
  doctor review after design. New one-step **job orders** already skip it.
- Any pre-existing non-veneer **legacy cases** currently sitting in a
  doctor-approval queue need a manual review before release — they were
  created under the old rules. Check for these in whatever DB you migrate.

### 5. Editable job-type / workflow config — does not exist, by design
- Job types and every status transition are code-managed
  (`public/js/utils/workflow.js`, `src/services/workflow.service.js`).
- The admin panel gained job **tracking** only. Account/role controls are
  unchanged. If the client wants admin-editable workflow config, that is a
  new project, not a fix here.

### 6. Deploy
- Not done. After 1–2 land: run migrations on the target DB, deploy, verify
  the deployed commit hash, smoke the two flows on the deployed URL.

## UI changes that landed alongside your work (commit `4daed72`)

Separate session, public-site only — mentioned so nothing surprises you:

- `public/js/pages/home.js` — the full "Meet the clinicians" doctor grid is
  gone; replaced by a compact team teaser linking to `#/about`. Added an
  "About Ceram Dental" link in the signature section. Removed the
  signature-points label row.
- `public/js/pages/about.js` — "Our philosophy" + "About the clinic" merged
  into one `.about-manifesto` section with a reserved placeholder panel.
  Doctor grid is now compact 3-up. "Get to know us" closing block reworked.
- `public/css/style.css`, `public/css/silk.css` — two-stage scroll reveal
  (`.reveal` block + `.reveal.visible :is(h1,h2,…)` text settle), the About
  redesign styles, narrow-width header (`≤900px` groups actions with the
  hamburger).
- `public/js/components/notifications.js` — the topbar bell now shows only
  on non-public routes (all the workspaces) or while shopping, not on the
  marketing pages. `notifRelevant()` drives it. This interacts with your
  `router.js` change (workspace routes are non-public → bell shows in the
  portals, which is intended).

No overlap with your files. The merge was conflict-free.

## Running it

```
node server.js        # http://localhost:3000  (in-memory, no login, demo data)
npm test              # node --test test/*.test.js
```
