from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from models.cameras import Camera as CameraModel
from api.cameras.schemas import CameraCreate, CameraUpdate, Camera
from core.database import get_db


router = APIRouter(prefix="/camera", tags=["Cameras"])


@router.post("/", response_model=Camera, status_code=status.HTTP_201_CREATED)
def create_camera(camera: CameraCreate, db: Session = Depends(get_db)):
    db_camera = CameraModel(url=camera.url, location=camera.location, detection_threshold=camera.detection_threshold,
                            resize_dims=camera.resize_dims, crop_region=camera.crop_region, lines=camera.lines)
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)
    return db_camera


# Get all cameras
@router.get("/", response_model=List[Camera])
def get_cameras(db: Session = Depends(get_db)):
    cameras = db.query(CameraModel).all()
    return cameras


@router.get("/{camera_id}", response_model=Camera)
def get_camera(camera_id: int, db: Session = Depends(get_db)):
    camera = db.query(CameraModel).filter(CameraModel.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")
    return camera


# Get cameras by ID range
@router.get("/{start_id}/{end_id}", response_model=List[Camera])
def get_cameras_list(start_id: int, end_id: int, db: Session = Depends(get_db)):
    cameras = db.query(CameraModel).filter(CameraModel.id >= start_id, CameraModel.id <= end_id).all()
    return cameras


# update a camera
@router.put("/{camera_id}", response_model=Camera)
def update_camera(camera_id: int, camera: CameraUpdate, db: Session = Depends(get_db)):
    db_camera = db.query(CameraModel).filter(CameraModel.id == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")

    # Update the camera fields
    for key, value in camera.dict(exclude_unset=True).items():
        setattr(db_camera, key, value)

    db.commit()
    db.refresh(db_camera)
    return db_camera


@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_camera(camera_id: int, db: Session = Depends(get_db)):
    db_camera = db.query(CameraModel).filter(CameraModel.id == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")
    
    db.delete(db_camera)
    db.commit()
    return None