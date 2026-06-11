# HIS System — Data Flows & Scalable Architecture

> How data moves between departments. For database details, see `SCHEMA.md`.

---

## Current State: OPD Only

```
RECEPTION                 NURSE                    DOCTOR
    │                       │                        │
    ▼                       ▼                        ▼
┌─────────┐           ┌─────────┐            ┌──────────────┐
│ Patient │──────────►│  Visit  │───────────►│ Consultation │
│Register │           │ Vitals  │            │   (SOAP)     │
└─────────┘           └─────────┘            └──────────────┘
                                                    │
                           ┌────────────────────────┼────────────────────────┐
                           ▼                        ▼                        ▼
                    ┌────────────┐          ┌─────────────┐          ┌────────────┐
                    │ Diagnosis  │          │ Prescription│          │  Lab Order │
                    │  (ICD-10)  │          │   (Drugs)   │          │  (Tests)   │
                    └────────────┘          └─────────────┘          └────────────┘
                                                   │                        │
                                                   ▼                        ▼
                                            ┌─────────────┐          ┌────────────┐
                                            │  PHARMACY   │          │    LAB     │
                                            │  (pending)  │          │  (pending) │
                                            └─────────────┘          └────────────┘
```

### Current Flow Steps

```
Step 1: Patient Registration
        └── Creates: Patient (UHID: HIS2024000001)

Step 2: Appointment + Check-in
        └── Creates: Appointment → Visit

Step 3: Vitals (Nurse)
        └── Creates: Vitals (linked to Visit)

Step 4: Consultation (Doctor)
        └── Creates: Consultation
                ├── Diagnosis (ICD-10)
                ├── Prescription → Items (drugs)
                └── LabOrder → Items (tests)
```

### Problem: Fragmented Orders

```
Current tables:
├── Prescription    → Only drugs
├── LabOrder        → Only lab tests
└── ???             → Radiology, procedures, blood — missing!

Each needs separate:
  - API endpoints
  - Queue logic
  - Billing integration
  - Status tracking
```

---

## Target State: Scalable Tier 1

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         TIER 1 HOSPITAL INFORMATION SYSTEM                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                        PATIENT MASTER (Single Source)                     │   │
│  │     UHID │ ABHA │ Demographics │ Allergies │ Insurance │ History         │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                          │
│         ┌─────────────────────────────┼─────────────────────────────────────┐   │
│         ▼                             ▼                             ▼           │
│  ┌─────────────┐              ┌─────────────┐              ┌─────────────┐      │
│  │     OPD     │              │     IPD     │              │  EMERGENCY  │      │
│  │   (Visit)   │              │ (Admission) │              │  (Triage)   │      │
│  └─────────────┘              └─────────────┘              └─────────────┘      │
│         │                             │                             │           │
│         └─────────────────────────────┼─────────────────────────────┘           │
│                                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                         ENCOUNTER (Universal)                             │   │
│  │   encounter_id │ patient_id │ type(OPD/IPD/ER) │ status │ department     │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                          │
│         ┌──────────────┬──────────────┼──────────────┬──────────────┐           │
│         ▼              ▼              ▼              ▼              ▼           │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐     │
│  │  CLINICAL │  │   ORDER   │  │   ORDER   │  │   ORDER   │  │   ORDER   │     │
│  │   NOTES   │  │ (Pharmacy)│  │   (Lab)   │  │(Radiology)│  │(Procedure)│     │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘     │
│                       │              │              │              │            │
│                       ▼              ▼              ▼              ▼            │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                      DEPARTMENT WORK QUEUES                               │   │
│  ├───────────┬───────────┬───────────┬───────────┬───────────┬─────────────┤   │
│  │  PHARMACY │    LAB    │ RADIOLOGY │    OT     │BLOOD BANK │   BILLING   │   │
│  └───────────┴───────────┴───────────┴───────────┴───────────┴─────────────┘   │
│                                       │                                          │
│                                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                         BILLING AGGREGATOR                                │   │
│  │   Auto-collects: Consultation + Labs + Radiology + Pharmacy + Room + OT  │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Concept: Unified Order System

### One Table for All Order Types

```
┌─────────────────────────────────────────────────────────────┐
│                         orders                               │
├─────────────────────────────────────────────────────────────┤
│ order_type = PHARMACY   → Pharmacy sees it                  │
│ order_type = LAB        → Lab sees it                       │
│ order_type = RADIOLOGY  → Radiology sees it                 │
│ order_type = PROCEDURE  → OT sees it                        │
│ order_type = BLOOD      → Blood bank sees it                │
│ order_type = DIET       → Dietetics sees it                 │
└─────────────────────────────────────────────────────────────┘
```

### How It Works

```
DOCTOR creates consultation:
    └── Orders 2 medicines + 1 lab test + 1 X-ray

SYSTEM creates 3 Order records:
    │
    ├── Order #1 ─────────────────────────────────────────┐
    │   order_type: PHARMACY                              │
    │   items: Metformin 500mg x30, Amlodipine 5mg x30   │
    │                                                     │
    ├── Order #2 ─────────────────────────────────────────┤
    │   order_type: LAB                                   │
    │   items: HbA1c                                      │
    │                                                     │
    └── Order #3 ─────────────────────────────────────────┤
        order_type: RADIOLOGY                             │
        items: Chest X-ray PA view                        │
        └─────────────────────────────────────────────────┘
```

---

## Department Queue Views

Each department sees only their orders:

### Pharmacy Screen
```sql
SELECT * FROM orders
WHERE order_type = 'PHARMACY'
  AND status IN ('ORDERED', 'ACCEPTED')
ORDER BY priority DESC, created_at
```

```
┌────────────────────────────────────────────────────────────┐
│ PHARMACY QUEUE                           2026-06-11 10:30  │
├────────────────────────────────────────────────────────────┤
│ Token  Patient         Items                   Status      │
│ ────────────────────────────────────────────────────────── │
│ P-042  Ramesh Kumar    Metformin, Amlodipine   PENDING  ◄──│── NEW
│ P-041  Sunita Devi     Paracetamol 500mg       PENDING     │
│ P-040  Amit Shah       Azithromycin 500mg      DISPENSED   │
└────────────────────────────────────────────────────────────┘
```

### Lab Screen
```sql
SELECT * FROM orders
WHERE order_type = 'LAB'
  AND status IN ('ORDERED', 'SAMPLE_COLLECTED', 'PROCESSING')
ORDER BY priority DESC, created_at
```

```
┌────────────────────────────────────────────────────────────┐
│ LAB QUEUE                                2026-06-11 10:30  │
├────────────────────────────────────────────────────────────┤
│ Token  Patient         Tests                   Status      │
│ ────────────────────────────────────────────────────────── │
│ L-089  Ramesh Kumar    HbA1c                   ORDERED  ◄──│── NEW
│ L-088  Amit Shah       CBC, LFT                COLLECTED   │
│ L-087  Priya Patel     Lipid Profile           PROCESSING  │
└────────────────────────────────────────────────────────────┘
```

### Radiology Screen
```sql
SELECT * FROM orders
WHERE order_type = 'RADIOLOGY'
  AND status IN ('ORDERED', 'SCHEDULED', 'IN_ROOM')
ORDER BY scheduled_at
```

```
┌────────────────────────────────────────────────────────────┐
│ RADIOLOGY QUEUE                          2026-06-11 10:30  │
├────────────────────────────────────────────────────────────┤
│ Token  Patient         Exam                    Status      │
│ ────────────────────────────────────────────────────────── │
│ R-023  Ramesh Kumar    Chest X-ray PA          SCHEDULED◄──│── NEW
│ R-022  Priya Patel     USG Abdomen             IN_ROOM     │
│ R-021  Sunita Devi     CT Head                 REPORTED    │
└────────────────────────────────────────────────────────────┘
```

---

## Order Status Flow

```
                    ┌─────────────────────────────────────────┐
                    │            ORDER STATUS FLOW             │
                    └─────────────────────────────────────────┘

PHARMACY:    ORDERED → ACCEPTED → DISPENSING → DISPENSED
                                      │
                                      └── PARTIALLY_DISPENSED (if partial stock)

LAB:         ORDERED → ACCEPTED → SAMPLE_COLLECTED → PROCESSING → RESULTED
                                                           │
                                                           └── Flags: is_abnormal

RADIOLOGY:   ORDERED → SCHEDULED → PATIENT_ARRIVED → IN_ROOM → COMPLETED → REPORTED
                  │
                  └── scheduled_at = "2026-06-11 14:00"

PROCEDURE:   ORDERED → SCHEDULED → PRE_OP_CLEARED → IN_OT → COMPLETED
                  │
                  └── Requires: anesthesia clearance, blood availability

BLOOD:       ORDERED → CROSS_MATCHED → ISSUED → TRANSFUSED
                  │
                  └── Links to blood_inventory table
```

---

## Auto-Billing Flow

```
When order status = COMPLETED:
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                    BILLING TRIGGER                           │
│                                                              │
│  1. Look up service price from services table               │
│  2. Create bill_item for each order_item                    │
│  3. Apply GST rules (5% pharmacy, 0% healthcare)            │
│  4. Link to encounter's bill                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────┐
│ Bill for Ramesh Kumar (UHID: HIS2024000042)        │
│ ─────────────────────────────────────────────────  │
│ Consultation (Dr. Mehta)          ₹500.00          │
│ Metformin 500mg x 30              ₹120.00          │
│ Amlodipine 5mg x 30               ₹ 85.00          │
│ HbA1c                             ₹450.00          │
│ Chest X-ray PA                    ₹350.00          │
│ ─────────────────────────────────────────────────  │
│ Subtotal                        ₹1,505.00          │
│ GST (5% on pharmacy only)       ₹   10.25          │
│ ─────────────────────────────────────────────────  │
│ TOTAL                           ₹1,515.25          │
└────────────────────────────────────────────────────┘
```

---

## Cross-Department Visibility

### What Each Role Sees

```
┌──────────────┬──────────────────────────────────────────────┐
│     ROLE     │              CAN SEE / DO                    │
├──────────────┼──────────────────────────────────────────────┤
│ RECEPTIONIST │ Register patient                             │
│              │ Book appointment                             │
│              │ Check-in patient                             │
│              │ View all appointments for today              │
├──────────────┼──────────────────────────────────────────────┤
│ NURSE        │ View patients in queue                       │
│              │ Record vitals                                │
│              │ View doctor's orders (read-only)             │
├──────────────┼──────────────────────────────────────────────┤
│ DOCTOR       │ View own patient queue                       │
│              │ Record consultation (SOAP)                   │
│              │ Add diagnosis, prescriptions, lab orders     │
│              │ View lab/radiology results                   │
│              │ Refer to other doctors                       │
├──────────────┼──────────────────────────────────────────────┤
│ LAB_TECH     │ View lab queue (order_type = LAB)            │
│              │ Collect sample (update status)               │
│              │ Enter results                                │
│              │ Flag abnormal values                         │
├──────────────┼──────────────────────────────────────────────┤
│ PHARMACIST   │ View pharmacy queue (order_type = PHARMACY)  │
│              │ Dispense medication                          │
│              │ Record partial dispensing                    │
│              │ Check drug interactions                      │
├──────────────┼──────────────────────────────────────────────┤
│ RADIOLOGIST  │ View radiology queue                         │
│              │ Schedule exams                               │
│              │ Upload images                                │
│              │ Dictate reports                              │
├──────────────┼──────────────────────────────────────────────┤
│ BILLING      │ View all completed orders                    │
│              │ Generate bills                               │
│              │ Record payments                              │
│              │ Apply discounts/insurance                    │
├──────────────┼──────────────────────────────────────────────┤
│ ADMIN        │ Everything                                   │
│              │ Manage users, departments, services          │
│              │ View reports                                 │
└──────────────┴──────────────────────────────────────────────┘
```

---

## End-to-End Example: OPD Visit

```
09:00  PATIENT arrives
        │
        ▼
09:02  RECEPTION registers patient
        └── Creates: Patient (UHID: HIS2024000042)
        │
        ▼
09:05  RECEPTION books appointment with Dr. Mehta
        └── Creates: Appointment (APT202606110015)
        └── Check-in → Creates: Visit (VIS202606110012)
        └── Token: #15
        │
        ▼
09:10  NURSE records vitals
        └── Creates: Vitals (BP: 140/90, Pulse: 82)
        └── Status: IN_QUEUE
        │
        ▼
09:45  DOCTOR sees patient
        └── Creates: Consultation (CON202606110008)
        └── Diagnosis: E11.9 (Type 2 DM), I10 (Hypertension)
        └── Creates: Order #1 (PHARMACY) → Metformin, Amlodipine
        └── Creates: Order #2 (LAB) → HbA1c, FBS
        └── Creates: Order #3 (RADIOLOGY) → Chest X-ray
        │
        ├────────────────────┬────────────────────┐
        ▼                    ▼                    ▼
09:50  PHARMACY sees      LAB sees             RADIOLOGY sees
       Order #1           Order #2             Order #3
        │                    │                    │
        ▼                    ▼                    ▼
10:00  Dispenses         Collects sample     Schedules for 11:00
       Metformin,        HbA1c, FBS
       Amlodipine
        │                    │                    │
        ▼                    ▼                    ▼
       COMPLETED          PROCESSING          SCHEDULED
        │                    │                    │
        ▼                    ▼                    ▼
       → BillItem         → BillItem          11:15 → BillItem
         ₹205               ₹650                 ₹350
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ▼
11:30  BILLING generates final bill
        ┌────────────────────────────────────┐
        │ Consultation         ₹500.00       │
        │ Metformin 500mg      ₹120.00       │
        │ Amlodipine 5mg       ₹ 85.00       │
        │ HbA1c                ₹400.00       │
        │ FBS                  ₹250.00       │
        │ Chest X-ray          ₹350.00       │
        │ ─────────────────────────────────  │
        │ Total                ₹1,705.00     │
        │ GST (5% pharmacy)    ₹   10.25     │
        │ ─────────────────────────────────  │
        │ GRAND TOTAL          ₹1,715.25     │
        └────────────────────────────────────┘
        │
        ▼
11:35  PATIENT pays at counter
        └── Payment recorded, receipt generated
        │
        ▼
       VISIT COMPLETE
```

---

## Scalability Principles

| Principle | How We Apply It |
|-----------|-----------------|
| **Single Patient Record** | One UHID across all departments, all visits |
| **Unified Encounter** | OPD/IPD/ER use same base structure |
| **Universal Order System** | One `orders` table for all order types |
| **Department Queues** | Filter orders by `order_type` + `status` |
| **Auto-Billing** | Orders create bill items on completion |
| **Audit Trail** | Every status change logged with who/when |
| **Service Catalog** | All billable items in `services` table |

---

## Next: Schema Refactor Steps

1. Add `orders` table (unified)
2. Add `order_items` table
3. Migrate existing `prescriptions` → orders (type=PHARMACY)
4. Migrate existing `lab_orders` → orders (type=LAB)
5. Update API endpoints
6. Update frontend to use new order system
