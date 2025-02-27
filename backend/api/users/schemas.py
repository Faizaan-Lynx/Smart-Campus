from pydantic import BaseModel, EmailStr
from typing import Optional, List
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")    

class UserBase(BaseModel):
    username: str
    email: EmailStr
    is_admin: Optional[bool] = False
    ip_address: Optional[str] = None
    cameras: List[int] = []

    class Config:
        orm_mode = True

    @classmethod
    def from_orm(cls, obj):
        """Convert ORM model to schema, extracting camera IDs"""
        return cls(
            username=obj.username,
            email=obj.email,
            is_admin=obj.is_admin,
            ip_address=obj.ip_address,
            cameras=[camera.id for camera in obj.cameras] if hasattr(obj, "cameras") else []
        )


class UserCreate(UserBase):
    password: str

    def hash_password(self):
        """Hash the password before storing"""
        self.password = pwd_context.hash(self.password)


class UserUpdate(UserBase):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_admin: Optional[bool] = None
    ip_address: Optional[str] = None