from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional
from datetime import date, datetime
from app.db.database import get_session
from app.db.models import (
    Appointment, Doctor, Department, Visit, User,
    AppointmentStatus, Waitlist, WaitlistStatus
)
from app.modules.auth.router import get_current_user
from app.modules.appointment.schemas import (
    AppointmentCreate, AppointmentStatusUpdate,
    AppointmentReschedule, NotifyDelay, WaitlistCreate,
)
from app.modules.appointment.service import (
    generate_appointment_no, generate_visit_no, get_next_token,
    get_slot_availability, find_earliest_available, estimate_fee,
)

router = APIRouter()


# ─── Read endpoints ───────────────────────────────────────────────────────────

@router.get("")
def list_appointments(
    appointment_date: Optional[date] = Query(None),
    doctor_id: Optional[int] = Query(None),
    department_id: Optional[int] = Query(None),
    status: Optional[AppointmentStatus] = Query(None),
    patient_id: Optional[int] = Query(None),
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

    # Enrich with patient and doctor names
    result = []
    for a in appts:
        from app.db.models import Patient
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
        from app.db.models import Patient
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

    # Create visit record on check-in if not already exists
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
    session.commit()
    session.refresh(appt)
    visit_record = session.exec(select(Visit).where(Visit.appointment_id == appt.id)).first()
    return {
        "appointment": appt,
        "visit_id": visit_record.id if visit_record else None,
        "visit_no": visit_record.visit_no if visit_record else None,
    }


@router.post("/{appt_id}/reschedule")
def reschedule(
    appt_id: int,
    body: AppointmentReschedule,
    session: Session = Depends(get_session),
    _=Depends(get_current_user),
):
    appt = session.get(Appointment, appt_id)
    if not appt:
        raise HTTPException(404, "Appointment not found")
    if appt.status in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]:
        raise HTTPException(400, "Cannot reschedule a completed or cancelled appointment")

    avail = get_slot_availability(session, appt.doctor_id, body.new_date)
    if avail["is_full"] and avail["has_schedule"]:
        raise HTTPException(409, "Target slot is full")

    appt.appointment_date = body.new_date
    appt.appointment_time = body.new_time
    appt.status = AppointmentStatus.SCHEDULED
    appt.token_number = get_next_token(session, appt.doctor_id, body.new_date)
    if body.reason:
        appt.cancelled_reason = f"Rescheduled: {body.reason}"

    session.add(appt)
    session.commit()
    session.refresh(appt)
    return appt


@router.post("/{appt_id}/no-show")
def mark_no_show(
    appt_id: int,
    session: Session = Depends(get_session),
    _=Depends(get_current_user),
):
    appt = session.get(Appointment, appt_id)
    if not appt:
        raise HTTPException(404, "Appointment not found")
    appt.status = AppointmentStatus.NO_SHOW
    session.add(appt)

    # Notify first waitlisted patient for this doctor+date
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

    # Mark delay on all pending appointments for same doctor on same date
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
    _=Depends(get_current_user),
):
    appt = session.get(Appointment, appt_id)
    if not appt:
        raise HTTPException(404, "Appointment not found")
    appt.status = body.status
    if body.cancelled_reason:
        appt.cancelled_reason = body.cancelled_reason
    if body.status == AppointmentStatus.COMPLETED:
        appt.completed_at = datetime.utcnow()
    session.add(appt)
    session.commit()
    return appt
