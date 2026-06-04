from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from typing import Optional
from app.db.database import get_session
from app.db.models import Department, Doctor, Drug, LabTest, ICD10, User, Company
from app.modules.auth.router import get_current_user

router = APIRouter()


@router.get("/departments")
def list_departments(session: Session = Depends(get_session), _=Depends(get_current_user)):
    return session.exec(select(Department).where(Department.is_active == True)).all()


@router.get("/doctors")
def list_doctors(
    department_id: Optional[int] = Query(None),
    session: Session = Depends(get_session),
    _=Depends(get_current_user),
):
    query = select(Doctor).where(Doctor.is_active == True)
    if department_id:
        query = query.where(Doctor.department_id == department_id)
    doctors = session.exec(query).all()

    result = []
    for doc in doctors:
        user = session.get(User, doc.user_id)
        dept = session.get(Department, doc.department_id)
        result.append({
            "id": doc.id,
            "user_id": doc.user_id,
            "department_id": doc.department_id,
            "department_name": dept.name if dept else "",
            "full_name": user.full_name if user else f"Doctor {doc.id}",
            "specialization": doc.specialization,
            "qualification": doc.qualification,
            "experience_years": doc.experience_years,
            "consultation_fee": doc.consultation_fee,
            "max_patients_per_slot": doc.max_patients_per_slot,
            "avg_consultation_minutes": doc.avg_consultation_minutes,
            "registration_number": doc.registration_number,
            "is_active": doc.is_active,
        })
    return result


@router.get("/drugs")
def search_drugs(q: str = Query(""), session: Session = Depends(get_session), _=Depends(get_current_user)):
    return session.exec(
        select(Drug).where(Drug.is_active == True, Drug.name.icontains(q)).limit(20)
    ).all()


@router.get("/lab-tests")
def search_lab_tests(q: str = Query(""), session: Session = Depends(get_session), _=Depends(get_current_user)):
    return session.exec(
        select(LabTest).where(LabTest.is_active == True, LabTest.name.icontains(q)).limit(20)
    ).all()


@router.get("/icd10")
def search_icd10(q: str = Query(""), session: Session = Depends(get_session), _=Depends(get_current_user)):
    return session.exec(
        select(ICD10).where(
            ICD10.is_active == True,
            ICD10.description.icontains(q) | ICD10.code.icontains(q)
        ).limit(20)
    ).all()


@router.get("/companies")
def list_companies(session: Session = Depends(get_session), _=Depends(get_current_user)):
    return session.exec(select(Company).where(Company.is_active == True)).all()
