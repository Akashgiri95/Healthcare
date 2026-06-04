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

## Vibe Coding Rules
1. Always read web/CLAUDE.md before editing frontend files
2. Always read api/CLAUDE.md before editing backend files
3. Work one module at a time
4. Types/schemas defined in api first, then frontend consumes them
5. All demo data seeded via api/seed.py — never hardcode data in UI

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
