"""
Seed demo users for all 12 roles.
Run: python seed.py
Password for all demo users: his@1234
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.patient import Patient  # noqa — ensures table exists
from app.auth import hash_password

ROLES = [
    ("Receptionist Demo",  "receptionist@his.local", "receptionist", "Front Desk"),
    ("Dr. Sharma",         "doctor@his.local",        "doctor",        "General Medicine"),
    ("Nurse Priya",        "nurse@his.local",          "nurse",         "Ward B"),
    ("Billing Executive",  "billing@his.local",        "billing",       "Billing"),
    ("Cashier Ravi",       "cashier@his.local",        "cashier",       "Cash Counter"),
    ("Pharmacist Anita",   "pharmacist@his.local",     "pharmacist",    "Pharmacy"),
    ("Lab Tech Mohan",     "lab@his.local",            "lab",           "Laboratory"),
    ("Radiology Tech",     "radiology@his.local",      "radiology",     "Radiology"),
    ("Store Keeper",       "store@his.local",          "store",         "Store"),
    ("CSSD Tech",          "cssd@his.local",           "cssd",          "CSSD"),
    ("Hospital Manager",   "management@his.local",     "management",    None),
    ("System Admin",       "master@his.local",         "master",        None),
]

Base.metadata.create_all(bind=engine)

db = SessionLocal()
added = 0
for name, email, role, dept in ROLES:
    if not db.query(User).filter(User.email == email).first():
        db.add(User(
            name=name, email=email,
            password_hash=hash_password("his@1234"),
            role=role, department=dept,
        ))
        added += 1
db.commit()
db.close()
print(f"Seeded {added} users. All passwords: his@1234")
