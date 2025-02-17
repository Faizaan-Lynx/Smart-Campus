from pydantic import BaseModel
from typing import Optional

class AlertBase(BaseModel):
    camera_id: int
    timestamp: str
    is_acknowledged: bool = False
    file_path: Optional[str] = None

class AlertCreate(AlertBase):
    pass  # No extra fields for creation

class AlertResponse(AlertBase):
    id: int

    class Config:
        from_attributes = True  # ✅ Pydantic v2: Replaces `orm_mode`
