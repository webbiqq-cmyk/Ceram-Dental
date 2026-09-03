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

## Deploying — required environment variable

**`JWT_SECRET` must be set before deploying to production**, or every
`/api/*` request will fail (the server deliberately refuses to start
signing sessions on a secret nobody chose, rather than silently using a
predictable or per-instance-random one). Generate one with:

```
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Set it in the hosting platform's environment variables (on Vercel: Project
→ Settings → Environment Variables → add `JWT_SECRET` for **both
Production and Preview**) before the first deploy that includes the auth
system. Locally, it's optional — a throwaway one is generated per process
start with a console warning, which is fine for development but means
every restart invalidates existing sessions.

Optional: `SESSION_TTL_HOURS` (default `12`) controls how long a login
session lasts before needing to sign in again.

## Demo login credentials

Admin, Dentist Portal and Lab Studio each require signing in — one seeded
account per role, handed to the client separately from this repo (never
committed). See project handoff notes, or use `POST
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
- `public/js/components/`, `public/js/utils/` — pieces shared across pages
  (case detail drawer, cart, doctor modal, the login gate; formatting/
  tooth-diagram helpers).

## Authentication

Admin, Dentist Portal and Lab Studio are three independent logins — each
gets its own cookie (`admin_session` / `dentist_session` / `lab_session`),
so a session for one never grants access to another. Sessions are JWTs
(`jsonwebtoken`) in httpOnly, sameSite=strict cookies; passwords are
bcrypt-hashed (`src/models/user.model.js`); login is rate-limited per IP
per role (`src/middleware/security.js`). `GET /api/state` itself is
role-aware: an anonymous visitor gets only the public-safe fields (team,
jobs, active products, settings) — cases, invoices, expenses etc. are
included only when that specific role's session is valid. Case actions
are further restricted per role in `src/controllers/cases.controller.js`
(dentist: approve/reject/pickup; lab: advance/qc-accept/qc-reject/pickup)
to match what each portal's UI actually exposes as buttons.

## What's here

- **Website** (`/`, `/about`, `/services`, `/shop`, `/contact`, `/careers`) —
  marketing pages, the six services, a small B2B shop with a cart and
  checkout, a contact form, and job listings with an apply flow.
- **Start a Case** (`/new-case`) — the four-step intake wizard clinics use
  to open a case: service, case details, the protocol-of-acceptance
  checklist, review and submit.
- **Dentist Portal** (`/portal`, sign-in required) — "My Cases" with live
  status, the mockup approval step, and a billing tab showing invoices per
  case.
- **Lab Studio** (`/studio`, sign-in required) — the internal case pipeline
  as a kanban board, matching the client's own whiteboard flow (Reception →
  QC → Design → Doctor Approval → CAD-CAM → Layering → QC/Photography →
  Ready for Pickup).
- **Accounts & Admin** (`/admin`, sign-in required) — revenue and
  outstanding invoices, expense logging, shop orders, and the
  applications/messages that come in through Careers and Contact.

Submitting a case, checking out in the shop, applying to a job, or sending a
contact message all write to the same in-memory store, so they show up
immediately in the relevant dashboard — there's one case/customer record
behind every surface, not four separate demos stitched together.

`demo/index.html` is an earlier single-file mockup (still openable directly,
no server needed) kept for reference; the Express app above is the current,
fuller demo.
