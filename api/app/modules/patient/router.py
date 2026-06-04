from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import Optional
from app.db.database import get_session
from app.db.models import Patient, PatientAllergy
from app.modules.auth.router import get_current_user
from app.modules.patient.schemas import PatientCreate, PatientUpdate
from app.modules.patient.service import generate_uhid
import math

router = APIRouter()


@router.get("")
def list_patients(
    q: Optional[str] = Query(None, description="Search by name, phone, UHID"),
    page: int = 1,
    limit: int = 20,
    session: Session = Depends(get_session),
    _=Depends(get_current_user),
):
    query = select(Patient).where(Patient.is_active == True)
    if q:
        query = query.where(
            Patient.phone.contains(q)
            | Patient.uhid.contains(q)
            | Patient.first_name.contains(q)
            | Patient.last_name.contains(q)
        )
    total = len(session.exec(query).all())
    patients = session.exec(query.offset((page - 1) * limit).limit(limit)).all()
    return {"data": patients, "total": total, "page": page, "pages": math.ceil(total / limit)}


@router.post("", status_code=201)
def create_patient(body: PatientCreate, session: Session = Depends(get_session), current_user=Depends(get_current_user)):
    patient = Patient(**body.model_dump(), uhid=generate_uhid(session), registered_by=current_user.id)
    session.add(patient)
    session.commit()
    session.refresh(patient)
    return patient


@router.get("/{patient_id}")
def get_patient(patient_id: int, session: Session = Depends(get_session), _=Depends(get_current_user)):
    patient = session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(404, "Patient not found")
    return patient


@router.put("/{patient_id}")
def update_patient(patient_id: int, body: PatientUpdate, session: Session = Depends(get_session), _=Depends(get_current_user)):
    patient = session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(404, "Patient not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(patient, k, v)
    session.add(patient)
    session.commit()
    session.refresh(patient)
    return patient


@router.get("/{patient_id}/visits")
def get_patient_visits(patient_id: int, session: Session = Depends(get_session), _=Depends(get_current_user)):
    from app.db.models import Visit
    visits = session.exec(select(Visit).where(Visit.patient_id == patient_id)).all()
    return visits
