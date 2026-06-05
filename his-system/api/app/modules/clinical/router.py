from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db.database import get_session
from app.db.models import Consultation, Vitals, Diagnosis, Visit, Doctor
from app.modules.auth.router import get_current_user
from app.modules.clinical.schemas import VitalsCreate, ConsultationCreate, DiagnosisAdd
from datetime import datetime

router = APIRouter()


def _generate_consultation_no(session: Session) -> str:
    from datetime import date
    prefix = f"CON{date.today().strftime('%Y%m%d')}"
    count = session.exec(select(Consultation).where(Consultation.consultation_no.startswith(prefix))).all()  # type: ignore
    return f"{prefix}{len(count) + 1:04d}"


def _resolve_doctor_id(session: Session, current_user) -> int:
    doc = session.exec(select(Doctor).where(Doctor.user_id == current_user.id)).first()
    if not doc:
        raise HTTPException(403, "Only doctors can perform this action. Log in as a doctor.")
    return doc.id


@router.post("/vitals", status_code=201)
def record_vitals(body: VitalsCreate, session: Session = Depends(get_session), current_user=Depends(get_current_user)):
    existing = session.exec(select(Vitals).where(Vitals.visit_id == body.visit_id)).first()
    if existing:
        # Update in place
        for k, v in body.model_dump(exclude_unset=True).items():
            setattr(existing, k, v)
        if body.weight and body.height:
            existing.bmi = round(body.weight / ((body.height / 100) ** 2), 1)
        existing.recorded_by = current_user.id
        existing.recorded_at = datetime.utcnow()
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    bmi = None
    if body.weight and body.height:
        bmi = round(body.weight / ((body.height / 100) ** 2), 1)
    vitals = Vitals(**body.model_dump(), bmi=bmi, recorded_by=current_user.id)
    session.add(vitals)
    session.commit()
    session.refresh(vitals)
    return vitals


@router.get("/vitals/{visit_id}")
def get_vitals(visit_id: int, session: Session = Depends(get_session), _=Depends(get_current_user)):
    vitals = session.exec(select(Vitals).where(Vitals.visit_id == visit_id)).first()
    if not vitals:
        raise HTTPException(404, "Vitals not found")
    return vitals


@router.post("/consultation", status_code=201)
def create_consultation(body: ConsultationCreate, session: Session = Depends(get_session), current_user=Depends(get_current_user)):
    doctor_id = _resolve_doctor_id(session, current_user)

    existing = session.exec(select(Consultation).where(Consultation.visit_id == body.visit_id)).first()
    if existing:
        raise HTTPException(400, "Consultation already exists for this visit")

    consultation = Consultation(
        **body.model_dump(),
        doctor_id=doctor_id,
        consultation_no=_generate_consultation_no(session),
    )
    session.add(consultation)
    session.commit()
    session.refresh(consultation)
    return consultation


@router.get("/consultation/{visit_id}")
def get_consultation(visit_id: int, session: Session = Depends(get_session), _=Depends(get_current_user)):
    consultation = session.exec(select(Consultation).where(Consultation.visit_id == visit_id)).first()
    if not consultation:
        raise HTTPException(404, "Consultation not found")
    return consultation


@router.put("/consultation/{consultation_id}")
def update_consultation(consultation_id: int, body: ConsultationCreate, session: Session = Depends(get_session), _=Depends(get_current_user)):
    c = session.get(Consultation, consultation_id)
    if not c:
        raise HTTPException(404, "Consultation not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    session.add(c)
    session.commit()
    session.refresh(c)
    return c


@router.post("/consultation/{consultation_id}/finalize")
def finalize(consultation_id: int, session: Session = Depends(get_session), _=Depends(get_current_user)):
    c = session.get(Consultation, consultation_id)
    if not c:
        raise HTTPException(404, "Consultation not found")
    c.is_finalized = True
    c.finalized_at = datetime.utcnow()
    session.add(c)
    session.commit()
    return {"message": "Consultation finalized"}


@router.post("/consultation/{consultation_id}/diagnosis")
def add_diagnosis(consultation_id: int, body: DiagnosisAdd, session: Session = Depends(get_session), _=Depends(get_current_user)):
    dx = Diagnosis(consultation_id=consultation_id, **body.model_dump())
    session.add(dx)
    session.commit()
    session.refresh(dx)
    return dx


@router.delete("/consultation/{consultation_id}/diagnosis/{dx_id}")
def remove_diagnosis(consultation_id: int, dx_id: int, session: Session = Depends(get_session), _=Depends(get_current_user)):
    dx = session.get(Diagnosis, dx_id)
    if not dx or dx.consultation_id != consultation_id:
        raise HTTPException(404, "Diagnosis not found")
    session.delete(dx)
    session.commit()
    return {"message": "Removed"}


@router.get("/consultation/{consultation_id}/diagnoses")
def get_diagnoses(consultation_id: int, session: Session = Depends(get_session), _=Depends(get_current_user)):
    return session.exec(select(Diagnosis).where(Diagnosis.consultation_id == consultation_id)).all()
