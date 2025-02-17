from pydantic import BaseModel
from typing import List, Optional

class CameraBase(BaseModel):
    url: str
    location: Optional[str] = None
    detection_threshold: int
    resize_dims: Optional[str] = None  # You can also use a JSON object if preferred
    crop_region: Optional[str] = None  # You can also use a JSON object if preferred
    lines: Optional[str] = None  # You can also use a JSON object if preferred

class CameraCreate(CameraBase):
    pass

class CameraUpdate(CameraBase):
    url: Optional[str] = None
    location: Optional[str] = None
    detection_threshold: Optional[int] = None
    resize_dims: Optional[str] = None
    crop_region: Optional[str] = None
    lines: Optional[str] = None

class Camera(CameraBase):
    id: int

    class Config:
        orm_mode = True  # This tells FastAPI to treat the SQLAlchemy model as a Pydantic model

class CameraListResponse(BaseModel):
    cameras: List[Camera]
