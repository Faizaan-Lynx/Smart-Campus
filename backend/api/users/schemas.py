from pydantic import BaseModel, EmailStr
from typing import Optional, List
from passlib.context import CryptContext
from datetime import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")    

class UserBase(BaseModel):
    id: int  # Add ID field here
    username: str
    email: EmailStr
    is_admin: Optional[bool] = False
    ip_address: Optional[str] = None
    cameras: List[int] = []
    license_plate: Optional[str] = None  # Optional field for license plate
    entered_at_timestamp: Optional[datetime] = None # Use str for ISO format
    exit_at_timestamp: Optional[datetime] = None   # Use str for ISO format
    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        """Convert ORM model to schema, extracting camera IDs"""
        return cls(
            id=obj.id,  # Ensure ID is included in the response
            username=obj.username,
            email=obj.email,
            is_admin=obj.is_admin,
            ip_address=obj.ip_address,
            cameras=[camera.id for camera in obj.cameras] if hasattr(obj, "cameras") else [],
            license_plate=obj.license_plate,
            entered_at_timestamp=obj.entered_at_timestamp,
            exit_at_timestamp=obj.exit_at_timestamp
        )


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    is_admin: Optional[bool] = False
    ip_address: Optional[str] = None
    cameras: List[int] = []
    license_plate: Optional[str] = None  # Optional field for license plate
    entered_at_timestamp: Optional[datetime] = None  # Use str for ISO format
    exit_at_timestamp: Optional[datetime] = None   # Use str for ISO format

    def hash_password(self):
        """Hash the password before storing, truncating to 72 bytes for bcrypt."""
        password_bytes = self.password.encode("utf-8")[:72]
        result = password_bytes.decode("utf-8", errors="ignore")
        while len(result.encode("utf-8")) > 72:
            result = result[:-1]
        self.password = pwd_context.hash(result)


class UserUpdate(BaseModel):  # No need to inherit from UserBase to keep fields optional
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_admin: Optional[bool] = None
    ip_address: Optional[str] = None
    cameras: Optional[List[int]] = None  # Make cameras optional
    license_plate: Optional[str] = None  # Optional field for license plate
    entered_at_timestamp: Optional[datetime] = None  # Use str for ISO format
    exit_at_timestamp: Optional[datetime] = None   # Use str for ISO format

    class Config:
        from_attributes = True
