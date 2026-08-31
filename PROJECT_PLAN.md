# Ceram Dental — Project Plan

Working notes from the client workshop (floor plan + whiteboard sketches), turned into a build plan.

## What the client needs

Three connected systems, not one:

1. **Public website + e-commerce** — clinics/dentists start a case, browse services, pay/track invoices.
2. **Internal lab system** — staff-facing case pipeline (reception → design → production → QC → pickup).
3. **Dentist application/portal** — "my cases" view, and the one step that needs the doctor directly: approving the mockup.

## Services (from the sitemap sketch)

Home → Start New Case → **Veneers · Crowns · Bridges · Implants · Surgical Guide · Digital Smile Design**

Each case carries a **Protocol of Acceptance** the client already uses to QC incoming cases:
Photos · Digital Scan/Impression · Retraction Cord Photo · Clear Margins · Clear Contacts.

Veneer cases additionally track design-side choices: layering style, glaze type, surface structure, shade.

## Case pipeline (from the internal lab flowchart)

```
Reception → QC (Accept/Reject) → Design → Doctor Approval (mockup) → CAD-CAM/Milling
   → Layering & Finishing → QC & Photography → Ready for Pickup
```

Branches called out on the board:
- **QC reject** sends a case back to Reception.
- **Doctor rejects the mockup** → "Request Modification" → back to Design → re-submitted for approval.
  The note on the board is explicit: *extra charges apply from the second revision on.*
- Named roles on the sketch: Reception, QC, Designer, Doctor (the client dentist), CAD-CAM/wax technician (e.g. "Malvin").

## The demo (this branch)

`demo/index.html` — a single-file, click-through prototype covering all three surfaces against one shared
in-memory case list, so a case submitted on the website shows up immediately in Lab Studio, moves through
the pipeline, and the doctor-approval step is answerable from "My Cases." No backend, no build step —
open the file directly or view it as a published Artifact. Eight sample cases seed the pipeline; submitting
the wizard adds a real one.

This is meant to get the client's sign-off on the *shape* of the product before we scope real engineering.

## Proposed phases (after demo sign-off)

| Phase | Scope |
|---|---|
| 1 | Website: marketing pages + "Start New Case" intake, e-commerce/invoicing |
| 2 | Internal Lab Studio: real case pipeline, roles/permissions, QC gates |
| 3 | Dentist portal: case tracking, notifications, mockup approval, billing/credits |
| 4 | Integrations: payments, SMS/email notifications, CAD-CAM file export |

## Open questions for the client

A few items on the whiteboard need a short follow-up before they're spec'd:

- **"Main Requirements"** list mentions *Credits*, and what look like *Password Guard* / *Video Guard* — need
  these read back to confirm (billing credits? access control? something else?).
- **Roles & permissions** — who can Accept/Reject at QC, who can see pricing, who manages staff accounts.
- **Seats/stations** — the floor plan shows ~7 desks plus a CAD-CAM room; confirm how many concurrent
  lab-system logins that implies.
- **Billing model** — per-case invoicing vs. a credit/prepay system.
