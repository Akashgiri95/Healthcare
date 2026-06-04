from sqlmodel import Session, select, func
from app.db.models import LabOrder
from datetime import date


def generate_order_no(session: Session) -> str:
    count = session.exec(select(func.count(LabOrder.id))).one()
    return f"LAB{date.today().strftime('%Y%m%d')}{str(count + 1).zfill(4)}"
