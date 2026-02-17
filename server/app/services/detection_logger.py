import asyncio
import queue
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import async_session_factory
from app.db.models.detection_log import DetectionLog

logger = logging.getLogger(__name__)

class DetectionLogger:
    def __init__(self):
        self.log_queue = queue.Queue()
        self.is_running = False
        self.consumer_task = None

    def log(self, 
            camera_id: str, 
            model_id: str, 
            inference_ms: float, 
            fps: float, 
            detections: List[Dict], 
            image_path: Optional[str] = None):
        """Add a detection log to the queue (Thread-safe)"""
        if not self.is_running:
            return
            
        entry = {
            "camera_id": camera_id,
            "model_id": model_id,
            "inference_ms": inference_ms,
            "speed_fps": fps,
            "detections": detections,
            "has_detections": len(detections) > 0,
            "detection_count": len(detections),
            "image_path": image_path,
            "timestamp": datetime.now()
        }
        try:
            self.log_queue.put_nowait(entry)
        except queue.Full:
            logger.warning("Detection log queue full, dropping entry")

    async def start(self):
        """Start the consumer task"""
        if self.is_running:
            return
        self.is_running = True
        self.consumer_task = asyncio.create_task(self._consume_logs())
        logger.info("✅ DetectionLogger started")

    async def stop(self):
        """Stop the consumer task"""
        self.is_running = False
        if self.consumer_task:
            await self.consumer_task
        logger.info("🛑 DetectionLogger stopped")

    async def _consume_logs(self):
        """Background task to consume logs and write to DB"""
        while self.is_running or not self.log_queue.empty():
            try:
                # Get batch of logs to reduce DB calls?
                # For now simplify to one by one or small batches
                entries = []
                try:
                    # Get up to 100 entries from queue
                    while len(entries) < 100:
                        entry = self.log_queue.get_nowait()
                        entries.append(entry)
                except queue.Empty:
                    pass

                if not entries:
                    await asyncio.sleep(1.0)
                    continue

                async with async_session_factory() as db:
                    for entry in entries:
                        log = DetectionLog(
                            camera_id=entry["camera_id"],
                            model_id=entry["model_id"],
                            speed_inference=entry["inference_ms"],
                            speed_fps=entry["speed_fps"],
                            has_detections=entry["has_detections"],
                            detection_count=entry["detection_count"],
                            detections=entry["detections"],
                            image_path=entry["image_path"],
                            # Let DB handle timestamp or use entry timestamp?
                            # DB default is server time, but entry timestamp is more accurate to when it happened
                            # But our model sets default=func.now(). Let's keep DB time for simplicity or overwrite if needed.
                        )
                        db.add(log)
                    await db.commit()
                
            except Exception as e:
                logger.error(f"Error in detection logger consumer: {e}")
                await asyncio.sleep(5) # Backoff on error

# Singleton
detection_logger = DetectionLogger()
