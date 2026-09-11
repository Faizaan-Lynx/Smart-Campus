from typing import List
from celery import group
from sqlalchemy import text
from config import settings
from core.database import get_db
from sqlalchemy.orm import Session
from api.auth.schemas import UserResponseSchema
from models.cameras import Camera as CameraModel
from api.auth.security import is_admin, get_current_user
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from api.cameras.schemas import CameraCreate, CameraUpdate, Camera, CameraDetectionToggle
from core.celery.model_worker import update_cameras_for_model_workers
import cv2
import io
from PIL import Image
from fastapi.responses import Response
router = APIRouter(prefix="/camera", tags=["Cameras"])


@router.post("/", response_model=Camera, status_code=status.HTTP_201_CREATED)
def create_camera(camera: CameraCreate, db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(is_admin)):
    if camera.id is not None:
        existing = db.query(CameraModel).filter(CameraModel.id == camera.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Camera with ID {camera.id} already exists."
            )
        db_camera = CameraModel(id=camera.id, **camera.model_dump(exclude={"id"}))
    else:
        db_camera = CameraModel(**camera.model_dump())

    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)

    # Ensure sequence is up-to-date
    db.execute(
        text("SELECT setval('cameras_id_seq', (SELECT MAX(id) FROM cameras))")
    )
    db.commit()

    # update model workers
    task_group = group(update_cameras_for_model_workers.s() for _ in range(settings.MODEL_WORKERS))
    task_group.apply_async(queue='model_tasks')

    return db_camera


# Get all cameras
@router.get("/", response_model=List[Camera])
def get_cameras(db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(is_admin)):
    cameras = db.query(CameraModel).all()
    return cameras


@router.get("/{camera_id}/frame")
def get_camera_frame(camera_id: int, db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(get_current_user)):
    """Capture a single frame from the camera stream"""
    db_camera = db.query(CameraModel).filter(CameraModel.id == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")

    try:
        cap = cv2.VideoCapture(db_camera.url)
        if not cap.isOpened():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to connect to camera stream"
            )

        ret, frame = cap.read()
        cap.release()

        if not ret:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to capture frame from camera"
            )

        if db_camera.resize_dims:
            try:
                dims = eval(db_camera.resize_dims)
                frame = cv2.resize(frame, dims)
            except:
                pass

        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = Image.fromarray(frame)
        img_io = io.BytesIO()
        img.save(img_io, 'JPEG', quality=85)
        img_io.seek(0)

        return Response(content=img_io.getvalue(), media_type="image/jpeg")

    except Exception as e:
        print(f"Error capturing frame from camera {camera_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error capturing frame: {str(e)}"
        )


@router.get("/{camera_id}", response_model=Camera)
def get_camera(camera_id: int, db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(get_current_user)):
    camera = db.query(CameraModel).filter(CameraModel.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")
    return camera


# Get cameras by ID range
@router.get("/{start_id}/{end_id}", response_model=List[Camera])
def get_cameras_list(start_id: int, end_id: int, db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(is_admin)):
    cameras = db.query(CameraModel).filter(CameraModel.id >= start_id, CameraModel.id <= end_id).all()
    return cameras


# update a camera
@router.put("/{camera_id}", response_model=Camera)
def update_camera(camera_id: int, camera: CameraUpdate, db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(is_admin)):
    db_camera = db.query(CameraModel).filter(CameraModel.id == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")

    # Update the camera fields
    for key, value in camera.model_dump(exclude_unset=True).items():
        setattr(db_camera, key, value)

    db.commit()
    db.refresh(db_camera)

    # create a task group to update the cameras list for all model workers
    task_group = group(update_cameras_for_model_workers.s() for _ in range(settings.MODEL_WORKERS))
    task_group.apply_async(queue='model_tasks')

    return db_camera


# toggle an optional detection feature on a camera (e.g. fire/smoke) without editing the whole camera
@router.patch("/{camera_id}/detection", response_model=Camera)
def toggle_camera_detection(camera_id: int, toggle: CameraDetectionToggle, db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(is_admin)):
    db_camera = db.query(CameraModel).filter(CameraModel.id == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")

    feature_columns = {
        "fire_smoke": "detect_fire_smoke",
        "intrusion": "detect_intrusions",
    }

    column = feature_columns.get(toggle.feature)
    if not column:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown detection feature '{toggle.feature}'. Supported: {', '.join(feature_columns.keys())}"
        )

    setattr(db_camera, column, toggle.enabled)
    db.commit()
    db.refresh(db_camera)

    # let disabled model workers know (no-op today, harmless)
    task_group = group(update_cameras_for_model_workers.s() for _ in range(settings.MODEL_WORKERS))
    task_group.apply_async(queue='model_tasks')

    return db_camera


@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_camera(camera_id: int, db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(is_admin)):
    db_camera = db.query(CameraModel).filter(CameraModel.id == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")
    
    db.delete(db_camera)
    db.commit()

    # create a task group to update the cameras list for all model workers
    task_group = group(update_cameras_for_model_workers.s() for _ in range(settings.MODEL_WORKERS))
    task_group.apply_async(queue='model_tasks')
    
    return None