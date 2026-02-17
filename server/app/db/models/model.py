"""Model database model."""

from sqlalchemy import Column, String, Integer, Float, JSON, DateTime, Text
from sqlalchemy.sql import func
from app.db.base import Base

class Model(Base):
    """AI Model database model."""
    
    __tablename__ = "models"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Model type and storage
    model_type = Column(String(50), nullable=False, index=True)  # yolov8, yolov5, custom, etc.
    file_path = Column(String(500), nullable=False)  # Relative path: yolov8/model.pt
    file_size = Column(Integer, nullable=False)  # Size in bytes
    file_format = Column(String(20), nullable=False)  # .pt, .onnx, .tflite
    framework = Column(String(50), nullable=True)  # ultralytics, yolov7, custom
    version = Column(String(50), nullable=True)  # Model version
    
    # Model configuration
    classes = Column(JSON, nullable=True)  # List of class definitions
    confidence = Column(Float, default=0.5)  # Default confidence threshold
    roi = Column(JSON, nullable=True)  # Region of interest
    
    # Status
    status = Column(String(20), default='ready')  # ready, training, error
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
