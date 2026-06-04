import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional, List
from datetime import date, datetime
from app.db.database import get_session
from app.db.models import (
    Appointment, Doctor, Department, Patient, Visit, User,
    AppointmentStatus, Waitlist, WaitlistStatus,
    AppointmentAuditLog, DoctorBlock, AuditAction,
)
from app.modules.auth.router import get_current_user
from app.modules.appointment.schemas import (
    AppointmentCreate, AppointmentStatusUpdate,
    AppointmentReschedule, NotifyDelay, WaitlistCreate,
    CancelBody, BulkCancelBody, BulkTransferBody, DoctorBlockCreate,
)
from app.modules.appointment.service import (
    generate_appointment_no, generate_visit_no, get_next_token,
    get_slot_availability, find_earliest_available, estimate_fee,
)

router = APIRouter()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _log_action(
    session: Session,
    appointment_id: int,
    action: AuditAction,
    performed_by: int,
    note: str = None,
    old_val: str = None,
    new_val: str = None,
):
    """Write an audit entry — caller must commit."""
    session.add(AppointmentAuditLog(
        appointment_id=appointment_id,
        action=action,
        performed_by=performed_by,
        note=note,
        old_value=old_val,
        new_value=new_val,
    ))


def _enrich(session: Session, appts: list) -> list:
    """Add patient/doctor/department names to appointment dicts."""
    result = []
    for a in appts:
        pat = session.get(Patient, a.patient_id)
        doc = session.get(Doctor, a.doctor_id)
        doc_user = session.get(User, doc.user_id) if doc else None
        dept = session.get(Department, a.department_id)
        result.append({
            **a.model_dump(),
            "patient_name": f"{pat.first_name} {pat.last_name}" if pat else "",
            "patient_uhid": pat.uhid if pat else "",
            "patient_phone": pat.phone if pat else "",
            "doctor_name": doc_user.full_name if doc_user else "",
            "department_name": dept.name if dept else "",
        })
    return result


# ─── Read endpoints ───────────────────────────────────────────────────────────

@router.get("")
def list_appointments(
    appointment_date: Optional[date] = Query(None),
    doctor_id: Optional[int] = Query(None),
    department_id: Optional[int] = Query(None),
    status: Optional[AppointmentStatus] = Query(None),
    patient_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    _=Depends(get_current_user),
):
    query = select(Appointment)
    if appointment_date:
        query = query.where(Appointment.appointment_date == appointment_date)
    if doctor_id:
        query = query.where(Appointment.doctor_id == doctor_id)
    if department_id:
        query = query.where(Appointment.department_id == department_id)
    if status:
        query = query.where(Appointment.status == status)
    if patient_id:
        query = query.where(Appointment.patient_id == patient_id)

    appts = session.exec(query.order_by(Appointment.priority.desc(), Appointment.token_number)).all()

    if search:
        search_lower = search.lower()
        filtered = []
        for a in appts:
            pat = session.get(Patient, a.patient_id)
            if pat and (
                search_lower in pat.first_name.lower() or
                search_lower in pat.last_name.lower() or
                search_lower in pat.uhid.lower() or
                search_lower in (pat.phone or "")
            ):
                filtered.append(a)
        appts = filtered

    return _enrich(session, appts)


@router.get("/stats")
def appointment_stats(
    stats_date: Optional[date] = Query(None),
    session: Session = Depends(get_session),
    _=Depends(get_current_user),
):
    target = stats_date or date.today()
    appts = session.exec(
        select(Appointment).where(Appointment.appointment_date == target)
    ).all()

    counts = {s.value: 0 for s in AppointmentStatus}
    for a in appts:
        counts[a.status.value] += 1

    return {
        "date": target,
        "total": len(appts),
        "by_status": counts,
        "pending": counts["SCHEDULED"] + counts["CHECKED_IN"] + counts["IN_QUEUE"] + counts["WITH_DOCTOR"],
        "completed": counts["COMPLETED"],
        "cancelled": counts["CANCELLED"],
        "no_show": counts["NO_SHOW"],
    }


@router.get("/duplicate-check")
def duplicate_check(
    patient_id: int = Query(...),
    doctor_id: int = Query(...),
    check_date: Optional[date] = Query(None),
    session: Session = Depends(get_session),
    _=Depends(get_current_user),
):
    target = check_date or date.today()
    existing = session.exec(
        select(Appointment).where(
            Appointment.patient_id == patient_id,
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date == target,
            Appointment.status.not_in([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]),
        )
    ).first()
    return {"duplicate": existing is not None, "appointment": existing}


@router.get("/available-slots")
def available_slots(
    doctor_id: int = Query(...),
    date_: date = Query(..., alias="date"),
    session: Session = Depends(get_session),
    _=Depends(get_current_user),
):
    return get_slot_availability(session, doctor_id, date_)


@router.get("/earliest-available")
def earliest_available(
    department_id: int = Query(...),
    from_date: Optional[date] = Query(None),
    days_ahead: int = Query(14),
    session: Session = Depends(get_session),
    _=Depends(get_current_user),
):
    start = from_date or date.today()
    return find_earliest_available(session, department_id, start, days_ahead)


@router.get("/fee-estimate")
def fee_estimate(
    patient_id: int = Query(...),
    doctor_id: int = Query(...),
    session: Session = Depends(get_session),
    _=Depends(get_current_user),
):
    return estimate_fee(session, patient_id, doctor_id)


@router.get("/today/queue")
def today_queue(
    doctor_id: Optional[int] = Query(None),
    department_id: Optional[int] = Query(None),
    session: Session = Depends(get_session),
    _=Depends(get_current_user),
):
    today = date.today()
    query = select(Appointment).where(
        Appointment.appointment_date == today,
        Appointment.status.in_([
            AppointmentStatus.CHECKED_IN,
            AppointmentStatus.IN_QUEUE,
            AppointmentStatus.WITH_DOCTOR,
        ])
    )
    if doctor_id:
        query = query.where(Appointment.doctor_id == doctor_id)
    if department_id:
        query = query.where(Appointment.department_id == department_id)
    return session.exec(query.order_by(Appointment.priority.desc(), Appointment.token_number)).all()


@router.get("/waitlist")
def get_waitlist(
    doctor_id: Optional[int] = Query(None),
    preferred_date: Optional[date] = Query(None),
    session: Session = Depends(get_session),
    _=Depends(get_current_user),
):
    query = select(Waitlist).where(Waitlist.status == WaitlistStatus.WAITING)
    if doctor_id:
        query = query.where(Waitlist.doctor_id == doctor_id)
    if preferred_date:
        query = query.where(Waitlist.preferred_date == preferred_date)
    entries = session.exec(query.order_by(Waitlist.position)).all()

    result = []
    for w in entries:
        pat = session.get(Patient, w.patient_id)
        doc = session.get(Doctor, w.doctor_id)
        doc_user = session.get(User, doc.user_id) if doc else None
        result.append({
            **w.model_dump(),
            "patient_name": f"{pat.first_name} {pat.last_name}" if pat else "",
            "patient_uhid": pat.uhid if pat else "",
            "doctor_name": doc_user.full_name if doc_user else "",
        })
    return result


@router.get("/{appt_id}/audit")
def get_audit_log(
    appt_id: int,
    session: Session = Depends(get_session),
    _=Depends(get_current_user),
):
    appt = session.get(Appointment, appt_id)
    if not appt:
        raise HTTPException(404, "Appointment not found")
    logs = session.exec(
        select(AppointmentAuditLog)
        .where(AppointmentAuditLog.appointment_id == appt_id)
        .order_by(AppointmentAuditLog.created_at)
    ).all()
    result = []
    for log in logs:
        user = session.get(User, log.performed_by)
        result.append({
            **log.model_dump(),
            "performed_by_name": user.full_name if user else "Unknown",
            "performed_by_role": user.role if user else None,
        })
    return result


# ─── Doctor block endpoints ───────────────────────────────────────────────────

@router.get("/blocks")
def list_blocks(
    doctor_id: Optional[int] = Query(None),
    block_date: Optional[date] = Query(None),
    session: Session = Depends(get_session),
    _=Depends(get_current_user),
):
    query = select(DoctorBlock).where(DoctorBlock.is_active == True)
    if doctor_id:
        query = query.where(DoctorBlock.doctor_id == doctor_id)
    if block_date:
        query = query.where(DoctorBlock.block_date == block_date)
    blocks = session.exec(query.order_by(DoctorBlock.block_date)).all()
    result = []
    for b in blocks:
        doc = session.get(Doctor, b.doctor_id)
        doc_user = session.get(User, doc.user_id) if doc else None
        result.append({
            **b.model_dump(),
            "doctor_name": doc_user.full_name if doc_user else "",
        })
    return result


@router.post("/blocks", status_code=201)
def create_block(
    body: DoctorBlockCreate,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    block = DoctorBlock(**body.model_dump(), created_by=current_user.id)
    session.add(block)
    session.commit()
    session.refresh(block)
    return block


@router.delete("/blocks/{block_id}")
def delete_block(
    block_id: int,
    session: Session = Depends(get_session),
    _=Depends(get_current_user),
):
    block = session.get(DoctorBlock, block_id)
    if not block:
        raise HTTPException(404, "Block not found")
    block.is_active = False
    session.add(block)
    session.commit()
    return {"message": "Block removed"}


# ─── Create endpoints ─────────────────────────────────────────────────────────

@router.post("", status_code=201)
def create_appointment(
    body: AppointmentCreate,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    avail = get_slot_availability(session, body.doctor_id, body.appointment_date)
    if avail["is_full"] and avail["has_schedule"]:
        raise HTTPException(409, "Slot full — consider adding patient to waitlist")

    token = get_next_token(session, body.doctor_id, body.appointment_date)
    appt = Appointment(
        **body.model_dump(),
        appointment_no=generate_appointment_no(session),
        token_number=token,
        booked_by=current_user.id,
    )
    session.add(appt)
    session.flush()  # get appt.id before logging
    _log_action(session, appt.id, AuditAction.CREATED, current_user.id,
                note=f"Booked for {body.appointment_date} token #{token}")
    session.commit()
    session.refresh(appt)
    return appt


@router.post("/waitlist", status_code=201)
def join_waitlist(
    body: WaitlistCreate,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    existing_position = session.exec(
        select(func.max(Waitlist.position)).where(
            Waitlist.doctor_id == body.doctor_id,
            Waitlist.preferred_date == body.preferred_date,
            Waitlist.status == WaitlistStatus.WAITING,
        )
    ).one() or 0

    entry = Waitlist(
        **body.model_dump(),
        position=existing_position + 1,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@router.post("/bulk-cancel")
def bulk_cancel(
    body: BulkCancelBody,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    cancelled = []
    skipped = []
    for appt_id in body.appointment_ids:
        appt = session.get(Appointment, appt_id)
        if not appt or appt.status in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]:
            skipped.append(appt_id)
            continue
        old_status = appt.status.value
        appt.status = AppointmentStatus.CANCELLED
        appt.cancelled_reason = body.reason
        session.add(appt)
        _log_action(session, appt.id, AuditAction.CANCELLED, current_user.id,
                    note=body.reason, old_val=old_status, new_val="CANCELLED")
        cancelled.append(appt_id)
    session.commit()
    return {"cancelled": cancelled, "skipped": skipped}


@router.post("/bulk-transfer")
def bulk_transfer(
    body: BulkTransferBody,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    to_doc = session.get(Doctor, body.to_doctor_id)
    if not to_doc:
        raise HTTPException(404, "Target doctor not found")

    # Collect affected dates to check capacity
    appts_to_move = []
    for appt_id in body.appointment_ids:
        appt = session.get(Appointment, appt_id)
        if appt and appt.status not in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]:
            appts_to_move.append(appt)

    # Capacity check per date
    dates_needed = {}
    for appt in appts_to_move:
        dates_needed.setdefault(appt.appointment_date, 0)
        dates_needed[appt.appointment_date] += 1

    for check_date, count_moving in dates_needed.items():
        avail = get_slot_availability(session, body.to_doctor_id, check_date)
        remaining_capacity = avail.get("remaining_slots", to_doc.max_patients_per_slot)
        if count_moving > remaining_capacity:
            raise HTTPException(
                409,
                f"Target doctor has only {remaining_capacity} slots available on {check_date} "
                f"but {count_moving} appointments are being transferred."
            )

    transferred = []
    for appt in appts_to_move:
        old_doc_id = appt.doctor_id
        appt.doctor_id = body.to_doctor_id
        appt.token_number = get_next_token(session, body.to_doctor_id, appt.appointment_date)
        session.add(appt)
        _log_action(session, appt.id, AuditAction.TRANSFERRED, current_user.id,
                    note=body.reason,
                    old_val=str(old_doc_id),
                    new_val=str(body.to_doctor_id))
        transferred.append(appt.id)

    session.commit()
    return {"transferred": transferred, "count": len(transferred)}


# ─── Appointment action endpoints ─────────────────────────────────────────────

@router.post("/{appt_id}/checkin")
def checkin(
    appt_id: int,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    appt = session.get(Appointment, appt_id)
    if not appt:
        raise HTTPException(404, "Appointment not found")
    if appt.status not in [AppointmentStatus.SCHEDULED, AppointmentStatus.CHECKED_IN]:
        raise HTTPException(400, f"Cannot check in appointment with status {appt.status}")

    appt.status = AppointmentStatus.CHECKED_IN
    appt.checked_in_at = datetime.utcnow()

    existing_visit = session.exec(select(Visit).where(Visit.appointment_id == appt.id)).first()
    if not existing_visit:
        visit = Visit(
            visit_no=generate_visit_no(session),
            patient_id=appt.patient_id,
            appointment_id=appt.id,
            department_id=appt.department_id,
            visit_type=appt.visit_type,
        )
        session.add(visit)

    session.add(appt)
    _log_action(session, appt.id, AuditAction.CHECKED_IN, current_user.id)
    session.commit()
    session.refresh(appt)
    visit_record = session.exec(select(Visit).where(Visit.appointment_id == appt.id)).first()
    return {
        "appointment": appt,
        "visit_id": visit_record.id if visit_record else None,
        "visit_no": visit_record.visit_no if visit_record else None,
    }


@router.post("/{appt_id}/cancel")
def cancel_appointment(
    appt_id: int,
    body: CancelBody,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    appt = session.get(Appointment, appt_id)
    if not appt:
        raise HTTPException(404, "Appointment not found")
    if appt.status in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]:
        raise HTTPException(400, f"Cannot cancel appointment with status {appt.status}")

    old_status = appt.status.value
    appt.status = AppointmentStatus.CANCELLED
    appt.cancelled_reason = body.reason
    session.add(appt)
    _log_action(session, appt.id, AuditAction.CANCELLED, current_user.id,
                note=body.note or body.reason,
                old_val=old_status, new_val="CANCELLED")

    # Notify first waitlisted patient
    next_wait = session.exec(
        select(Waitlist).where(
            Waitlist.doctor_id == appt.doctor_id,
            Waitlist.preferred_date == appt.appointment_date,
            Waitlist.status == WaitlistStatus.WAITING,
        ).order_by(Waitlist.position)
    ).first()
    if next_wait:
        next_wait.status = WaitlistStatus.NOTIFIED
        next_wait.notified_at = datetime.utcnow()
        session.add(next_wait)

    session.commit()
    return {"message": "Appointment cancelled", "waitlist_notified": next_wait is not None}


@router.post("/{appt_id}/reschedule")
def reschedule(
    appt_id: int,
    body: AppointmentReschedule,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    appt = session.get(Appointment, appt_id)
    if not appt:
        raise HTTPException(404, "Appointment not found")
    if appt.status in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]:
        raise HTTPException(400, "Cannot reschedule a completed or cancelled appointment")

    avail = get_slot_availability(session, appt.doctor_id, body.new_date)
    if avail["is_full"] and avail["has_schedule"]:
        raise HTTPException(409, "Target slot is full")

    old_val = json.dumps({"date": str(appt.appointment_date), "time": str(appt.appointment_time)})
    new_val = json.dumps({"date": str(body.new_date), "time": str(body.new_time)})

    appt.appointment_date = body.new_date
    appt.appointment_time = body.new_time
    appt.status = AppointmentStatus.SCHEDULED
    appt.token_number = get_next_token(session, appt.doctor_id, body.new_date)
    if body.reason:
        appt.cancelled_reason = f"Rescheduled: {body.reason}"

    session.add(appt)
    _log_action(session, appt.id, AuditAction.RESCHEDULED, current_user.id,
                note=body.reason, old_val=old_val, new_val=new_val)
    session.commit()
    session.refresh(appt)
    return appt


@router.post("/{appt_id}/no-show")
def mark_no_show(
    appt_id: int,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    appt = session.get(Appointment, appt_id)
    if not appt:
        raise HTTPException(404, "Appointment not found")
    appt.status = AppointmentStatus.NO_SHOW
    session.add(appt)
    _log_action(session, appt.id, AuditAction.NO_SHOW, current_user.id)

    next_wait = session.exec(
        select(Waitlist).where(
            Waitlist.doctor_id == appt.doctor_id,
            Waitlist.preferred_date == appt.appointment_date,
            Waitlist.status == WaitlistStatus.WAITING,
        ).order_by(Waitlist.position)
    ).first()
    if next_wait:
        next_wait.status = WaitlistStatus.NOTIFIED
        next_wait.notified_at = datetime.utcnow()
        session.add(next_wait)

    session.commit()
    return {"message": "Marked as no-show", "waitlist_notified": next_wait is not None}


@router.post("/{appt_id}/notify-delay")
def notify_delay(
    appt_id: int,
    body: NotifyDelay,
    session: Session = Depends(get_session),
    _=Depends(get_current_user),
):
    appt = session.get(Appointment, appt_id)
    if not appt:
        raise HTTPException(404, "Appointment not found")

    pending = session.exec(
        select(Appointment).where(
            Appointment.doctor_id == appt.doctor_id,
            Appointment.appointment_date == appt.appointment_date,
            Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.CHECKED_IN]),
        )
    ).all()
    for p in pending:
        p.delay_minutes = body.delay_minutes
        session.add(p)

    session.commit()
    return {"message": f"Delay of {body.delay_minutes} min notified to {len(pending)} patients"}


@router.patch("/{appt_id}/status")
def update_status(
    appt_id: int,
    body: AppointmentStatusUpdate,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    appt = session.get(Appointment, appt_id)
    if not appt:
        raise HTTPException(404, "Appointment not found")
    old_status = appt.status.value
    appt.status = body.status
    if body.cancelled_reason:
        appt.cancelled_reason = body.cancelled_reason
    if body.status == AppointmentStatus.COMPLETED:
        appt.completed_at = datetime.utcnow()
    session.add(appt)
    _log_action(session, appt.id, AuditAction.STATUS_CHANGED, current_user.id,
                old_val=old_status, new_val=body.status.value)
    session.commit()
    return appt
