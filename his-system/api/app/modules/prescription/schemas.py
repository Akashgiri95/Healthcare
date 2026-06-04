from pydantic import BaseModel
from typing import Optional, List


class PrescriptionItemCreate(BaseModel):
    drug_id: int
    drug_name: str
    dosage: str
    frequency: str
    duration: str
    route: str = "Oral"
    instructions: Optional[str] = None
    quantity: int = 0


class PrescriptionCreate(BaseModel):
    consultation_id: int
    patient_id: int
    items: List[PrescriptionItemCreate]
    notes: Optional[str] = None
