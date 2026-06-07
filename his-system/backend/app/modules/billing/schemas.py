from pydantic import BaseModel
from typing import Optional, List
from app.db.models import PaymentMode


class BillItemCreate(BaseModel):
    service_name: str
    service_code: Optional[str] = None
    category: str  # CONSULTATION, LAB, PHARMACY, RADIOLOGY
    quantity: int = 1
    unit_price: float
    discount: float = 0.0
    gst_rate: float = 0.0


class BillCreate(BaseModel):
    patient_id: int
    visit_id: Optional[int] = None
    items: List[BillItemCreate]
    discount_percent: float = 0.0
    notes: Optional[str] = None


class PaymentCreate(BaseModel):
    amount: float
    payment_mode: PaymentMode
    transaction_ref: Optional[str] = None
    notes: Optional[str] = None
