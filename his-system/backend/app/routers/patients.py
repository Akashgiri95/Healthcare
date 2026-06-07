from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from datetime import date, datetime
from typing import Optional
import re

from ..database import get_db
from ..models.patient import Patient
from ..auth import get_current_user, require_roles
from ..websocket import manager

router = APIRouter()

# ── Schemas ──────────────────────────────────────────────────────
class RegisterIn(BaseModel):
    name: str
    dob: date
    gender: str
    blood_group: Optional[str] = None
    mobile: str
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    id_type: Optional[str] = None
    id_number: Optional[str] = None
    abha_id: Optional[str] = None
    visit_type: str = "OPD"
    department: str
    referral_source: Optional[str] = None
    referral_name: Optional[str] = None
    payment_type: str = "Self"
    insurance_name: Optional[str] = None
    insurance_policy: Optional[str] = None
    emergency: bool = False

    @field_validator('mobile')
    @classmethod
    def validate_mobile(cls, v):
        if not re.match(r'^[6-9]\d{9}$', v):
            raise ValueError('Invalid mobile number')
        return v

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Name too short')
        return v.strip().title()

class RegisterOut(BaseModel):
    uhid: str
    name: str
    token: str
    department: str
    visit_type: str
    message: str


def _generate_uhid(db: Session) -> str:
    year = datetime.now().year % 100
    count = db.query(Patient).count() + 1
    return f"HIS{year:02d}{count:05d}"

def _generate_token(department: str, db: Session) -> str:
    dept_abbr = department[:3].upper()
    today_count = db.query(Patient).filter(
        Patient.department == department
    ).count() + 1
    return f"{dept_abbr}{today_count:03d}"


# ── Endpoints ─────────────────────────────────────────────────────
@router.post("/register", response_model=RegisterOut,
             dependencies=[Depends(require_roles("receptionist", "master", "management"))])
async def register_patient(data: RegisterIn, db: Session = Depends(get_db),
                            current_user=Depends(get_current_user)):
    uhid  = _generate_uhid(db)
    token = _generate_token(data.department, db)

    patient = Patient(
        uhid=uhid,
        name=data.name,
        dob=data.dob,
        gender=data.gender,
        blood_group=data.blood_group,
        mobile=data.mobile,
        email=data.email,
        address=data.address,
        city=data.city,
        state=data.state,
        id_type=data.id_type,
        id_number=data.id_number,
        abha_id=data.abha_id or None,
        visit_type=data.visit_type,
        department=data.department,
        referral_source=data.referral_source,
        referral_name=data.referral_name,
        payment_type=data.payment_type,
        insurance_name=data.insurance_name,
        insurance_policy=data.insurance_policy,
        emergency=data.emergency,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    # ── Real-time broadcast to relevant roles ─────────────────────
    payload = {
        "uhid": uhid,
        "name": patient.name,
        "gender": patient.gender,
        "department": patient.department,
        "visit_type": patient.visit_type,
        "token": token,
        "emergency": patient.emergency,
        "payment_type": patient.payment_type,
        "registered_by": current_user.name,
    }
    await manager.broadcast_to_roles(["doctor", "nurse", "billing", "management"],
                                     "patient_registered", payload)

    return RegisterOut(
        uhid=uhid,
        name=patient.name,
        token=token,
        department=patient.department,
        visit_type=patient.visit_type,
        message=f"Patient registered. Token {token} assigned for {patient.department}.",
    )


@router.get("/search")
def search_patients(q: str, db: Session = Depends(get_db),
                    _=Depends(get_current_user)):
    results = (
        db.query(Patient)
        .filter(
            (Patient.uhid.ilike(f"%{q}%")) |
            (Patient.name.ilike(f"%{q}%")) |
            (Patient.mobile.ilike(f"%{q}%"))
        )
        .limit(20).all()
    )
    return [
        {"uhid": p.uhid, "name": p.name, "mobile": p.mobile,
         "gender": p.gender, "department": p.department,
         "visit_type": p.visit_type, "created_at": p.created_at}
        for p in results
    ]


@router.get("/{uhid}")
def get_patient(uhid: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(Patient).filter(Patient.uhid == uhid).first()
    if not p:
        raise HTTPException(404, "Patient not found")
    return p
