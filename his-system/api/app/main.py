from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import create_db_and_tables
from app.modules.auth.router import router as auth_router
from app.modules.patient.router import router as patient_router
from app.modules.appointment.router import router as appointment_router
from app.modules.clinical.router import router as clinical_router
from app.modules.prescription.router import router as prescription_router
from app.modules.lab.router import router as lab_router
from app.modules.billing.router import router as billing_router
from app.modules.masters.router import router as masters_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Hospital Information System — OPD Module",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(patient_router, prefix="/api/patients", tags=["Patients"])
app.include_router(appointment_router, prefix="/api/appointments", tags=["Appointments"])
app.include_router(clinical_router, prefix="/api/clinical", tags=["Clinical"])
app.include_router(prescription_router, prefix="/api/prescriptions", tags=["Prescriptions"])
app.include_router(lab_router, prefix="/api/lab", tags=["Lab"])
app.include_router(billing_router, prefix="/api/billing", tags=["Billing"])
app.include_router(masters_router, prefix="/api/masters", tags=["Masters"])


@app.get("/")
def root():
    return {"status": "HIS API running", "docs": "/docs"}
