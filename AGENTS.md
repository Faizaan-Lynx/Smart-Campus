# AGENTS.md

## Project Overview
Smart Campus surveillance system with FastAPI backend, Celery workers, React frontend, PostgreSQL, Redis, and YOLO-based computer vision.

## Architecture
- **Backend**: Python 3.12 + FastAPI (`backend/main.py`)
- **Frontend**: React + Vite + MUI (`frontend/`)
- **Workers**: Multiple Celery worker types for camera feeds, model inference, alerts, license plates
- **Database**: PostgreSQL with SQLAlchemy + Alembic migrations
- **Cache/Queue**: Redis for Celery broker and WebSocket pub/sub
- **Models**: YOLO (Ultralytics) for object detection, GStreamer for video streams

## Quick Commands

### Frontend
```bash
cd frontend && npm install && npm run dev   # Dev server on :3000
cd frontend && npm run lint                 # ESLint (0 warnings enforced)
```

### Backend (Docker)
```bash
docker-compose build                        # Build containers
docker-compose up                           # Start all services
# API on :8000, Flower on :5555
```

### Backend (Local)
```bash
cd backend && uvicorn main:app --reload --port 8000
```

### Celery Workers
```bash
./start_workers.sh [GENERAL] [FEED] [LICENSE]  # Args control worker counts
```
Worker queues: `general_tasks`, `feed_tasks`, `model_tasks`, `stream_tasks`, `license_plate_tasks`

### Database Migrations
```bash
cd backend && alembic revision --autogenerate -m "description"
cd backend && alembic upgrade head
```

## Environment
- Copy `.env.copy` to `.env` before first run
- `DATABASE_HOST=postgres-db` when using Docker, `localhost` for local dev
- `REDIS_URL=redis://redis:6379/0` (Docker) or `redis://localhost:6379/0`
- `.env` contains secrets - never commit

## Key Gotchas
- Line endings: Set `git config core.autocrlf false` and `core.eol lf` before cloning
- Database auto-creates tables on import (`Base.metadata.create_all` in `database.py`)
- Feed dimensions configured via `FEED_DIMS` env var (default: `(640,480)`)
- Model workers are currently disabled in `start_workers.sh` (commented out)
- GStreamer plugins required for RTSP stream handling (installed in Dockerfile)
- `WATCHFILES_FORCE_POLLING=true` set for Docker dev reload
