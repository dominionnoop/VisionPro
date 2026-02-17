from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class DetectionLog(Base):
    __tablename__ = "detection_logs"
    
    id = Column(String, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    camera_id = Column(String, ForeignKey("cameras.id"), index=True)
    model_id = Column(String, ForeignKey("models.id"), index=True)
    
    speed_inference = Column(Float)  # ms
    speed_fps = Column(Float)
    
    has_detections = Column(Boolean, default=False, index=True)
    detection_count = Column(Integer, default=0)
    
    # Store full JSON payload for flexibility
    detections = Column(JSON)
    
    # Optional snapshot path (relative to media dir)
    image_path = Column(String, nullable=True)
