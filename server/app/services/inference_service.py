"""YOLOv8 Inference Service for model testing."""

import os
import io
import asyncio
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import numpy as np
from PIL import Image
from fastapi import UploadFile
import torch
import cv2

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.services.model_storage import model_storage
from app.db.models.test_record import TestRecord, MediaType


class InferenceService:
    """Service for running YOLOv8 inference on uploaded files."""
    
    def __init__(self):
        self.models_cache: Dict[str, any] = {}
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        
    async def load_model(self, model_path: str) -> any:
        """Load YOLOv8 model from file path."""
        # Check cache first
        if model_path in self.models_cache:
            return self.models_cache[model_path]
        
        # Get absolute path
        full_path = model_storage.base_path / model_path
        
        if not full_path.exists():
            raise FileNotFoundError(f"Model file not found: {full_path}")
        
        # Load model using ultralytics
        try:
            from ultralytics import YOLO
            model = YOLO(str(full_path))
            model.to(self.device)
            
            # Cache the model
            self.models_cache[model_path] = model
            
            return model
        except Exception as e:
            raise RuntimeError(f"Failed to load model: {str(e)}")
    
    async def run_inference(
        self,
        model_path: str,
        image: UploadFile,
        confidence: float = 0.5,
        iou_threshold: float = 0.45,
        db: Optional[AsyncSession] = None,
        model_id: Optional[str] = None
    ) -> Dict:
        """Run inference on an uploaded image or video."""
        
        # Load model
        model = await self.load_model(model_path)
        
        # Prepare file paths
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{image.filename}"
        
        input_dir = Path(settings.MEDIA_DIR) / "inputs"
        output_dir = Path(settings.MEDIA_DIR) / "outputs"
        
        input_path = input_dir / filename
        output_path = output_dir / filename  # Same name in outputs dir
        
        # Save input file
        content = await image.read()
        with open(input_path, "wb") as f:
            f.write(content)
            
        # Determine media type
        is_video = image.content_type.startswith('video/') if image.content_type else False
        media_type = MediaType.VIDEO if is_video else MediaType.IMAGE
        
        start_time = time.time()
        detections = []
        orig_size = [0, 0]
        
        if is_video:
            # Process Video
            cap = cv2.VideoCapture(str(input_path))
            
            # Get video properties
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            orig_size = [width, height]
            
            # Initialize video writer
            # Use 'mp4v' codec for MP4 container
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                    
                # Inference on frame
                results = model.predict(
                    frame,
                    conf=confidence,
                    iou=iou_threshold,
                    device=self.device,
                    verbose=False
                )
                
                # Plot results (BGR numpy array)
                annotated_frame = results[0].plot()
                
                # Write frame
                out.write(annotated_frame)
                
                # Collect detections from first frame only (for simple summary)
                # or we could aggregate, but for now let's just keep it simple
                if len(detections) == 0 and len(results[0].boxes) > 0:
                    detections = self._parse_detections(results[0], model)

            cap.release()
            out.release()
            
        else:
            # Process Image
            # Use cv2 to read image (so plotting matches)
            # cv2 reads as BGR
            img = cv2.imread(str(input_path))
            
            if img is None:
                # Fallback to PIL if cv2 fails to read
                pil_image = Image.open(io.BytesIO(content))
                img = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
                
            height, width = img.shape[:2]
            orig_size = [width, height]
            
            # Predict
            results = model.predict(
                img,
                conf=confidence,
                iou=iou_threshold,
                device=self.device,
                verbose=False
            )
            
            # Plot
            annotated_img = results[0].plot()
            
            # Save output
            cv2.imwrite(str(output_path), annotated_img)
            
            # Parse detections
            detections = self._parse_detections(results[0], model)

        inference_time = (time.time() - start_time) * 1000
        
        # Save record to DB
        record = None
        if db and model_id:
            try:
                # Calculate relative paths for URL
                rel_input_path = f"media/inputs/{filename}"
                rel_output_path = f"media/outputs/{filename}"
                
                record = TestRecord(
                    model_id=model_id,
                    type=media_type,
                    input_path=rel_input_path,
                    output_path=rel_output_path,
                    inference_result={
                        "detections": detections,
                        "inference_time": inference_time,
                        "image_size": orig_size
                    }
                )
                db.add(record)
                await db.commit()
                await db.refresh(record)
            except Exception as e:
                print(f"Failed to save test record: {e}")
                # Don't fail the request if logging fails
        
        return {
            'image_size': orig_size,
            'inference_time': round(inference_time, 2),
            'detections': detections,
            'input_url': f"/{record.input_path}" if record else f"/media/inputs/{filename}",
            'output_url': f"/{record.output_path}" if record else f"/media/outputs/{filename}",
            'type': media_type.value
        }

    def _parse_detections(self, result, model) -> List[Dict]:
        """Helper to parse detections from a result object."""
        detections = []
        boxes = result.boxes
        
        for i in range(len(boxes)):
            box = boxes[i]
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            class_id = int(box.cls[0].cpu().numpy())
            conf = float(box.conf[0].cpu().numpy())
            class_name = model.names[class_id] if hasattr(model, 'names') else f"class_{class_id}"
            
            detections.append({
                'class_id': class_id,
                'class_name': class_name,
                'confidence': round(conf, 3),
                'bbox': {
                    'x': int(x1),
                    'y': int(y1),
                    'width': int(x2 - x1),
                    'height': int(y2 - y1)
                }
            })
        return detections
    
    async def get_model_info(self, model_path: str) -> Dict:
        """Get information about a loaded model."""
        model = await self.load_model(model_path)
        return {
            'device': self.device,
            'input_size': getattr(model, 'imgsz', 640),
            'classes': getattr(model, 'names', {}),
            'num_classes': len(getattr(model, 'names', {})),
        }
    
    def clear_cache(self, model_path: Optional[str] = None):
        """Clear model cache."""
        if model_path:
            self.models_cache.pop(model_path, None)
        else:
            self.models_cache.clear()
        if self.device == 'cuda':
            torch.cuda.empty_cache()


# Global inference service instance
inference_service = InferenceService()
