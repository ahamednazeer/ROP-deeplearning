"""
routers/auth.py
---------------
Authentication routes:
  POST /auth/login  → returns JWT access token
  GET  /auth/me     → returns current user info
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import (
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate with username + password.
    Returns a JWT access token valid for 24 hours.
    """
    user = db.query(models.User).filter(
        models.User.username == credentials.username
    ).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    token = create_access_token(data={"sub": user.username, "role": user.role.value})

    return schemas.Token(
        access_token=token,
        token_type="bearer",
        user=schemas.UserResponse.model_validate(user),
    )


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Return the profile of the currently authenticated user."""
    return schemas.UserResponse.model_validate(current_user)
