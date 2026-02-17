import asyncio
from app.db.session import async_session_maker
from app.db.models import Camera, VisionModel
from sqlalchemy import select

async def check():
    async with async_session_maker() as db:
        # Get cameras
        result = await db.execute(select(Camera))
        cameras = result.scalars().all()
        
        print("=== Cameras ===")
        for c in cameras:
            print(f"ID: {c.id}")
            print(f"Name: {c.name}")
            print(f"URL: {c.stream_url}")
            print()
        
        # Get models
        result = await db.execute(select(VisionModel))
        models = result.scalars().all()
        
        print("=== Models ===")
        for m in models:
            print(f"ID: {m.id}")
            print(f"Name: {m.name}")
            print(f"Path: {m.file_path}")
            print(f"Status: {m.status}")
            print()

if __name__ == "__main__":
    asyncio.run(check())
