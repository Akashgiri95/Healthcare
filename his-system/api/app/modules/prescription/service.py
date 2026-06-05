from sqlmodel import Session, select, func
from app.db.models import Prescription
from datetime import date


def generate_prescription_no(session: Session) -> str:
    count = session.exec(select(func.count(Prescription.id))).one()
    return f"RX{date.today().strftime('%Y%m%d')}{str(count + 1).zfill(4)}"
