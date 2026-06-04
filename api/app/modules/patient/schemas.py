from pydantic import BaseModel
from typing import Optional
from datetime import date
from app.db.models import Gender, BloodGroup


class PatientCreate(BaseModel):
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    date_of_birth: date
    gender: Gender
    blood_group: Optional[BloodGroup] = None
    phone: str
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    district: str
    state: str
    pincode: str
    abha_id: Optional[str] = None
    aadhaar_last4: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_policy_no: Optional[str] = None
    ayushman_card_no: Optional[str] = None
    marital_status: Optional[str] = None
    occupation: Optional[str] = None


class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    blood_group: Optional[BloodGroup] = None
    insurance_provider: Optional[str] = None
    insurance_policy_no: Optional[str] = None
    ayushman_card_no: Optional[str] = None
    abha_id: Optional[str] = None
    is_vip: Optional[bool] = None
