"""
routers/predictions.py
----------------------
Prediction routes:
  POST /predictions/upload     → upload retinal image + run inference + save result
  GET  /predictions            → list predictions (role-aware)
  GET  /predictions/{id}       → prediction detail with image URL
  DELETE /predictions/{id}     → delete prediction record (and image file)
"""

import json
import os
import uuid
import logging
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user
from ml.inference import predict_image, is_model_loaded

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predictions", tags=["Predictions"])

# Uploads directory (resolved relative to this file → backend/uploads/)
UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"


def _ensure_uploads_dir():
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _get_prediction_or_404(prediction_id: int, db: Session) -> models.Prediction:
    pred = db.query(models.Prediction).filter(models.Prediction.id == prediction_id).first()
    if not pred:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found")
    return pred


def _check_prediction_access(prediction: models.Prediction, current_user: models.User):
    if current_user.role != models.UserRole.ADMIN and prediction.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this prediction",
        )


def _build_image_url(request: Request, filename: str) -> str:
    base = str(request.base_url).rstrip("/")
    return f"{base}/static/uploads/{filename}"


# ──────────────────────────────────────────────
# Upload & Predict
# ──────────────────────────────────────────────

@router.post("/upload", response_model=schemas.PredictionResponse, status_code=status.HTTP_201_CREATED)
async def upload_and_predict(
    request: Request,
    patient_id: int = Form(...),
    notes: Optional[str] = Form(None),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Upload a retinal image, run ROP inference, and persist the result.

    Form fields:
      - patient_id (int, required)
      - notes (str, optional)
      - image (file, required) – JPEG/PNG retinal photograph
    """
    _ensure_uploads_dir()

    # Validate patient exists and is accessible
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    if current_user.role != models.UserRole.ADMIN and patient.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to add a prediction for this patient",
        )

    # Validate file type
    allowed_content_types = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
    if image.content_type not in allowed_content_types:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported image type '{image.content_type}'. Allowed: JPEG, PNG, WebP",
        )

    # Read image bytes
    image_bytes = await image.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    # Save image with unique filename
    ext = Path(image.filename).suffix.lower() if image.filename else ".jpg"
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    save_path = UPLOADS_DIR / unique_filename
    save_path.write_bytes(image_bytes)
    logger.info(f"Image saved to {save_path}")

    # Run ML inference
    if not is_model_loaded():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML model is not loaded. Please ensure PyTorch model is initialized.",
        )

    try:
        # Patient sex in schema: 0=Male, 1=Female
        # Inference script: 1=Male, 0=Female
        sex_val = 1 if patient.sex == 0 else 0
        ga_val = float(patient.gestational_age_weeks) if patient.gestational_age_weeks else 31.3   # dataset mean
        bw_val = float(patient.birth_weight) if patient.birth_weight else 1660.0                   # dataset mean
        
        result = predict_image(image_bytes, ga=ga_val, bw=bw_val, sex=sex_val)
    except Exception as exc:
        logger.error(f"Inference failed: {exc}")
        # Clean up saved file on inference failure
        save_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {str(exc)}",
        )

    # Persist prediction to DB
    prediction = models.Prediction(
        patient_id=patient_id,
        doctor_id=current_user.id,
        image_filename=unique_filename,
        stage=result["stage_idx"],
        stage_prob=result["stage_confidence"],
        zone=result["zone_idx"],
        zone_prob=result["zone_confidence"],
        plus_disease=result["plus_idx"],
        plus_prob=result["plus_confidence"],
        all_probabilities=json.dumps({
            "stage": result["stage_probs"],
            "zone": result["zone_probs"],
            "plus": result["plus_probs"]
        }),
        notes=notes,
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    response = schemas.PredictionResponse.model_validate(prediction)
    response.patient_name = patient.name
    response.image_url = _build_image_url(request, unique_filename)
    return response


# ──────────────────────────────────────────────
# List predictions
# ──────────────────────────────────────────────

@router.get("", response_model=List[schemas.PredictionResponse])
def list_predictions(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    List predictions.
    - ADMIN: all predictions.
    - DOCTOR: only their own.
    Includes patient name and image URL for each record.
    """
    query = db.query(models.Prediction)
    if current_user.role != models.UserRole.ADMIN:
        query = query.filter(models.Prediction.doctor_id == current_user.id)

    predictions = query.order_by(models.Prediction.created_at.desc()).all()

    results = []
    for pred in predictions:
        r = schemas.PredictionResponse.model_validate(pred)
        r.patient_name = pred.patient.name if pred.patient else None
        r.image_url = _build_image_url(request, pred.image_filename)
        results.append(r)
    return results


# ──────────────────────────────────────────────
# Get single prediction
# ──────────────────────────────────────────────

@router.get("/{prediction_id}", response_model=schemas.PredictionDetail)
def get_prediction(
    prediction_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retrieve a single prediction with patient details and image URL."""
    pred = _get_prediction_or_404(prediction_id, db)
    _check_prediction_access(pred, current_user)

    detail = schemas.PredictionDetail.model_validate(pred)
    detail.patient_name = pred.patient.name if pred.patient else None
    detail.image_url = _build_image_url(request, pred.image_filename)
    if pred.patient:
        detail.patient = schemas.PatientResponse.model_validate(pred.patient)
    return detail


# ──────────────────────────────────────────────
# Delete prediction
# ──────────────────────────────────────────────

@router.delete("/{prediction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prediction(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a prediction record and its associated image file."""
    pred = _get_prediction_or_404(prediction_id, db)
    _check_prediction_access(pred, current_user)

    # Remove image file from disk
    image_path = UPLOADS_DIR / pred.image_filename
    if image_path.exists():
        image_path.unlink()
        logger.info(f"Deleted image file: {image_path}")

    db.delete(pred)
    db.commit()
