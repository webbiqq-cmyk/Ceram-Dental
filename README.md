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

Then open **http://localhost:3000**. Data lives in memory (`db.js`) and
resets whenever the server restarts — there's no database to set up.

## What's here

- **Website** (`/`, `/about`, `/services`, `/shop`, `/contact`, `/careers`) —
  marketing pages, the six services, a small B2B shop with a cart and
  checkout, a contact form, and job listings with an apply flow.
- **Start a Case** (`/new-case`) — the four-step intake wizard clinics use
  to open a case: service, case details, the protocol-of-acceptance
  checklist, review and submit.
- **Dentist Portal** (`/portal`) — "My Cases" with live status, the mockup
  approval step, and a billing tab showing invoices per case.
- **Lab Studio** (`/studio`) — the internal case pipeline as a kanban board,
  matching the client's own whiteboard flow (Reception → QC → Design →
  Doctor Approval → CAD-CAM → Layering → QC/Photography → Ready for Pickup).
- **Accounts & Admin** (`/admin`) — revenue and outstanding invoices,
  expense logging, shop orders, and the applications/messages that come in
  through Careers and Contact.

Submitting a case, checking out in the shop, applying to a job, or sending a
contact message all write to the same in-memory store, so they show up
immediately in the relevant dashboard — there's one case/customer record
behind every surface, not four separate demos stitched together.

`demo/index.html` is an earlier single-file mockup (still openable directly,
no server needed) kept for reference; the Express app above is the current,
fuller demo.
