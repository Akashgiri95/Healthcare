# HIS System — Database Schema

> Complete table definitions. For overview, see `ARCHITECTURE.md`.

---

## Current Schema (What Exists Now)

### Users & Staff

```
┌─────────────────────────────────────────────────────────────┐
│ users                                                        │
├─────────────────────────────────────────────────────────────┤
│ id              INT PRIMARY KEY                             │
│ employee_id     VARCHAR(20) UNIQUE      "EMP001"            │
│ full_name       VARCHAR(150)            "Dr. Priya Mehta"   │
│ email           VARCHAR(255) UNIQUE     "dr.mehta@his.local"│
│ phone           VARCHAR(15)             "9876543210"        │
│ password_hash   VARCHAR                 (bcrypt hash)       │
│ role            ENUM                    ADMIN, DOCTOR,      │
│                                         NURSE, RECEPTIONIST,│
│                                         PHARMACIST,         │
│                                         LAB_TECHNICIAN,     │
│                                         BILLING             │
│ is_active       BOOLEAN                 TRUE                │
│ created_at      TIMESTAMP               auto                │
│ last_login      TIMESTAMP               nullable            │
└─────────────────────────────────────────────────────────────┘
        │
        │ 1:1 (only for DOCTOR role)
        ▼
┌─────────────────────────────────────────────────────────────┐
│ doctors                                                      │
├─────────────────────────────────────────────────────────────┤
│ id                  INT PRIMARY KEY                         │
│ user_id             FK → users (UNIQUE)                     │
│ department_id       FK → departments                        │
│ registration_number VARCHAR(50) UNIQUE   "MH/12345/2020"    │
│ specialization      VARCHAR(100)         "Internal Medicine"│
│ qualification       VARCHAR(200)         "MBBS, MD"         │
│ experience_years    INT                  15                 │
│ consultation_fee    DECIMAL              500.00 (nullable)  │
│ max_patients_slot   INT                  20                 │
│ avg_consult_mins    INT                  10                 │
│ is_active           BOOLEAN              TRUE               │
└─────────────────────────────────────────────────────────────┘
```

### Departments

```
┌─────────────────────────────────────────────────────────────┐
│ departments                                                  │
├─────────────────────────────────────────────────────────────┤
│ id                INT PRIMARY KEY                           │
│ name              VARCHAR(100) UNIQUE   "General Medicine"  │
│ code              VARCHAR(10) UNIQUE    "MED"               │
│ description       TEXT                  nullable            │
│ is_active         BOOLEAN               TRUE                │
│ consultation_fee  DECIMAL               500.00              │
│ follow_up_fee     DECIMAL               150.00 (nullable)   │
│ created_at        TIMESTAMP             auto                │
└─────────────────────────────────────────────────────────────┘
```

### Patients

```
┌─────────────────────────────────────────────────────────────┐
│ patients                                                     │
├─────────────────────────────────────────────────────────────┤
│ id                    INT PRIMARY KEY                       │
│ uhid                  VARCHAR(20) UNIQUE  "HIS2024000042"   │
│ abha_id               VARCHAR(17)         "12-3456-7890-1234"│
│ abha_address          VARCHAR(100)        "user@abdm"       │
│                                                             │
│ # Demographics                                              │
│ first_name            VARCHAR(50)         "Ramesh"          │
│ middle_name           VARCHAR(50)         nullable          │
│ last_name             VARCHAR(50)         "Kumar"           │
│ date_of_birth         DATE                "1985-03-15"      │
│ gender                ENUM                MALE, FEMALE,OTHER│
│ blood_group           ENUM                A+, A-, B+, etc.  │
│ marital_status        VARCHAR             nullable          │
│ occupation            VARCHAR             nullable          │
│ nationality           VARCHAR             "Indian"          │
│                                                             │
│ # Contact                                                   │
│ phone                 VARCHAR(15)         "9876543210"      │
│ alternate_phone       VARCHAR(15)         nullable          │
│ email                 VARCHAR(255)        nullable          │
│                                                             │
│ # Address                                                   │
│ address_line1         VARCHAR             required          │
│ address_line2         VARCHAR             nullable          │
│ city                  VARCHAR(100)        "Mumbai"          │
│ district              VARCHAR(100)        "Mumbai Suburban" │
│ state                 VARCHAR(100)        "Maharashtra"     │
│ pincode               VARCHAR(6)          "400001"          │
│                                                             │
│ # Identity                                                  │
│ aadhaar_last4         VARCHAR(4)          "1234"            │
│ pan_number            VARCHAR(10)         nullable          │
│                                                             │
│ # Emergency Contact                                         │
│ emergency_name        VARCHAR(150)        nullable          │
│ emergency_phone       VARCHAR(15)         nullable          │
│ emergency_relation    VARCHAR(50)         "Spouse"          │
│                                                             │
│ # Insurance                                                 │
│ insurance_provider    VARCHAR(100)        nullable          │
│ insurance_policy_no   VARCHAR(50)         nullable          │
│ ayushman_card_no      VARCHAR(20)         nullable          │
│ company_id            FK → companies      nullable          │
│                                                             │
│ # Flags                                                     │
│ is_vip                BOOLEAN             FALSE             │
│ is_active             BOOLEAN             TRUE              │
│ registered_at         TIMESTAMP           auto              │
│ registered_by         FK → users          nullable          │
└─────────────────────────────────────────────────────────────┘
        │
        │ 1:many
        ▼
┌─────────────────────────────────────────────────────────────┐
│ patient_allergies                                            │
├─────────────────────────────────────────────────────────────┤
│ id           INT PRIMARY KEY                                │
│ patient_id   FK → patients                                  │
│ allergen     VARCHAR(100)        "Penicillin"               │
│ reaction     VARCHAR(200)        "Rash, breathing issues"   │
│ severity     VARCHAR(20)         MILD, MODERATE, SEVERE     │
└─────────────────────────────────────────────────────────────┘
```

### Appointments & Visits

```
┌─────────────────────────────────────────────────────────────┐
│ appointments                                                 │
├─────────────────────────────────────────────────────────────┤
│ id                    INT PRIMARY KEY                       │
│ appointment_no        VARCHAR(20) UNIQUE  "APT202606110001" │
│ patient_id            FK → patients                         │
│ doctor_id             FK → doctors                          │
│ department_id         FK → departments                      │
│                                                             │
│ appointment_date      DATE                "2026-06-11"      │
│ appointment_time      TIME                "10:30:00"        │
│ appointment_type      ENUM                WALK_IN, SCHEDULED│
│                                           EMERGENCY,        │
│                                           FOLLOW_UP,        │
│                                           TELECONSULT       │
│ status                ENUM                SCHEDULED,        │
│                                           CHECKED_IN,       │
│                                           IN_QUEUE,         │
│                                           WITH_DOCTOR,      │
│                                           COMPLETED,        │
│                                           CANCELLED,        │
│                                           NO_SHOW           │
│ visit_type            ENUM                NEW, FOLLOW_UP,   │
│                                           EMERGENCY         │
│ chief_complaint       TEXT                nullable          │
│ token_number          INT                 3                 │
│ priority              INT                 0=normal, 1=urgent│
│                                                             │
│ booked_by             FK → users          nullable          │
│ created_at            TIMESTAMP           auto              │
│ checked_in_at         TIMESTAMP           nullable          │
│ completed_at          TIMESTAMP           nullable          │
│ cancelled_reason      TEXT                nullable          │
└─────────────────────────────────────────────────────────────┘
        │
        │ 1:1
        ▼
┌─────────────────────────────────────────────────────────────┐
│ visits                                                       │
├─────────────────────────────────────────────────────────────┤
│ id              INT PRIMARY KEY                             │
│ visit_no        VARCHAR(20) UNIQUE      "VIS202606110001"   │
│ patient_id      FK → patients                               │
│ appointment_id  FK → appointments (UNIQUE)                  │
│ department_id   FK → departments                            │
│ visit_date      DATE                    "2026-06-11"        │
│ visit_type      ENUM                    NEW, FOLLOW_UP,     │
│                                         EMERGENCY           │
│ created_at      TIMESTAMP               auto                │
└─────────────────────────────────────────────────────────────┘
```

### Clinical Records

```
┌─────────────────────────────────────────────────────────────┐
│ vitals                                                       │
├─────────────────────────────────────────────────────────────┤
│ id                INT PRIMARY KEY                           │
│ visit_id          FK → visits (UNIQUE)                      │
│ patient_id        FK → patients                             │
│                                                             │
│ temperature       DECIMAL               98.6 (Fahrenheit)   │
│ pulse             INT                   72 (bpm)            │
│ respiratory_rate  INT                   16 (breaths/min)    │
│ bp_systolic       INT                   120 (mmHg)          │
│ bp_diastolic      INT                   80 (mmHg)           │
│ spo2              DECIMAL               98 (%)              │
│ weight            DECIMAL               70 (kg)             │
│ height            DECIMAL               170 (cm)            │
│ bmi               DECIMAL               auto-calculated     │
│ blood_glucose     DECIMAL               110 (mg/dL)         │
│ pain_score        INT                   0-10 scale          │
│                                                             │
│ recorded_by       FK → users                                │
│ recorded_at       TIMESTAMP             auto                │
│ notes             TEXT                  nullable            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ consultations                                                │
├─────────────────────────────────────────────────────────────┤
│ id                       INT PRIMARY KEY                    │
│ consultation_no          VARCHAR         "CON202606110001"  │
│ visit_id                 FK → visits (UNIQUE)               │
│ patient_id               FK → patients                      │
│ doctor_id                FK → doctors                       │
│                                                             │
│ # SOAP Notes                                                │
│ chief_complaint          TEXT            required           │
│ history_present_illness  TEXT            nullable           │
│ past_medical_history     TEXT            nullable           │
│ family_history           TEXT            nullable           │
│ personal_history         TEXT            smoking, alcohol   │
│ review_of_systems        TEXT            nullable           │
│                                                             │
│ # Examination                                               │
│ general_examination      TEXT            nullable           │
│ systemic_examination     TEXT            nullable           │
│                                                             │
│ # Plan                                                      │
│ clinical_notes           TEXT            nullable           │
│ advice                   TEXT            nullable           │
│ follow_up_days           INT             nullable           │
│ follow_up_date           DATE            nullable           │
│ referred_to              VARCHAR         nullable           │
│ referred_doctor          FK → doctors    nullable           │
│                                                             │
│ is_finalized             BOOLEAN         FALSE              │
│ created_at               TIMESTAMP       auto               │
│ finalized_at             TIMESTAMP       nullable           │
└─────────────────────────────────────────────────────────────┘
        │
        │ 1:many
        ▼
┌─────────────────────────────────────────────────────────────┐
│ diagnoses                                                    │
├─────────────────────────────────────────────────────────────┤
│ id                INT PRIMARY KEY                           │
│ consultation_id   FK → consultations                        │
│ icd10_code        VARCHAR(10)           "E11.9"             │
│ icd10_description VARCHAR(255)          "Type 2 DM"         │
│ is_primary        BOOLEAN               TRUE/FALSE          │
│ is_provisional    BOOLEAN               TRUE                │
└─────────────────────────────────────────────────────────────┘
```

### Prescriptions

```
┌─────────────────────────────────────────────────────────────┐
│ prescriptions                                                │
├─────────────────────────────────────────────────────────────┤
│ id               INT PRIMARY KEY                            │
│ prescription_no  VARCHAR(20) UNIQUE    "RX202606110001"     │
│ consultation_id  FK → consultations                         │
│ patient_id       FK → patients                              │
│ doctor_id        FK → doctors                               │
│ status           ENUM                  ACTIVE, DISPENSED,   │
│                                        PARTIALLY_DISPENSED, │
│                                        CANCELLED            │
│ created_at       TIMESTAMP             auto                 │
│ dispensed_at     TIMESTAMP             nullable             │
│ notes            TEXT                  nullable             │
└─────────────────────────────────────────────────────────────┘
        │
        │ 1:many
        ▼
┌─────────────────────────────────────────────────────────────┐
│ prescription_items                                           │
├─────────────────────────────────────────────────────────────┤
│ id               INT PRIMARY KEY                            │
│ prescription_id  FK → prescriptions                         │
│ drug_id          FK → drugs                                 │
│ drug_name        VARCHAR(200)          "Metformin"          │
│ dosage           VARCHAR(50)           "500mg"              │
│ frequency        VARCHAR(50)           "BD" (twice daily)   │
│ duration         VARCHAR(50)           "30 days"            │
│ route            VARCHAR(30)           "Oral"               │
│ instructions     VARCHAR(200)          "After food"         │
│ quantity         INT                   60                   │
└─────────────────────────────────────────────────────────────┘
```

### Lab Orders

```
┌─────────────────────────────────────────────────────────────┐
│ lab_orders                                                   │
├─────────────────────────────────────────────────────────────┤
│ id               INT PRIMARY KEY                            │
│ order_no         VARCHAR(20) UNIQUE    "LAB202606110001"    │
│ consultation_id  FK → consultations                         │
│ patient_id       FK → patients                              │
│ ordered_by       FK → doctors                               │
│ status           ENUM                  ORDERED,             │
│                                        SAMPLE_COLLECTED,    │
│                                        PROCESSING,          │
│                                        COMPLETED,           │
│                                        CANCELLED            │
│ priority         VARCHAR(20)           ROUTINE, URGENT, STAT│
│ clinical_notes   TEXT                  nullable             │
│ ordered_at       TIMESTAMP             auto                 │
│ collected_at     TIMESTAMP             nullable             │
│ resulted_at      TIMESTAMP             nullable             │
└─────────────────────────────────────────────────────────────┘
        │
        │ 1:many
        ▼
┌─────────────────────────────────────────────────────────────┐
│ lab_order_items                                              │
├─────────────────────────────────────────────────────────────┤
│ id               INT PRIMARY KEY                            │
│ order_id         FK → lab_orders                            │
│ test_id          FK → lab_tests                             │
│ test_name        VARCHAR(200)          "HbA1c"              │
│ result_value     VARCHAR(500)          "6.5"                │
│ result_unit      VARCHAR(20)           "%"                  │
│ normal_range     VARCHAR(200)          "4.0-5.6"            │
│ is_abnormal      BOOLEAN               TRUE                 │
│ remarks          TEXT                  nullable             │
└─────────────────────────────────────────────────────────────┘
```

### Billing

```
┌─────────────────────────────────────────────────────────────┐
│ bills                                                        │
├─────────────────────────────────────────────────────────────┤
│ id                       INT PRIMARY KEY                    │
│ bill_no                  VARCHAR(20) UNIQUE "BILL20260611001│
│ patient_id               FK → patients                      │
│ visit_id                 FK → visits                        │
│ bill_date                TIMESTAMP         auto             │
│                                                             │
│ subtotal                 DECIMAL           1500.00          │
│ discount_amount          DECIMAL           0.00             │
│ discount_percent         DECIMAL           0.00             │
│ tax_amount               DECIMAL           75.00            │
│ total_amount             DECIMAL           1575.00          │
│ paid_amount              DECIMAL           0.00             │
│ due_amount               DECIMAL           1575.00          │
│                                                             │
│ status                   ENUM              PENDING, PARTIAL,│
│                                            PAID, WAIVED,    │
│                                            INSURANCE        │
│ payment_mode             ENUM              CASH, UPI, CARD, │
│                                            INSURANCE,       │
│                                            AYUSHMAN         │
│ insurance_claim_no       VARCHAR(50)       nullable         │
│ insurance_approved_amt   DECIMAL           nullable         │
│                                                             │
│ created_by               FK → users                         │
│ paid_at                  TIMESTAMP         nullable         │
│ notes                    TEXT              nullable         │
└─────────────────────────────────────────────────────────────┘
        │
        │ 1:many
        ▼
┌─────────────────────────────────────────────────────────────┐
│ bill_items                                                   │
├─────────────────────────────────────────────────────────────┤
│ id               INT PRIMARY KEY                            │
│ bill_id          FK → bills                                 │
│ service_name     VARCHAR(200)          "Consultation"       │
│ service_code     VARCHAR(20)           nullable             │
│ category         VARCHAR(50)           CONSULTATION, LAB,   │
│                                        PHARMACY, RADIOLOGY  │
│ quantity         INT                   1                    │
│ unit_price       DECIMAL               500.00               │
│ discount         DECIMAL               0.00                 │
│ gst_rate         DECIMAL               5.0                  │
│ gst_amount       DECIMAL               25.00                │
│ total            DECIMAL               525.00               │
└─────────────────────────────────────────────────────────────┘
```

### Master Tables

```
┌─────────────────────────────────────────────────────────────┐
│ drugs                                                        │
├─────────────────────────────────────────────────────────────┤
│ id           INT PRIMARY KEY                                │
│ name         VARCHAR(200)        "Metformin" (generic)      │
│ brand_name   VARCHAR(200)        "Glycomet" (optional)      │
│ drug_class   VARCHAR(100)        "Antidiabetic"             │
│ formulation  VARCHAR(50)         TAB, CAP, SYP, INJ, DROP   │
│ strength     VARCHAR(50)         "500mg"                    │
│ unit         VARCHAR(20)         "mg"                       │
│ is_narcotic  BOOLEAN             FALSE                      │
│ is_active    BOOLEAN             TRUE                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ lab_tests                                                    │
├─────────────────────────────────────────────────────────────┤
│ id               INT PRIMARY KEY                            │
│ name             VARCHAR(200)        "HbA1c"                │
│ code             VARCHAR(20) UNIQUE  "HBAC"                 │
│ department       VARCHAR(50)         "Biochemistry"         │
│ sample_type      VARCHAR(50)         "Blood"                │
│ normal_range     VARCHAR(200)        "4.0-5.6 %"            │
│ unit             VARCHAR(20)         "%"                    │
│ turnaround_hours INT                 24                     │
│ price            DECIMAL             450.00                 │
│ is_active        BOOLEAN             TRUE                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ icd10_codes                                                  │
├─────────────────────────────────────────────────────────────┤
│ id           INT PRIMARY KEY                                │
│ code         VARCHAR(10) UNIQUE  "E11.9"                    │
│ description  VARCHAR(500)        "Type 2 DM without complic"│
│ category     VARCHAR(100)        "Endocrine"                │
│ is_active    BOOLEAN             TRUE                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Target Schema (Scalable)

See `docs/FLOWS.md` for the unified Order system design.

### New Tables Needed

| Table | Purpose |
|-------|---------|
| `orders` | Unified orders (replaces separate prescription/lab_order) |
| `order_items` | Line items for any order type |
| `services` | Master catalog of all billable services |
| `imaging_exams` | Radiology exam master |
| `procedures` | Procedure master |
| `beds` | Bed inventory |
| `admissions` | IPD admissions |
| `nursing_notes` | Nursing documentation |

Schema details will be added here as we implement each module.
