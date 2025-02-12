from pydantic import BaseModel
from typing import Optional

class CameraBase(BaseModel):
    """
    Base schema for Camera model, defining common attributes.
    """
    url: str
    location: Optional[str] = None
    detection_threshold: Optional[int] = None
    resize_dims: Optional[str] = None  # Expected format: "width,height"
    crop_region: Optional[str] = None  # Expected format: "x,y,width,height"
    lines: Optional[str] = None  # Expected format: "x1,y1,x2,y2"

class CameraCreate(CameraBase):
    """
    Schema for creating a new camera.
    
    Inherits:
        CameraBase (BaseModel): Inherits common camera fields.
    """
    pass  # No additional fields required for creation

class CameraResponse(CameraBase):
    """
    Response schema for returning a camera object.

    Inherits:
        CameraBase (BaseModel): Inherits all camera fields.

    Attributes:
        id (int): Unique identifier of the camera.
    """
    id: int

    class Config:
        """Config class to enable ORM mode for SQLAlchemy compatibility."""
        from_attributes = True
