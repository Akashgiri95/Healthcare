from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db.database import get_session
from app.db.models import Prescription, PrescriptionItem, PrescriptionStatus
from app.modules.auth.router import get_current_user
from app.modules.prescription.schemas import PrescriptionCreate
from app.modules.prescription.service import generate_prescription_no
from datetime import datetime

router = APIRouter()


@router.post("", status_code=201)
def create_prescription(body: PrescriptionCreate, session: Session = Depends(get_session), current_user=Depends(get_current_user)):
    from app.db.models import Doctor
    from sqlmodel import select as _sel
    doc = session.exec(_sel(Doctor).where(Doctor.user_id == current_user.id)).first()
    if not doc:
        raise HTTPException(403, "Only doctors can create prescriptions")
    rx = Prescription(
        prescription_no=generate_prescription_no(session),
        consultation_id=body.consultation_id,
        patient_id=body.patient_id,
        doctor_id=doc.id,
        notes=body.notes,
    )
    session.add(rx)
    session.flush()
    for item in body.items:
        session.add(PrescriptionItem(prescription_id=rx.id, **item.model_dump()))
    session.commit()
    session.refresh(rx)
    return rx


@router.get("/{prescription_id}")
def get_prescription(prescription_id: int, session: Session = Depends(get_session), _=Depends(get_current_user)):
    rx = session.get(Prescription, prescription_id)
    if not rx:
        raise HTTPException(404, "Prescription not found")
    items = session.exec(select(PrescriptionItem).where(PrescriptionItem.prescription_id == prescription_id)).all()
    return {"prescription": rx, "items": items}


@router.get("/consultation/{consultation_id}")
def get_by_consultation(consultation_id: int, session: Session = Depends(get_session), _=Depends(get_current_user)):
    rxs = session.exec(select(Prescription).where(Prescription.consultation_id == consultation_id)).all()
    return rxs


@router.patch("/{prescription_id}/dispense")
def mark_dispensed(prescription_id: int, session: Session = Depends(get_session), _=Depends(get_current_user)):
    rx = session.get(Prescription, prescription_id)
    if not rx:
        raise HTTPException(404, "Prescription not found")
    rx.status = PrescriptionStatus.DISPENSED
    rx.dispensed_at = datetime.utcnow()
    session.add(rx)
    session.commit()
    return {"message": "Dispensed"}
