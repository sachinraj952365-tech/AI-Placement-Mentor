# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup FastAPI backend and copy assets
FROM python:3.10-slim
WORKDIR /app

# Install system dependencies if needed (like sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# Expose FastAPI port
EXPOSE 8000

# Run uvicorn server
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
