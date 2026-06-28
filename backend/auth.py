from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os

from database import get_db
import models

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────

SECRET_KEY = os.getenv("SECRET_KEY", "rop-detection-super-secret-key-change-in-production-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ──────────────────────────────────────────────
# Password utilities
# ──────────────────────────────────────────────

def get_password_hash(password: str) -> str:
    """Hash a plain-text password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


# ──────────────────────────────────────────────
# JWT utilities
# ──────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token. Returns payload dict or None."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# ──────────────────────────────────────────────
# Dependency: get current authenticated user
# ──────────────────────────────────────────────

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """FastAPI dependency that returns the authenticated user from the JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = verify_token(token)
    if payload is None:
        raise credentials_exception

    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
    return user


def get_current_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Dependency that ensures the current user has ADMIN role."""
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required",
        )
    return current_user
