from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, Text
from sqlalchemy.sql import func
from ..database import Base

class Patient(Base):
    __tablename__ = "patients"

    id               = Column(Integer, primary_key=True, index=True)
    uhid             = Column(String(20), unique=True, index=True, nullable=False)
    name             = Column(String(120), nullable=False)
    dob              = Column(Date, nullable=False)
    gender           = Column(String(20), nullable=False)
    blood_group      = Column(String(5))
    mobile           = Column(String(15), nullable=False, index=True)
    email            = Column(String(120))
    address          = Column(Text)
    city             = Column(String(60))
    state            = Column(String(60))
    id_type          = Column(String(30))
    id_number        = Column(String(50))
    abha_id          = Column(String(20), index=True)

    visit_type       = Column(String(20), default="OPD")
    department       = Column(String(60), nullable=False)
    referral_source  = Column(String(60))
    referral_name    = Column(String(100))

    payment_type     = Column(String(30), default="Self")
    insurance_name   = Column(String(100))
    insurance_policy = Column(String(50))

    emergency        = Column(Boolean, default=False)
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
