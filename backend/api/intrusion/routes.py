from typing import List
from core.database import get_db
from models.cameras import Camera
from sqlalchemy.orm import Session
from api.auth.security import is_admin, get_current_user
from models.intrusion import Intrusion
from api.auth.schemas import UserResponseSchema
from fastapi import APIRouter, Depends, HTTPException
from api.intrusion.schemas import IntrusionCreate, IntrusionResponse
from core.celery.full_feed_worker import start_all_feed_workers, stop_all_feed_workers, stop_feed_worker, start_feed_worker, monitor_feed_health
import redis
from config import settings
# from core.celery.feed_worker import start_all_feed_workers, stop_all_feed_workers, stop_feed_worker, start_feed_worker

router = APIRouter(prefix="/intrusions", tags=["Intrusions"])

# admin only routes
@router.get("/start_all_feed_workers")
async def start_all_feed_workers_route(current_user: UserResponseSchema = Depends(is_admin), db: Session = Depends(get_db)):  
    # get all cameras from the database
    cameras = db.query(Camera).all()
    camera_ids = [camera.id for camera in cameras]
    start_all_feed_workers.apply_async(queue='feed_tasks', args=[camera_ids], priority=10)
    return {"status": "Starting all feeds..."}


@router.get("/stop_all_feed_workers")
async def stop_all_feed_workers_route(current_user: UserResponseSchema = Depends(is_admin)):
    stop_all_feed_workers.apply_async(queue='feed_tasks', priority=0)
    return {"status": "Stopping all feeds..."}


@router.get("/start_feed_worker/{camera_id}")
async def start_feed_worker_route(camera_id: int, current_user: UserResponseSchema = Depends(is_admin)):
    start_feed_worker.apply_async(queue='feed_tasks', args=[camera_id], priority=10)
    return {"status": f"Starting Camera {camera_id}..."}


@router.get("/stop_feed_worker/{camera_id}")
async def stop_feed_worker_route(camera_id: int, current_user: UserResponseSchema = Depends(is_admin)):
    stop_feed_worker.apply_async(queue='feed_tasks', args=[camera_id], priority=0)
    return {"status": f"Stopping Camera {camera_id}..."}


@router.get("/feed_health_check")
async def feed_health_check(current_user: UserResponseSchema = Depends(is_admin), db: Session = Depends(get_db)):
    """
    Check health status of all camera feeds and return which ones are active.
    """
    try:
        redis_client = redis.from_url(settings.REDIS_URL)
        cameras = db.query(Camera).all()
        
        health_status = {
            "total_cameras": len(cameras),
            "active_streams": 0,
            "inactive_streams": [],
            "cameras": []
        }
        
        for camera in cameras:
            running_flag = redis_client.get(f"feed_worker_{camera.id}_running")
            websocket_active = redis_client.get(f"camera_{camera.id}_websocket_active")
            
            camera_status = {
                "id": camera.id,
                "name": camera.name,
                "running": running_flag == b"True",
                "websocket_active": websocket_active == b"True"
            }
            health_status["cameras"].append(camera_status)
            
            if running_flag == b"True" and websocket_active == b"True":
                health_status["active_streams"] += 1
            else:
                health_status["inactive_streams"].append(camera.id)
        
        redis_client.close()
        return health_status
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking feed health: {str(e)}")


@router.post("/restart_failed_feeds")
async def restart_failed_feeds(current_user: UserResponseSchema = Depends(is_admin)):
    """
    Monitor and restart any failed feeds immediately.
    """
    try:
        result = monitor_feed_health.apply_async(queue='feed_tasks', priority=9)
        return {"status": "Health check initiated", "task_id": result.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error restarting feeds: {str(e)}")


# any user routes

# Create an intrusion
@router.post("/", response_model=IntrusionResponse)
def create_intrusion(data: IntrusionCreate, db: Session = Depends(get_db)):
    # Check if camera exists
    camera = db.query(Camera).filter(Camera.id == data.camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    new_intrusion = Intrusion(**data.model_dump())
    db.add(new_intrusion)
    db.commit()
    db.refresh(new_intrusion)
    return new_intrusion

# Get all intrusions
@router.get("/", response_model=List[IntrusionResponse])
def get_intrusions(db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(is_admin)):
    return db.query(Intrusion).all()

# Get intrusions by camera ID
@router.get("/camera/{camera_id}", response_model=List[IntrusionResponse])
def get_intrusions_by_camera(camera_id: int, db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(get_current_user)):
    intrusions = db.query(Intrusion).filter(Intrusion.camera_id == camera_id).all()
    if not intrusions:
        raise HTTPException(status_code=404, detail="No intrusions found for this camera")
    return intrusions

# Delete an intrusion by ID
@router.delete("/{intrusion_id}")
def delete_intrusion(intrusion_id: int, db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(is_admin)):
    intrusion = db.query(Intrusion).filter(Intrusion.id == intrusion_id).first()
    if not intrusion:
        raise HTTPException(status_code=404, detail="Intrusion not found")

    db.delete(intrusion)
    db.commit()
    return {"message": "Intrusion deleted successfully"}