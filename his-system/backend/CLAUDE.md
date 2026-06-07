# HIS API — CLAUDE.md

## Stack
- FastAPI + Python 3.11+
- SQLModel (ORM — combines Pydantic + SQLAlchemy)
- PostgreSQL
- python-jose (JWT), passlib/bcrypt (passwords)
- Uvicorn ASGI server

## Structure
```
api/
├── app/
│   ├── main.py              # App entry, routers registered here
│   ├── core/
│   │   ├── config.py        # Settings (reads .env)
│   │   └── security.py      # JWT + bcrypt helpers
│   ├── db/
│   │   ├── database.py      # Engine, session, create_tables
│   │   └── models.py        # ALL SQLModel table models (single file)
│   └── modules/
│       ├── auth/            # JWT login, get_current_user dependency
│       ├── patient/         # Patient CRUD, UHID generation
│       ├── appointment/     # Booking, check-in, queue, token
│       ├── clinical/        # Vitals, consultation (SOAP), diagnosis
│       ├── prescription/    # e-Prescription, items
│       ├── lab/             # Lab orders, results
│       ├── billing/         # Bills, GST, payments
│       ├── pharmacy/        # Dispensing stub
│       └── masters/         # Departments, doctors, drugs, ICD-10
├── seed.py                  # Demo data — run once
├── requirements.txt
└── .env
```

## Conventions
- Every module has: router.py, schemas.py, service.py
- router.py: FastAPI routes only, calls service or direct DB ops
- schemas.py: Pydantic models for request/response
- service.py: Business logic (ID generation, calculations)
- All DB models in app/db/models.py (single file for easy reference)
- Auth dependency: `current_user = Depends(get_current_user)` on protected routes

## ID Generation Pattern
All IDs follow: PREFIX + YYYYMMDD + zero-padded sequence
- UHID: HIS + YEAR + 6-digit seq (e.g. HIS2024000001)
- Appointment: APT + YYYYMMDD + 4-digit seq
- Visit: VIS + YYYYMMDD + 4-digit seq
- Bill: BILL + YYYYMMDD + 4-digit seq
- Prescription: RX + YYYYMMDD + 4-digit seq
- Lab Order: LAB + YYYYMMDD + 4-digit seq

## Key Models Summary
- User → Doctor (1:1 via user_id)
- Patient → Appointment → Visit → Vitals + Consultation
- Consultation → Diagnosis[] + Prescription[] + LabOrder[]
- Prescription → PrescriptionItem[] (each line = one drug)
- Bill → BillItem[] + Payment[]

## Running
```bash
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
# API docs at http://localhost:8000/docs
```
