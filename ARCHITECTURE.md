# HIS System — Architecture Overview

> Quick reference. Detailed schemas in `docs/SCHEMA.md`, flows in `docs/FLOWS.md`.

## Stack

| Layer | Tech | Port |
|-------|------|------|
| Frontend | Next.js 14 + TypeScript + Tailwind + shadcn/ui | 3000 |
| Backend | FastAPI + Python 3.11 | 8000 |
| Database | PostgreSQL + SQLModel ORM | 5432 |
| Auth | JWT (python-jose) + bcrypt | — |
| State | Zustand (auth) + React Query (server) | — |

## Project Structure

```
HIS System/
├── api/                      # Backend
│   ├── app/
│   │   ├── main.py           # Entry point
│   │   ├── core/             # Config, security
│   │   ├── db/               # Database, models
│   │   └── modules/          # Feature modules
│   │       ├── auth/
│   │       ├── patient/
│   │       ├── appointment/
│   │       ├── clinical/
│   │       ├── prescription/
│   │       ├── lab/
│   │       ├── billing/
│   │       └── masters/
│   └── seed.py
│
├── web/                      # Frontend
│   └── src/
│       ├── app/              # Pages (file-based routing)
│       │   ├── login/
│       │   ├── dashboard/
│       │   ├── opd/journey/  # 4-step OPD flow
│       │   ├── patients/
│       │   ├── appointments/
│       │   ├── doctor/
│       │   ├── lab/
│       │   ├── pharmacy/
│       │   └── billing/
│       ├── components/       # UI + HIS components
│       ├── lib/              # API client, utils
│       └── store/            # Zustand stores
│
├── docs/                     # Detailed documentation
│   ├── SCHEMA.md             # Database tables
│   └── FLOWS.md              # Data flow diagrams
│
├── CLAUDE.md                 # Project rules
├── ARCHITECTURE.md           # This file
├── ROADMAP.md                # Plan & progress
└── LEARNING.md               # Concept glossary
```

## Key Relationships

```
Patient (UHID)
    └── Appointment
            └── Visit
                ├── Vitals (Nurse)
                └── Consultation (Doctor)
                        ├── Diagnosis (ICD-10)
                        ├── Prescription → Items
                        └── LabOrder → Items
```

## API Modules

| Module | Prefix | Purpose |
|--------|--------|---------|
| auth | `/api/auth` | Login, JWT tokens |
| patient | `/api/patients` | CRUD, UHID generation |
| appointment | `/api/appointments` | Booking, check-in, queue |
| clinical | `/api/clinical` | Vitals, consultation |
| prescription | `/api/prescriptions` | Drug prescriptions |
| lab | `/api/lab` | Lab orders, results |
| billing | `/api/billing` | Bills, payments |
| masters | `/api/masters` | Departments, doctors, drugs |

## ID Formats

| Entity | Format | Example |
|--------|--------|---------|
| Patient UHID | HIS + YYYY + 6-digit | HIS2024000042 |
| Appointment | APT + YYYYMMDD + 4-digit | APT202606110001 |
| Visit | VIS + YYYYMMDD + 4-digit | VIS202606110001 |
| Consultation | CON + YYYYMMDD + 4-digit | CON202606110001 |
| Prescription | RX + YYYYMMDD + 4-digit | RX202606110001 |
| Lab Order | LAB + YYYYMMDD + 4-digit | LAB202606110001 |
| Bill | BILL + YYYYMMDD + 4-digit | BILL202606110001 |

## Current Status

### Completed Modules
- **Auth:** JWT login, role-based access
- **Patient:** CRUD, UHID generation, duplicate detection
- **Appointment:** Booking, check-in, queue management, doctor availability
- **Reception Desk:** Tabbed workspace (New Appointment, Appointments, Patients)
- **Doctor Desk:** SOAP notes, ICD-10 diagnosis, prescription builder, patient queue
- **Clinical:** Vitals recording, consultation, diagnosis management

### Partial
- **Lab:** Orders only (no results entry)
- **Pharmacy:** Schema only (no dispensing UI)
- **Billing:** Schema only (no payments UI)

### Key Features
- **Doctor Dropdown in Sidebar:** Switch between doctors to view their queue
- **Symptom-to-Department Mapping:** Auto-suggest department based on symptoms
- **Duplicate Patient Detection:** Phone+DOB and Name+DOB matching
- **Follow-up Fee Detection:** Auto-discount within 7/30 days
- **ICD-10 Search:** Diagnosis coding with primary/secondary support
- **Prescription Builder:** Drug search, dosage, frequency, duration

### Next Steps
- Lab results entry
- Pharmacy dispensing
- Billing & payments
- Reports & analytics

See `docs/FLOWS.md` for the scalable Tier 1 architecture design.
