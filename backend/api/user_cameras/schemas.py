from pydantic import BaseModel

class UserCameraBase(BaseModel):
    user_id: int
    camera_id: int

class UserCameraCreate(UserCameraBase):
    pass

class UserCameraResponse(UserCameraBase):
    class Config:
        orm_mode = True
