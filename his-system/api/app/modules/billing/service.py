from sqlmodel import Session, select, func
from app.db.models import Bill
from datetime import date


def generate_bill_no(session: Session) -> str:
    count = session.exec(select(func.count(Bill.id))).one()
    return f"BILL{date.today().strftime('%Y%m%d')}{str(count + 1).zfill(4)}"


def calculate_totals(items):
    subtotal = sum(i.unit_price * i.quantity - i.discount for i in items)
    tax = sum(round((i.unit_price * i.quantity - i.discount) * i.gst_rate / 100, 2) for i in items)
    return subtotal, tax
