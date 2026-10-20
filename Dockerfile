# ==========================================
# Multi-stage Dockerfile for Render Deployment
# Unified Single-Container (FastAPI + React SPA)
# ==========================================

# Stage 1: Build Frontend React / Vite
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

ARG VITE_GOOGLE_CLIENT_ID="926646602874-dakf4njbrmgg2fp4qokfflq7tlhid68j.apps.googleusercontent.com"
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

COPY frontend-web/package.json frontend-web/package-lock.json ./
RUN npm install

COPY frontend-web/ ./
RUN npm run build

# Stage 2: Production Backend & Static Serving
FROM python:3.11-slim AS runner

# Install security updates and ca-certificates for Supabase SSL
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python backend dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ /app/backend

# Copy compiled frontend dist from builder stage
COPY --from=frontend-builder /app/frontend/dist /app/frontend_dist

# Set production environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend \
    FRONTEND_DIST_DIR=/app/frontend_dist \
    ENVIRONMENT=production \
    DEBUG=false \
    USE_SQLITE_FALLBACK=false \
    PORT=8000

# Expose default port (Render overrides with $PORT dynamically)
EXPOSE 8000

# Start Uvicorn bound to 0.0.0.0 and dynamic $PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
