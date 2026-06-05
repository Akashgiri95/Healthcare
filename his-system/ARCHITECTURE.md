# HIS System — Architecture & Learning Guide

## What is this project?

A **Hospital Information System (HIS)** — software that manages an entire hospital's workflow:
patients walking in, doctors seeing them, prescriptions written, lab tests ordered, bills generated.

This is a **learning/portfolio project** built to production quality. It runs entirely on your laptop.

---

## The Two Halves

```
Your browser                    Your laptop (background)
    │                                    │
    ▼                                    ▼
┌─────────────┐    HTTP requests    ┌─────────────┐
│   FRONTEND  │ ◄──────────────────► │   BACKEND   │
│  (Next.js)  │                     │  (FastAPI)  │
│  port 3000  │                     │  port 8000  │
└─────────────┘                     └─────────────┘
                                           │
                                           ▼
                                    ┌─────────────┐
                                    │  PostgreSQL  │
                                    │  (Database) │
                                    └─────────────┘
```

**Frontend** = what you see (the UI, buttons, forms).
**Backend** = the brain (business logic, data validation, rules).
**Database** = permanent storage (all data lives here, survives restarts).

They talk via **HTTP requests** — the same way a browser loads a website, but instead of HTML, the backend sends back JSON data.

---

## Why This Architecture?

| Decision | Why |
|---|---|
| Separate frontend and backend | Each can be changed independently. A designer can update UI without touching the database. |
| FastAPI (Python) for backend | You know Python. FastAPI is simple, fast, and auto-generates documentation. |
| Next.js for frontend | Industry standard for React apps. Server-side rendering, file-based routing. |
| PostgreSQL database | Real hospital-grade database. Not SQLite (toy), not MongoDB (wrong tool). |
| Zustand for state | Simple store that remembers things between pages (like "which patient is selected"). |

---

## Backend Deep Dive (`api/`)

```
api/
├── app/
│   ├── main.py              ← Entry point. Registers all routes.
│   ├── core/
│   │   ├── config.py        ← Reads .env file (DB password, secret key)
│   │   └── security.py      ← JWT tokens + password hashing
│   ├── db/
│   │   ├── database.py      ← Creates DB connection
│   │   └── models.py        ← ALL database tables defined here
│   └── modules/             ← One folder per feature
│       ├── auth/            ← Login/logout
│       ├── patient/         ← Patient CRUD
│       ├── appointment/     ← Booking, check-in, tokens
│       ├── clinical/        ← Vitals, SOAP consultation, diagnosis
│       ├── prescription/    ← Drug prescriptions
│       ├── lab/             ← Lab orders & results
│       ├── billing/         ← Bills, GST, payments
│       └── masters/         ← Reference data (departments, doctors, drugs, ICD-10)
├── seed.py                  ← Creates demo data (run once)
├── requirements.txt         ← Python packages needed
└── .env                     ← Secrets (never commit this)
```

### How a Request Works (Example: Book Appointment)

```
Browser clicks "Book & Check In"
        │
        ▼
POST http://localhost:8000/api/appointments
+ JSON body: { patient_id: 3, doctor_id: 1, ... }
        │
        ▼
api/app/modules/appointment/router.py   ← receives the request
        │
        ▼
api/app/modules/appointment/schemas.py  ← validates the JSON
        │
        ▼
api/app/modules/appointment/service.py  ← business logic (check slot availability)
        │
        ▼
api/app/db/models.py                    ← Appointment table
        │
        ▼
PostgreSQL database                     ← data saved
        │
        ▼
Returns JSON: { id: 42, appointment_no: "APT20260604...", token_number: 3 }
        │
        ▼
Browser receives response, shows "Token #3 assigned"
```

### Each Module has 3 Files

| File | Job |
|---|---|
| `router.py` | Defines the URL endpoints (`GET /`, `POST /`, etc.) |
| `schemas.py` | Defines what JSON the request must contain |
| `service.py` | Business logic that's too complex for the router |

---

## Frontend Deep Dive (`web/`)

```
web/src/
├── app/                     ← Every folder here = one URL page
│   ├── page.tsx             ← / (redirects to dashboard)
│   ├── login/page.tsx       ← /login
│   ├── dashboard/page.tsx   ← /dashboard
│   ├── opd/
│   │   ├── page.tsx         ← /opd (queue)
│   │   └── journey/
│   │       ├── page.tsx     ← /opd/journey (redirects to register)
│   │       ├── register/    ← /opd/journey/register  (Step 1)
│   │       ├── appointment/ ← /opd/journey/appointment (Step 2)
│   │       ├── vitals/      ← /opd/journey/vitals (Step 3)
│   │       └── consultation/← /opd/journey/consultation (Step 4)
│   ├── patients/page.tsx    ← /patients
│   ├── appointments/page.tsx← /appointments
│   ├── doctor/page.tsx      ← /doctor (Doctor Desk)
│   ├── reception/page.tsx   ← /reception
│   ├── lab/page.tsx         ← /lab
│   ├── billing/page.tsx     ← /billing
│   └── pharmacy/page.tsx    ← /pharmacy
│
├── components/
│   ├── his/
│   │   ├── sidebar.tsx      ← Left navigation bar (shared by ALL pages)
│   │   ├── topbar.tsx       ← Top bar with clock (shared by ALL pages)
│   │   └── journey-banner.tsx ← Step 1→2→3→4 progress bar
│   ├── providers.tsx        ← Wraps app with React Query
│   └── ui/                  ← Reusable UI pieces (button, input, badge...)
│
├── lib/
│   ├── api.ts               ← Axios setup (auto-attaches JWT token to every request)
│   └── utils.ts             ← Small helper functions (calcAge, fmtCurrency...)
│
└── store/
    ├── auth.ts              ← Remembers: who is logged in, their role
    └── journey.ts           ← Remembers: current patient, appointment, visit during OPD flow
```

### How a Page Works (Example: Vitals page)

```
User is on /opd/journey/vitals
        │
        ▼
web/src/app/opd/journey/vitals/page.tsx loads
        │
        ├── reads journey store (who is the patient? what is visitId?)
        ├── renders the vitals form (BP, pulse, temp...)
        │
        ▼
User fills form and clicks "Save & Proceed"
        │
        ▼
useMutation hook calls:
  POST http://localhost:8000/api/clinical/vitals
  body: { visit_id: 5, patient_id: 3, bp_systolic: 118, ... }
        │
        ▼
onSuccess: completeStep(3) → router.push("/opd/journey/consultation")
```

---

## The OPD Journey — How the 4 Steps Connect

```
Step 1: Register
  → User selects/creates patient
  → Saves PatientSummary to journey store
  → Navigates to Step 2

Step 2: Book Appointment
  → Selects dept + doctor + type
  → POST /api/appointments  →  creates Appointment record (APT...)
  → POST /api/appointments/{id}/checkin  →  creates Visit record (VIS...)
  → Saves appointment + visitId to journey store
  → Navigates to Step 3

Step 3: Vitals
  → Fills vitals form
  → POST /api/clinical/vitals  →  creates Vitals record linked to visitId
  → Navigates to Step 4

Step 4: Consultation
  → Doctor fills SOAP notes → POST /api/clinical/consultation  →  creates Consultation (CON...)
  → Doctor adds diagnoses → POST /api/clinical/consultation/{id}/diagnosis
  → Doctor writes prescription → POST /api/prescriptions
  → Doctor orders labs → POST /api/lab/orders
  → Doctor clicks Finalize → POST /api/clinical/consultation/{id}/finalize
```

### The Database Links Everything

```
Patient (id=3)
    └── Appointment (id=4, APT202606040004)
            └── Visit (id=5, VIS202606040001)
                    ├── Vitals (bp=118/76, pulse=74...)
                    └── Consultation (CON202606040001, SOAP notes)
                            ├── Diagnosis (E11.9 Diabetes)
                            ├── Diagnosis (A90 Dengue)
                            ├── Prescription → PrescriptionItem (Metformin 500mg)
                            └── LabOrder → LabOrderItem (HbA1c)
```

---

## Key Concepts to Understand

### JWT Token (Login)
When you log in, the backend gives you a **token** — like a badge. Every request you make after that sends this badge. The backend checks "is this badge valid? what role is this person?" That's how it knows if you're a doctor or receptionist.

### Zustand Store
Think of it as a **sticky note on the browser tab**. When you select a patient in Step 1, you stick their info on the note. Step 2, 3, 4 all read from that sticky note. When you click "New Patient", the note is wiped clean (`reset()`).

### React Query (TanStack Query)
Manages API calls. Instead of writing `fetch()` manually:
- `useQuery` = "load data when the page opens, cache it"
- `useMutation` = "send data when user does something (click, submit)"

### Roles and Permissions
The sidebar shows different items based on your role. The backend also checks your role on protected actions (e.g., only DOCTOR can create a consultation).

| Role | Can do |
|---|---|
| RECEPTIONIST | Register patients, book appointments |
| NURSE | Record vitals |
| DOCTOR | Write consultations, prescriptions, lab orders |
| BILLING | Generate bills |
| ADMIN | Everything |

---

## Our Working Process (Rules)

1. **Discuss first** — Before any code, we agree on what we're building and why.
2. **Update ARCHITECTURE.md** — Any structural change gets documented here.
3. **Commit to GitHub** — After every meaningful change, we commit.
4. **One module at a time** — Finish it before moving to the next.

---

## Commands You Should Know (Practice These)

```bash
# Start the backend
cd "api"
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Start the frontend (new terminal tab)
cd "web"
npm run dev

# Check git status (what files changed?)
git status

# See what changed in a file
git diff

# Stage all changes
git add .

# Commit with a message
git commit -m "Add vitals page fix: include patient_id in payload"

# Push to GitHub
git push origin main

# See recent commits
git log --oneline -10
```

```bash
# See running API docs (open in browser)
open http://localhost:8000/docs

# Test an API endpoint directly
curl http://localhost:8000/api/masters/departments \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Appointment Management Module

The `/appointments` page is the full appointment management screen for reception staff.

### What it does
| Feature | Where |
|---|---|
| Stats strip (total, checked-in, completed, cancelled, no-show) | Top of appointments page |
| Filter by date, status, search | Toolbar |
| Per-row actions: Check In, Reschedule, Cancel, No Show | Row buttons |
| Audit log for every appointment | Eye icon → modal |
| Bulk Cancel (select rows → cancel with reason) | Checkbox + bulk bar |
| Bulk Transfer (check capacity, move to another doctor) | Checkbox + bulk bar |
| Book appointment for existing or new patient | `/appointments/new` |
| Quick-register walk-in patient (real UHID, minimal fields) | New appointment page |
| Duplicate check warning | If same patient+doctor+date exists |
| Appointment slip (printable confirmation) | After booking |
| Doctor block slots (admin/reception sets leave/conference) | API: `POST /api/appointments/blocks` |

### New DB Tables
- `appointment_audit_logs` — every action (CREATED, CHECKED_IN, RESCHEDULED, CANCELLED, NO_SHOW, TRANSFERRED) stored with who did it and when
- `doctor_blocks` — blocks a doctor's schedule for a date range (LEAVE, CONFERENCE, HOLIDAY, etc.)

### API Endpoints Added
```
GET  /api/appointments/stats          — counts by status for a date
GET  /api/appointments/duplicate-check — warns if patient already has appt with same doctor
GET  /api/appointments/{id}/audit     — full audit trail for one appointment
POST /api/appointments/{id}/cancel    — cancel with reason + audit log
POST /api/appointments/bulk-cancel    — cancel multiple appointments
POST /api/appointments/bulk-transfer  — move appointments to another doctor (checks capacity)
GET  /api/appointments/blocks         — list doctor schedule blocks
POST /api/appointments/blocks         — create a block (leave, holiday…)
DELETE /api/appointments/blocks/{id}  — remove a block
POST /api/patients/quick-register     — minimal registration (Name+Phone+DOB+Gender → real UHID)
```

## What's NOT in the project yet (next to build)

- [ ] Billing page — fully functional (create bill from visit, add items, calculate GST, record payment)
- [ ] Pharmacy dispensing — dispense drugs against a prescription
- [ ] Lab results entry — lab tech enters test results
- [ ] Patient detail page — full history of a patient
- [ ] Admin panel — manage departments, doctors, drugs, users
- [ ] Reports — daily OPD count, revenue summary
