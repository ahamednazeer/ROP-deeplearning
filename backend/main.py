"""
main.py
-------
FastAPI application entry point for the ROP Detection backend.

Features:
  - CORS (all origins allowed for development)
  - Static file serving for uploaded images at /static/uploads
  - JWT-protected API routes
  - SQLite database with auto-created tables on startup
  - Default seed users (admin + demo doctor) created if DB is empty
  - ML model loaded on startup with graceful error handling
"""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Load .env file before anything else
load_dotenv()

from database import engine, SessionLocal
import models
from auth import get_password_hash
from routers import auth as auth_router
from routers import users as users_router
from routers import patients as patients_router
from routers import predictions as predictions_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# Uploads directory (backend/uploads/)
UPLOADS_DIR = Path(__file__).resolve().parent / "uploads"


# ──────────────────────────────────────────────
# Database initialisation helpers
# ──────────────────────────────────────────────

def create_tables():
    """Create all ORM-mapped tables if they don't already exist."""
    models.Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified / created.")


def seed_default_users():
    """Insert default admin and doctor accounts if the users table is empty."""
    db = SessionLocal()
    try:
        count = db.query(models.User).count()
        if count > 0:
            logger.info(f"Skipping seed – {count} user(s) already exist.")
            return

        defaults = [
            {
                "username": "admin",
                "password": "admin123",
                "full_name": "Administrator",
                "role": models.UserRole.ADMIN,
                "email": "admin@rop-detection.local",
            },
            {
                "username": "doctor",
                "password": "doctor123",
                "full_name": "Dr. Demo",
                "role": models.UserRole.DOCTOR,
                "email": "doctor@rop-detection.local",
            },
        ]

        for u in defaults:
            user = models.User(
                username=u["username"],
                hashed_password=get_password_hash(u["password"]),
                full_name=u["full_name"],
                role=u["role"],
                email=u["email"],
                is_active=True,
            )
            db.add(user)

        db.commit()
        logger.info("Default users seeded: admin / doctor")
    finally:
        db.close()


# ──────────────────────────────────────────────
# Lifespan context (startup / shutdown)
# ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────
    logger.info("=== ROP Detection API starting up ===")

    # Ensure uploads directory exists
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(f"Uploads directory: {UPLOADS_DIR}")

    # Initialise database
    create_tables()
    seed_default_users()

    # Load ML model
    try:
        from ml.inference import load_model
        success = load_model()
        if success:
            logger.info("ML model loaded and ready.")
        else:
            logger.warning(
                "ML model could NOT be loaded. "
                "Inference endpoints will return 503 until the model is available."
            )
    except Exception as exc:
        logger.error(f"Unexpected error loading ML model: {exc}")

    logger.info("=== Startup complete ===")
    yield
    # ── Shutdown ─────────────────────────────
    logger.info("=== ROP Detection API shutting down ===")


# ──────────────────────────────────────────────
# FastAPI app
# ──────────────────────────────────────────────

app = FastAPI(
    title="ROP Detection API",
    description=(
        "AI-powered Retinopathy of Prematurity (ROP) detection backend. "
        "Upload retinal images for automated ROP stage classification."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files (uploaded images) ───────────
app.mount(
    "/static/uploads",
    StaticFiles(directory=str(UPLOADS_DIR)),
    name="uploads",
)

# ── Routers ──────────────────────────────────
app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(patients_router.router)
app.include_router(predictions_router.router)


# ── Health check ─────────────────────────────
@app.get("/", tags=["Health"])
def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "ROP Detection API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    """Detailed health check including ML model status."""
    from ml.inference import is_model_loaded
    return {
        "status": "ok",
        "model_loaded": is_model_loaded(),
        "database": "connected",
    }
