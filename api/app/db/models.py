from datetime import datetime, date, time
from typing import Optional
from sqlmodel import SQLModel, Field, Relationship
from enum import Enum
import uuid


# ─── Enums ────────────────────────────────────────────────────────────────────

class Gender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"

class BloodGroup(str, Enum):
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    O_POS = "O+"
    O_NEG = "O-"
    AB_POS = "AB+"
    AB_NEG = "AB-"

class AppointmentStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    CHECKED_IN = "CHECKED_IN"
    IN_QUEUE = "IN_QUEUE"
    WITH_DOCTOR = "WITH_DOCTOR"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"

class AppointmentType(str, Enum):
    WALK_IN = "WALK_IN"
    SCHEDULED = "SCHEDULED"
    EMERGENCY = "EMERGENCY"
    FOLLOW_UP = "FOLLOW_UP"
    TELECONSULT = "TELECONSULT"

class VisitType(str, Enum):
    NEW = "NEW"
    FOLLOW_UP = "FOLLOW_UP"
    EMERGENCY = "EMERGENCY"

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    DOCTOR = "DOCTOR"
    NURSE = "NURSE"
    RECEPTIONIST = "RECEPTIONIST"
    PHARMACIST = "PHARMACIST"
    LAB_TECHNICIAN = "LAB_TECHNICIAN"
    BILLING = "BILLING"

class BillingStatus(str, Enum):
    PENDING = "PENDING"
    PARTIAL = "PARTIAL"
    PAID = "PAID"
    WAIVED = "WAIVED"
    INSURANCE = "INSURANCE"

class PaymentMode(str, Enum):
    CASH = "CASH"
    UPI = "UPI"
    CARD = "CARD"
    NETBANKING = "NETBANKING"
    INSURANCE = "INSURANCE"
    AYUSHMAN = "AYUSHMAN"

class LabOrderStatus(str, Enum):
    ORDERED = "ORDERED"
    SAMPLE_COLLECTED = "SAMPLE_COLLECTED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class PrescriptionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    DISPENSED = "DISPENSED"
    PARTIALLY_DISPENSED = "PARTIALLY_DISPENSED"
    CANCELLED = "CANCELLED"

class QueueStatus(str, Enum):
    WAITING = "WAITING"
    CALLED = "CALLED"
    WITH_DOCTOR = "WITH_DOCTOR"
    DONE = "DONE"
    SKIPPED = "SKIPPED"

class WaitlistStatus(str, Enum):
    WAITING = "WAITING"
    NOTIFIED = "NOTIFIED"
    BOOKED = "BOOKED"
    EXPIRED = "EXPIRED"


# ─── Company (corporate billing accounts) ────────────────────────────────────

class Company(SQLModel, table=True):
    __tablename__ = "companies"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=200, unique=True)
    code: str = Field(max_length=20, unique=True)
    contact_person: Optional[str] = Field(default=None, max_length=150)
    contact_phone: Optional[str] = Field(default=None, max_length=15)
    billing_address: Optional[str] = None
    credit_limit: float = 0.0
    is_active: bool = True

    patients: list["Patient"] = Relationship(back_populates="company")


# ─── Department ───────────────────────────────────────────────────────────────

class Department(SQLModel, table=True):
    __tablename__ = "departments"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, unique=True)
    code: str = Field(max_length=10, unique=True)
    description: Optional[str] = None
    is_active: bool = True
    consultation_fee: float = 0.0
    follow_up_fee: Optional[float] = None   # None → use 30% of consultation_fee
    created_at: datetime = Field(default_factory=datetime.utcnow)

    doctors: list["Doctor"] = Relationship(back_populates="department")
    slots: list["DoctorSlot"] = Relationship(back_populates="department")


# ─── User / Staff ─────────────────────────────────────────────────────────────

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    employee_id: str = Field(max_length=20, unique=True)
    full_name: str = Field(max_length=150)
    email: str = Field(max_length=255, unique=True)
    phone: str = Field(max_length=15)
    password_hash: str
    role: UserRole
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

    doctor_profile: Optional["Doctor"] = Relationship(back_populates="user")


class Doctor(SQLModel, table=True):
    __tablename__ = "doctors"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True)
    department_id: int = Field(foreign_key="departments.id")
    registration_number: str = Field(max_length=50, unique=True)  # NMC number
    specialization: str = Field(max_length=100)
    qualification: str = Field(max_length=200)
    experience_years: int = 0
    consultation_fee: Optional[float] = None  # override dept fee if set
    max_patients_per_slot: int = 20
    avg_consultation_minutes: int = 10
    is_active: bool = True

    user: Optional[User] = Relationship(back_populates="doctor_profile")
    department: Optional[Department] = Relationship(back_populates="doctors")
    slots: list["DoctorSlot"] = Relationship(back_populates="doctor")
    appointments: list["Appointment"] = Relationship(back_populates="doctor")
    consultations: list["Consultation"] = Relationship(
        back_populates="doctor",
        sa_relationship_kwargs={"foreign_keys": "[Consultation.doctor_id]"},
    )


# ─── Doctor Slots ─────────────────────────────────────────────────────────────

class DoctorSlot(SQLModel, table=True):
    __tablename__ = "doctor_slots"

    id: Optional[int] = Field(default=None, primary_key=True)
    doctor_id: int = Field(foreign_key="doctors.id")
    department_id: int = Field(foreign_key="departments.id")
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: time
    end_time: time
    max_patients: int = 20
    is_active: bool = True

    doctor: Optional[Doctor] = Relationship(back_populates="slots")
    department: Optional[Department] = Relationship(back_populates="slots")


# ─── Patient ──────────────────────────────────────────────────────────────────

class Patient(SQLModel, table=True):
    __tablename__ = "patients"

    id: Optional[int] = Field(default=None, primary_key=True)
    uhid: str = Field(max_length=20, unique=True)  # Unique Hospital ID
    abha_id: Optional[str] = Field(default=None, max_length=17)  # XX-XXXX-XXXX-XXXX
    abha_address: Optional[str] = Field(default=None, max_length=100)  # user@abdm

    # Demographics
    first_name: str = Field(max_length=50)
    middle_name: Optional[str] = Field(default=None, max_length=50)
    last_name: str = Field(max_length=50)
    date_of_birth: date
    gender: Gender
    blood_group: Optional[BloodGroup] = None
    marital_status: Optional[str] = None
    religion: Optional[str] = None
    occupation: Optional[str] = None
    nationality: str = "Indian"

    # Contact
    phone: str = Field(max_length=15)
    alternate_phone: Optional[str] = Field(default=None, max_length=15)
    email: Optional[str] = Field(default=None, max_length=255)

    # Address
    address_line1: str
    address_line2: Optional[str] = None
    city: str = Field(max_length=100)
    district: str = Field(max_length=100)
    state: str = Field(max_length=100)
    pincode: str = Field(max_length=6)

    # Identity
    aadhaar_last4: Optional[str] = Field(default=None, max_length=4)
    pan_number: Optional[str] = Field(default=None, max_length=10)

    # Emergency Contact
    emergency_contact_name: Optional[str] = Field(default=None, max_length=150)
    emergency_contact_phone: Optional[str] = Field(default=None, max_length=15)
    emergency_contact_relation: Optional[str] = Field(default=None, max_length=50)

    # Insurance
    insurance_provider: Optional[str] = Field(default=None, max_length=100)
    insurance_policy_no: Optional[str] = Field(default=None, max_length=50)
    ayushman_card_no: Optional[str] = Field(default=None, max_length=20)

    # Corporate
    company_id: Optional[int] = Field(default=None, foreign_key="companies.id")

    # Preferences
    language_preference: str = Field(default="Hindi", max_length=50)
    interpreter_required: bool = False

    # Flags
    is_vip: bool = False
    is_active: bool = True
    registered_at: datetime = Field(default_factory=datetime.utcnow)
    registered_by: Optional[int] = Field(default=None, foreign_key="users.id")

    appointments: list["Appointment"] = Relationship(back_populates="patient")
    visits: list["Visit"] = Relationship(back_populates="patient")
    bills: list["Bill"] = Relationship(back_populates="patient")
    allergies: list["PatientAllergy"] = Relationship(back_populates="patient")
    waitlist_entries: list["Waitlist"] = Relationship(back_populates="patient")
    company: Optional["Company"] = Relationship(back_populates="patients")


class PatientAllergy(SQLModel, table=True):
    __tablename__ = "patient_allergies"

    id: Optional[int] = Field(default=None, primary_key=True)
    patient_id: int = Field(foreign_key="patients.id")
    allergen: str = Field(max_length=100)
    reaction: Optional[str] = Field(default=None, max_length=200)
    severity: str = Field(default="MILD", max_length=20)  # MILD, MODERATE, SEVERE

    patient: Optional[Patient] = Relationship(back_populates="allergies")


# ─── Appointment & Queue ──────────────────────────────────────────────────────

class Appointment(SQLModel, table=True):
    __tablename__ = "appointments"

    id: Optional[int] = Field(default=None, primary_key=True)
    appointment_no: str = Field(max_length=20, unique=True)
    patient_id: int = Field(foreign_key="patients.id")
    doctor_id: int = Field(foreign_key="doctors.id")
    department_id: int = Field(foreign_key="departments.id")

    appointment_date: date
    appointment_time: time
    appointment_type: AppointmentType = AppointmentType.WALK_IN
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    visit_type: VisitType = VisitType.NEW

    chief_complaint: Optional[str] = None
    token_number: Optional[int] = None
    priority: int = 0  # 0=normal, 1=urgent, 2=emergency

    parent_appointment_id: Optional[int] = Field(default=None, foreign_key="appointments.id")
    delay_minutes: Optional[int] = None

    booked_by: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    checked_in_at: Optional[datetime] = None
    called_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_reason: Optional[str] = None

    patient: Optional[Patient] = Relationship(back_populates="appointments")
    doctor: Optional[Doctor] = Relationship(back_populates="appointments")
    visit: Optional["Visit"] = Relationship(back_populates="appointment")


# ─── Visit (OPD Encounter) ────────────────────────────────────────────────────

class Visit(SQLModel, table=True):
    __tablename__ = "visits"

    id: Optional[int] = Field(default=None, primary_key=True)
    visit_no: str = Field(max_length=20, unique=True)
    patient_id: int = Field(foreign_key="patients.id")
    appointment_id: Optional[int] = Field(default=None, foreign_key="appointments.id")
    department_id: int = Field(foreign_key="departments.id")
    visit_date: date = Field(default_factory=date.today)
    visit_type: VisitType = VisitType.NEW
    created_at: datetime = Field(default_factory=datetime.utcnow)

    patient: Optional[Patient] = Relationship(back_populates="visits")
    appointment: Optional[Appointment] = Relationship(back_populates="visit")
    vitals: Optional["Vitals"] = Relationship(back_populates="visit")
    consultation: Optional["Consultation"] = Relationship(back_populates="visit")
    bill: Optional["Bill"] = Relationship(back_populates="visit")


# ─── Vitals ───────────────────────────────────────────────────────────────────

class Vitals(SQLModel, table=True):
    __tablename__ = "vitals"

    id: Optional[int] = Field(default=None, primary_key=True)
    visit_id: int = Field(foreign_key="visits.id", unique=True)
    patient_id: int = Field(foreign_key="patients.id")

    # Measurements
    temperature: Optional[float] = None          # Celsius
    pulse: Optional[int] = None                  # bpm
    respiratory_rate: Optional[int] = None       # breaths/min
    bp_systolic: Optional[int] = None            # mmHg
    bp_diastolic: Optional[int] = None           # mmHg
    spo2: Optional[float] = None                 # %
    weight: Optional[float] = None               # kg
    height: Optional[float] = None               # cm
    bmi: Optional[float] = None                  # auto-calculated
    blood_glucose: Optional[float] = None        # mg/dL
    pain_score: Optional[int] = None             # 0-10

    recorded_by: int = Field(foreign_key="users.id")
    recorded_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None

    visit: Optional[Visit] = Relationship(back_populates="vitals")


# ─── Consultation (Doctor's Notes) ────────────────────────────────────────────

class Consultation(SQLModel, table=True):
    __tablename__ = "consultations"

    id: Optional[int] = Field(default=None, primary_key=True)
    visit_id: int = Field(foreign_key="visits.id", unique=True)
    patient_id: int = Field(foreign_key="patients.id")
    doctor_id: int = Field(foreign_key="doctors.id")

    # SOAP Notes
    chief_complaint: str
    history_of_present_illness: Optional[str] = None
    past_medical_history: Optional[str] = None
    family_history: Optional[str] = None
    personal_history: Optional[str] = None       # smoking, alcohol, diet
    review_of_systems: Optional[str] = None

    # Examination
    general_examination: Optional[str] = None
    systemic_examination: Optional[str] = None

    # Assessment
    clinical_notes: Optional[str] = None
    advice: Optional[str] = None
    follow_up_days: Optional[int] = None
    follow_up_date: Optional[date] = None
    referred_to: Optional[str] = None
    referred_doctor: Optional[int] = Field(default=None, foreign_key="doctors.id")

    is_finalized: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    finalized_at: Optional[datetime] = None

    visit: Optional[Visit] = Relationship(back_populates="consultation")
    doctor: Optional[Doctor] = Relationship(
        back_populates="consultations",
        sa_relationship_kwargs={"foreign_keys": "[Consultation.doctor_id]"},
    )
    diagnoses: list["Diagnosis"] = Relationship(back_populates="consultation")
    prescriptions: list["Prescription"] = Relationship(back_populates="consultation")
    lab_orders: list["LabOrder"] = Relationship(back_populates="consultation")


class Diagnosis(SQLModel, table=True):
    __tablename__ = "diagnoses"

    id: Optional[int] = Field(default=None, primary_key=True)
    consultation_id: int = Field(foreign_key="consultations.id")
    icd10_code: str = Field(max_length=10)
    icd10_description: str = Field(max_length=255)
    is_primary: bool = False
    is_provisional: bool = True  # provisional until confirmed

    consultation: Optional[Consultation] = Relationship(back_populates="diagnoses")


# ─── Drug Master ──────────────────────────────────────────────────────────────

class Drug(SQLModel, table=True):
    __tablename__ = "drugs"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=200)             # Generic name
    brand_name: Optional[str] = Field(default=None, max_length=200)
    drug_class: Optional[str] = Field(default=None, max_length=100)
    formulation: str = Field(max_length=50)       # TAB, CAP, SYP, INJ, DROP, etc.
    strength: str = Field(max_length=50)          # 500mg, 5mg/5ml, etc.
    unit: str = Field(max_length=20)              # mg, ml, units
    is_narcotic: bool = False
    is_active: bool = True

    prescription_items: list["PrescriptionItem"] = Relationship(back_populates="drug")


# ─── Prescription ─────────────────────────────────────────────────────────────

class Prescription(SQLModel, table=True):
    __tablename__ = "prescriptions"

    id: Optional[int] = Field(default=None, primary_key=True)
    prescription_no: str = Field(max_length=20, unique=True)
    consultation_id: int = Field(foreign_key="consultations.id")
    patient_id: int = Field(foreign_key="patients.id")
    doctor_id: int = Field(foreign_key="doctors.id")
    status: PrescriptionStatus = PrescriptionStatus.ACTIVE
    created_at: datetime = Field(default_factory=datetime.utcnow)
    dispensed_at: Optional[datetime] = None
    notes: Optional[str] = None

    consultation: Optional[Consultation] = Relationship(back_populates="prescriptions")
    items: list["PrescriptionItem"] = Relationship(back_populates="prescription")


class PrescriptionItem(SQLModel, table=True):
    __tablename__ = "prescription_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    prescription_id: int = Field(foreign_key="prescriptions.id")
    drug_id: int = Field(foreign_key="drugs.id")
    drug_name: str = Field(max_length=200)        # denormalized for history
    dosage: str = Field(max_length=50)            # 500mg, 1 tab, 5ml
    frequency: str = Field(max_length=50)         # OD, BD, TDS, QID, SOS
    duration: str = Field(max_length=50)          # 5 days, 1 week, 1 month
    route: str = Field(max_length=30)             # Oral, IV, IM, Topical
    instructions: Optional[str] = Field(default=None, max_length=200)  # Before food, etc.
    quantity: int = 0

    prescription: Optional[Prescription] = Relationship(back_populates="items")
    drug: Optional[Drug] = Relationship(back_populates="prescription_items")


# ─── Lab Tests ────────────────────────────────────────────────────────────────

class LabTest(SQLModel, table=True):
    __tablename__ = "lab_tests"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=200)
    code: str = Field(max_length=20, unique=True)
    department: str = Field(max_length=50)        # Biochemistry, Haematology, etc.
    sample_type: str = Field(max_length=50)       # Blood, Urine, Stool, etc.
    normal_range: Optional[str] = Field(default=None, max_length=200)
    unit: Optional[str] = Field(default=None, max_length=20)
    turnaround_hours: int = 24
    price: float = 0.0
    is_active: bool = True


class LabOrder(SQLModel, table=True):
    __tablename__ = "lab_orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_no: str = Field(max_length=20, unique=True)
    consultation_id: int = Field(foreign_key="consultations.id")
    patient_id: int = Field(foreign_key="patients.id")
    ordered_by: int = Field(foreign_key="doctors.id")
    status: LabOrderStatus = LabOrderStatus.ORDERED
    priority: str = Field(default="ROUTINE", max_length=20)  # ROUTINE, URGENT, STAT
    clinical_notes: Optional[str] = None
    ordered_at: datetime = Field(default_factory=datetime.utcnow)
    collected_at: Optional[datetime] = None
    resulted_at: Optional[datetime] = None

    consultation: Optional[Consultation] = Relationship(back_populates="lab_orders")
    items: list["LabOrderItem"] = Relationship(back_populates="order")


class LabOrderItem(SQLModel, table=True):
    __tablename__ = "lab_order_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="lab_orders.id")
    test_id: int = Field(foreign_key="lab_tests.id")
    test_name: str = Field(max_length=200)
    result_value: Optional[str] = Field(default=None, max_length=500)
    result_unit: Optional[str] = Field(default=None, max_length=20)
    normal_range: Optional[str] = Field(default=None, max_length=200)
    is_abnormal: bool = False
    remarks: Optional[str] = None

    order: Optional[LabOrder] = Relationship(back_populates="items")


# ─── Billing ──────────────────────────────────────────────────────────────────

class Bill(SQLModel, table=True):
    __tablename__ = "bills"

    id: Optional[int] = Field(default=None, primary_key=True)
    bill_no: str = Field(max_length=20, unique=True)
    patient_id: int = Field(foreign_key="patients.id")
    visit_id: Optional[int] = Field(default=None, foreign_key="visits.id")
    bill_date: datetime = Field(default_factory=datetime.utcnow)

    subtotal: float = 0.0
    discount_amount: float = 0.0
    discount_percent: float = 0.0
    tax_amount: float = 0.0           # GST
    total_amount: float = 0.0
    paid_amount: float = 0.0
    due_amount: float = 0.0

    status: BillingStatus = BillingStatus.PENDING
    payment_mode: Optional[PaymentMode] = None
    insurance_claim_no: Optional[str] = Field(default=None, max_length=50)
    insurance_approved_amount: Optional[float] = None

    created_by: int = Field(foreign_key="users.id")
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None

    patient: Optional[Patient] = Relationship(back_populates="bills")
    visit: Optional[Visit] = Relationship(back_populates="bill")
    items: list["BillItem"] = Relationship(back_populates="bill")
    payments: list["Payment"] = Relationship(back_populates="bill")


class BillItem(SQLModel, table=True):
    __tablename__ = "bill_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    bill_id: int = Field(foreign_key="bills.id")
    service_name: str = Field(max_length=200)
    service_code: Optional[str] = Field(default=None, max_length=20)
    category: str = Field(max_length=50)          # CONSULTATION, LAB, PHARMACY, etc.
    quantity: int = 1
    unit_price: float = 0.0
    discount: float = 0.0
    gst_rate: float = 0.0
    gst_amount: float = 0.0
    total: float = 0.0

    bill: Optional[Bill] = Relationship(back_populates="items")


class Payment(SQLModel, table=True):
    __tablename__ = "payments"

    id: Optional[int] = Field(default=None, primary_key=True)
    bill_id: int = Field(foreign_key="bills.id")
    amount: float
    payment_mode: PaymentMode
    transaction_ref: Optional[str] = Field(default=None, max_length=100)
    paid_at: datetime = Field(default_factory=datetime.utcnow)
    received_by: int = Field(foreign_key="users.id")
    notes: Optional[str] = None

    bill: Optional[Bill] = Relationship(back_populates="payments")


# ─── ICD10 Master ─────────────────────────────────────────────────────────────

class ICD10(SQLModel, table=True):
    __tablename__ = "icd10_codes"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(max_length=10, unique=True)
    description: str = Field(max_length=500)
    category: str = Field(max_length=100)
    is_active: bool = True


# ─── Waitlist ─────────────────────────────────────────────────────────────────

class Waitlist(SQLModel, table=True):
    __tablename__ = "waitlist"

    id: Optional[int] = Field(default=None, primary_key=True)
    patient_id: int = Field(foreign_key="patients.id")
    doctor_id: int = Field(foreign_key="doctors.id")
    department_id: int = Field(foreign_key="departments.id")
    preferred_date: date
    status: WaitlistStatus = WaitlistStatus.WAITING
    position: int = 1
    notes: Optional[str] = None
    added_at: datetime = Field(default_factory=datetime.utcnow)
    notified_at: Optional[datetime] = None

    patient: Optional[Patient] = Relationship(back_populates="waitlist_entries")
