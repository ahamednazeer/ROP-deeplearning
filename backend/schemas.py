from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ──────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    DOCTOR = "DOCTOR"


class EyeSide(str, Enum):
    LEFT = "LEFT"
    RIGHT = "RIGHT"
    BOTH = "BOTH"


# ──────────────────────────────────────────────
# User Schemas
# ──────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: UserRole = UserRole.DOCTOR
    email: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    role: UserRole
    email: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None


# ──────────────────────────────────────────────
# Auth Schemas
# ──────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


# ──────────────────────────────────────────────
# Patient Schemas
# ──────────────────────────────────────────────

class PatientCreate(BaseModel):
    name: str
    age: Optional[int] = None
    gestational_age_weeks: float
    birth_weight: float
    sex: int  # 0: Male, 1: Female
    eye_side: Optional[EyeSide] = None
    notes: Optional[str] = None


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gestational_age_weeks: Optional[float] = None
    birth_weight: Optional[float] = None
    sex: Optional[int] = None
    eye_side: Optional[EyeSide] = None
    notes: Optional[str] = None


class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    age: Optional[int] = None
    gestational_age_weeks: float
    birth_weight: float
    sex: int
    eye_side: Optional[EyeSide] = None
    notes: Optional[str] = None
    doctor_id: int
    created_at: Optional[datetime] = None


# ──────────────────────────────────────────────
# Prediction Schemas
# ──────────────────────────────────────────────

class PredictionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    doctor_id: int
    image_filename: str
    
    stage: int
    stage_prob: float
    zone: int
    zone_prob: float
    plus_disease: int
    plus_prob: float
    
    all_probabilities: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    patient_name: Optional[str] = None
    image_url: Optional[str] = None


class PredictionDetail(PredictionResponse):
    patient: Optional[PatientResponse] = None


# ──────────────────────────────────────────────
# ML Inference Result
# ──────────────────────────────────────────────

class InferenceResult(BaseModel):
    stage: int
    stage_prob: float
    zone: int
    zone_prob: float
    plus_disease: int
    plus_prob: float
    all_probabilities: Dict[str, List[float]]


# ──────────────────────────────────────────────
# System Stats
# ──────────────────────────────────────────────

class SystemStats(BaseModel):
    total_users: int
    total_patients: int
    total_predictions: int
    by_stage: Dict[str, int]
    by_role: Dict[str, int]
