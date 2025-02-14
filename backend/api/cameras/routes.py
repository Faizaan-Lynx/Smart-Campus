from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from api.cameras import schemas, models
from core.database import get_db

router = APIRouter()

@router.post("/", response_model=schemas.CameraResponse)
def create_camera(camera: schemas.CameraCreate, db: Session = Depends(get_db)):
    """
    Creates a new camera entry in the database.
    
    Args:
        camera (CameraCreate): Camera details from request body.
        db (Session): Database session dependency.
    
    Returns:
        CameraResponse: The newly created camera object.
    """
    db_camera = models.Camera(**camera.model_dump())  # Convert Pydantic model to dictionary
    db.add(db_camera)  # Add to the session
    db.commit()  # Commit changes to the database
    db.refresh(db_camera)  # Refresh to get the new ID
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
    return db.query(models.Camera).all()

@router.get("/{camera_id}", response_model=schemas.CameraResponse)
def get_camera(camera_id: int, db: Session = Depends(get_db)):
    """
    Retrieves a specific camera by ID.
    
    Args:
        camera_id (int): The ID of the camera to retrieve.
        db (Session): Database session dependency.
    
    Returns:
        CameraResponse: The camera object if found.
    
    Raises:
        HTTPException: If the camera is not found.
    """
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera

@router.put("/{camera_id}", response_model=schemas.CameraResponse)
def update_camera(camera_id: int, updated_data: schemas.CameraUpdate, db: Session = Depends(get_db)):
    """
    Updates an existing camera record.
    
    Args:
        camera_id (int): The ID of the camera to update.
        updated_data (CameraUpdate): The fields to update.
        db (Session): Database session dependency.
    
    Returns:
        CameraResponse: The updated camera object.
    
    Raises:
        HTTPException: If the camera is not found.
    """
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    # Update only the fields provided in the request
    for key, value in updated_data.model_dump(exclude_unset=True).items():
        setattr(camera, key, value)
    
    db.commit()  # Save changes
    db.refresh(camera)  # Refresh to get updated data
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
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    db.delete(camera)  # Remove from database
    db.commit()  # Commit deletion
    return {"message": "Camera deleted successfully"}
