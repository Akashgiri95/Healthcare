# HIS — Full Architecture & Scenario Reference

---

## Project Identity

| Item | Value |
|---|---|
| System | Hospital Information System |
| Short Name | HIS |
| Version | 0.1.0-alpha |
| GitHub | https://github.com/akashgiri95/his-system |
| Location | `/HIS/` (backend/ + frontend/ + his-demo/) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI + SQLAlchemy + Alembic |
| Auth | JWT (python-jose) + bcrypt direct (NOT passlib) |
| Real-time | WebSocket (FastAPI native) |
| Frontend | React 18 + Vite 8 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite` plugin) |
| Routing | React Router v6 |
| HTTP client | Axios with JWT interceptor |
| DB (dev) | SQLite |
| DB (prod) | PostgreSQL |
| Deployment | Render / Railway (free tier) |

---

## Project Structure

```
HIS/
├── backend/
│   ├── venv/                         ← isolated venv (never commit)
│   ├── app/
│   │   ├── main.py                   ← FastAPI entry, startup, router registration
│   │   ├── database.py               ← SQLAlchemy engine + create_tables()
│   │   ├── auth.py                   ← JWT; import bcrypt directly (NOT passlib)
│   │   ├── websocket.py              ← WebSocket manager, broadcast_to_roles()
│   │   ├── config.py                 ← Pydantic Settings (REDIS_ENABLED: bool = False)
│   │   ├── models/
│   │   │   ├── patient.py            ← uhid, name, triage_level, mlc, emergency, etc.
│   │   │   ├── opd.py
│   │   │   ├── ipd.py
│   │   │   ├── clinical_order.py
│   │   │   ├── lab.py
│   │   │   ├── billing.py
│   │   │   ├── pharmacy.py
│   │   │   ├── inventory.py
│   │   │   └── user.py
│   │   ├── schemas/
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── patients.py           ← POST fires WS: patient_registered
│   │   │   ├── opd.py
│   │   │   ├── ipd.py
│   │   │   ├── clinical.py
│   │   │   ├── lab.py
│   │   │   ├── billing.py
│   │   │   ├── pharmacy.py
│   │   │   └── inventory.py
│   │   └── services/
│   │       ├── patient_service.py
│   │       ├── uhid_service.py       ← format: HIS26NNNNN
│   │       ├── billing_service.py
│   │       └── notification_service.py
│   ├── seed.py                       ← 12 demo users, all password: his@1234
│   ├── alembic/
│   ├── requirements.txt
│   ├── .env                          ← DO NOT COMMIT
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx                   ← Router, PrivateRoute, all page routes
│   │   ├── index.css                 ← @import "tailwindcss" only
│   │   ├── context/
│   │   │   ├── AuthContext.jsx       ← login/logout, JWT, user+role state
│   │   │   └── HISContext.jsx        ← shared state + 10 cross-dept flows
│   │   ├── api/
│   │   │   └── client.js             ← axios + JWT interceptor + 401 redirect
│   │   ├── components/
│   │   │   └── Shell.jsx             ← sidebar (11 depts, collapsible) + topbar
│   │   └── pages/
│   │       ├── Login.jsx             ← 12 quick-login role badges
│   │       ├── Dashboard.jsx
│   │       ├── Registration.jsx      ← OPD reg: ABHA, insurance, token, UHID
│   │       ├── OpdQueue.jsx          ← live queue, emergency pinned top
│   │       ├── DoctorWorkbench.jsx   ← 5 tabs: vitals/consult/lab/Rx/history
│   │       ├── LabScreen.jsx         ← orders → results → notify doctor
│   │       ├── PharmacyScreen.jsx    ← dispense Rx → auto-post billing charge
│   │       ├── BillingScreen.jsx     ← bills + payment modal (8 modes)
│   │       ├── EmergencyRegistration.jsx ← triage, MLC, fast-entry, unknown patient
│   │       └── EmergencyQueue.jsx    ← triage-sorted ED queue (RED first)
│   ├── vite.config.js                ← @tailwindcss/vite + proxy /api→:8000
│   └── package.json
│
├── his-demo/                         ← HTML prototype (UI reference only)
├── HIS Scenarios/                    ← Excel scenario sheets per department
├── CLAUDE.md                         ← short quick-reference (load every session)
├── CLAUDE.local.md                   ← this file — full details
└── README.md
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│  BROWSER — React + Vite + Tailwind CSS v4              │
│  Reception | Doctor | Nurse | Billing | Lab | Pharma   │
│         REST API  +  WebSocket (live updates)          │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  FASTAPI BACKEND                                        │
│  Patient │ Clinical │ Billing │ Lab │ Pharma │ Inv      │
│                WebSocket Event Bus                      │
│                JWT Auth Middleware                      │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  SQLite (dev)  /  PostgreSQL (prod)                    │
└─────────────────────────────────────────────────────────┘
```

---

## Agreed Module Structure

```
Registration & Front Desk  →  OPD patients only (new reg, returning, OPD queue, appointments)
Emergency Department       →  SEPARATE module (not OPD, not IPD)
OPD Management             →  Doctor view: OPD Queue (live) + consult + Rx + lab orders
IPD & Ward                 →  Receives from: OPD admission OR Emergency transfer
```

OPD Queue appears in BOTH Registration sidebar (receptionist) AND OPD Management (doctor).

---

## HISContext — Cross-Department Flows

| Flow | Action | Result | Notifies |
|---|---|---|---|
| 1 | `registerPatient` | adds to patients + opdQueue | doctor, nurse, billing |
| 2 | `callPatient` | opdQueue status → in-consultation | — |
| 3 | `completeConsultation` | opdQueue status → done | — |
| 4 | `orderLab` | adds to labOrders | lab |
| 5 | `uploadLabResult` | labOrders → completed + results | doctor |
| 6 | `writePrescription` | adds to prescriptions | pharmacist |
| 7 | `dispensePrescription` | dispensed + charge posted to billing | billing |
| 8 | `admitPatient` | ipdAdmissions + bed → occupied | nurse, billing |
| 9 | `postCharge` | appends to IPD charge list | — |
| 10 | `dischargePatient` | IPD → discharged + final bill created | billing |

Seed data: 5 patients (HIS2600001–005) at various journey stages covering all flows.

---

## Sidebar NAV_TREE (Shell.jsx)

| Section | Roles | Key Items |
|---|---|---|
| Registration & Front Desk | master, receptionist | Patient Registration, OPD Queue, Appointments |
| Emergency Department | master, receptionist, doctor, nurse | Emergency Reg, Triage & ED Queue, Transfer to IPD |
| OPD Management | master, receptionist, doctor, nurse | OPD Queue (Live), Doctor's Consultation, Rx/Orders |
| IPD & Ward | master, doctor, nurse, billing | Admission Desk, Nursing, Rounds, Charges, Discharge |
| Billing | master, billing, cashier | Dashboard, Tariff, OPD/IPD/Final billing, TPA |
| Pharmacy | master, pharmacist, nurse | OPD Dispensing, IPD Dispensing, Indent, Returns |
| Laboratory (LIS) | master, lab, doctor, nurse | Orders, Collection, Processing, Reports, Critical |
| Radiology (RIS) | master, radiology, doctor | Orders, Schedule, Reports |
| Inventory & Store | master, store, pharmacist | Stock, GRN, Indent, Transfer, Expiry |
| CSSD | master, cssd | Sterilisation Request, Tracking, Dispatch |
| MIS & Analytics | master, management | Executive Dashboard, Clinical KPIs, Financial Reports |

---

## Module Scenarios & Status

### Module 1 — Registration & Front Desk

| # | Scenario | Status | Interlinks |
|---|---|---|---|
| 1 | New Patient Registration | ✅ | Doctor queue, Billing, Pharmacy |
| 2 | Returning Patient Check-in | 🔨 Partial | Queue, history lookup |
| 3 | Walk-in OPD Token | ✅ | Doctor queue, display board |
| 4 | Appointment Booking | ⏳ | Doctor schedule, Billing |
| 5 | Insurance / TPA Verification | ⏳ | Billing cashless flag |
| 6 | ABHA Linkage | ✅ Field | National health records |
| 7 | Patient Demographics Update | ⏳ | All departments |
| 8 | OPD Queue Management | ✅ | Doctor live queue |
| 9 | Bed Availability Check | ⏳ | IPD, Nursing |

### Module 2 — Emergency Department

| # | Scenario | Status | Interlinks |
|---|---|---|---|
| 1 | Emergency Fast Registration | ✅ | ED Queue, Doctor, Nursing, Billing |
| 2 | Triage (RED/YELLOW/GREEN/BLACK) | ✅ | ED Queue sorting, doctor alert |
| 3 | MLC Case Flagging | ✅ | Police, medico-legal records |
| 4 | Unknown / Unconscious Patient | ✅ | Form allows blank name |
| 5 | ED Consultation | ⏳ | Doctor Workbench (shared) |
| 6 | Transfer to IPD | ⏳ | IPD Admission Desk, Nursing, Billing |

### Module 3 — OPD Management

| # | Scenario | Status | Interlinks |
|---|---|---|---|
| 1 | OPD Queue (Doctor View) | ✅ | Live from HISContext |
| 2 | Call Patient / Vitals | ✅ | Doctor Workbench 5-tab |
| 3 | Consultation & Diagnosis | ✅ | Doctor Workbench |
| 4 | Lab Investigation Orders | ✅ | Lab Screen live |
| 5 | Prescription Writing | ✅ | Pharmacy Screen live |
| 6 | Admit to IPD | ✅ | IPD + bed + nurse/billing notify |
| 7 | OPD Billing | ✅ | BillingScreen auto charge |

### Module 4 — IPD & Ward

| # | Scenario | Status |
|---|---|---|
| 1 | Admission Desk (planned admit) | ⏳ Next |
| 2 | Bed Allotment | ⏳ |
| 3 | Nursing Workbench | ⏳ |
| 4 | Doctor Rounds (IPD) | ⏳ |
| 5 | Real-time Charge Posting | ✅ Context |
| 6 | Provisional Bill Review | ⏳ |
| 7 | Discharge Management | ✅ Context |

### Module 5 — Billing

| # | Scenario | Status |
|---|---|---|
| 1–2 | OPD Bill + Payment Modes | ✅ |
| 3 | IPD Final Bill at Discharge | ✅ Context, UI partial |
| 4 | Billing Dashboard | ✅ |
| 5–22 | Full scenarios from Excel | ⏳ |

### Module 6 — Laboratory (LIS)

| # | Scenario | Status |
|---|---|---|
| 1 | Orders from Doctor | ✅ |
| 2 | Sample Collection | ✅ |
| 3 | Result Entry | ✅ |
| 4 | Doctor Notification | ✅ |
| 5 | Critical Value Alert (*) | 🔨 Partial |

### Module 7 — Pharmacy

| # | Scenario | Status |
|---|---|---|
| 1 | OPD Dispensing | ✅ |
| 2 | Charge Auto-posted | ✅ |
| 3 | IPD Dispensing | ⏳ |
| 4 | Indent from Store | ⏳ |

### Modules 8–11 (Radiology, Inventory, CSSD, MIS) — ⏳ Planned

---

## Database Key Tables

```sql
patients        (uhid, name, dob, gender, mobile, blood_group, address,
                 insurance_id, abha_id, patient_type, emergency,
                 triage_level, mlc, arrival_mode, is_active)

opd_visits      (id, patient_id, token, doctor_id, dept, status,
                 visit_date, chief_complaint)

clinical_orders (id, patient_id, visit_id, order_type, items_json,
                 doctor_id, status, ordered_at)

lab_results     (id, order_id, test_name, value, unit,
                 reference_range, is_critical, status, reported_at)

ipd_admissions  (id, patient_id, bed_id, doctor_id, advance_paid,
                 diagnosis, status, admitted_at, discharged_at)

ipd_charges     (id, admission_id, charge_head, amount,
                 posted_by, posted_at, source)

prescriptions   (id, visit_id, medicines_json, instructions, prescribed_at)

pharmacy_dispatch (id, prescription_id, items_json,
                   dispensed_by, dispensed_at)

billing_bills   (id, patient_id, visit_type, gross, discount,
                 gst, net_total, status, payer_type)

billing_receipts (id, bill_id, amount, payment_mode,
                  transaction_ref, collected_at)

users           (id, name, role, department, email,
                 password_hash, is_active)

notifications   (id, to_role, to_user_id, message, module,
                 ref_id, is_read, created_at)

beds            (id, ward, bed_number, type, status,
                 current_patient_id)
```

---

## API Endpoints

```
Auth
  POST  /api/auth/login
  POST  /api/auth/logout

Patients
  GET   /api/patients?search=&uhid=
  POST  /api/patients              → WS: patient.registered
  GET   /api/patients/{uhid}
  PUT   /api/patients/{uhid}       → WS: patient.updated

OPD
  GET   /api/opd/queue
  POST  /api/opd/token             → WS: opd.token.issued
  POST  /api/opd/visit
  PUT   /api/opd/visit/{id}

Beds
  GET   /api/beds/availability

Clinical Orders
  POST  /api/clinical/orders       → WS: lab.order.new / rad.order.new

Lab
  GET   /api/lab/orders
  PUT   /api/lab/results/{id}      → WS: lab.result.ready

IPD
  POST  /api/ipd/admit             → WS: ipd.admission.new
  GET   /api/ipd/charges/{id}

Billing
  GET   /api/billing/bill/{id}
  POST  /api/billing/payment

Pharmacy
  POST  /api/pharmacy/dispense     → WS: ipd.charge.posted

WebSocket
  WS    /ws/{user_id}
```

---

## Role & Access Map

| Role | Sidebar Sections |
|---|---|
| receptionist | registration, emergency, opd |
| doctor | emergency, opd, ipd, lab |
| nurse | emergency, opd, ipd |
| billing | billing, ipd |
| cashier | billing |
| pharmacist | pharmacy |
| lab | lab |
| radiology | radiology |
| store | inventory |
| cssd | cssd |
| management | mis |
| master | ALL (no login switch needed) |

---

## Indian Healthcare Standards

| Standard | Implementation |
|---|---|
| UHID | `HIS26NNNNN` auto-generated, year-prefixed |
| ABHA | Optional linkage at registration |
| NABH | Audit trail on all master changes |
| GST | Consultation exempt; lab/pharma 5–12% |
| CGHS/ECHS/PMJAY | Tariff slab auto-applied by patient type |
| MLC | MLC flag + police station + remarks in Emergency Reg |
| Triage | RED / YELLOW / GREEN / BLACK (START method) |
| Payment modes | Cash, UPI, Card, NEFT/RTGS, Insurance, CGHS, ECHS, PMJAY |

---

## Environment Variables (.env)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/his_db
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false
SECRET_KEY=change-this-to-a-secure-random-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

---

## Git Conventions

```bash
git checkout -b feat/ipd-admission
git checkout -b feat/nursing-workbench

# Commit format
feat: add IPD admission desk screen
fix: ED queue not showing triage level
refactor: extract billing service from router
```

---

## Development Progress

| Phase | Module | Status |
|---|---|---|
| 1 | Registration & Front Desk | ✅ Core complete |
| 2 | Emergency Department | ✅ Core complete |
| 3 | OPD Management | ✅ Core complete |
| 4 | Lab (LIS) | ✅ Core complete |
| 5 | Pharmacy | ✅ Core complete |
| 6 | Billing | ✅ Core complete |
| 7 | IPD & Ward | 🔨 Next |
| 8 | Radiology, Inventory, CSSD | ⏳ Planned |
| 9 | MIS & Analytics | ⏳ Planned |
| 10 | Backend API wiring | ⏳ Replace HISContext actions with API calls |
| 11 | Deploy to cloud | ⏳ Render / Railway |

---

*Last updated: 2026-05-20 | v0.1.0-alpha*
