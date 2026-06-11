from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Hospital Information System API",
    description="Tier 1 Hospital HIS — OPD Module",
    version="0.1.0"
)

@app.on_event("startup")
def on_startup():
    from app.db.database import create_db_and_tables
    create_db_and_tables()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
from app.modules.auth.router import router as auth_router
from app.modules.patient.router import router as patient_router
from app.modules.appointment.router import router as appointment_router
from app.modules.clinical.router import router as clinical_router
from app.modules.prescription.router import router as prescription_router
from app.modules.lab.router import router as lab_router
from app.modules.billing.router import router as billing_router
from app.modules.masters.router import router as masters_router

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
    return {"message": "HIS API running", "docs": "/docs"}
