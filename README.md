# Ceram Dental

A click-through demo of Ceram Dental's platform: the public website and shop,
a dentist portal, an internal Lab Studio, and an accounts/admin dashboard —
one Express server and one shared set of data behind all four.

See [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) for the scope this was built
against (services, the case pipeline, open questions for the client).

## Run it

```
npm install
npm start
```

Then open **http://localhost:3000**. Data lives in memory (`src/models/`)
and resets whenever the server restarts — there's no database to set up.

**Authentication is currently disabled.** Admin, Dentist Portal and Lab
Studio are all directly reachable with no login screen — every visitor is
treated as signed into all three at once. This is a deliberate, temporary
state (see below), not the finished product; an unmissable banner prints
on every startup to say so. Set `REQUIRE_LOGIN=true` to turn the original
three-way login back on exactly as it was built (see Authentication below)
— do that before any real deployment.

Run the automated test suite (`test/`, Node's built-in test runner, no
extra dependencies) with:

```
npm test
```

It also runs automatically on every push via GitHub Actions
(`.github/workflows/ci.yml`). `GET /api/health` is a lightweight,
unrate-limited endpoint for uptime monitoring.

## Deploying — required environment variable

**`JWT_SECRET` is required once `REQUIRE_LOGIN=true` is set** (see
Authentication above) — the server refuses to start signing real sessions
on a secret nobody chose, rather than silently using a predictable or
per-instance-random one. While login is disabled (the current default),
this doesn't apply: nothing signs or verifies a JWT, so a missing
`JWT_SECRET` no longer blocks the deploy — it just falls back to a
throwaway per-invocation secret like local dev does, with a console
warning. Generate a real one with:

```
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Set it in the hosting platform's environment variables (on Vercel: Project
→ Settings → Environment Variables → add `JWT_SECRET` for **both
Production and Preview**) before setting `REQUIRE_LOGIN=true` there.
Locally, or in production while login stays disabled, it's optional — a
throwaway one is generated per process start with a console warning, which
means every restart (or, on Vercel, every cold start) invalidates existing
sessions — harmless right now since no real sessions are being issued.

Optional: `SESSION_TTL_HOURS` (default `12`) controls how long a login
session lasts before needing to sign in again. `REMEMBER_TTL_DAYS`
(default `30`) controls how long a "remember this device" login lasts
instead (see Authentication below).

Optional: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
`CLOUDINARY_API_SECRET` enable image upload for products (Admin → Products
gets an "Upload image" field that signs a direct-to-Cloudinary upload — the
file never passes through this server). Without them the feature is simply
hidden; nothing breaks, and product images fall back to a manually-entered
URL as before.

## Demo login credentials

Not needed while auth is disabled (see above) — every visitor already has
full access to all three portals with no sign-in. When `REQUIRE_LOGIN=true`
is set, Admin, Dentist Portal and Lab Studio each go back to requiring a
real sign-in — one seeded account per role, handed to the client separately
from this repo (never committed). See project handoff notes, or use `POST
/api/auth/:role/change-password` once signed in to set your own.

## Code layout

- `server.js` — entry point only; starts `src/app.js` listening.
- `src/routes/`, `src/controllers/`, `src/models/`, `src/services/` — one
  file per HTTP resource / entity, so a fix always starts from a
  predictable place (e.g. an invoices bug → `src/models/invoice.model.js`).
- `src/middleware/auth.js` + `src/services/auth.service.js` +
  `src/models/user.model.js` — login/session handling (see Authentication
  below). `src/middleware/security.js` — helmet + rate limiting.
- `public/js/pages/` — one render function (+ its own event wiring) per
  page, loaded as native ES modules (no build step). Admin's 11 tabs each
  get their own file under `public/js/pages/admin/`.
- `test/` — the automated suite (`npm test`); `test/helpers/testApp.js` is
  shared setup, not itself a test file.
- `public/js/components/`, `public/js/utils/` — pieces shared across pages
  (case detail drawer, cart, doctor modal, the login gate; formatting/
  tooth-diagram helpers).

## Authentication

**Currently disabled by default** — `src/middleware/auth.js`'s single
`readSession()` choke point (which every role gate in the app goes
through) returns an open session for whatever role is asked, for every
visitor, regardless of cookies. Set `REQUIRE_LOGIN=true` to switch it back
to real enforcement; nothing else below changed or was removed, it's just
bypassed until that's set.

When `REQUIRE_LOGIN=true`: Admin, Dentist Portal and Lab Studio are three independent logins — each
gets its own cookie (`admin_session` / `dentist_session` / `lab_session`),
so a session for one never grants access to another. Sessions are JWTs
(`jsonwebtoken`) in httpOnly, sameSite=strict cookies; passwords are
bcrypt-hashed (`src/models/user.model.js`); login is rate-limited per IP
per role (`src/middleware/security.js`), and every `/api` request also sits
behind a general per-IP ceiling on top of that. `GET /api/state` itself is
role-aware: an anonymous visitor gets only the public-safe fields (team,
jobs, active products, settings) — cases, invoices, expenses etc. are
included only when that specific role's session is valid. Case actions
are further restricted per role in `src/controllers/cases.controller.js`
(dentist: approve/reject/pickup; lab: advance/qc-accept/qc-reject/pickup)
to match what each portal's UI actually exposes as buttons.

Every issued session is tracked server-side (`src/models/session.model.js`)
by a unique `jti`, not just trusted to expire on its own — so logout
actually revokes it, and Admin → Accounts & Access can force any device
signed out on demand. Checking "remember this device" at login issues a
longer-lived session (`REMEMBER_TTL_DAYS`, default 30 days) instead of a
literal saved password — same revocation, same cookie, just a longer clock,
so a familiar device skips re-login without weakening the model.

Admin → **Accounts & Access** is the one place logins, roles and access for
all three portals get created, deactivated, password-reset or deleted
(with a safeguard against removing/deactivating the last active admin) —
and it doubles as oversight: every account's active sessions are listed
there with a one-click "sign out" per device, so admin can see and end
anyone's active session on the spot. Every create/update/delete, login and
logout is written to an audit trail (`src/models/activityLog.model.js`,
Admin → **Activity Log**), and role-targeted in-app notifications
(`src/models/notification.model.js`, the bell in the top bar, polled every
25s) fire on the events each role cares about — a new case for lab, a
mockup ready for review for the dentist, and so on.

Admin → **Export Data** downloads real Excel (`exceljs`) and Word
(`docx`) files — invoices, expenses, appointments, cases and orders as
spreadsheets, plus a one-page business summary as a Word doc — filterable
by date range (defaults to the current month), for manual/offline record
keeping alongside the live dashboards.

## What's here

- **Website** (`/`, `/about`, `/services`, `/shop`, `/contact`, `/careers`) —
  marketing pages, the six services, a small B2B shop with a cart and
  checkout, a contact form, and job listings with an apply flow.
- **Start a Case** (`/new-case`) — the four-step intake wizard clinics use
  to open a case: service, case details, the protocol-of-acceptance
  checklist, review and submit.
- **Dentist Portal** (`/portal`, sign-in required once `REQUIRE_LOGIN=true`,
  open by default for now) — "My Cases" with live status, the mockup
  approval step, and a billing tab showing invoices per case.
- **Lab Studio** (`/studio`, sign-in required once `REQUIRE_LOGIN=true`,
  open by default for now) — the internal case pipeline as a kanban board,
  matching the client's own whiteboard flow (Reception → QC → Design →
  Doctor Approval → CAD-CAM → Layering → QC/Photography → Ready for
  Pickup).
- **Accounts & Admin** (`/admin`, sign-in required once `REQUIRE_LOGIN=true`,
  open by default for now) — revenue and
  outstanding invoices, expense logging, shop orders, the
  applications/messages that come in through Careers and Contact, plus
  central Accounts & Access management, an Activity Log, and Export Data
  (see Authentication above).

Submitting a case, checking out in the shop, applying to a job, or sending a
contact message all write to the same in-memory store, so they show up
immediately in the relevant dashboard — there's one case/customer record
behind every surface, not four separate demos stitched together.

## Lab workflow system (job orders)

A second, newer system alongside the original case pipeline above —
Postgres-backed (not in-memory), with five roles instead of two:

- **`/new-order`** — a doctor creates a job order: job type, case details,
  implant-specific fields when relevant, shade, instructions, delivery/
  pickup preference.
- **`/reception`** — accepts (assigning a designer in the same step) or
  rejects incoming orders with a note.
- **`/designer`** — the assigned queue, doctor files, case chat, and
  "mark done" (which hands to a chosen technician).
- **`/technician`** — the production queue with a per-job-type checklist
  (a night guard is printed and cleaned; a crown is milled and glazed),
  and "mark done" (hands to a chosen QC reviewer).
- **`/qc`** — a checklist review, approve (→ the doctor) or reject
  (→ back to the technician) with a note.
- Back on **`/portal`**'s "Job Orders" tab, the doctor approves or
  requests changes; reception then confirms completion and marks it
  delivered/picked up.

**Veneers are the one two-stage job**: the same order goes through the
whole pipeline once as a `demo` and, the moment the doctor approves the
demo, flips to `final` and runs through it again — same order number,
same file/message thread, same history — rather than becoming a second,
disconnected order. Every other job type is a single pass.

`src/db/migrations/` (schema + seed data), `src/services/workflow.service.js`
(the state machine — every status transition in the system in one place),
`src/routes/orders.routes.js`. Verified end-to-end (every role, both veneer
stages, rejection paths at every gate) against a real local Postgres
instance before shipping — see that verification in this project's
history for the exact scenarios covered.

**Works with or without `DATABASE_URL` set.** `src/db/jobOrders.store.js`
picks the storage backend once at boot: the real, persistent Postgres repo
(`jobOrders.repo.js`) when `DATABASE_URL` is set, an in-memory one
(`jobOrders.memory.js`, same seed accounts, same interface) when it isn't
— so this runs immediately on a fresh deploy with zero setup, exactly
like every other model in `src/models/` already does for the rest of the
site. `workflow.service.js` and the controller are written against that
shared interface, not against either backend directly, so the rules
behave identically on both — only persistence differs: the in-memory
store resets on every restart/cold start and isn't shared across
concurrent serverless instances, same trade-off the rest of this demo
already accepts. Set `DATABASE_URL` (see Deploying above) the moment real
persistence matters — no code changes needed, it switches on its own.

Because login is disabled by default (see Authentication above), there's
one shared seeded identity per single-person role (dentist, receptionist,
qc) and a small real roster for the two multi-person roles (designer,
technician) — `src/db/migrations/005_seed_workflow_users.sql`. Every
shared multi-role endpoint (list orders, chat, files, staff rosters) takes
an explicit `asRole` so it knows which dashboard is asking, since every
role's session check would otherwise look identical while login stays
off — see `src/middleware/workflowRole.js`.

`demo/index.html` is an earlier single-file mockup (still openable directly,
no server needed) kept for reference; the Express app above is the current,
fuller demo.
