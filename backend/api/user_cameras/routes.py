from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.user_cameras import user_cameras
from models.users import Users
from models.cameras import Camera
from core.database import get_db
from api.user_cameras.schemas import UserCameraCreate, UserCameraResponse

router = APIRouter(prefix="/user-cameras", tags=["User Cameras"])

@router.post("/", response_model=UserCameraResponse)
def add_camera_to_user(user_camera: UserCameraCreate, db: Session = Depends(get_db)):
    user = db.query(Users).filter(Users.id == user_camera.user_id).first()
    camera = db.query(Camera).filter(Camera.id == user_camera.camera_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    db.execute(user_cameras.insert().values(user_id=user.id, camera_id=camera.id))
    db.commit()
    return {"user_id": user.id, "camera_id": camera.id}

@router.get("/{user_id}", response_model=list[UserCameraResponse])
def get_cameras_for_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(Users).filter(Users.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    query = db.execute(user_cameras.select().where(user_cameras.c.user_id == user_id))
    cameras = query.fetchall()
    return [{"user_id": row.user_id, "camera_id": row.camera_id} for row in cameras]

@router.delete("/", status_code=204)
def remove_camera_from_user(user_camera: UserCameraCreate, db: Session = Depends(get_db)):
    user = db.query(Users).filter(Users.id == user_camera.user_id).first()
    camera = db.query(Camera).filter(Camera.id == user_camera.camera_id).first()

    if not user or not camera:
        raise HTTPException(status_code=404, detail="User or Camera not found")

    db.execute(user_cameras.delete().where(
        (user_cameras.c.user_id == user_camera.user_id) &
        (user_cameras.c.camera_id == user_camera.camera_id)
    ))
    db.commit()
    return None
