from sqlmodel import Session, select, func
from app.db.models import Appointment, Visit, Doctor, Department, DoctorSlot, AppointmentStatus
from datetime import date, timedelta, datetime, time as time_type


def generate_appointment_no(session: Session) -> str:
    count = session.exec(select(func.count(Appointment.id))).one()
    return f"APT{date.today().strftime('%Y%m%d')}{str(count + 1).zfill(4)}"


def generate_visit_no(session: Session) -> str:
    count = session.exec(select(func.count(Visit.id))).one()
    return f"VIS{date.today().strftime('%Y%m%d')}{str(count + 1).zfill(4)}"


def get_next_token(session: Session, doctor_id: int, appt_date: date) -> int:
    last = session.exec(
        select(func.max(Appointment.token_number)).where(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date == appt_date,
        )
    ).one()
    return (last or 0) + 1


def get_slot_availability(session: Session, doctor_id: int, appt_date: date) -> dict:
    day_of_week = appt_date.weekday()  # 0=Monday, 6=Sunday

    slots = session.exec(
        select(DoctorSlot).where(
            DoctorSlot.doctor_id == doctor_id,
            DoctorSlot.day_of_week == day_of_week,
            DoctorSlot.is_active == True,
        )
    ).all()

    booked = session.exec(
        select(func.count(Appointment.id)).where(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date == appt_date,
            Appointment.status.notin_([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]),
        )
    ).one() or 0

    max_patients = sum(s.max_patients for s in slots) if slots else 20

    # Fetch all appointments for this doctor+date to compute per-slot counts
    day_appts = session.exec(
        select(Appointment).where(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date == appt_date,
            Appointment.status.notin_([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]),
        )
    ).all()

    # Get slot duration from doctor's avg_consultation_minutes (default 10)
    doctor = session.get(Doctor, doctor_id)
    duration_min = (doctor.avg_consultation_minutes if doctor and doctor.avg_consultation_minutes else 10)

    # Generate individual time slots from schedule windows
    time_slots = []
    for s in slots:
        current = datetime.combine(appt_date, s.start_time)
        end = datetime.combine(appt_date, s.end_time)
        while current + timedelta(minutes=duration_min) <= end:
            slot_start = current.time()
            slot_end = (current + timedelta(minutes=duration_min)).time()
            slot_booked = sum(
                1 for a in day_appts
                if a.appointment_time is not None
                and slot_start <= a.appointment_time < slot_end
            )
            time_slots.append({
                "time": slot_start.strftime("%H:%M"),
                "end_time": slot_end.strftime("%H:%M"),
                "booked": slot_booked,
                "is_full": slot_booked >= 1,
            })
            current += timedelta(minutes=duration_min)

    return {
        "date": appt_date.isoformat(),
        "slots": [
            {"start": s.start_time.strftime("%H:%M"), "end": s.end_time.strftime("%H:%M"), "max": s.max_patients}
            for s in slots
        ],
        "time_slots": time_slots,
        "slot_duration_min": duration_min,
        "booked": booked,
        "available": max(0, max_patients - booked),
        "max": max_patients,
        "is_full": booked >= max_patients,
        "has_schedule": len(slots) > 0,
    }


def find_earliest_available(session: Session, department_id: int, from_date: date, days_ahead: int = 14) -> list:
    doctors = session.exec(
        select(Doctor).where(Doctor.department_id == department_id, Doctor.is_active == True)
    ).all()

    results = []
    for doctor in doctors:
        user = doctor.user
        for i in range(days_ahead):
            check_date = from_date + timedelta(days=i)
            avail = get_slot_availability(session, doctor.id, check_date)
            if avail["has_schedule"] and avail["available"] > 0:
                results.append({
                    "doctor_id": doctor.id,
                    "doctor_name": user.full_name if user else f"Doctor {doctor.id}",
                    "specialization": doctor.specialization,
                    "date": check_date.isoformat(),
                    "available": avail["available"],
                    "booked": avail["booked"],
                    "max": avail["max"],
                    "slots": avail["slots"],
                })
                break

    results.sort(key=lambda x: x["date"])
    return results


def estimate_fee(session: Session, patient_id: int, doctor_id: int) -> dict:
    doctor = session.get(Doctor, doctor_id)
    if not doctor:
        return {"fee": 0, "visit_type": "NEW", "discount": 0}

    dept = session.get(Department, doctor.department_id)
    base_fee = doctor.consultation_fee if doctor.consultation_fee is not None else (dept.consultation_fee if dept else 500)
    followup_fee = dept.follow_up_fee if (dept and dept.follow_up_fee is not None) else round(base_fee * 0.3)

    last_appt = session.exec(
        select(Appointment).where(
            Appointment.patient_id == patient_id,
            Appointment.doctor_id == doctor_id,
            Appointment.status == AppointmentStatus.COMPLETED,
        ).order_by(Appointment.appointment_date.desc())
    ).first()

    if not last_appt:
        return {
            "fee": base_fee,
            "visit_type": "NEW",
            "discount": 0,
            "last_visit_date": None,
            "days_since": None,
            "followup_fee": followup_fee,
            "base_fee": base_fee,
        }

    days_since = (date.today() - last_appt.appointment_date).days

    if days_since <= 7:
        return {
            "fee": followup_fee,
            "visit_type": "FOLLOW_UP",
            "discount": base_fee - followup_fee,
            "last_visit_date": last_appt.appointment_date.isoformat(),
            "days_since": days_since,
            "followup_fee": followup_fee,
            "base_fee": base_fee,
        }
    elif days_since <= 30:
        half = round(base_fee * 0.5)
        return {
            "fee": half,
            "visit_type": "FOLLOW_UP",
            "discount": base_fee - half,
            "last_visit_date": last_appt.appointment_date.isoformat(),
            "days_since": days_since,
            "followup_fee": followup_fee,
            "base_fee": base_fee,
        }
    else:
        return {
            "fee": base_fee,
            "visit_type": "NEW",
            "discount": 0,
            "last_visit_date": last_appt.appointment_date.isoformat(),
            "days_since": days_since,
            "followup_fee": followup_fee,
            "base_fee": base_fee,
        }
