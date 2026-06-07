# HIS System — Hospital Information System

Tier 1 Indian hospital workflow system. Covers the complete OPD cycle.

## Modules

| Module | Description |
|--------|-------------|
| Registration | Patient registration, demographics, UHID |
| Appointment | OPD scheduling, slot management |
| Nurse Triage | Vitals recording, queue management |
| OPD Consultation | Doctor SOAP notes, diagnosis, prescriptions |
| Billing | Invoice generation, payment tracking |

## Stack

- **Backend**: FastAPI 0.110 + SQLite + SQLAlchemy
- **Frontend**: Next.js 15 + TypeScript + shadcn/ui
- **Demo**: Standalone HTML/JS prototype (`his-demo/`)

## Quick Start

```bash
# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python seed.py          # seed demo data
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev             # http://localhost:3000
```

## Demo users

All accounts use password `his@1234`.

## Architecture

See `CLAUDE.local.md` for full module breakdown and data flow.
