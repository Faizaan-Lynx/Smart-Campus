from pydantic import BaseModel, EmailStr
from typing import Optional, List
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserBase(BaseModel):
    username: str
    email: EmailStr
    is_admin: Optional[bool] = False
    ip_address: Optional[str] = None


class UserCreate(UserBase):
    password: str  # Accept plain password

    def hash_password(self):
        """Hash the provided plain password"""
        self.password = pwd_context.hash(self.password)


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None  # Accept plain password
    is_admin: Optional[bool] = None
    ip_address: Optional[str] = None

    def process_password(self):
        """Rehash the password if provided"""
        if self.password:
            self.password = pwd_context.hash(self.password)


class User(UserBase):
    id: int
    cameras: List[int] = []

    class Config:
        orm_mode = True

    @classmethod
    def from_orm(cls, obj):
        """Convert ORM model to schema, extracting camera IDs"""
        return cls(
            id=obj.id,
            username=obj.username,
            email=obj.email,
            is_admin=obj.is_admin,
            ip_address=obj.ip_address,
            cameras=[camera.id for camera in obj.cameras]  # Convert Camera objects to IDs
        )
