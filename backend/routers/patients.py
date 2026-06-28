"""
routers/patients.py
-------------------
Patient management routes:
  GET    /patients         → list patients (doctors see own; admins see all)
  POST   /patients         → create a patient (doctor_id from token)
  GET    /patients/{id}    → retrieve patient detail
  DELETE /patients/{id}    → delete patient (owner or admin)
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter(prefix="/patients", tags=["Patients"])


def _get_patient_or_404(patient_id: int, db: Session) -> models.Patient:
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return patient


def _check_patient_access(patient: models.Patient, current_user: models.User):
    """Raise 403 if a non-admin doctor tries to access someone else's patient."""
    if current_user.role != models.UserRole.ADMIN and patient.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this patient",
        )


@router.get("", response_model=List[schemas.PatientResponse])
def list_patients(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    List patients.
    - ADMIN: returns all patients.
    - DOCTOR: returns only their own patients.
    """
    query = db.query(models.Patient)
    if current_user.role != models.UserRole.ADMIN:
        query = query.filter(models.Patient.doctor_id == current_user.id)
    patients = query.order_by(models.Patient.created_at.desc()).all()
    return [schemas.PatientResponse.model_validate(p) for p in patients]


@router.post("", response_model=schemas.PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: schemas.PatientCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a new patient record. The doctor_id is set from the authenticated user."""
    eye_side = models.EyeSide(payload.eye_side.value) if payload.eye_side else None

    patient = models.Patient(
        name=payload.name,
        age=payload.age,
        gestational_age_weeks=payload.gestational_age_weeks,
        birth_weight=payload.birth_weight,
        sex=payload.sex,
        eye_side=eye_side,
        notes=payload.notes,
        doctor_id=current_user.id,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return schemas.PatientResponse.model_validate(patient)


@router.get("/{patient_id}", response_model=schemas.PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retrieve a single patient by ID."""
    patient = _get_patient_or_404(patient_id, db)
    _check_patient_access(patient, current_user)
    return schemas.PatientResponse.model_validate(patient)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a patient and all associated predictions."""
    patient = _get_patient_or_404(patient_id, db)
    _check_patient_access(patient, current_user)
    db.delete(patient)
    db.commit()
