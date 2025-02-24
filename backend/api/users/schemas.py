from pydantic import BaseModel, EmailStr
from typing import Optional, List

class UserBase(BaseModel):
    username: str
    email: EmailStr
    is_admin: Optional[bool] = False
    ip_address: Optional[str] = None

class UserCreate(UserBase):
    hashed_password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    hashed_password: Optional[str] = None
    is_admin: Optional[bool] = None
    ip_address: Optional[str] = None

class User(UserBase):
    id: int
    cameras: List[int] = []

    class Config:
        orm_mode = True
