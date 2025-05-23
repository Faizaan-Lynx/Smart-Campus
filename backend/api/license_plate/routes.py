from typing import List
from core.database import get_db
from models.cameras import Camera
from models.license_detection import License
from sqlalchemy.orm import Session
from api.auth.security import is_admin, get_current_user
from api.auth.schemas import UserResponseSchema
from fastapi import APIRouter, Depends, HTTPException
from core.celery.license_plate_worker import start_all_license_plate_workers, stop_all_license_plate_workers, stop_license_plate_worker, start_license_plate_worker
from api.license_plate.schemas import LicensePlateCreate, LicensePlateResponse
import cv2
import numpy as np
import os
from ultralytics import YOLO
from paddleocr import PaddleOCR

router = APIRouter(prefix="/license-plates", tags=["License Plates"])

# admin only routes
@router.get("/start_all_workers")
async def start_all_license_plate_workers_route(current_user: UserResponseSchema = Depends(is_admin), db: Session = Depends(get_db)):  
    # get all cameras from the database
    cameras = db.query(Camera).all()
    camera_ids = [camera.id for camera in cameras]
    start_all_license_plate_workers.apply_async(queue='license_plate_tasks', args=[camera_ids], priority=10)
    return {"status": "Starting all license plate detection workers..."}


@router.get("/stop_all_workers")
async def stop_all_license_plate_workers_route(current_user: UserResponseSchema = Depends(is_admin)):
    stop_all_license_plate_workers.apply_async(queue='license_plate_tasks', priority=0)
    return {"status": "Stopping all license plate detection workers..."}


@router.get("/start_worker/{camera_id}")
async def start_license_plate_worker_route(camera_id: int, current_user: UserResponseSchema = Depends(is_admin)):
    start_license_plate_worker.apply_async(queue='license_plate_tasks', args=[camera_id], priority=10)
    return {"status": f"Starting license plate detection for Camera {camera_id}..."}


@router.get("/stop_worker/{camera_id}")
async def stop_license_plate_worker_route(camera_id: int, current_user: UserResponseSchema = Depends(is_admin)):
    stop_license_plate_worker.apply_async(queue='license_plate_tasks', args=[camera_id], priority=0)
    return {"status": f"Stopping license plate detection for Camera {camera_id}..."}

# @router.get("/test_dummy_video")
# async def test_dummy_video(
#     current_user: UserResponseSchema = Depends(is_admin),
#     db: Session = Depends(get_db)
# ):
#     """
#     Test the license plate detection model on the dummy video and store results in the database.
#     """
#     try:
#         # Initialize models
#         model = YOLO(model="./yolo-models/yolo-license-plates.pt")
#         ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
        
#         # Open the dummy video
#         video_path = "/app/alert_images/dummy.mp4"
#         print("Video Path:", video_path)
#         print("File Exists:", os.path.exists(video_path))
#         cap = cv2.VideoCapture(video_path)
        
#         if not cap.isOpened():
#             raise HTTPException(status_code=404, detail=f"Could not open dummy video at path: {video_path}")
        
#         # Read first frame
#         ret, frame = cap.read()
#         if not ret:
#             raise HTTPException(status_code=500, detail="Could not read frame from video")
        
#         results = model.predict(frame, verbose=False)

#         detected_plates = []
#         for res in results:
#             for detection in res.boxes:
#                 if detection.conf < 0.30:
#                     continue
                
#                 x1, y1, x2, y2 = map(int, detection.xyxy[0])
#                 plate_region = frame[y1:y2, x1:x2]
                
#                 ocr_results = ocr.ocr(plate_region, cls=True)
                
#                 if len(ocr_results) > 0 and ocr_results[0] is not None:
#                     for line in ocr_results[0]:
#                         text = line[1][0]
#                         confidence = float(line[1][1])

#                         detected_plate = {
#                             "text": text,
#                             "confidence": confidence,
#                             "bbox": [x1, y1, x2, y2]
#                         }
#                         detected_plates.append(detected_plate)

#                         # Save to database
#                         camera_id = 1  # Replace with appropriate camera_id logic
#                         # camera = db.query(Camera).filter(Camera.id == camera_id).first()
#                         # if not camera:
#                         #     raise HTTPException(status_code=404, detail="Camera not found")

#                         new_license = License(
#                             camera_id=camera_id,
#                             license_number=text,
#                         )
#                         db.add(new_license)
#                         db.commit()
#                         db.refresh(new_license) 

#         return {
#             "status": "success",
#             "detected_plates": detected_plates
#         }

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# Create a license plate detection record
@router.post("/", response_model=LicensePlateResponse)
def create_license_plate_detection(data: LicensePlateCreate, db: Session = Depends(get_db)):
    # Check if camera exists
    camera = db.query(Camera).filter(Camera.id == data.camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    new_license = License(**data.model_dump())
    db.add(new_license)
    db.commit()
    print("license added in db!!!!!!")
    db.refresh(new_license)
    return new_license

# Get all license plate detections
@router.get("/", response_model=List[LicensePlateResponse])
def get_license_plates(db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(is_admin)):
    return db.query(License).all()

# Get license plate detections by camera ID
@router.get("/camera/{camera_id}", response_model=List[LicensePlateResponse])
def get_license_plates_by_camera(camera_id: int, db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(get_current_user)):
    license_plates = db.query(License).filter(License.camera_id == camera_id).all()
    if not license_plates:
        raise HTTPException(status_code=404, detail="No license plate detections found for this camera")
    return license_plates

# Delete a license plate detection by ID
@router.delete("/{license_id}")
def delete_license_plate(license_id: int, db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(is_admin)):
    license_plate = db.query(License).filter(License.id == license_id).first()
    if not license_plate:
        raise HTTPException(status_code=404, detail="License plate detection not found")

    db.delete(license_plate)
    db.commit()
    return {"message": "License plate detection deleted successfully"} 