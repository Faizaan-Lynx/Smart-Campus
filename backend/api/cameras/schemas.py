from pydantic import BaseModel
from typing import Optional

class CameraBase(BaseModel):
    url: str
    location: Optional[str] = None
    detection_threshold: Optional[int] = None
    resize_dims: Optional[str] = None  # Can be stored as JSON string
    crop_region: Optional[str] = None
    lines: Optional[str] = None

class CameraCreate(CameraBase):
    pass

class CameraUpdate(CameraBase):
    pass

class CameraResponse(CameraBase):
    id: int

    class Config:
        from_attributes = True
