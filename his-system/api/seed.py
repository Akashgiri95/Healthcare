"""
Run: python seed.py
Seeds the database with realistic Indian hospital demo data.
"""
from sqlmodel import Session
from app.db.database import engine, create_db_and_tables
from app.db.models import (
    User, Doctor, Department, Patient, Drug, LabTest, ICD10,
    DoctorSlot, Company, UserRole, Gender, BloodGroup
)
from app.core.security import hash_password
from datetime import date, time


def seed():
    create_db_and_tables()

    with Session(engine) as s:
        # ── Departments ──────────────────────────────────────────────────────
        depts = [
            Department(name="General Medicine", code="GM", consultation_fee=500, follow_up_fee=150, description="General OPD"),
            Department(name="Cardiology", code="CARD", consultation_fee=1000, follow_up_fee=300, description="Heart & Blood Vessels"),
            Department(name="Orthopaedics", code="ORTHO", consultation_fee=800, follow_up_fee=250, description="Bones & Joints"),
            Department(name="Gynaecology", code="GYN", consultation_fee=800, follow_up_fee=250, description="Women's Health"),
            Department(name="Paediatrics", code="PAED", consultation_fee=600, follow_up_fee=200, description="Children 0-18 years"),
            Department(name="ENT", code="ENT", consultation_fee=700, follow_up_fee=200, description="Ear, Nose & Throat"),
            Department(name="Dermatology", code="DERM", consultation_fee=700, follow_up_fee=200, description="Skin & Hair"),
            Department(name="Ophthalmology", code="OPTH", consultation_fee=700, follow_up_fee=200, description="Eye Care"),
            Department(name="Neurology", code="NEURO", consultation_fee=1200, follow_up_fee=400, description="Brain & Nervous System"),
            Department(name="Emergency", code="EMRG", consultation_fee=0, description="24x7 Emergency"),
        ]
        for d in depts:
            s.add(d)
        s.commit()
        for d in depts:
            s.refresh(d)

        # ── Admin User ───────────────────────────────────────────────────────
        admin = User(
            employee_id="EMP001",
            full_name="Admin User",
            email="admin@his.local",
            phone="9000000001",
            password_hash=hash_password("his@1234"),
            role=UserRole.ADMIN,
        )
        s.add(admin)

        # ── Receptionist ─────────────────────────────────────────────────────
        recept = User(
            employee_id="EMP002",
            full_name="Priya Sharma",
            email="reception@his.local",
            phone="9000000002",
            password_hash=hash_password("his@1234"),
            role=UserRole.RECEPTIONIST,
        )
        s.add(recept)

        # ── Nurse ────────────────────────────────────────────────────────────
        nurse = User(
            employee_id="EMP003",
            full_name="Sunita Devi",
            email="nurse@his.local",
            phone="9000000003",
            password_hash=hash_password("his@1234"),
            role=UserRole.NURSE,
        )
        s.add(nurse)

        # ── Billing ──────────────────────────────────────────────────────────
        billing_user = User(
            employee_id="EMP004",
            full_name="Rajesh Gupta",
            email="billing@his.local",
            phone="9000000004",
            password_hash=hash_password("his@1234"),
            role=UserRole.BILLING,
        )
        s.add(billing_user)

        # ── Doctor Users ─────────────────────────────────────────────────────
        doc_users = [
            User(employee_id="DOC001", full_name="Dr. Arvind Mehta", email="dr.mehta@his.local", phone="9000000010", password_hash=hash_password("his@1234"), role=UserRole.DOCTOR),
            User(employee_id="DOC002", full_name="Dr. Sneha Patel", email="dr.patel@his.local", phone="9000000011", password_hash=hash_password("his@1234"), role=UserRole.DOCTOR),
            User(employee_id="DOC003", full_name="Dr. Ramesh Iyer", email="dr.iyer@his.local", phone="9000000012", password_hash=hash_password("his@1234"), role=UserRole.DOCTOR),
            User(employee_id="DOC004", full_name="Dr. Kavitha Nair", email="dr.nair@his.local", phone="9000000013", password_hash=hash_password("his@1234"), role=UserRole.DOCTOR),
            User(employee_id="DOC005", full_name="Dr. Suresh Kumar", email="dr.kumar@his.local", phone="9000000014", password_hash=hash_password("his@1234"), role=UserRole.DOCTOR),
        ]
        for u in doc_users:
            s.add(u)
        s.commit()
        for u in doc_users:
            s.refresh(u)

        # ── Doctor Profiles ───────────────────────────────────────────────────
        doctors = [
            Doctor(user_id=doc_users[0].id, department_id=depts[0].id, registration_number="MCI12345", specialization="General Medicine", qualification="MBBS, MD", experience_years=15),
            Doctor(user_id=doc_users[1].id, department_id=depts[1].id, registration_number="MCI12346", specialization="Cardiology", qualification="MBBS, MD, DM Cardiology", experience_years=12, consultation_fee=1200),
            Doctor(user_id=doc_users[2].id, department_id=depts[2].id, registration_number="MCI12347", specialization="Orthopaedics", qualification="MBBS, MS Ortho", experience_years=10),
            Doctor(user_id=doc_users[3].id, department_id=depts[3].id, registration_number="MCI12348", specialization="Gynaecology", qualification="MBBS, MS OBG", experience_years=14),
            Doctor(user_id=doc_users[4].id, department_id=depts[4].id, registration_number="MCI12349", specialization="Paediatrics", qualification="MBBS, MD Paediatrics", experience_years=8),
        ]
        for d in doctors:
            s.add(d)
        s.commit()
        for d in doctors:
            s.refresh(d)

        # ── Doctor Slots (weekly schedule templates) ──────────────────────────
        # Day: 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat
        slots = [
            # Dr. Mehta — General Medicine: Mon-Sat morning, Mon/Wed/Fri evening
            *[DoctorSlot(doctor_id=doctors[0].id, department_id=depts[0].id, day_of_week=d, start_time=time(9, 0), end_time=time(13, 0), max_patients=20) for d in range(6)],
            *[DoctorSlot(doctor_id=doctors[0].id, department_id=depts[0].id, day_of_week=d, start_time=time(17, 0), end_time=time(20, 0), max_patients=15) for d in [0, 2, 4]],
            # Dr. Patel — Cardiology: Mon-Fri morning, Mon/Wed evening
            *[DoctorSlot(doctor_id=doctors[1].id, department_id=depts[1].id, day_of_week=d, start_time=time(10, 0), end_time=time(13, 0), max_patients=15) for d in range(5)],
            *[DoctorSlot(doctor_id=doctors[1].id, department_id=depts[1].id, day_of_week=d, start_time=time(16, 0), end_time=time(19, 0), max_patients=10) for d in [0, 2]],
            # Dr. Iyer — Orthopaedics: Mon/Wed/Fri morning, Tue/Thu afternoon
            *[DoctorSlot(doctor_id=doctors[2].id, department_id=depts[2].id, day_of_week=d, start_time=time(9, 0), end_time=time(13, 0), max_patients=20) for d in [0, 2, 4]],
            *[DoctorSlot(doctor_id=doctors[2].id, department_id=depts[2].id, day_of_week=d, start_time=time(14, 0), end_time=time(17, 0), max_patients=15) for d in [1, 3]],
            # Dr. Nair — Gynaecology: Tue/Thu/Sat morning, Mon/Wed afternoon
            *[DoctorSlot(doctor_id=doctors[3].id, department_id=depts[3].id, day_of_week=d, start_time=time(9, 0), end_time=time(13, 0), max_patients=20) for d in [1, 3, 5]],
            *[DoctorSlot(doctor_id=doctors[3].id, department_id=depts[3].id, day_of_week=d, start_time=time(15, 0), end_time=time(18, 0), max_patients=15) for d in [0, 2]],
            # Dr. Kumar — Paediatrics: Mon-Sat morning, Tue/Thu evening
            *[DoctorSlot(doctor_id=doctors[4].id, department_id=depts[4].id, day_of_week=d, start_time=time(9, 0), end_time=time(12, 0), max_patients=25) for d in range(6)],
            *[DoctorSlot(doctor_id=doctors[4].id, department_id=depts[4].id, day_of_week=d, start_time=time(16, 0), end_time=time(18, 0), max_patients=15) for d in [1, 3]],
        ]
        for sl in slots:
            s.add(sl)
        s.commit()

        # ── Corporate Companies ───────────────────────────────────────────────
        companies = [
            Company(name="Adani Enterprises Ltd", code="AEL", contact_person="HR Department", contact_phone="9000100001", billing_address="Shantigram, Ahmedabad", credit_limit=500000),
            Company(name="Gujarat Gas Limited", code="GGL", contact_person="Medical Department", contact_phone="9000100002", billing_address="GIFT City, Gandhinagar", credit_limit=200000),
        ]
        for c in companies:
            s.add(c)
        s.commit()
        for c in companies:
            s.refresh(c)

        # ── Patients ──────────────────────────────────────────────────────────
        patients_data = [
            dict(first_name="Ramesh", last_name="Yadav", date_of_birth=date(1980, 5, 12), gender=Gender.MALE, blood_group=BloodGroup.B_POS, phone="9876543210", city="Ahmedabad", district="Ahmedabad", state="Gujarat", pincode="380001", address_line1="12, Ashram Road", aadhaar_last4="1234", language_preference="Gujarati"),
            dict(first_name="Sunita", last_name="Patel", date_of_birth=date(1992, 8, 22), gender=Gender.FEMALE, blood_group=BloodGroup.O_POS, phone="9876543211", city="Surat", district="Surat", state="Gujarat", pincode="395001", address_line1="45, Ring Road", language_preference="Gujarati"),
            dict(first_name="Arun", last_name="Sharma", date_of_birth=date(1975, 3, 10), gender=Gender.MALE, blood_group=BloodGroup.A_POS, phone="9876543212", city="Gandhinagar", district="Gandhinagar", state="Gujarat", pincode="382010", address_line1="8, Sector 11", language_preference="Hindi"),
            dict(first_name="Meena", last_name="Gupta", date_of_birth=date(1988, 11, 30), gender=Gender.FEMALE, blood_group=BloodGroup.AB_POS, phone="9876543213", city="Rajkot", district="Rajkot", state="Gujarat", pincode="360001", address_line1="22, University Road", language_preference="Hindi"),
            dict(first_name="Vikram", last_name="Singh", date_of_birth=date(1965, 7, 4), gender=Gender.MALE, blood_group=BloodGroup.O_NEG, phone="9876543214", city="Vadodara", district="Vadodara", state="Gujarat", pincode="390001", address_line1="101, Alkapuri", company_id=companies[0].id, language_preference="Hindi"),
            dict(first_name="Kavita", last_name="Joshi", date_of_birth=date(2005, 1, 18), gender=Gender.FEMALE, phone="9876543215", city="Ahmedabad", district="Ahmedabad", state="Gujarat", pincode="380015", address_line1="7, Navrangpura", language_preference="Gujarati"),
            dict(first_name="Deepak", last_name="Mehta", date_of_birth=date(1958, 9, 25), gender=Gender.MALE, blood_group=BloodGroup.B_NEG, phone="9876543216", city="Anand", district="Anand", state="Gujarat", pincode="388001", address_line1="3, Market Road", ayushman_card_no="AB123456789", company_id=companies[1].id, language_preference="Gujarati"),
            dict(first_name="Asha", last_name="Reddy", date_of_birth=date(1995, 4, 14), gender=Gender.FEMALE, blood_group=BloodGroup.A_NEG, phone="9876543217", city="Surat", district="Surat", state="Gujarat", pincode="395002", address_line1="88, Varachha Road", language_preference="Tamil", interpreter_required=True),
            dict(first_name="Mohan", last_name="Verma", date_of_birth=date(1972, 12, 8), gender=Gender.MALE, blood_group=BloodGroup.AB_NEG, phone="9876543218", city="Bhavnagar", district="Bhavnagar", state="Gujarat", pincode="364001", address_line1="15, Station Road", language_preference="Hindi"),
            dict(first_name="Priya", last_name="Nair", date_of_birth=date(2010, 6, 20), gender=Gender.FEMALE, phone="9876543219", city="Ahmedabad", district="Ahmedabad", state="Gujarat", pincode="380006", address_line1="56, CG Road", language_preference="Malayalam", interpreter_required=True),
        ]
        for i, p in enumerate(patients_data):
            patient = Patient(uhid=f"HIS2024{str(i+1).zfill(6)}", **p)
            s.add(patient)
        s.commit()

        # ── Common Drugs ──────────────────────────────────────────────────────
        drugs = [
            Drug(name="Paracetamol", brand_name="Crocin", formulation="TAB", strength="500mg", unit="mg", drug_class="Analgesic/Antipyretic"),
            Drug(name="Amoxicillin", brand_name="Mox", formulation="CAP", strength="500mg", unit="mg", drug_class="Antibiotic"),
            Drug(name="Azithromycin", brand_name="Zithromax", formulation="TAB", strength="500mg", unit="mg", drug_class="Antibiotic"),
            Drug(name="Metformin", brand_name="Glycomet", formulation="TAB", strength="500mg", unit="mg", drug_class="Antidiabetic"),
            Drug(name="Amlodipine", brand_name="Amlip", formulation="TAB", strength="5mg", unit="mg", drug_class="Antihypertensive"),
            Drug(name="Atorvastatin", brand_name="Atorva", formulation="TAB", strength="10mg", unit="mg", drug_class="Statin"),
            Drug(name="Pantoprazole", brand_name="Pan", formulation="TAB", strength="40mg", unit="mg", drug_class="PPI"),
            Drug(name="Cetirizine", brand_name="Alerid", formulation="TAB", strength="10mg", unit="mg", drug_class="Antihistamine"),
            Drug(name="Ibuprofen", brand_name="Brufen", formulation="TAB", strength="400mg", unit="mg", drug_class="NSAID"),
            Drug(name="Omeprazole", brand_name="Omez", formulation="CAP", strength="20mg", unit="mg", drug_class="PPI"),
            Drug(name="Dolo", brand_name="Dolo 650", formulation="TAB", strength="650mg", unit="mg", drug_class="Analgesic"),
            Drug(name="Montelukast", brand_name="Montair", formulation="TAB", strength="10mg", unit="mg", drug_class="Leukotriene antagonist"),
            Drug(name="Salbutamol", brand_name="Asthalin", formulation="SYP", strength="2mg/5ml", unit="ml", drug_class="Bronchodilator"),
            Drug(name="Metronidazole", brand_name="Flagyl", formulation="TAB", strength="400mg", unit="mg", drug_class="Antiprotozoal"),
            Drug(name="Calcium + Vit D3", brand_name="Shelcal", formulation="TAB", strength="500mg+250IU", unit="mg", drug_class="Supplement"),
        ]
        for d in drugs:
            s.add(d)
        s.commit()

        # ── Common Lab Tests ──────────────────────────────────────────────────
        lab_tests = [
            LabTest(name="Complete Blood Count", code="CBC", department="Haematology", sample_type="Blood", normal_range="See report", price=250),
            LabTest(name="Blood Glucose Fasting", code="FBS", department="Biochemistry", sample_type="Blood", normal_range="70-100 mg/dL", unit="mg/dL", price=80),
            LabTest(name="Blood Glucose PP", code="PPBS", department="Biochemistry", sample_type="Blood", normal_range="<140 mg/dL", unit="mg/dL", price=80),
            LabTest(name="HbA1c", code="HBA1C", department="Biochemistry", sample_type="Blood", normal_range="<5.7%", unit="%", price=350),
            LabTest(name="Lipid Profile", code="LIPID", department="Biochemistry", sample_type="Blood", price=450),
            LabTest(name="Liver Function Test", code="LFT", department="Biochemistry", sample_type="Blood", price=500),
            LabTest(name="Kidney Function Test", code="KFT", department="Biochemistry", sample_type="Blood", price=450),
            LabTest(name="Thyroid Profile (TSH)", code="TSH", department="Endocrinology", sample_type="Blood", normal_range="0.4-4.0 mIU/L", unit="mIU/L", price=350),
            LabTest(name="Urine Routine", code="URINE", department="Microbiology", sample_type="Urine", price=100),
            LabTest(name="ECG", code="ECG", department="Cardiology", sample_type="Non-invasive", price=200),
            LabTest(name="Chest X-Ray PA View", code="CXRPA", department="Radiology", sample_type="Non-invasive", price=400),
            LabTest(name="Dengue NS1 Antigen", code="DENGUE", department="Serology", sample_type="Blood", price=600),
            LabTest(name="Malaria Antigen", code="MALARIA", department="Serology", sample_type="Blood", price=300),
            LabTest(name="Serum Creatinine", code="CREAT", department="Biochemistry", sample_type="Blood", normal_range="0.7-1.3 mg/dL", unit="mg/dL", price=120),
        ]
        for t in lab_tests:
            s.add(t)
        s.commit()

        # ── Common ICD-10 Codes ───────────────────────────────────────────────
        icd10_codes = [
            ICD10(code="J06.9", description="Acute upper respiratory infection, unspecified", category="Respiratory"),
            ICD10(code="J18.9", description="Pneumonia, unspecified", category="Respiratory"),
            ICD10(code="E11.9", description="Type 2 diabetes mellitus without complications", category="Endocrine"),
            ICD10(code="I10", description="Essential (primary) hypertension", category="Circulatory"),
            ICD10(code="K21.0", description="Gastro-oesophageal reflux disease with oesophagitis", category="Digestive"),
            ICD10(code="M54.5", description="Low back pain", category="Musculoskeletal"),
            ICD10(code="J45.9", description="Asthma, unspecified", category="Respiratory"),
            ICD10(code="A90", description="Dengue fever", category="Infectious"),
            ICD10(code="B54", description="Unspecified malaria", category="Infectious"),
            ICD10(code="K29.7", description="Gastritis, unspecified", category="Digestive"),
            ICD10(code="N39.0", description="Urinary tract infection, site not specified", category="Genitourinary"),
            ICD10(code="I25.9", description="Chronic ischaemic heart disease, unspecified", category="Circulatory"),
            ICD10(code="E78.5", description="Hyperlipidaemia, unspecified", category="Endocrine"),
            ICD10(code="J00", description="Acute nasopharyngitis (common cold)", category="Respiratory"),
            ICD10(code="R51", description="Headache", category="Symptoms"),
            ICD10(code="R05", description="Cough", category="Symptoms"),
            ICD10(code="R50.9", description="Fever, unspecified", category="Symptoms"),
            ICD10(code="K59.0", description="Constipation", category="Digestive"),
            ICD10(code="A09", description="Diarrhoea and gastroenteritis", category="Infectious"),
            ICD10(code="L20.9", description="Atopic dermatitis, unspecified", category="Skin"),
        ]
        for code in icd10_codes:
            s.add(code)
        s.commit()

    print("Seed complete. Demo users:")
    print("  admin@his.local      / his@1234  (Admin)")
    print("  reception@his.local  / his@1234  (Receptionist)")
    print("  nurse@his.local      / his@1234  (Nurse)")
    print("  billing@his.local    / his@1234  (Billing)")
    print("  dr.mehta@his.local   / his@1234  (Doctor - General Medicine)")
    print("  dr.patel@his.local   / his@1234  (Doctor - Cardiology)")


if __name__ == "__main__":
    seed()
