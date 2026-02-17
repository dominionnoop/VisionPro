from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Enum as SQLEnum
from sqlalchemy.sql import func
from app.db.base import Base
import enum

class ProjectStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"

class CameraStatus(str, enum.Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"

class CameraMode(str, enum.Enum):
    AUTO = "auto"
    MANUAL = "manual"
    SNAPSHOT = "snapshot"

class ModelStatus(str, enum.Enum):
    READY = "ready"
    TRAINING = "training"
    ERROR = "error"

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    status = Column(SQLEnum(ProjectStatus), default=ProjectStatus.ACTIVE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    cameras = Column(JSON, default=list)  # List of camera IDs
    models = Column(JSON, default=list)   # List of model IDs

class Camera(Base):
    __tablename__ = "cameras"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    protocol = Column(String, nullable=False)  # GigE, RTSP, HTTP
    connection_string = Column(String, nullable=False)
    status = Column(SQLEnum(CameraStatus), default=CameraStatus.DISCONNECTED)
    mode = Column(SQLEnum(CameraMode), default=CameraMode.AUTO)
    settings = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Model(Base):
    __tablename__ = "models"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    description = Column(String, nullable=True)
    
    # Model type and storage
    model_type = Column(String(50), nullable=False, index=True)  # yolov8, yolov5, custom, etc.
    file_path = Column(String(500), nullable=False)  # Relative path: yolov8/model.pt
    file_size = Column(Integer, nullable=False)  # Size in bytes
    file_format = Column(String(20), nullable=False)  # .pt, .onnx, .tflite
    framework = Column(String(50), nullable=True)  # ultralytics, yolov7, custom
    version = Column(String(50), nullable=True)  # Model version
    
    # Model configuration
    classes = Column(JSON, default=list)  # List of class definitions
    confidence = Column(Float, default=0.5)
    roi = Column(JSON, nullable=True)  # Region of interest
    status = Column(String(20), default=ModelStatus.READY.value)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
