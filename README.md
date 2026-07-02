# Across Assist — Travel Claims Management Portal

Full-stack rebuild of the demo: **React (Vite) + Node.js/Express + Prisma +
PostgreSQL**, branded to Across Assist, with real role-based auth and a real
database behind every screen instead of client-only state.

> This was built and syntax-verified in a sandboxed container without a live
> Postgres instance or internet access to Prisma's binary mirror — the
> frontend has been installed and **production-built successfully**
> (`npm run build`), and every backend file has been syntax-checked. Run the
> steps below on your machine / server to bring the database online.

## What changed vs. the earlier client-only demo

- **Real backend**: Express API, JWT auth, PostgreSQL via Prisma, activity-log
  audit trail — nothing lives only in the browser anymore.
- **Registration removed from the Customer portal.** Customers can only view
  and submit **Intimation**. Registration is exclusively an Agent-portal
  screen and is never rendered for a Customer session, even by URL.
- **Assessment moved entirely to the Insurer portal.** The Agent's job ends at
  "Submit to Insurer"; all medical / PA / non-medical assessment fields,
  approval status, and the Approve / Reject / Return decision are now
  Insurer-only.
- **Agent-initiated intimation.** `/agent/new` lets an agent search a
  customer's policy by number and lodge the claim on their behalf — the same
  Intimation form, just filled from the Agent portal instead of the Customer
  portal.
- **Across Assist branding**: your uploaded logo, a blue/orange design
  system (`frontend/src/styles/theme.css`), sidebar + top bar shell modeled
  on your reference screenshots (and taken a level further: stage stepper,
  field-provenance badges, accordion field groups, status chips).

## Architecture

```
across-assist-portal/
├── backend/         Express API, Prisma schema, JWT auth, seed script
│   ├── prisma/schema.prisma
│   ├── prisma/seed.js
│   └── src/{index.js, routes, controllers, middleware, utils}
└── frontend/        React 18 + Vite, react-router-dom, axios
    └── src/{pages/{customer,agent,insurer}, components, lib, context, api}
```

**Data model.** Each `Claim` has structured columns for anything you'd want
to search or filter on (claim number, stage, status, coverages, insurer
reference numbers) plus four JSONB payloads — `intimationData`,
`registrationData`, `assessmentData`, `paymentData` — that store every
wireframe field for that stage keyed by field id. This is the same pattern
most claims platforms use once the field list runs into the hundreds and
keeps growing with each insurer: you get full flexibility to add/rename
fields from `frontend/src/lib/fieldSchemas.js` without a database migration,
while the columns that matter for search stay indexed and relational.

**Stage ownership is enforced server-side**, not just hidden in the UI —
`claim.controller.js` rejects a `PATCH /claims/:id/registration` from a
Customer token and a `PATCH /claims/:id/assessment` from an Agent token
regardless of what the frontend sends.

## Running it locally

### 1. Database
Install PostgreSQL and create a database:
```bash
createdb across_assist
```

### 2. Backend
```bash
cd backend
cp .env.example .env        # edit DATABASE_URL / JWT_SECRET if needed
npm install
npx prisma migrate dev --name init
npm run seed                 # creates demo Customer / Agent / Insurer + a policy
npm run dev                  # http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173 (proxies /api to :4000)
```

### Demo logins (password for all: `password123`)
| Role     | Email                          |
|----------|---------------------------------|
| Customer | customer@acrossassist.demo      |
| Agent    | agent@acrossassist.demo         |
| Insurer  | insurer@acrossassist.demo       |

The seed script also creates policy `POTBHI00100017114` with the same
coverage set shown in your reference screenshots (Emergency Medical
Expenses, Dental, Personal Accident, Baggage, etc.) so the Customer and
Agent portals have real data to work against immediately.

## End-to-end flow to demo to your CEO

1. **Customer** logs in → reviews policy & coverages → selects coverages →
   Initiate Claim → fills Intimation → Submit.
2. **Agent** logs in → sees it in the Claims Queue → opens it → runs
   First-Level Validation (Pass or Raise Deficiency) → on Pass, Registration
   unlocks → fills Registration → "Submit to Insurer" (simulated API call,
   generates insurer intimation/registration numbers).
3. Separately, **Agent** can click **New Claim** to intimate a claim entirely
   on a customer's behalf by searching their policy number first.
4. **Insurer** logs in → sees it in the Assessment Queue → fills
   Medical/PA/Non-Medical + common assessment fields → Approve / Reject /
   Return.
5. **Agent** sees the outcome in the Payment tab → enters UTR → Process
   Payment & Close Case (or closes the repudiation if rejected).

## Extending the field set
Every field lives in `frontend/src/lib/fieldSchemas.js` as a small object
(`id`, `label`, `type`, `source`, `req`, `options`). Add a field there and it
renders automatically, tagged with the right "who fills this" badge, and
respects the stage-ownership rules in `frontend/src/lib/permissions.js`.


# Across Assist — Travel Claims Management Portal

Full-stack rebuild of the demo: **React (Vite) + Node.js/Express + Prisma +
PostgreSQL**, branded to Across Assist, with real role-based auth and a real
database behind every screen instead of client-only state.

> This was built and syntax-verified in a sandboxed container without a live
> Postgres instance or internet access to Prisma's binary mirror — the
> frontend has been installed and **production-built successfully**
> (`npm run build`), and every backend file has been syntax-checked. Run the
> steps below on your machine / server to bring the database online.

## Update: document upload, Admin portal, notification stubs

This pass adds three things on top of the previous drop:

1. **Real document upload/storage.** Multer writes files to
   `backend/uploads/` on disk with randomized filenames (never trusting the
   client's filename), a `Document` row is created per upload, and every
   claim workspace (Customer / Agent / Insurer) now has a **Documents** tab
   to upload, list, download, and delete. Swap the disk storage for S3/GCS
   later by only touching `backend/src/utils/upload.js`.
2. **Admin / Policy-Config portal** (`/admin`, `SUPER_ADMIN` role). Create
   and deactivate master policies + coverage lines, create Agent/Insurer/
   Admin accounts, and view a **notification outbox**.
3. **Email/SMS/WhatsApp notification stubs.** `backend/src/utils/notifications.js`
   logs to the console and writes a row to a `Notification` table (status
   QUEUED→SENT) at every key claim transition — submitted, deficiency
   raised, registered with insurer, insurer decision, case closed. Swap the
   three sender functions for SendGrid/Twilio/WhatsApp Business API later;
   nothing else needs to change. Admin → Notification Outbox shows the log.

New demo login: **Admin** — `admin@acrossassist.demo` / `password123`.

If you're applying this as an update to an existing checkout, only the files
listed at the end of this README changed or were added — everything else
from the previous drop is untouched. After copying them in:

```bash
cd backend
npm install                      # picks up the new multer dependency
npx prisma migrate dev --name add_documents_and_notifications
npm run dev
```

## What changed vs. the earlier client-only demo

- **Real backend**: Express API, JWT auth, PostgreSQL via Prisma, activity-log
  audit trail — nothing lives only in the browser anymore.
- **Registration removed from the Customer portal.** Customers can only view
  and submit **Intimation**. Registration is exclusively an Agent-portal
  screen and is never rendered for a Customer session, even by URL.
- **Assessment moved entirely to the Insurer portal.** The Agent's job ends at
  "Submit to Insurer"; all medical / PA / non-medical assessment fields,
  approval status, and the Approve / Reject / Return decision are now
  Insurer-only.
- **Agent-initiated intimation.** `/agent/new` lets an agent search a
  customer's policy by number and lodge the claim on their behalf — the same
  Intimation form, just filled from the Agent portal instead of the Customer
  portal.
- **Across Assist branding**: your uploaded logo, a blue/orange design
  system (`frontend/src/styles/theme.css`), sidebar + top bar shell modeled
  on your reference screenshots (and taken a level further: stage stepper,
  field-provenance badges, accordion field groups, status chips).

## Architecture

```
across-assist-portal/
├── backend/         Express API, Prisma schema, JWT auth, seed script
│   ├── prisma/schema.prisma
│   ├── prisma/seed.js
│   └── src/{index.js, routes, controllers, middleware, utils}
└── frontend/        React 18 + Vite, react-router-dom, axios
    └── src/{pages/{customer,agent,insurer}, components, lib, context, api}
```

**Data model.** Each `Claim` has structured columns for anything you'd want
to search or filter on (claim number, stage, status, coverages, insurer
reference numbers) plus four JSONB payloads — `intimationData`,
`registrationData`, `assessmentData`, `paymentData` — that store every
wireframe field for that stage keyed by field id. This is the same pattern
most claims platforms use once the field list runs into the hundreds and
keeps growing with each insurer: you get full flexibility to add/rename
fields from `frontend/src/lib/fieldSchemas.js` without a database migration,
while the columns that matter for search stay indexed and relational.

**Stage ownership is enforced server-side**, not just hidden in the UI —
`claim.controller.js` rejects a `PATCH /claims/:id/registration` from a
Customer token and a `PATCH /claims/:id/assessment` from an Agent token
regardless of what the frontend sends.

## Running it locally

### 1. Database
Install PostgreSQL and create a database:
```bash
createdb across_assist
```

### 2. Backend
```bash
cd backend
cp .env.example .env        # edit DATABASE_URL / JWT_SECRET if needed
npm install
npx prisma migrate dev --name init
npm run seed                 # creates demo Customer / Agent / Insurer + a policy
npm run dev                  # http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173 (proxies /api to :4000)
```

### Demo logins (password for all: `password123`)
| Role     | Email                          |
|----------|---------------------------------|
| Customer | customer@acrossassist.demo      |
| Agent    | agent@acrossassist.demo         |
| Insurer  | insurer@acrossassist.demo       |

The seed script also creates policy `POTBHI00100017114` with the same
coverage set shown in your reference screenshots (Emergency Medical
Expenses, Dental, Personal Accident, Baggage, etc.) so the Customer and
Agent portals have real data to work against immediately.

## End-to-end flow to demo to your CEO

1. **Customer** logs in → reviews policy & coverages → selects coverages →
   Initiate Claim → fills Intimation → Submit.
2. **Agent** logs in → sees it in the Claims Queue → opens it → runs
   First-Level Validation (Pass or Raise Deficiency) → on Pass, Registration
   unlocks → fills Registration → "Submit to Insurer" (simulated API call,
   generates insurer intimation/registration numbers).
3. Separately, **Agent** can click **New Claim** to intimate a claim entirely
   on a customer's behalf by searching their policy number first.
4. **Insurer** logs in → sees it in the Assessment Queue → fills
   Medical/PA/Non-Medical + common assessment fields → Approve / Reject /
   Return.
5. **Agent** sees the outcome in the Payment tab → enters UTR → Process
   Payment & Close Case (or closes the repudiation if rejected).

## Extending the field set
Every field lives in `frontend/src/lib/fieldSchemas.js` as a small object
(`id`, `label`, `type`, `source`, `req`, `options`). Add a field there and it
renders automatically, tagged with the right "who fills this" badge, and
respects the stage-ownership rules in `frontend/src/lib/permissions.js`.

## Files added or changed in this update

**New**
- `backend/src/utils/notifications.js`
- `backend/src/utils/upload.js`
- `backend/src/controllers/document.controller.js`
- `backend/src/routes/document.routes.js`
- `backend/src/controllers/admin.controller.js`
- `backend/src/routes/admin.routes.js`
- `frontend/src/components/DocumentUpload.jsx`
- `frontend/src/pages/admin/AdminLayout.jsx`
- `frontend/src/pages/admin/AdminPolicies.jsx`
- `frontend/src/pages/admin/AdminUsers.jsx`
- `frontend/src/pages/admin/AdminNotifications.jsx`

**Modified**
- `backend/prisma/schema.prisma` (Document, Notification models; Policy.isActive)
- `backend/prisma/seed.js` (phone numbers for notification stubs, admin account)
- `backend/src/controllers/claim.controller.js` (notification hooks at each transition)
- `backend/src/index.js` (mounts document + admin routes)
- `backend/package.json` (adds `multer`)
- `backend/.env.example` (adds `UPLOAD_DIR`)
- `backend/.gitignore` (ignores uploaded files, keeps the folder)
- `frontend/src/components/Sidebar.jsx` (Admin nav)
- `frontend/src/App.jsx` (Admin routes + role-home fix)
- `frontend/src/pages/LoginPage.jsx` (Admin login tab)
- `frontend/src/pages/customer/CustomerClaimView.jsx` (Documents section)
- `frontend/src/pages/agent/AgentClaimWorkspace.jsx` (Documents tab)
- `frontend/src/pages/insurer/InsurerClaimWorkspace.jsx` (Documents tab)