from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from models.base import Base


class License(Base):
    __tablename__ = 'license_detection'

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    license_number = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)          # OCR confidence 0.0–1.0
    bounding_box = Column(String, nullable=True)       # JSON: [x1, y1, x2, y2]
    timestamp = Column(DateTime, default=datetime.utcnow)
    file_path = Column(String, nullable=True)          # saved plate-crop image

    # Relationship with the Camera model
    camera = relationship("Camera", back_populates="license_detection")
