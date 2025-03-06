# app/cameras/models.py
from sqlalchemy import Column, Integer, String, ForeignKey
from models.base import Base
from sqlalchemy.orm import relationship

class Camera(Base):
    __tablename__ = 'cameras'

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, index=True)
    location = Column(String)
    detection_threshold = Column(Integer)
    resize_dims = Column(String, nullable=True)
    crop_region = Column(String, nullable=True)
    lines = Column(String)

    # Relationship with users
    from models.user_cameras import user_cameras  
    users = relationship("Users", secondary=user_cameras, back_populates="cameras")

    # Relationship with alerts
    alerts = relationship("Alert", back_populates="camera", cascade="all, delete-orphan")

    intrusions = relationship("Intrusion", back_populates="camera", cascade="all, delete-orphan")