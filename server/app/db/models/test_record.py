from sqlalchemy import Column, String, Integer, DateTime, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum

from app.db.base import Base

class MediaType(str, enum.Enum):
    IMAGE = "image"
    VIDEO = "video"

class TestRecord(Base):
    __tablename__ = "test_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    model_id = Column(String, ForeignKey("models.id"), nullable=False)
    
    type = Column(SQLEnum(MediaType), nullable=False)
    input_path = Column(String, nullable=False)   # stored as relative path: media/inputs/...
    output_path = Column(String, nullable=True)   # stored as relative path: media/outputs/...
    
    inference_result = Column(JSON, nullable=True) # Full JSON result
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    model = relationship("Model")
