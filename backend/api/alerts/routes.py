import os
import logging
from config import settings
from models.alerts import Alert
from core.database import get_db
from models import Camera, Users
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse
from api.auth.schemas import UserResponseSchema
from fastapi import APIRouter, Depends, HTTPException, Query
from api.auth.security import is_admin, get_current_user
from core.celery.alert_tasks import publish_alert, send_email
from core.celery.worker import celery_app
from api.alerts.schemas import AlertBase, AlertResponse, AlertUpdateAcknowledgment
from typing import Optional, List

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.post("/", response_model=AlertResponse)
def create_alert(alert_data: AlertBase, db: Session = Depends(get_db)):
    """Creates a new alert and broadcasts it in real time."""
    alert = Alert(**alert_data.dict())
    db.add(alert)
    db.commit()
    db.refresh(alert)

    alert_response = AlertResponse.model_validate(alert)
    alert_camera_id = alert_response.camera_id
    alert_timestamp = alert_response.timestamp
    alert_location = db.query(Camera).filter(Camera.id == alert_camera_id).first().location

    # celery tasks to generate alerts and send emails
    # publish_alert.apply_async(args=[alert_response.dict()], queue='general_tasks')
    celery_app.send_task("core.celery.alert_tasks.publish_alert", args=[alert_response.dict()], queue='general_tasks')
    
    # send_email.apply_async(args=[settings.SMTP_EMAIL, settings.SMTP_PASSWORD, settings.RECEIVER_EMAILS, 
    #                              f"Intrusion Detected by Camera {alert_camera_id}", 
    #                              f"Intrusion Detected at {alert_location} by {alert_camera_id}. Time: {alert_timestamp}", 
    #                              settings.SMTP_SERVER, settings.SMTP_PORT], queue='general_tasks')
    
    # celery_app.send_task(   
    #                         "core.celery.alert_tasks.send_email", 
    #                         args=[settings.SMTP_EMAIL, settings.SMTP_PASSWORD, settings.RECEIVER_EMAILS,
    #                            f"Intrusion Detected by Camera {alert_camera_id}", 
    #                            f"Intrusion Detected at {alert_location} by {alert_camera_id}. Time: {alert_timestamp}", 
    #                            settings.SMTP_SERVER, settings.SMTP_PORT], 
    #                         queue='general_tasks'
    #                     )

    return alert_response


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(alert_id: int, db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(get_current_user)):
    """Fetch an alert by ID."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.get("/", response_model=List[AlertResponse])
def get_alerts(
    camera_id: Optional[str] = Query(None, description="Comma-separated list of integer camera IDs to filter alerts (e.g., '1,2,3')"),
    db: Session = Depends(get_db), 
    current_user: UserResponseSchema = Depends(get_current_user)
):
    """Fetch alerts with optional camera filtering."""
    query = db.query(Alert)
    
    # If camera_id parameter is provided, filter by camera IDs
    if camera_id:
        try:
            # Parse comma-separated string into list of integers
            camera_ids = [int(cid.strip()) for cid in camera_id.split(",") if cid.strip()]
            query = query.filter(Alert.camera_id.in_(camera_ids))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid camera_id format. Expected comma-separated integers (e.g., '1,2,3').")
    
    # If user is not admin, filter by their assigned cameras
    if not current_user.is_admin:
        user = db.query(Users).filter(Users.id == current_user.id).first()
        if not user or not user.cameras:
            return []  # Return empty list if user has no cameras assigned
        
        # Extract camera IDs from the Camera objects
        user_camera_ids = [camera.id for camera in user.cameras]
        
        # If camera_id parameter was provided, ensure user has access to those cameras
        if camera_id:
            try:
                requested_camera_ids = [int(cid.strip()) for cid in camera_id.split(",") if cid.strip()]
                # Check if all requested camera IDs are in user's assigned cameras
                if not all(cid in user_camera_ids for cid in requested_camera_ids):
                    raise HTTPException(status_code=403, detail="Access denied to one or more requested cameras")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid camera_id format. Expected comma-separated integers (e.g., '1,2,3').")
        else:
            # If no camera_id parameter, filter by user's assigned cameras
            query = query.filter(Alert.camera_id.in_(user_camera_ids))
    
    # Get all matching alerts
    alerts = query.all()
    return alerts

@router.delete("/all")
def delete_all_alerts(db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(is_admin)):
    """Delete all alerts."""
    deleted = db.query(Alert).delete()
    db.commit()
    return {"message": f"{deleted} alerts deleted successfully"}

@router.delete("/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(is_admin)):
    """Delete an alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted successfully"}

@router.patch("/{alert_id}/acknowledge", response_model=AlertResponse)
def update_alert_acknowledgment(
    alert_id: int, update_data: AlertUpdateAcknowledgment, db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(get_current_user)
):
    """Updates only the `is_acknowledged` field of an alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_acknowledged = update_data.is_acknowledged
    db.commit()
    db.refresh(alert)

    return AlertResponse.model_validate(alert)

# get blob of image associated with alert
@router.get("/{alert_id}/image")
def get_alert_image(alert_id: int, db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(get_current_user)):
    """Fetch the image associated with an alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # check if the user has access to the camera
    if not current_user.is_admin:
        user = db.query(Users).filter(Users.id == current_user.id).first()
        user_camera_ids = [camera.id for camera in user.cameras]
        if alert.camera_id not in user_camera_ids:
            raise HTTPException(status_code=403, detail="Access denied to this camera")    
    
    try:
        return FileResponse(path=alert.file_path, media_type="image/jpeg", filename=alert.file_path.split("/")[-1])
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image file not found")