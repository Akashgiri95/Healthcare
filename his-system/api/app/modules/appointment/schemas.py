from pydantic import BaseModel
from typing import Optional, List
from datetime import date, time
from app.db.models import AppointmentType, AppointmentStatus, VisitType, BlockReason


class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    department_id: int
    appointment_date: date
    appointment_time: time
    appointment_type: AppointmentType = AppointmentType.WALK_IN
    visit_type: VisitType = VisitType.NEW
    chief_complaint: Optional[str] = None
    priority: int = 0
    parent_appointment_id: Optional[int] = None


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus
    cancelled_reason: Optional[str] = None


class AppointmentReschedule(BaseModel):
    new_date: date
    new_time: time
    reason: Optional[str] = None


class NotifyDelay(BaseModel):
    delay_minutes: int


class WaitlistCreate(BaseModel):
    patient_id: int
    doctor_id: int
    department_id: int
    preferred_date: date
    notes: Optional[str] = None


class CancelBody(BaseModel):
    reason: str
    note: Optional[str] = None


class BulkCancelBody(BaseModel):
    appointment_ids: List[int]
    reason: str


class BulkTransferBody(BaseModel):
    appointment_ids: List[int]
    to_doctor_id: int
    reason: str


class DoctorBlockCreate(BaseModel):
    doctor_id: int
    block_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    reason: BlockReason
    notes: Optional[str] = None
