from pydantic import BaseModel
from typing import List

class UserCameraBase(BaseModel):
    user_id: int
    camera_id: int

class UserCameraCreate(UserCameraBase):
    pass

class UserCameraResponse(UserCameraBase):
    class Config:
        orm_mode = True
class UserCameraUpdate(BaseModel):
    camera_ids: List[int]