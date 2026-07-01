"""
License Plate API Routes
------------------------
All endpoints are kept as-is (no duplicates added).
Business logic now reads from the enriched License model
(confidence, bounding_box, file_path) produced by fast-alpr.
"""
import json
import os
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from api.auth.schemas import UserResponseSchema
from api.auth.security import get_current_user, is_admin
from api.license_plate.schemas import LicensePlateCreate, LicensePlateResponse
from core.celery.license_plate_worker import (
    start_all_license_plate_workers,
    start_license_plate_worker,
    stop_all_license_plate_workers,
    stop_license_plate_worker,
)
from core.database import get_db
from models.cameras import Camera
from models.license_detection import License
from models import Users

router = APIRouter(prefix="/license-plates", tags=["License Plates"])


# ──────────────────────────────────────────────────────────────────────────────
# Worker control  (admin-only)
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/start_all_workers")
async def start_all_workers(
    current_user: UserResponseSchema = Depends(is_admin),
    db: Session = Depends(get_db),
):
    cameras = db.query(Camera).all()
    camera_ids = [c.id for c in cameras]
    start_all_license_plate_workers.apply_async(
        queue="license_plate_tasks", args=[camera_ids], priority=10
    )
    return {"status": "Starting all license plate detection workers..."}


@router.get("/stop_all_workers")
async def stop_all_workers(current_user: UserResponseSchema = Depends(is_admin)):
    stop_all_license_plate_workers.apply_async(queue="license_plate_tasks", priority=0)
    return {"status": "Stopping all license plate detection workers..."}


@router.get("/start_worker/{camera_id}")
async def start_worker(
    camera_id: int,
    current_user: UserResponseSchema = Depends(is_admin),
):
    start_license_plate_worker.apply_async(
        queue="license_plate_tasks", args=[camera_id], priority=10
    )
    return {"status": f"Starting license plate detection for Camera {camera_id}..."}


@router.get("/stop_worker/{camera_id}")
async def stop_worker(
    camera_id: int,
    current_user: UserResponseSchema = Depends(is_admin),
):
    stop_license_plate_worker.apply_async(
        queue="license_plate_tasks", args=[camera_id], priority=0
    )
    return {"status": f"Stopping license plate detection for Camera {camera_id}..."}


# ──────────────────────────────────────────────────────────────────────────────
# CRUD  (existing endpoints – business logic updated for fast-alpr payload)
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/", response_model=LicensePlateResponse)
def create_license_plate_detection(
    data: LicensePlateCreate, db: Session = Depends(get_db)
):
    """Create a license plate record manually (e.g., from external integrations)."""
    camera = db.query(Camera).filter(Camera.id == data.camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    # Duplicate guard: reject if same plate + camera detected in last 5 minutes
    from datetime import datetime, timedelta
    five_min_ago = datetime.utcnow() - timedelta(minutes=5)
    existing = (
        db.query(License)
        .filter(
            License.camera_id == data.camera_id,
            License.license_number == data.license_number,
            License.timestamp >= five_min_ago,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Duplicate: plate '{data.license_number}' already recorded within the last 5 minutes.",
        )

    new_license = License(**data.model_dump())
    db.add(new_license)
    db.commit()
    db.refresh(new_license)
    return new_license


@router.get("/", response_model=List[LicensePlateResponse])
def get_license_plates(
    db: Session = Depends(get_db),
    current_user: UserResponseSchema = Depends(is_admin),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
):
    """Return paginated list of all license plate detections (admin only)."""
    return (
        db.query(License)
        .order_by(License.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/camera/{camera_id}", response_model=List[LicensePlateResponse])
def get_license_plates_by_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    current_user: UserResponseSchema = Depends(get_current_user),
    limit: int = Query(default=50, le=500),
    offset: int = Query(default=0, ge=0),
):
    """Return license plate detections for a specific camera (empty list if none yet)."""
    records = (
        db.query(License)
        .filter(License.camera_id == camera_id)
        .order_by(License.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return records


@router.get("/{license_id}/image")
def get_license_image(
    license_id: int,
    db: Session = Depends(get_db),
    current_user: UserResponseSchema = Depends(get_current_user),
):
    """Serve the saved plate-crop image for a detection record."""
    record = db.query(License).filter(License.id == license_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="License record not found")

    if not current_user.is_admin:
        user = db.query(Users).filter(Users.id == current_user.id).first()
        if record.camera_id not in (user.cameras or []):
            raise HTTPException(status_code=403, detail="Access denied to this camera")

    if not record.file_path or not os.path.isfile(record.file_path):
        raise HTTPException(status_code=404, detail="Image file not found on disk")

    return FileResponse(
        path=record.file_path,
        media_type="image/jpeg",
        filename=os.path.basename(record.file_path),
    )


@router.get("/{license_id}", response_model=LicensePlateResponse)
def get_license_plate_by_id(
    license_id: int,
    db: Session = Depends(get_db),
    current_user: UserResponseSchema = Depends(get_current_user),
):
    """Fetch a single detection record with full payload (text, bbox, confidence)."""
    record = db.query(License).filter(License.id == license_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="License plate detection not found")
    return record


@router.delete("/delete_all")
def delete_all_license_plates(
    db: Session = Depends(get_db),
    current_user: UserResponseSchema = Depends(is_admin),
):
    deleted = db.query(License).delete()
    db.commit()
    return {"message": f"Deleted {deleted} license plate detection(s) successfully"}


@router.delete("/{license_id}")
def delete_license_plate(
    license_id: int,
    db: Session = Depends(get_db),
    current_user: UserResponseSchema = Depends(is_admin),
):
    record = db.query(License).filter(License.id == license_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="License plate detection not found")
    db.delete(record)
    db.commit()
    return {"message": "License plate detection deleted successfully"}