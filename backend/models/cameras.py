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
    resize_dims = Column(String)  # Store dimensions as a string or json
    crop_region = Column(String)  # Store as a string or json
    lines = Column(String)  # Store coordinates as a string or json

    # Relationship with users
    from models.user_cameras import user_cameras  
    users = relationship("Users", secondary=user_cameras, back_populates="cameras")