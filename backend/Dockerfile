FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install OS-level dependencies for image handling and TensorFlow
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (build context root = project root)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code from backend/ subdirectory
COPY backend/ .

# Copy the pre-trained model from project root into container
COPY best_rop_model.h5 /app/best_rop_model.h5

# Environment defaults (override at runtime)
ENV MODEL_PATH=/app/best_rop_model.h5
ENV DATABASE_URL=sqlite:///./rop.db
ENV SECRET_KEY=change-me-in-production

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose FastAPI port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
