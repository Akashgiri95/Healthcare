from pydantic import BaseModel
from typing import Optional, List


class LabTestItem(BaseModel):
    test_id: int
    test_name: str


class LabOrderCreate(BaseModel):
    consultation_id: int
    patient_id: int
    tests: List[LabTestItem]
    priority: str = "ROUTINE"
    clinical_notes: Optional[str] = None


class LabResultUpdate(BaseModel):
    item_id: int
    result_value: str
    result_unit: Optional[str] = None
    is_abnormal: bool = False
    remarks: Optional[str] = None
