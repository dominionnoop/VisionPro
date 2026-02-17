import asyncio
import logging
from app.db.session import AsyncSessionLocal
from app.db.models.vision import Camera, CameraStatus, CameraMode
import uuid

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def add_camera():
    async with AsyncSessionLocal() as session:
        camera = Camera(
            id=f"cam-{uuid.uuid4().hex[:8]}",
            name="Laptop Camera (HTTP)",
            protocol="HTTP",
            connection_string="http://host.docker.internal:8000/video_feed",
            status=CameraStatus.DISCONNECTED,
            mode=CameraMode.AUTO,
            settings={
                "resolution": "640x480",
                "fps": 30
            }
        )
        
        session.add(camera)
        await session.commit()
        logger.info(f"✅ Added camera: {camera.name} ({camera.id})")

if __name__ == "__main__":
    asyncio.run(add_camera())
