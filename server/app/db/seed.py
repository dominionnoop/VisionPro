"""
Seed the database with initial data
"""
import asyncio
import logging
from app.db.session import AsyncSessionLocal
from app.db.models.vision import Project, Camera, Model, ProjectStatus, CameraStatus, CameraMode, ModelStatus
from app.db.models.user import User, UserRole
from app.core.security import get_password_hash

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_data():
    async with AsyncSessionLocal() as session:
        # Check if users exist
        from sqlalchemy import select
        result = await session.execute(select(User))
        if result.scalars().first():
            logger.info("Database already seeded (users exist). Skipping...")
            return
        
        logger.info("Seeding database...")

        # Create Users
        users = [
            User(
                id="user-001",
                username="admin",
                email="admin@example.com",
                hashed_password=get_password_hash("admin"),
                role=UserRole.ADMIN,
                is_active=True
            ),
             User(
                id="user-002",
                username="operator",
                email="operator@example.com",
                hashed_password=get_password_hash("password"),
                role=UserRole.USER,
                is_active=True
            )
        ]

        # Create projects
        projects = [
            Project(
                id="proj-001",
                name="PCB Inspection Line 1",
                description="Automated PCB defect detection for production line 1",
                status=ProjectStatus.ACTIVE,
                cameras=["cam-001"],
                models=["model-001"]
            ),
            Project(
                id="proj-002",
                name="Bottle Label Check",
                description="Label alignment and quality inspection",
                status=ProjectStatus.ACTIVE,
                cameras=["cam-002"],
                models=["model-002"]
            ),
            Project(
                id="proj-003",
                name="Metal Parts QC",
                description="Surface defect detection for metal components",
                status=ProjectStatus.INACTIVE,
                cameras=[],
                models=[]
            ),
        ]
        
        # Create cameras
        cameras = [
            Camera(
                id="cam-001",
                name="GigE Camera 1",
                protocol="GigE",
                connection_string="192.168.1.100",
                status=CameraStatus.CONNECTED,
                mode=CameraMode.AUTO,
                settings={
                    "resolution": {"width": 1920, "height": 1080},
                    "frameRate": 30,
                    "exposure": 10000,
                    "gain": 1.0,
                    "brightness": 50,
                    "contrast": 50,
                    "saturation": 50,
                }
            ),
            Camera(
                id="cam-002",
                name="RTSP Camera 1",
                protocol="RTSP",
                connection_string="rtsp://192.168.1.101:554/stream1",
                status=CameraStatus.CONNECTED,
                mode=CameraMode.AUTO,
                settings={
                    "resolution": {"width": 1280, "height": 720},
                    "frameRate": 25,
                    "exposure": 8000,
                    "gain": 1.2,
                    "brightness": 55,
                    "contrast": 45,
                    "saturation": 50,
                }
            ),
            Camera(
                id="cam-003",
                name="HTTP Camera 1",
                protocol="HTTP",
                connection_string="http://192.168.1.102/snapshot",
                status=CameraStatus.DISCONNECTED,
                mode=CameraMode.SNAPSHOT,
                settings={
                    "resolution": {"width": 2592, "height": 1944},
                    "frameRate": 5,
                    "exposure": 15000,
                    "gain": 1.5,
                    "brightness": 60,
                    "contrast": 55,
                    "saturation": 45,
                }
            ),
        ]
        
        # Create models
        models = [
            Model(
                id="model-001",
                name="YOLOv8n Pre-trained",
                filename="yolov8n.pt",
                model_type="yolov8",
                file_path="yolov8/yolov8n.pt",
                file_size=6500000,
                file_format=".pt",
                framework="ultralytics",
                version="v8.0.0",
                classes=[
                    {"id": 0, "name": "person", "color": "#22c55e"},
                    {"id": 1, "name": "bicycle", "color": "#ef4444"},
                    {"id": 2, "name": "car", "color": "#f97316"},
                ],
                confidence=0.5,
                status=ModelStatus.READY.value
            ),
            Model(
                id="model-002",
                name="YOLOv8n Copy",
                filename="yolov8n.pt",
                model_type="yolov8",
                file_path="yolov8/yolov8n.pt",
                file_size=6500000,
                file_format=".pt",
                framework="ultralytics",
                version="v8.0.0",
                classes=[
                    {"id": 0, "name": "person", "color": "#22c55e"},
                    {"id": 1, "name": "bicycle", "color": "#ef4444"},
                ],
                confidence=0.5,
                roi={"x": 100, "y": 50, "width": 400, "height": 300},
                status=ModelStatus.READY.value
            ),
        ]
        
        # Add all to session
        session.add_all(users + projects + cameras + models)
        await session.commit()
        
        logger.info("✅ Database seeded successfully!")
        logger.info(f"   - {len(users)} users")
        logger.info(f"   - {len(projects)} projects")
        logger.info(f"   - {len(cameras)} cameras")
        logger.info(f"   - {len(models)} models")

if __name__ == "__main__":
    asyncio.run(seed_data())
