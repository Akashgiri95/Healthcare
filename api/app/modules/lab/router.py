from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db.database import get_session
from app.db.models import LabOrder, LabOrderItem, LabOrderStatus
from app.modules.auth.router import get_current_user
from app.modules.lab.schemas import LabOrderCreate, LabResultUpdate
from app.modules.lab.service import generate_order_no
from datetime import datetime

router = APIRouter()


@router.post("/orders", status_code=201)
def create_lab_order(body: LabOrderCreate, session: Session = Depends(get_session), current_user=Depends(get_current_user)):
    from app.db.models import Doctor
    from sqlmodel import select as _sel
    doc = session.exec(_sel(Doctor).where(Doctor.user_id == current_user.id)).first()
    if not doc:
        raise HTTPException(403, "Only doctors can create lab orders")
    order = LabOrder(
        order_no=generate_order_no(session),
        consultation_id=body.consultation_id,
        patient_id=body.patient_id,
        ordered_by=doc.id,
        priority=body.priority,
        clinical_notes=body.clinical_notes,
    )
    session.add(order)
    session.flush()
    for item in body.tests:
        session.add(LabOrderItem(order_id=order.id, **item.model_dump()))
    session.commit()
    session.refresh(order)
    return order


@router.get("/orders/{order_id}")
def get_order(order_id: int, session: Session = Depends(get_session), _=Depends(get_current_user)):
    order = session.get(LabOrder, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    items = session.exec(select(LabOrderItem).where(LabOrderItem.order_id == order_id)).all()
    return {"order": order, "items": items}


@router.patch("/orders/{order_id}/collect")
def mark_collected(order_id: int, session: Session = Depends(get_session), _=Depends(get_current_user)):
    order = session.get(LabOrder, order_id)
    if not order:
        raise HTTPException(404)
    order.status = LabOrderStatus.SAMPLE_COLLECTED
    order.collected_at = datetime.utcnow()
    session.add(order)
    session.commit()
    return {"message": "Sample collected"}


@router.post("/orders/{order_id}/results")
def enter_results(order_id: int, body: list[LabResultUpdate], session: Session = Depends(get_session), _=Depends(get_current_user)):
    order = session.get(LabOrder, order_id)
    if not order:
        raise HTTPException(404)
    for result in body:
        item = session.get(LabOrderItem, result.item_id)
        if item and item.order_id == order_id:
            item.result_value = result.result_value
            item.result_unit = result.result_unit
            item.is_abnormal = result.is_abnormal
            item.remarks = result.remarks
            session.add(item)
    order.status = LabOrderStatus.COMPLETED
    order.resulted_at = datetime.utcnow()
    session.add(order)
    session.commit()
    return {"message": "Results entered"}
