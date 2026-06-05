"""
Run: python seed.py
Full demo seed — pre-fills patients, appointments (today + 30-day history),
visits, vitals, consultations, prescriptions, lab orders, and bills so the
demo looks live from the moment it starts.
"""
from sqlmodel import Session
from app.db.database import engine, create_db_and_tables
from app.db.models import (
    User, Doctor, Department, Patient, Drug, LabTest, ICD10,
    DoctorSlot, Company, Appointment, Visit, Vitals, Consultation,
    Prescription, PrescriptionItem, LabOrder, LabOrderItem,
    Bill, BillItem, Payment,
    UserRole, Gender, BloodGroup, AppointmentStatus, AppointmentType,
    VisitType, BillingStatus, PaymentMode, LabOrderStatus, PrescriptionStatus,
)
from app.core.security import hash_password
from datetime import date, time, datetime, timedelta
import random

TODAY = date.today()
NOW   = datetime.utcnow()


def d(days_ago: int) -> date:
    return TODAY - timedelta(days=days_ago)


def dt(days_ago: int, hour: int = 10, minute: int = 0) -> datetime:
    return datetime.combine(d(days_ago), time(hour, minute))


def appt_no(dt_: date, seq: int) -> str:
    return f"APT{dt_.strftime('%Y%m%d')}{seq:04d}"


def visit_no(dt_: date, seq: int) -> str:
    return f"VIS{dt_.strftime('%Y%m%d')}{seq:04d}"


def con_no(dt_: date, seq: int) -> str:
    return f"CON{dt_.strftime('%Y%m%d')}{seq:04d}"


def rx_no(dt_: date, seq: int) -> str:
    return f"RX{dt_.strftime('%Y%m%d')}{seq:04d}"


def lab_no(dt_: date, seq: int) -> str:
    return f"LAB{dt_.strftime('%Y%m%d')}{seq:04d}"


def bill_no(dt_: date, seq: int) -> str:
    return f"BILL{dt_.strftime('%Y%m%d')}{seq:04d}"


def seed():
    create_db_and_tables()

    with Session(engine) as s:

        # ── Departments ───────────────────────────────────────────────────────
        depts = [
            Department(name="General Medicine",  code="GM",    consultation_fee=500,  follow_up_fee=150, description="General OPD"),
            Department(name="Cardiology",         code="CARD",  consultation_fee=1000, follow_up_fee=300, description="Heart & Blood Vessels"),
            Department(name="Orthopaedics",       code="ORTHO", consultation_fee=800,  follow_up_fee=250, description="Bones & Joints"),
            Department(name="Gynaecology",        code="GYN",   consultation_fee=800,  follow_up_fee=250, description="Women's Health"),
            Department(name="Paediatrics",        code="PAED",  consultation_fee=600,  follow_up_fee=200, description="Children 0–18 years"),
            Department(name="ENT",                code="ENT",   consultation_fee=700,  follow_up_fee=200, description="Ear, Nose & Throat"),
            Department(name="Dermatology",        code="DERM",  consultation_fee=700,  follow_up_fee=200, description="Skin & Hair"),
            Department(name="Ophthalmology",      code="OPTH",  consultation_fee=700,  follow_up_fee=200, description="Eye Care"),
            Department(name="Neurology",          code="NEURO", consultation_fee=1200, follow_up_fee=400, description="Brain & Nervous System"),
            Department(name="Emergency",          code="EMRG",  consultation_fee=0,                      description="24×7 Emergency"),
        ]
        for d_ in depts:
            s.add(d_)
        s.commit()
        for d_ in depts:
            s.refresh(d_)

        # ── Staff users ───────────────────────────────────────────────────────
        admin = User(employee_id="EMP001", full_name="Admin User",    email="admin@his.local",      phone="9000000001", password_hash=hash_password("his@1234"), role=UserRole.ADMIN)
        recept= User(employee_id="EMP002", full_name="Priya Sharma",  email="reception@his.local",  phone="9000000002", password_hash=hash_password("his@1234"), role=UserRole.RECEPTIONIST)
        nurse = User(employee_id="EMP003", full_name="Sunita Devi",   email="nurse@his.local",      phone="9000000003", password_hash=hash_password("his@1234"), role=UserRole.NURSE)
        billing_u = User(employee_id="EMP004", full_name="Rajesh Gupta", email="billing@his.local", phone="9000000004", password_hash=hash_password("his@1234"), role=UserRole.BILLING)
        for u in [admin, recept, nurse, billing_u]:
            s.add(u)

        # ── Staff users (pharmacist + lab tech) ───────────────────────────────
        pharma_u = User(employee_id="EMP005", full_name="Mahesh Jain",    email="pharmacy@his.local",  phone="9000000005", password_hash=hash_password("his@1234"), role=UserRole.PHARMACIST)
        lab_u    = User(employee_id="EMP006", full_name="Anita Kulkarni", email="lab@his.local",       phone="9000000006", password_hash=hash_password("his@1234"), role=UserRole.LAB_TECHNICIAN)
        for u in [pharma_u, lab_u]:
            s.add(u)

        # ── Doctor users ──────────────────────────────────────────────────────
        doc_users = [
            User(employee_id="DOC001", full_name="Dr. Arvind Mehta",    email="dr.mehta@his.local",    phone="9000000010", password_hash=hash_password("his@1234"), role=UserRole.DOCTOR),
            User(employee_id="DOC002", full_name="Dr. Sneha Patel",     email="dr.patel@his.local",    phone="9000000011", password_hash=hash_password("his@1234"), role=UserRole.DOCTOR),
            User(employee_id="DOC003", full_name="Dr. Ramesh Iyer",     email="dr.iyer@his.local",     phone="9000000012", password_hash=hash_password("his@1234"), role=UserRole.DOCTOR),
            User(employee_id="DOC004", full_name="Dr. Kavitha Nair",    email="dr.nair@his.local",     phone="9000000013", password_hash=hash_password("his@1234"), role=UserRole.DOCTOR),
            User(employee_id="DOC005", full_name="Dr. Suresh Kumar",    email="dr.kumar@his.local",    phone="9000000014", password_hash=hash_password("his@1234"), role=UserRole.DOCTOR),
            User(employee_id="DOC006", full_name="Dr. Priya Menon",     email="dr.menon@his.local",    phone="9000000015", password_hash=hash_password("his@1234"), role=UserRole.DOCTOR),
            User(employee_id="DOC007", full_name="Dr. Rajesh Khanna",   email="dr.khanna@his.local",   phone="9000000016", password_hash=hash_password("his@1234"), role=UserRole.DOCTOR),
            User(employee_id="DOC008", full_name="Dr. Anita Desai",     email="dr.desai@his.local",    phone="9000000017", password_hash=hash_password("his@1234"), role=UserRole.DOCTOR),
            User(employee_id="DOC009", full_name="Dr. Vikram Joshi",    email="dr.joshi@his.local",    phone="9000000018", password_hash=hash_password("his@1234"), role=UserRole.DOCTOR),
        ]
        for u in doc_users:
            s.add(u)
        s.commit()
        for u in [admin, recept, nurse, billing_u, pharma_u, lab_u] + doc_users:
            s.refresh(u)

        # ── Doctor profiles ───────────────────────────────────────────────────
        # depts index: 0=GM, 1=Card, 2=Ortho, 3=Gyn, 4=Paed, 5=ENT, 6=Derm, 7=Opth, 8=Neuro, 9=Emrg
        doctors = [
            Doctor(user_id=doc_users[0].id, department_id=depts[0].id, registration_number="MCI12345", specialization="General Medicine",   qualification="MBBS, MD",                      experience_years=15),
            Doctor(user_id=doc_users[1].id, department_id=depts[1].id, registration_number="MCI12346", specialization="Cardiology",          qualification="MBBS, MD, DM Cardiology",        experience_years=12, consultation_fee=1200),
            Doctor(user_id=doc_users[2].id, department_id=depts[2].id, registration_number="MCI12347", specialization="Orthopaedics",        qualification="MBBS, MS Ortho",                 experience_years=10),
            Doctor(user_id=doc_users[3].id, department_id=depts[3].id, registration_number="MCI12348", specialization="Gynaecology",         qualification="MBBS, MS OBG",                   experience_years=14),
            Doctor(user_id=doc_users[4].id, department_id=depts[4].id, registration_number="MCI12349", specialization="Paediatrics",         qualification="MBBS, MD Paediatrics",           experience_years=8),
            Doctor(user_id=doc_users[5].id, department_id=depts[5].id, registration_number="MCI12350", specialization="ENT",                 qualification="MBBS, MS ENT",                   experience_years=9),
            Doctor(user_id=doc_users[6].id, department_id=depts[6].id, registration_number="MCI12351", specialization="Dermatology",         qualification="MBBS, MD Dermatology",           experience_years=11),
            Doctor(user_id=doc_users[7].id, department_id=depts[7].id, registration_number="MCI12352", specialization="Ophthalmology",       qualification="MBBS, MS Ophthalmology",         experience_years=13),
            Doctor(user_id=doc_users[8].id, department_id=depts[8].id, registration_number="MCI12353", specialization="Neurology",           qualification="MBBS, MD, DM Neurology",         experience_years=16, consultation_fee=1200),
        ]
        for doc in doctors:
            s.add(doc)
        s.commit()
        for doc in doctors:
            s.refresh(doc)

        # ── Doctor slots ──────────────────────────────────────────────────────
        slots = [
            # GM — Dr. Mehta (Mon-Sat morning + Mon/Wed/Fri evening)
            *[DoctorSlot(doctor_id=doctors[0].id, department_id=depts[0].id, day_of_week=d_, start_time=time(9,0),  end_time=time(13,0), max_patients=20) for d_ in range(6)],
            *[DoctorSlot(doctor_id=doctors[0].id, department_id=depts[0].id, day_of_week=d_, start_time=time(17,0), end_time=time(20,0), max_patients=15) for d_ in [0,2,4]],
            # Cardiology — Dr. Patel
            *[DoctorSlot(doctor_id=doctors[1].id, department_id=depts[1].id, day_of_week=d_, start_time=time(10,0), end_time=time(13,0), max_patients=15) for d_ in range(5)],
            *[DoctorSlot(doctor_id=doctors[1].id, department_id=depts[1].id, day_of_week=d_, start_time=time(16,0), end_time=time(19,0), max_patients=10) for d_ in [0,2]],
            # Ortho — Dr. Iyer
            *[DoctorSlot(doctor_id=doctors[2].id, department_id=depts[2].id, day_of_week=d_, start_time=time(9,0),  end_time=time(13,0), max_patients=20) for d_ in [0,2,4]],
            *[DoctorSlot(doctor_id=doctors[2].id, department_id=depts[2].id, day_of_week=d_, start_time=time(14,0), end_time=time(17,0), max_patients=15) for d_ in [1,3]],
            # Gynaecology — Dr. Nair
            *[DoctorSlot(doctor_id=doctors[3].id, department_id=depts[3].id, day_of_week=d_, start_time=time(9,0),  end_time=time(13,0), max_patients=20) for d_ in [1,3,5]],
            *[DoctorSlot(doctor_id=doctors[3].id, department_id=depts[3].id, day_of_week=d_, start_time=time(15,0), end_time=time(18,0), max_patients=15) for d_ in [0,2]],
            # Paediatrics — Dr. Kumar
            *[DoctorSlot(doctor_id=doctors[4].id, department_id=depts[4].id, day_of_week=d_, start_time=time(9,0),  end_time=time(12,0), max_patients=25) for d_ in range(6)],
            *[DoctorSlot(doctor_id=doctors[4].id, department_id=depts[4].id, day_of_week=d_, start_time=time(16,0), end_time=time(18,0), max_patients=15) for d_ in [1,3]],
            # ENT — Dr. Menon
            *[DoctorSlot(doctor_id=doctors[5].id, department_id=depts[5].id, day_of_week=d_, start_time=time(9,0),  end_time=time(13,0), max_patients=20) for d_ in range(6)],
            *[DoctorSlot(doctor_id=doctors[5].id, department_id=depts[5].id, day_of_week=d_, start_time=time(17,0), end_time=time(19,0), max_patients=10) for d_ in [1,3]],
            # Dermatology — Dr. Khanna
            *[DoctorSlot(doctor_id=doctors[6].id, department_id=depts[6].id, day_of_week=d_, start_time=time(10,0), end_time=time(14,0), max_patients=20) for d_ in range(6)],
            *[DoctorSlot(doctor_id=doctors[6].id, department_id=depts[6].id, day_of_week=d_, start_time=time(16,0), end_time=time(18,0), max_patients=15) for d_ in [0,2,4]],
            # Ophthalmology — Dr. Desai
            *[DoctorSlot(doctor_id=doctors[7].id, department_id=depts[7].id, day_of_week=d_, start_time=time(9,0),  end_time=time(13,0), max_patients=20) for d_ in [0,1,2,3,4]],
            *[DoctorSlot(doctor_id=doctors[7].id, department_id=depts[7].id, day_of_week=d_, start_time=time(15,0), end_time=time(18,0), max_patients=15) for d_ in [1,3]],
            # Neurology — Dr. Joshi
            *[DoctorSlot(doctor_id=doctors[8].id, department_id=depts[8].id, day_of_week=d_, start_time=time(10,0), end_time=time(13,0), max_patients=15) for d_ in range(5)],
            *[DoctorSlot(doctor_id=doctors[8].id, department_id=depts[8].id, day_of_week=d_, start_time=time(15,0), end_time=time(17,0), max_patients=10) for d_ in [0,2]],
        ]
        for sl in slots:
            s.add(sl)
        s.commit()

        # ── Companies ─────────────────────────────────────────────────────────
        companies = [
            Company(name="Adani Enterprises Ltd",  code="AEL", contact_person="HR Department",     contact_phone="9000100001", billing_address="Shantigram, Ahmedabad",  credit_limit=500000),
            Company(name="Gujarat Gas Limited",     code="GGL", contact_person="Medical Department",contact_phone="9000100002", billing_address="GIFT City, Gandhinagar", credit_limit=200000),
            Company(name="Torrent Pharmaceuticals", code="TORP",contact_person="Admin",             contact_phone="9000100003", billing_address="Ahmedabad",              credit_limit=300000),
        ]
        for c in companies:
            s.add(c)
        s.commit()
        for c in companies:
            s.refresh(c)

        # ── Patients (30 realistic Indian patients) ───────────────────────────
        patients_raw = [
            # (first, last, dob, gender, blood, phone, city, district, state, pin, addr, extras)
            ("Ramesh",    "Yadav",     date(1980,5,12),  "MALE",   "B+",  "9876543210", "Ahmedabad",   "Ahmedabad",   "Gujarat",     "380001", "12, Ashram Road",          {"language_preference":"Gujarati", "emergency_contact_name":"Geeta Yadav","emergency_contact_phone":"9876500001","emergency_contact_relation":"Spouse"}),
            ("Sunita",    "Patel",     date(1992,8,22),  "FEMALE", "O+",  "9876543211", "Surat",       "Surat",       "Gujarat",     "395001", "45, Ring Road",            {"language_preference":"Gujarati"}),
            ("Arun",      "Sharma",    date(1975,3,10),  "MALE",   "A+",  "9876543212", "Gandhinagar", "Gandhinagar", "Gujarat",     "382010", "8, Sector 11",             {"language_preference":"Hindi","company_id":companies[0].id}),
            ("Meena",     "Gupta",     date(1988,11,30), "FEMALE", "AB+", "9876543213", "Rajkot",      "Rajkot",      "Gujarat",     "360001", "22, University Road",      {"language_preference":"Hindi"}),
            ("Vikram",    "Singh",     date(1965,7,4),   "MALE",   "O-",  "9876543214", "Vadodara",    "Vadodara",    "Gujarat",     "390001", "101, Alkapuri",            {"language_preference":"Hindi","company_id":companies[0].id,"insurance_provider":"Star Health","insurance_policy_no":"SH20241234"}),
            ("Kavita",    "Joshi",     date(2005,1,18),  "FEMALE", None,  "9876543215", "Ahmedabad",   "Ahmedabad",   "Gujarat",     "380015", "7, Navrangpura",           {"language_preference":"Gujarati"}),
            ("Deepak",    "Mehta",     date(1958,9,25),  "MALE",   "B-",  "9876543216", "Anand",       "Anand",       "Gujarat",     "388001", "3, Market Road",           {"language_preference":"Gujarati","ayushman_card_no":"AB123456789","company_id":companies[1].id}),
            ("Asha",      "Reddy",     date(1995,4,14),  "FEMALE", "A-",  "9876543217", "Surat",       "Surat",       "Gujarat",     "395002", "88, Varachha Road",        {"language_preference":"Tamil","interpreter_required":True}),
            ("Mohan",     "Verma",     date(1972,12,8),  "MALE",   "AB-", "9876543218", "Bhavnagar",   "Bhavnagar",   "Gujarat",     "364001", "15, Station Road",         {"language_preference":"Hindi"}),
            ("Priya",     "Nair",      date(2010,6,20),  "FEMALE", None,  "9876543219", "Ahmedabad",   "Ahmedabad",   "Gujarat",     "380006", "56, CG Road",              {"language_preference":"Malayalam","interpreter_required":True}),
            ("Harish",    "Solanki",   date(1969,2,14),  "MALE",   "O+",  "9876543220", "Surat",       "Surat",       "Gujarat",     "395003", "12, Katargam",             {"language_preference":"Gujarati","emergency_contact_name":"Kamla Solanki","emergency_contact_phone":"9876500010","emergency_contact_relation":"Spouse"}),
            ("Geeta",     "Chauhan",   date(1983,7,7),   "FEMALE", "B+",  "9876543221", "Ahmedabad",   "Ahmedabad",   "Gujarat",     "380009", "33, Satellite Road",       {"language_preference":"Hindi","insurance_provider":"HDFC Ergo","insurance_policy_no":"HE20245678"}),
            ("Suresh",    "Prajapati", date(1977,10,19), "MALE",   "A+",  "9876543222", "Vadodara",    "Vadodara",    "Gujarat",     "390002", "7, Fatehgunj",             {"language_preference":"Gujarati","ayushman_card_no":"AB987654321"}),
            ("Lakshmi",   "Rao",       date(1999,3,25),  "FEMALE", "O+",  "9876543223", "Ahmedabad",   "Ahmedabad",   "Gujarat",     "380054", "14, Bopal",                {"language_preference":"Telugu"}),
            ("Dinesh",    "Panchal",   date(1961,11,11), "MALE",   "B+",  "9876543224", "Gandhinagar", "Gandhinagar", "Gujarat",     "382020", "2, Sector 21",             {"language_preference":"Gujarati","company_id":companies[2].id}),
            ("Rekha",     "Mishra",    date(1990,5,5),   "FEMALE", "A-",  "9876543225", "Surat",       "Surat",       "Gujarat",     "395004", "9, Adajan",                {"language_preference":"Hindi"}),
            ("Nilesh",    "Shah",      date(1973,8,30),  "MALE",   "AB+", "9876543226", "Ahmedabad",   "Ahmedabad",   "Gujarat",     "380007", "21, Navjivan",             {"language_preference":"Gujarati","insurance_provider":"New India Assurance","insurance_policy_no":"NIA20243456"}),
            ("Jyoti",     "Kumari",    date(2015,12,1),  "FEMALE", "O+",  "9876543227", "Rajkot",      "Rajkot",      "Gujarat",     "360004", "5, Kalawad Road",          {"language_preference":"Hindi"}),
            ("Bharat",    "Desai",     date(1955,4,22),  "MALE",   "B-",  "9876543228", "Junagadh",    "Junagadh",    "Gujarat",     "362001", "18, Dhal Road",            {"language_preference":"Gujarati","ayushman_card_no":"AB111222333"}),
            ("Manjula",   "Trivedi",   date(1968,9,9),   "FEMALE", "A+",  "9876543229", "Ahmedabad",   "Ahmedabad",   "Gujarat",     "380013", "44, Paldi",                {"language_preference":"Gujarati","emergency_contact_name":"Pratik Trivedi","emergency_contact_phone":"9876500020","emergency_contact_relation":"Spouse"}),
            ("Raju",      "Thakor",    date(1987,6,15),  "MALE",   "O+",  "9876543230", "Mehsana",     "Mehsana",     "Gujarat",     "384001", "6, Highway Road",          {"language_preference":"Gujarati"}),
            ("Sonal",     "Bhatt",     date(2001,1,28),  "FEMALE", "B+",  "9876543231", "Ahmedabad",   "Ahmedabad",   "Gujarat",     "380015", "11, Thaltej",              {"language_preference":"Gujarati"}),
            ("Prakash",   "Koli",      date(1963,7,3),   "MALE",   "A+",  "9876543232", "Rajkot",      "Rajkot",      "Gujarat",     "360002", "31, Gondal Road",          {"language_preference":"Gujarati","ayushman_card_no":"AB444555666"}),
            ("Hetal",     "Doshi",     date(1997,10,17), "FEMALE", "O-",  "9876543233", "Surat",       "Surat",       "Gujarat",     "395005", "25, Rander Road",          {"language_preference":"Gujarati"}),
            ("Manish",    "Rathod",    date(1980,2,20),  "MALE",   "B+",  "9876543234", "Vadodara",    "Vadodara",    "Gujarat",     "390015", "8, Gorwa",                 {"language_preference":"Hindi","company_id":companies[1].id}),
            ("Pooja",     "Agarwal",   date(1993,8,12),  "FEMALE", "A+",  "9876543235", "Ahmedabad",   "Ahmedabad",   "Gujarat",     "380052", "3, Prahlad Nagar",         {"language_preference":"Hindi","insurance_provider":"Bajaj Allianz","insurance_policy_no":"BA20247890"}),
            ("Naresh",    "Makwana",   date(1970,11,5),  "MALE",   "AB+", "9876543236", "Bhavnagar",   "Bhavnagar",   "Gujarat",     "364002", "7, Waghawadi Road",        {"language_preference":"Gujarati"}),
            ("Usha",      "Parmar",    date(1952,3,18),  "FEMALE", "O+",  "9876543237", "Gandhinagar", "Gandhinagar", "Gujarat",     "382011", "1, Sector 5",              {"language_preference":"Gujarati","ayushman_card_no":"AB777888999"}),
            ("Kiran",     "Baria",     date(2008,5,25),  "MALE",   "B+",  "9876543238", "Anand",       "Anand",       "Gujarat",     "388002", "14, Vitthal Udyognagar",   {"language_preference":"Gujarati"}),
            ("Falguni",   "Vora",      date(1985,9,8),   "FEMALE", "A-",  "9876543239", "Ahmedabad",   "Ahmedabad",   "Gujarat",     "380058", "9, Bodakdev",              {"language_preference":"Gujarati","insurance_provider":"Star Health","insurance_policy_no":"SH20249999"}),
        ]

        BG_MAP = {"A+":BloodGroup.A_POS,"A-":BloodGroup.A_NEG,"B+":BloodGroup.B_POS,"B-":BloodGroup.B_NEG,"O+":BloodGroup.O_POS,"O-":BloodGroup.O_NEG,"AB+":BloodGroup.AB_POS,"AB-":BloodGroup.AB_NEG}
        patients = []
        for i, (fn, ln, dob, gen, bg, ph, city, dist, st, pin, addr, extras) in enumerate(patients_raw):
            p = Patient(
                uhid=f"HIS2024{i+1:06d}",
                first_name=fn, last_name=ln, date_of_birth=dob,
                gender=Gender.MALE if gen=="MALE" else Gender.FEMALE,
                blood_group=BG_MAP.get(bg) if bg else None,
                phone=ph, city=city, district=dist, state=st, pincode=pin,
                address_line1=addr,
                **{k:v for k,v in extras.items() if k not in ("language_preference",)},
                language_preference=extras.get("language_preference","Hindi"),
            )
            s.add(p)
            patients.append(p)
        s.commit()
        for p in patients:
            s.refresh(p)

        # ── Drugs ─────────────────────────────────────────────────────────────
        drugs = [
            Drug(name="Paracetamol",       brand_name="Crocin",    formulation="TAB", strength="500mg",         unit="mg",  drug_class="Analgesic/Antipyretic"),
            Drug(name="Amoxicillin",       brand_name="Mox",       formulation="CAP", strength="500mg",         unit="mg",  drug_class="Antibiotic"),
            Drug(name="Azithromycin",      brand_name="Zithromax", formulation="TAB", strength="500mg",         unit="mg",  drug_class="Antibiotic"),
            Drug(name="Metformin",         brand_name="Glycomet",  formulation="TAB", strength="500mg",         unit="mg",  drug_class="Antidiabetic"),
            Drug(name="Amlodipine",        brand_name="Amlip",     formulation="TAB", strength="5mg",           unit="mg",  drug_class="Antihypertensive"),
            Drug(name="Atorvastatin",      brand_name="Atorva",    formulation="TAB", strength="10mg",          unit="mg",  drug_class="Statin"),
            Drug(name="Pantoprazole",      brand_name="Pan",       formulation="TAB", strength="40mg",          unit="mg",  drug_class="PPI"),
            Drug(name="Cetirizine",        brand_name="Alerid",    formulation="TAB", strength="10mg",          unit="mg",  drug_class="Antihistamine"),
            Drug(name="Ibuprofen",         brand_name="Brufen",    formulation="TAB", strength="400mg",         unit="mg",  drug_class="NSAID"),
            Drug(name="Omeprazole",        brand_name="Omez",      formulation="CAP", strength="20mg",          unit="mg",  drug_class="PPI"),
            Drug(name="Dolo 650",          brand_name="Dolo",      formulation="TAB", strength="650mg",         unit="mg",  drug_class="Analgesic"),
            Drug(name="Montelukast",       brand_name="Montair",   formulation="TAB", strength="10mg",          unit="mg",  drug_class="Leukotriene antagonist"),
            Drug(name="Salbutamol",        brand_name="Asthalin",  formulation="SYP", strength="2mg/5ml",       unit="ml",  drug_class="Bronchodilator"),
            Drug(name="Metronidazole",     brand_name="Flagyl",    formulation="TAB", strength="400mg",         unit="mg",  drug_class="Antiprotozoal"),
            Drug(name="Calcium + Vit D3",  brand_name="Shelcal",   formulation="TAB", strength="500mg+250IU",   unit="mg",  drug_class="Supplement"),
            Drug(name="Telmisartan",       brand_name="Telma",     formulation="TAB", strength="40mg",          unit="mg",  drug_class="Antihypertensive"),
            Drug(name="Glimepiride",       brand_name="Amaryl",    formulation="TAB", strength="2mg",           unit="mg",  drug_class="Antidiabetic"),
            Drug(name="Losartan",          brand_name="Cosart",    formulation="TAB", strength="50mg",          unit="mg",  drug_class="Antihypertensive"),
            Drug(name="Aspirin",           brand_name="Ecosprin",  formulation="TAB", strength="75mg",          unit="mg",  drug_class="Antiplatelet"),
            Drug(name="Clopidogrel",       brand_name="Plavix",    formulation="TAB", strength="75mg",          unit="mg",  drug_class="Antiplatelet"),
        ]
        for dr in drugs:
            s.add(dr)
        s.commit()
        for dr in drugs:
            s.refresh(dr)

        # ── Lab tests ─────────────────────────────────────────────────────────
        lab_tests = [
            LabTest(name="Complete Blood Count",     code="CBC",    department="Haematology",  sample_type="Blood", normal_range="See report",       price=250),
            LabTest(name="Blood Glucose Fasting",    code="FBS",    department="Biochemistry", sample_type="Blood", normal_range="70-100 mg/dL",     unit="mg/dL", price=80),
            LabTest(name="Blood Glucose PP",         code="PPBS",   department="Biochemistry", sample_type="Blood", normal_range="<140 mg/dL",       unit="mg/dL", price=80),
            LabTest(name="HbA1c",                    code="HBA1C",  department="Biochemistry", sample_type="Blood", normal_range="<5.7%",             unit="%",     price=350),
            LabTest(name="Lipid Profile",            code="LIPID",  department="Biochemistry", sample_type="Blood",                                               price=450),
            LabTest(name="Liver Function Test",      code="LFT",    department="Biochemistry", sample_type="Blood",                                               price=500),
            LabTest(name="Kidney Function Test",     code="KFT",    department="Biochemistry", sample_type="Blood",                                               price=450),
            LabTest(name="Thyroid Profile (TSH)",    code="TSH",    department="Endocrinology",sample_type="Blood", normal_range="0.4-4.0 mIU/L",   unit="mIU/L", price=350),
            LabTest(name="Urine Routine",            code="URINE",  department="Microbiology", sample_type="Urine",                                               price=100),
            LabTest(name="ECG",                      code="ECG",    department="Cardiology",   sample_type="Non-invasive",                                        price=200),
            LabTest(name="Chest X-Ray PA View",      code="CXRPA",  department="Radiology",    sample_type="Non-invasive",                                        price=400),
            LabTest(name="Dengue NS1 Antigen",       code="DENGUE", department="Serology",     sample_type="Blood",                                               price=600),
            LabTest(name="Malaria Antigen",          code="MALARIA",department="Serology",     sample_type="Blood",                                               price=300),
            LabTest(name="Serum Creatinine",         code="CREAT",  department="Biochemistry", sample_type="Blood", normal_range="0.7-1.3 mg/dL",   unit="mg/dL", price=120),
            LabTest(name="2D Echocardiography",      code="ECHO",   department="Cardiology",   sample_type="Non-invasive",                                        price=1800),
            LabTest(name="Vitamin D Total",          code="VITD",   department="Biochemistry", sample_type="Blood", normal_range="30-100 ng/mL",     unit="ng/mL", price=800),
        ]
        for lt in lab_tests:
            s.add(lt)
        s.commit()
        for lt in lab_tests:
            s.refresh(lt)

        # ── ICD-10 codes ──────────────────────────────────────────────────────
        icd10_codes = [
            ICD10(code="J06.9",  description="Acute upper respiratory infection, unspecified",         category="Respiratory"),
            ICD10(code="J18.9",  description="Pneumonia, unspecified",                                 category="Respiratory"),
            ICD10(code="E11.9",  description="Type 2 diabetes mellitus without complications",         category="Endocrine"),
            ICD10(code="I10",    description="Essential (primary) hypertension",                       category="Circulatory"),
            ICD10(code="K21.0",  description="Gastro-oesophageal reflux disease with oesophagitis",   category="Digestive"),
            ICD10(code="M54.5",  description="Low back pain",                                          category="Musculoskeletal"),
            ICD10(code="J45.9",  description="Asthma, unspecified",                                    category="Respiratory"),
            ICD10(code="A90",    description="Dengue fever",                                           category="Infectious"),
            ICD10(code="B54",    description="Unspecified malaria",                                    category="Infectious"),
            ICD10(code="K29.7",  description="Gastritis, unspecified",                                 category="Digestive"),
            ICD10(code="N39.0",  description="Urinary tract infection, site not specified",            category="Genitourinary"),
            ICD10(code="I25.9",  description="Chronic ischaemic heart disease, unspecified",           category="Circulatory"),
            ICD10(code="E78.5",  description="Hyperlipidaemia, unspecified",                           category="Endocrine"),
            ICD10(code="J00",    description="Acute nasopharyngitis (common cold)",                    category="Respiratory"),
            ICD10(code="R51",    description="Headache",                                               category="Symptoms"),
            ICD10(code="R05",    description="Cough",                                                  category="Symptoms"),
            ICD10(code="R50.9",  description="Fever, unspecified",                                     category="Symptoms"),
            ICD10(code="K59.0",  description="Constipation",                                           category="Digestive"),
            ICD10(code="A09",    description="Diarrhoea and gastroenteritis",                          category="Infectious"),
            ICD10(code="L20.9",  description="Atopic dermatitis, unspecified",                         category="Skin"),
            ICD10(code="I50.9",  description="Heart failure, unspecified",                             category="Circulatory"),
            ICD10(code="M17.9",  description="Osteoarthritis of knee, unspecified",                    category="Musculoskeletal"),
            ICD10(code="H52.1",  description="Myopia",                                                 category="Eye"),
            ICD10(code="J30.9",  description="Allergic rhinitis, unspecified",                         category="Respiratory"),
            ICD10(code="F32.9",  description="Depressive episode, unspecified",                        category="Mental Health"),
        ]
        for ic in icd10_codes:
            s.add(ic)
        s.commit()

        # ══════════════════════════════════════════════════════════════════════
        #  HISTORICAL APPOINTMENTS (past 30 days)
        # ══════════════════════════════════════════════════════════════════════
        appt_seq   = {}   # date → counter
        visit_seq  = {}
        con_seq    = {}
        rx_seq     = {}
        lab_seq    = {}
        bill_seq   = {}

        def next_seq(d_map, key):
            d_map[key] = d_map.get(key, 0) + 1
            return d_map[key]

        # Complaints, SOAP snippets
        complaints = [
            "Fever and body ache since 3 days",
            "Persistent cough for 1 week",
            "Chest pain on exertion",
            "Knee pain — difficulty walking",
            "High blood sugar — routine follow-up",
            "Hypertension — monthly review",
            "Skin rash on arms since 4 days",
            "Ear pain and discharge",
            "Lower back pain",
            "Headache and dizziness",
            "Stomach pain after meals",
            "Breathlessness on climbing stairs",
            "Irregular periods",
            "Eye redness and itching",
            "Child — fever and cold",
        ]

        past_appts = []
        for days_ago in range(1, 31):
            ap_date = d(days_ago)
            # 4–8 appointments per past day spread across doctors
            n = random.randint(4, 8)
            for k in range(n):
                doc = random.choice(doctors)
                pat = random.choice(patients[:20])  # first 20 for history
                tok = next_seq(appt_seq, ap_date)
                complaint = random.choice(complaints)
                # Mostly completed, some cancelled/no-show
                status_choice = random.choices(
                    [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
                    weights=[80, 15, 5], k=1
                )[0]
                ap = Appointment(
                    appointment_no=appt_no(ap_date, tok),
                    patient_id=pat.id,
                    doctor_id=doc.id,
                    department_id=doc.department_id,
                    appointment_date=ap_date,
                    appointment_time=time(9 + (k % 6), [0,15,30,45][k%4]),
                    appointment_type=AppointmentType.WALK_IN if k % 3 == 0 else AppointmentType.SCHEDULED,
                    visit_type=VisitType.NEW if days_ago > 7 else VisitType.FOLLOW_UP,
                    status=status_choice,
                    chief_complaint=complaint,
                    token_number=tok,
                    booked_by=recept.id,
                    created_at=dt(days_ago, 8),
                    checked_in_at=dt(days_ago, 9) if status_choice != AppointmentStatus.CANCELLED else None,
                    completed_at=dt(days_ago, 11) if status_choice == AppointmentStatus.COMPLETED else None,
                )
                s.add(ap)
                past_appts.append((ap, pat, doc, ap_date, days_ago, complaint, status_choice))
        s.commit()
        for ap, *_ in past_appts:
            s.refresh(ap)

        # Visits + vitals + consultations for completed past appointments
        completed_past = [(ap,pat,doc,ap_date,da,cc,st) for ap,pat,doc,ap_date,da,cc,st in past_appts if st == AppointmentStatus.COMPLETED]
        for i, (ap, pat, doc, ap_date, da, cc, st) in enumerate(completed_past[:40]):  # limit to 40
            vseq = next_seq(visit_seq, ap_date)
            v = Visit(
                visit_no=visit_no(ap_date, vseq),
                patient_id=pat.id,
                appointment_id=ap.id,
                department_id=doc.department_id,
                visit_date=ap_date,
                visit_type=ap.visit_type,
                created_at=dt(da, 9),
            )
            s.add(v)
            s.commit()
            s.refresh(v)

            vit = Vitals(
                visit_id=v.id, patient_id=pat.id,
                temperature=round(random.uniform(97.0, 101.5), 1),
                pulse=random.randint(68, 95),
                respiratory_rate=random.randint(14, 20),
                bp_systolic=random.randint(110, 145),
                bp_diastolic=random.randint(70, 95),
                spo2=round(random.uniform(96.0, 99.5), 1),
                weight=round(random.uniform(48, 95), 1),
                height=round(random.uniform(152, 182), 1),
                recorded_by=nurse.id,
                recorded_at=dt(da, 9, 30),
            )
            vit.bmi = round(vit.weight / ((vit.height/100)**2), 1)
            s.add(vit)
            s.commit()

            cseq = next_seq(con_seq, ap_date)
            con = Consultation(
                consultation_no=con_no(ap_date, cseq),
                visit_id=v.id, patient_id=pat.id, doctor_id=doc.id,
                chief_complaint=cc,
                history_of_present_illness=f"Patient presents with {cc.lower()}. Symptoms started a few days ago with gradual progression.",
                general_examination="Patient is conscious, cooperative and well-oriented. No acute distress.",
                clinical_notes="Examination findings consistent with presenting complaint. Vitals stable.",
                advice="Rest, adequate hydration. Avoid spicy food. Follow up if symptoms worsen.",
                follow_up_days=14,
                follow_up_date=ap_date + timedelta(days=14),
                is_finalized=True,
                created_at=dt(da, 10),
                finalized_at=dt(da, 10, 30),
            )
            s.add(con)
            s.commit()
            s.refresh(con)

            # Prescription for most
            if i % 3 != 0:
                rseq = next_seq(rx_seq, ap_date)
                rx = Prescription(
                    prescription_no=rx_no(ap_date, rseq),
                    consultation_id=con.id, patient_id=pat.id, doctor_id=doc.id,
                    status=PrescriptionStatus.DISPENSED,
                    created_at=dt(da, 10, 30),
                    dispensed_at=dt(da, 11),
                )
                s.add(rx)
                s.commit()
                s.refresh(rx)
                drug_pick = random.sample(drugs[:12], k=random.randint(2, 4))
                for dr in drug_pick:
                    s.add(PrescriptionItem(
                        prescription_id=rx.id, drug_id=dr.id, drug_name=dr.name,
                        dosage="1 tab", frequency=random.choice(["OD","BD","TDS"]),
                        duration=random.choice(["5 days","7 days","1 month"]),
                        route="Oral",
                        instructions=random.choice(["After food","Before food","With warm water",None]),
                        quantity=random.randint(5, 30),
                    ))
                s.commit()

            # Bill for all past completed
            bseq = next_seq(bill_seq, ap_date)
            fee = doc.consultation_fee or 500
            bill = Bill(
                bill_no=bill_no(ap_date, bseq),
                patient_id=pat.id, visit_id=v.id,
                bill_date=dt(da, 11),
                subtotal=float(fee),
                total_amount=float(fee),
                paid_amount=float(fee),
                due_amount=0.0,
                status=BillingStatus.PAID,
                payment_mode=random.choice([PaymentMode.CASH, PaymentMode.UPI, PaymentMode.CARD]),
                created_by=billing_u.id,
                paid_at=dt(da, 11, 15),
            )
            s.add(bill)
            s.commit()
            s.refresh(bill)
            s.add(BillItem(bill_id=bill.id, service_name="Consultation Fee", service_code="CONS", category="CONSULTATION", quantity=1))
            s.add(Payment(
                bill_id=bill.id, amount=float(fee),
                payment_mode=bill.payment_mode,
                transaction_ref=f"TXN{ap_date.strftime('%Y%m%d')}{bseq:04d}",
                received_by=billing_u.id,
                paid_at=dt(da, 11, 15),
            ))
            s.commit()

        # ══════════════════════════════════════════════════════════════════════
        #  TODAY'S APPOINTMENTS — pre-staged for a live demo
        # ══════════════════════════════════════════════════════════════════════
        # Dr. Mehta (GM) — busiest OPD, all statuses represented
        mehta_schedule = [
            # (patient_idx, token, time_h, time_m, status, complaint, visit+vitals+consult)
            (0,  1,  9,  0,  AppointmentStatus.COMPLETED,   "Fever and body ache since 3 days",     True),
            (1,  2,  9, 15,  AppointmentStatus.COMPLETED,   "Cough and cold for 5 days",            True),
            (2,  3,  9, 30,  AppointmentStatus.COMPLETED,   "Hypertension — monthly review",        True),
            (3,  4,  9, 45,  AppointmentStatus.WITH_DOCTOR, "Stomach pain and acidity",             True),  # vitals only
            (4,  5, 10,  0,  AppointmentStatus.IN_QUEUE,    "Headache and dizziness",               True),  # vitals only
            (5,  6, 10, 15,  AppointmentStatus.CHECKED_IN,  "Skin rash on forearms",                False),
            (6,  7, 10, 30,  AppointmentStatus.SCHEDULED,   "Follow-up — diabetes",                 False),
            (7,  8, 11,  0,  AppointmentStatus.SCHEDULED,   "Knee pain and swelling",               False),
        ]

        # Dr. Patel (Cardiology)
        patel_schedule = [
            (8,  1,  10,  0, AppointmentStatus.COMPLETED,   "Chest pain — follow-up post angioplasty", True),
            (9,  2,  10, 15, AppointmentStatus.WITH_DOCTOR, "Palpitations and breathlessness",          True),
            (10, 3,  10, 30, AppointmentStatus.IN_QUEUE,    "ECG and review",                           True),
            (11, 4,  11,  0, AppointmentStatus.SCHEDULED,   "Routine cardiac check-up",                 False),
        ]

        # Dr. Kumar (Paediatrics)
        kumar_schedule = [
            (12, 1,  9,  0, AppointmentStatus.COMPLETED,   "Child — fever since 2 days",              True),
            (13, 2,  9, 30, AppointmentStatus.CHECKED_IN,  "Child — cough and running nose",          False),
            (14, 3, 10,  0, AppointmentStatus.SCHEDULED,   "Vaccination and growth check",             False),
        ]

        # Dr. Nair (Gynaecology)
        nair_schedule = [
            (15, 1,  9,  0, AppointmentStatus.COMPLETED,   "Irregular menstrual cycle",               True),
            (16, 2,  9, 30, AppointmentStatus.SCHEDULED,   "Antenatal check-up — 28 weeks",           False),
        ]

        # Dr. Menon (ENT)
        menon_schedule = [
            (17, 1,  9,  0, AppointmentStatus.COMPLETED,   "Ear pain and discharge since 3 days",     True),
            (18, 2,  9, 30, AppointmentStatus.WITH_DOCTOR, "Throat pain and difficulty swallowing",   True),
            (19, 3, 10,  0, AppointmentStatus.IN_QUEUE,    "Nasal congestion and sneezing",            True),
            (20, 4, 10, 30, AppointmentStatus.SCHEDULED,   "Hearing difficulty — left ear",            False),
        ]

        # Dr. Khanna (Dermatology)
        khanna_schedule = [
            (21, 1, 10,  0, AppointmentStatus.COMPLETED,   "Skin rash and itching on arms",           True),
            (22, 2, 10, 30, AppointmentStatus.WITH_DOCTOR, "Acne and pigmentation on face",           True),
            (23, 3, 11,  0, AppointmentStatus.IN_QUEUE,    "Hair fall — excessive over 2 months",     True),
            (24, 4, 11, 30, AppointmentStatus.SCHEDULED,   "Psoriasis follow-up",                     False),
            (25, 5, 12,  0, AppointmentStatus.SCHEDULED,   "Fungal infection on scalp",               False),
        ]

        # Dr. Desai (Ophthalmology)
        desai_schedule = [
            (26, 1,  9,  0, AppointmentStatus.COMPLETED,   "Eye redness and watering",                True),
            (27, 2,  9, 30, AppointmentStatus.CHECKED_IN,  "Blurred vision — progressive",            False),
            (28, 3, 10,  0, AppointmentStatus.SCHEDULED,   "Routine eye check — glasses update",      False),
        ]

        # Dr. Joshi (Neurology)
        joshi_schedule = [
            (29, 1, 10,  0, AppointmentStatus.COMPLETED,   "Severe migraine — recurring",             True),
            (0,  2, 10, 30, AppointmentStatus.WITH_DOCTOR, "Numbness in hands and feet",              True),
            (1,  3, 11,  0, AppointmentStatus.SCHEDULED,   "Epilepsy — medication review",            False),
        ]

        all_today = [
            (doctors[0], depts[0], mehta_schedule),
            (doctors[1], depts[1], patel_schedule),
            (doctors[4], depts[4], kumar_schedule),
            (doctors[3], depts[3], nair_schedule),
            (doctors[5], depts[5], menon_schedule),
            (doctors[6], depts[6], khanna_schedule),
            (doctors[7], depts[7], desai_schedule),
            (doctors[8], depts[8], joshi_schedule),
        ]

        # Map status → minutes offset from appointment time for timestamps
        def status_times(status, base_h, base_m, days_ago=0):
            base = datetime.combine(TODAY, time(base_h, base_m))
            checkin = base + timedelta(minutes=5)  if status != AppointmentStatus.SCHEDULED else None
            completed = base + timedelta(minutes=40) if status == AppointmentStatus.COMPLETED else None
            return checkin, completed

        today_appts_meta = []  # for creating visits

        for doc, dept, schedule in all_today:
            for (pat_idx, token, th, tm, status, complaint, make_visit) in schedule:
                pat = patients[pat_idx]
                checkin_at, completed_at = status_times(status, th, tm)
                ap = Appointment(
                    appointment_no=appt_no(TODAY, next_seq(appt_seq, TODAY)),
                    patient_id=pat.id,
                    doctor_id=doc.id,
                    department_id=dept.id,
                    appointment_date=TODAY,
                    appointment_time=time(th, tm),
                    appointment_type=AppointmentType.WALK_IN if token <= 3 else AppointmentType.SCHEDULED,
                    visit_type=VisitType.FOLLOW_UP if "follow" in complaint.lower() or "review" in complaint.lower() or "monthly" in complaint.lower() else VisitType.NEW,
                    status=status,
                    chief_complaint=complaint,
                    token_number=token,
                    booked_by=recept.id,
                    created_at=datetime.combine(TODAY, time(8, 0)),
                    checked_in_at=checkin_at,
                    completed_at=completed_at,
                )
                s.add(ap)
                s.commit()
                s.refresh(ap)
                today_appts_meta.append((ap, pat, doc, dept, status, complaint, make_visit, th, tm))

        # Visits + vitals + consultations for today's checked-in/completed/in-queue/with-doctor
        for ap, pat, doc, dept, status, complaint, make_visit, th, tm in today_appts_meta:
            if not make_visit:
                continue

            vseq = next_seq(visit_seq, TODAY)
            v = Visit(
                visit_no=visit_no(TODAY, vseq),
                patient_id=pat.id,
                appointment_id=ap.id,
                department_id=dept.id,
                visit_date=TODAY,
                visit_type=ap.visit_type,
                created_at=datetime.combine(TODAY, time(th, tm + 5)),
            )
            s.add(v)
            s.commit()
            s.refresh(v)

            needs_vitals = status in (AppointmentStatus.COMPLETED, AppointmentStatus.WITH_DOCTOR,
                                      AppointmentStatus.IN_QUEUE)
            if needs_vitals:
                vit = Vitals(
                    visit_id=v.id, patient_id=pat.id,
                    temperature=round(random.uniform(97.5, 101.0), 1),
                    pulse=random.randint(70, 95),
                    respiratory_rate=random.randint(14, 20),
                    bp_systolic=random.randint(110, 145),
                    bp_diastolic=random.randint(70, 92),
                    spo2=round(random.uniform(96.5, 99.5), 1),
                    weight=round(random.uniform(50, 90), 1),
                    height=round(random.uniform(155, 180), 1),
                    recorded_by=nurse.id,
                    recorded_at=datetime.combine(TODAY, time(th, tm + 15)),
                )
                vit.bmi = round(vit.weight / ((vit.height/100)**2), 1)
                s.add(vit)
                s.commit()

            if status == AppointmentStatus.COMPLETED:
                cseq = next_seq(con_seq, TODAY)
                con = Consultation(
                    consultation_no=con_no(TODAY, cseq),
                    visit_id=v.id, patient_id=pat.id, doctor_id=doc.id,
                    chief_complaint=complaint,
                    history_of_present_illness=f"Patient presents with {complaint.lower()}. Onset gradual over the past few days.",
                    past_medical_history="No significant past history" if pat_idx % 3 == 0 else "Known case of hypertension, on medications.",
                    general_examination="Patient is conscious, alert and well-oriented. No pallor, icterus, cyanosis or oedema.",
                    systemic_examination="Cardiovascular: S1 S2 heard, no murmur. Respiratory: Air entry bilaterally equal. Abdomen: Soft, non-tender.",
                    clinical_notes="Assessment consistent with clinical presentation. Vitals stable. Management as per standard protocol.",
                    advice="Take medications as prescribed. Plenty of fluids. Rest. Follow up in 2 weeks or earlier if symptoms worsen.",
                    follow_up_days=14,
                    follow_up_date=TODAY + timedelta(days=14),
                    is_finalized=True,
                    created_at=datetime.combine(TODAY, time(th, tm + 20)),
                    finalized_at=datetime.combine(TODAY, time(th, tm + 40)),
                )
                s.add(con)
                s.commit()
                s.refresh(con)

                # Prescription
                rseq = next_seq(rx_seq, TODAY)
                rx = Prescription(
                    prescription_no=rx_no(TODAY, rseq),
                    consultation_id=con.id, patient_id=pat.id, doctor_id=doc.id,
                    status=PrescriptionStatus.ACTIVE,
                    created_at=datetime.combine(TODAY, time(th, tm + 40)),
                )
                s.add(rx)
                s.commit()
                s.refresh(rx)

                drug_pick = random.sample(drugs[:15], k=random.randint(2, 4))
                for dr in drug_pick:
                    s.add(PrescriptionItem(
                        prescription_id=rx.id, drug_id=dr.id, drug_name=dr.name,
                        dosage="1 tab", frequency=random.choice(["OD","BD","TDS"]),
                        duration=random.choice(["5 days","7 days","1 month"]),
                        route="Oral",
                        instructions=random.choice(["After food","Before food","With warm water",None]),
                        quantity=random.randint(5, 30),
                    ))
                s.commit()

                # Bill (pending — not yet paid today)
                bseq = next_seq(bill_seq, TODAY)
                fee = doc.consultation_fee or 500
                bill = Bill(
                    bill_no=bill_no(TODAY, bseq),
                    patient_id=pat.id, visit_id=v.id,
                    bill_date=datetime.combine(TODAY, time(th, tm + 45)),
                    subtotal=float(fee),
                    total_amount=float(fee),
                    paid_amount=0.0,
                    due_amount=float(fee),
                    status=BillingStatus.PENDING,
                    created_by=billing_u.id,
                )
                s.add(bill)
                s.commit()
                s.refresh(bill)
                s.add(BillItem(bill_id=bill.id, service_name="Consultation Fee", service_code="CONS", category="CONSULTATION", quantity=1))
                s.commit()

        print("\n✓ Seed complete.\n")
        print("Demo login credentials (password: his@1234)")
        print("─" * 50)
        print(f"  {'admin@his.local':<32} Admin")
        print(f"  {'reception@his.local':<32} Receptionist")
        print(f"  {'nurse@his.local':<32} Nurse")
        print(f"  {'billing@his.local':<32} Billing")
        print(f"  {'pharmacy@his.local':<32} Pharmacist")
        print(f"  {'lab@his.local':<32} Lab Technician")
        print(f"  {'dr.mehta@his.local':<32} Dr. Arvind Mehta  — General Medicine")
        print(f"  {'dr.patel@his.local':<32} Dr. Sneha Patel   — Cardiology")
        print(f"  {'dr.iyer@his.local':<32} Dr. Ramesh Iyer   — Orthopaedics")
        print(f"  {'dr.nair@his.local':<32} Dr. Kavitha Nair  — Gynaecology")
        print(f"  {'dr.kumar@his.local':<32} Dr. Suresh Kumar  — Paediatrics")
        print(f"  {'dr.menon@his.local':<32} Dr. Priya Menon   — ENT")
        print(f"  {'dr.khanna@his.local':<32} Dr. Rajesh Khanna — Dermatology")
        print(f"  {'dr.desai@his.local':<32} Dr. Anita Desai   — Ophthalmology")
        print(f"  {'dr.joshi@his.local':<32} Dr. Vikram Joshi  — Neurology")
        print("\nToday's demo state:")
        print("  Dr. Mehta  (GM)    — 3 completed, 1 with-doctor, 1 in-queue, 1 checked-in, 2 scheduled")
        print("  Dr. Patel  (Card)  — 1 completed, 1 with-doctor, 1 in-queue, 1 scheduled")
        print("  Dr. Kumar  (Paed)  — 1 completed, 1 checked-in, 1 scheduled")
        print("  Dr. Nair   (Gyn)   — 1 completed, 1 scheduled")
        print("  Dr. Menon  (ENT)   — 1 completed, 1 with-doctor, 1 in-queue, 1 scheduled")
        print("  Dr. Khanna (Derm)  — 1 completed, 1 with-doctor, 1 in-queue, 2 scheduled")
        print("  Dr. Desai  (Opth)  — 1 completed, 1 checked-in, 1 scheduled")
        print("  Dr. Joshi  (Neuro) — 1 completed, 1 with-doctor, 1 scheduled")
        print(f"\n  {len(patients)} patients  |  9 doctors across all departments  |  30-day history  |  prescriptions + bills pre-loaded\n")


if __name__ == "__main__":
    seed()
