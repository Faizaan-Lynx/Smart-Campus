from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class LicensePlateBase(BaseModel):
    camera_id: int
    license_number: str
    timestamp: datetime = datetime.utcnow()


class LicensePlateCreate(LicensePlateBase):
    confidence: Optional[float] = None
    bounding_box: Optional[str] = None   # JSON string [x1,y1,x2,y2]
    file_path: Optional[str] = None


class LicensePlateResponse(LicensePlateBase):
    id: int
    confidence: Optional[float] = None
    bounding_box: Optional[str] = None
    file_path: Optional[str] = None

    class Config:
        from_attributes = True
