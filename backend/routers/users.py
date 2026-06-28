"""
routers/users.py
----------------
User management routes (most require ADMIN role):
  GET    /users            → list all users (ADMIN)
  POST   /users            → create a new user (ADMIN)
  DELETE /users/{id}       → delete a user (ADMIN)
  GET    /users/stats      → system-wide statistics (ADMIN)
"""

from typing import List
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user, get_current_admin, get_password_hash

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[schemas.UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    """Return all registered users. ADMIN only."""
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    return [schemas.UserResponse.model_validate(u) for u in users]


@router.post("", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    """Create a new user account. ADMIN only."""
    # Check uniqueness
    existing = db.query(models.User).filter(
        models.User.username == payload.username
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{payload.username}' is already taken",
        )

    if payload.email:
        existing_email = db.query(models.User).filter(
            models.User.email == payload.email
        ).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Email '{payload.email}' is already registered",
            )

    user = models.User(
        username=payload.username,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        role=models.UserRole(payload.role.value),
        email=payload.email,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return schemas.UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    """Delete a user by ID. ADMIN only. Cannot delete yourself."""
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.delete(user)
    db.commit()


@router.get("/stats", response_model=schemas.SystemStats)
def get_stats(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    """Return system-wide statistics. ADMIN only."""
    total_users = db.query(models.User).count()
    total_patients = db.query(models.Patient).count()
    total_predictions = db.query(models.Prediction).count()

    # Predictions grouped by ROP stage
    stage_rows = db.query(
        models.Prediction.stage,
        models.Prediction.id,
    ).all()

    by_stage: dict = defaultdict(int)
    for row in stage_rows:
        by_stage[str(row.stage)] += 1

    # Users grouped by role
    role_rows = db.query(models.User).all()
    by_role: dict = defaultdict(int)
    for u in role_rows:
        by_role[u.role.value] += 1

    return schemas.SystemStats(
        total_users=total_users,
        total_patients=total_patients,
        total_predictions=total_predictions,
        by_stage=dict(by_stage),
        by_role=dict(by_role),
    )
