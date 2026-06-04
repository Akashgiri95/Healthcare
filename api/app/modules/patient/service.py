from sqlmodel import Session, select, func
from app.db.models import Patient
from datetime import date


def generate_uhid(session: Session) -> str:
    year = date.today().year
    count = session.exec(select(func.count(Patient.id))).one()
    return f"HIS{year}{str(count + 1).zfill(6)}"
