from pydantic import BaseModel
from typing import Optional
from datetime import date


class VitalsCreate(BaseModel):
    visit_id: int
    patient_id: int
    temperature: Optional[float] = None
    pulse: Optional[int] = None
    respiratory_rate: Optional[int] = None
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    spo2: Optional[float] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    blood_glucose: Optional[float] = None
    pain_score: Optional[int] = None
    notes: Optional[str] = None


class ConsultationCreate(BaseModel):
    visit_id: int
    patient_id: int
    chief_complaint: str
    history_of_present_illness: Optional[str] = None
    past_medical_history: Optional[str] = None
    family_history: Optional[str] = None
    personal_history: Optional[str] = None
    general_examination: Optional[str] = None
    systemic_examination: Optional[str] = None
    clinical_notes: Optional[str] = None
    advice: Optional[str] = None
    follow_up_days: Optional[int] = None
    follow_up_date: Optional[date] = None
    referred_to: Optional[str] = None


class DiagnosisAdd(BaseModel):
    icd10_code: str
    icd10_description: str
    is_primary: bool = False
    is_provisional: bool = True
