from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from api.cameras import schemas
from backend.models import cameras
from core.database import get_db

# Initialize FastAPI router with prefix "/cameras"
router = APIRouter(prefix="/cameras", tags=["Cameras"])

@router.post("/", response_model=schemas.CameraResponse)
def create_camera(camera: schemas.CameraCreate, db: Session = Depends(get_db)):
    """
    Creates a new camera entry.

    Args:
        camera (CameraCreate): The camera details to be stored.
        db (Session): Database session dependency.

    Returns:
        CameraResponse: The created camera record.
    """
    db_camera = cameras.Camera(**camera.model_dump())
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)
    return db_camera

@router.get("/", response_model=List[schemas.CameraResponse])
def get_cameras(db: Session = Depends(get_db)):
    """
    Retrieves all cameras from the database.

    Args:
        db (Session): Database session dependency.

    Returns:
        List[CameraResponse]: A list of all stored cameras.
    """
    return db.query(cameras.Camera).all()

@router.get("/{camera_id}", response_model=schemas.CameraResponse)
def get_camera(camera_id: int, db: Session = Depends(get_db)):
    """
    Retrieves a specific camera by ID.

    Args:
        camera_id (int): The ID of the camera to retrieve.
        db (Session): Database session dependency.

    Returns:
        CameraResponse: The requested camera record.

    Raises:
        HTTPException: If the camera is not found.
    """
    camera = db.query(cameras.Camera).filter(cameras.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera

@router.delete("/{camera_id}")
def delete_camera(camera_id: int, db: Session = Depends(get_db)):
    """
    Deletes a camera by ID.

    Args:
        camera_id (int): The ID of the camera to delete.
        db (Session): Database session dependency.

    Returns:
        dict: A success message if the camera is deleted.

    Raises:
        HTTPException: If the camera is not found.
    """
    camera = db.query(cameras.Camera).filter(cameras.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    db.delete(camera)
    db.commit()
    return {"message": "Camera deleted successfully"}
