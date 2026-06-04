# HIS System — Root CLAUDE.md (Vibe Coding Bible)

## Project Overview
Hospital Information System for Tier 1 Indian hospital.
Currently implementing: OPD Cycle (end-to-end).

## Stack
| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui |
| State | Zustand (auth) + TanStack React Query (server state) |
| Backend | FastAPI (Python) |
| ORM | SQLModel (Pydantic + SQLAlchemy combined) |
| DB | PostgreSQL (local) |
| Auth | JWT via python-jose + passlib/bcrypt |

## Directory Structure
```
HIS System/
├── web/          # Next.js frontend (port 3000)
├── api/          # FastAPI backend (port 8000)
└── CLAUDE.md     # This file
```

## Running the Project
```bash
# Backend
cd api
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Seed database (first time only)
python seed.py

# Frontend
cd web
npm run dev
```

## Demo Users (password: his@1234)
| Email | Role |
|---|---|
| admin@his.local | ADMIN |
| reception@his.local | RECEPTIONIST |
| nurse@his.local | NURSE |
| billing@his.local | BILLING |
| dr.mehta@his.local | DOCTOR (General Medicine) |
| dr.patel@his.local | DOCTOR (Cardiology) |

## OPD Workflow
```
Registration → Book Appointment → Check-in → Vitals (Nurse)
→ Queue → Doctor Consultation (SOAP + ICD-10 + Prescription + Lab)
→ Billing → Pharmacy Dispensing
```

## Indian Standards
- ABHA ID format: XX-XXXX-XXXX-XXXX
- ICD-10 coding for diagnosis
- GST on billing (pharmacy/services)
- NMC registration number for doctors
- Ayushman Bharat insurance support

## Working Process (MUST FOLLOW)
1. **Discuss before building** — explain what we're doing and why, get approval, then implement
2. **Read before editing** — always read web/CLAUDE.md or api/CLAUDE.md before touching files
3. **One module at a time** — finish it fully before starting the next
4. **Update ARCHITECTURE.md** — if structure/flow changes, document it there first
5. **Commit after every meaningful change** — push to GitHub so progress is saved
6. **Schemas first** — define API schema before writing frontend that calls it
7. **Never hardcode data** — all demo data comes from api/seed.py

## Key Rules (Claude must follow)
- DOCTOR role required for consultation endpoints — admin has no Doctor record
- consultation_no format: CON + YYYYMMDD + 4-digit seq
- patient_id must be in vitals payload
- Lab tests named "Complete Blood Count" not "CBC" in seed data
- Pharmacy module not yet implemented (router missing)

## Module Map
| Module | API prefix | Frontend route |
|---|---|---|
| Auth | /api/auth | /login |
| Patients | /api/patients | /patients |
| Appointments | /api/appointments | /appointments |
| Clinical | /api/clinical | /doctor |
| Prescriptions | /api/prescriptions | /doctor (tab) |
| Lab | /api/lab | /lab |
| Billing | /api/billing | /billing |
| Pharmacy | /api/pharmacy | /pharmacy |
| Masters | /api/masters | (dropdowns) |
