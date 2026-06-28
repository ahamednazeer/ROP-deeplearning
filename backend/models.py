from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean,
    DateTime, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from database import Base


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    DOCTOR = "DOCTOR"


class EyeSide(str, enum.Enum):
    LEFT = "LEFT"
    RIGHT = "RIGHT"
    BOTH = "BOTH"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.DOCTOR)
    email = Column(String(150), unique=True, index=True, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patients = relationship("Patient", back_populates="doctor", foreign_keys="Patient.doctor_id")
    predictions = relationship("Prediction", back_populates="doctor", foreign_keys="Prediction.doctor_id")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    age = Column(Integer, nullable=True)
    gestational_age_weeks = Column(Float, nullable=False)
    birth_weight = Column(Float, nullable=False)
    sex = Column(Integer, nullable=False)  # 0: Male, 1: Female
    eye_side = Column(SAEnum(EyeSide), nullable=True)
    notes = Column(Text, nullable=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    doctor = relationship("User", back_populates="patients", foreign_keys=[doctor_id])
    predictions = relationship("Prediction", back_populates="patient", cascade="all, delete-orphan")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    image_filename = Column(String(255), nullable=False)
    
    stage = Column(Integer, nullable=False)
    stage_prob = Column(Float, nullable=False)
    zone = Column(Integer, nullable=False)
    zone_prob = Column(Float, nullable=False)
    plus_disease = Column(Integer, nullable=False)
    plus_prob = Column(Float, nullable=False)

    all_probabilities = Column(Text, nullable=True)  # JSON string
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient", back_populates="predictions")
    doctor = relationship("User", back_populates="predictions", foreign_keys=[doctor_id])
