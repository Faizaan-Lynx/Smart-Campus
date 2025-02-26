from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from models.intrusion import Intrusion
from models.cameras import Camera
from api.intrusion.schemas import IntrusionCreate, IntrusionResponse
from typing import List

router = APIRouter(prefix="/intrusions", tags=["Intrusions"])

# Create an intrusion
@router.post("/", response_model=IntrusionResponse)
def create_intrusion(data: IntrusionCreate, db: Session = Depends(get_db)):
    # Check if camera exists
    camera = db.query(Camera).filter(Camera.id == data.camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    new_intrusion = Intrusion(**data.dict())
    db.add(new_intrusion)
    db.commit()
    db.refresh(new_intrusion)
    return new_intrusion

# Get all intrusions
@router.get("/", response_model=List[IntrusionResponse])
def get_intrusions(db: Session = Depends(get_db)):
    return db.query(Intrusion).all()

# Get intrusions by camera ID
@router.get("/camera/{camera_id}", response_model=List[IntrusionResponse])
def get_intrusions_by_camera(camera_id: int, db: Session = Depends(get_db)):
    intrusions = db.query(Intrusion).filter(Intrusion.camera_id == camera_id).all()
    if not intrusions:
        raise HTTPException(status_code=404, detail="No intrusions found for this camera")
    return intrusions

# Delete an intrusion by ID
@router.delete("/{intrusion_id}")
def delete_intrusion(intrusion_id: int, db: Session = Depends(get_db)):
    intrusion = db.query(Intrusion).filter(Intrusion.id == intrusion_id).first()
    if not intrusion:
        raise HTTPException(status_code=404, detail="Intrusion not found")

    db.delete(intrusion)
    db.commit()
    return {"message": "Intrusion deleted successfully"}