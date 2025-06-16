from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from models.base import Base
from datetime import datetime
from sqlalchemy import DateTime


class Users(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Boolean, default=False)
    ip_address = Column(String, nullable=True)
    license_plate = Column(String, nullable=True)
    entered_at_timestamp = Column(DateTime, default=datetime.utcnow)
    exit_at_timestamp = Column(DateTime, default=datetime.utcnow)


    # Relationship with cameras
    cameras = relationship("Camera", secondary="user_cameras", back_populates="users")