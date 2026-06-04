from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db.database import get_session
from app.db.models import Bill, BillItem, Payment, BillingStatus
from app.modules.auth.router import get_current_user
from app.modules.billing.schemas import BillCreate, PaymentCreate
from app.modules.billing.service import generate_bill_no, calculate_totals
from datetime import datetime

router = APIRouter()


@router.post("", status_code=201)
def create_bill(body: BillCreate, session: Session = Depends(get_session), current_user=Depends(get_current_user)):
    bill = Bill(
        bill_no=generate_bill_no(session),
        patient_id=body.patient_id,
        visit_id=body.visit_id,
        created_by=current_user.id,
        discount_percent=body.discount_percent,
        notes=body.notes,
    )
    session.add(bill)
    session.flush()

    subtotal = 0.0
    tax_total = 0.0
    for item in body.items:
        line_total = item.unit_price * item.quantity - item.discount
        gst = round(line_total * item.gst_rate / 100, 2)
        bi = BillItem(
            bill_id=bill.id,
            service_name=item.service_name,
            service_code=item.service_code,
            category=item.category,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount=item.discount,
            gst_rate=item.gst_rate,
            gst_amount=gst,
            total=line_total + gst,
        )
        session.add(bi)
        subtotal += line_total
        tax_total += gst

    discount_amt = round(subtotal * body.discount_percent / 100, 2)
    total = subtotal - discount_amt + tax_total
    bill.subtotal = subtotal
    bill.tax_amount = tax_total
    bill.discount_amount = discount_amt
    bill.total_amount = total
    bill.due_amount = total
    session.add(bill)
    session.commit()
    session.refresh(bill)
    return bill


@router.post("/{bill_id}/pay")
def record_payment(bill_id: int, body: PaymentCreate, session: Session = Depends(get_session), current_user=Depends(get_current_user)):
    bill = session.get(Bill, bill_id)
    if not bill:
        raise HTTPException(404, "Bill not found")
    payment = Payment(bill_id=bill_id, received_by=current_user.id, **body.model_dump())
    session.add(payment)
    bill.paid_amount += body.amount
    bill.due_amount = bill.total_amount - bill.paid_amount
    if bill.due_amount <= 0:
        bill.status = BillingStatus.PAID
        bill.paid_at = datetime.utcnow()
    else:
        bill.status = BillingStatus.PARTIAL
    session.add(bill)
    session.commit()
    return bill


@router.get("/{bill_id}")
def get_bill(bill_id: int, session: Session = Depends(get_session), _=Depends(get_current_user)):
    bill = session.get(Bill, bill_id)
    if not bill:
        raise HTTPException(404)
    items = session.exec(select(BillItem).where(BillItem.bill_id == bill_id)).all()
    payments = session.exec(select(Payment).where(Payment.bill_id == bill_id)).all()
    return {"bill": bill, "items": items, "payments": payments}


@router.get("/patient/{patient_id}")
def patient_bills(patient_id: int, session: Session = Depends(get_session), _=Depends(get_current_user)):
    return session.exec(select(Bill).where(Bill.patient_id == patient_id)).all()
