# AI-Based ROP Neonatal Eye Disease Detection System

A full-stack web application for **Retinopathy of Prematurity (ROP)** detection using deep learning.

## Architecture

```
├── backend/          # FastAPI + SQLite + TensorFlow
├── frontend/         # Next.js 15 + Tailwind CSS v4
├── best_rop_model.h5 # Pre-trained Keras model (11-class)
└── docker-compose.yml
```

## Quick Start (Docker)

```bash
# Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Start everything
docker compose up --build

# App runs at:
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## Manual Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Default Accounts

| Role   | Username | Password   |
|--------|----------|------------|
| Admin  | admin    | admin123   |
| Doctor | doctor   | doctor123  |

## Model Details

- **Architecture**: EfficientNet-based CNN (Keras)
- **Input**: 224×224×3 RGB retinal fundus images
- **Output**: 11 classes (ROP stages + variants)
- **Classes**:
  - 0: Normal / No ROP
  - 1: Stage 1 ROP (Mild)
  - 2: Stage 2 ROP (Moderate)
  - 3: Stage 3 ROP (Severe)
  - 4: Stage 4 ROP (Critical)
  - 5: Stage 5 ROP (Critical - Total Detachment)
  - 6: Plus Disease
  - 7: Pre-Plus Disease
  - 8: Aggressive Posterior ROP
  - 9: Post-treatment
  - 10: Regression

## API Documentation

FastAPI auto-generates interactive API docs at `http://localhost:8000/docs`
