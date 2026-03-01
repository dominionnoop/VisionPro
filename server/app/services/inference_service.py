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
        self.device = self._best_accelerator_device()

    def _best_accelerator_device(self) -> str:
        """Pick the best available runtime device for this host."""
        if torch.cuda.is_available() and torch.cuda.device_count() > 0:
            return "cuda:0"

        mps_backend = getattr(torch.backends, "mps", None)
        if mps_backend and mps_backend.is_available():
            return "mps"

        xpu_runtime = getattr(torch, "xpu", None)
        if xpu_runtime and xpu_runtime.is_available():
            count = xpu_runtime.device_count() if hasattr(xpu_runtime, "device_count") else 0
            return "xpu:0" if count > 0 else "xpu"

        return "cpu"

    def _resolve_device(self, requested_device: Optional[str]) -> str:
        """Resolve inference device from many input formats with safe fallback."""
        fallback = self._best_accelerator_device()
        if not requested_device:
            return fallback

        requested = requested_device.strip().lower()
        if requested in {"", "auto", "default"}:
            return fallback

        if requested in {"gpu", "accelerator"}:
            if torch.cuda.is_available() and torch.cuda.device_count() > 0:
                return "cuda:0"

            mps_backend = getattr(torch.backends, "mps", None)
            if mps_backend and mps_backend.is_available():
                return "mps"

            xpu_runtime = getattr(torch, "xpu", None)
            if xpu_runtime and xpu_runtime.is_available():
                count = xpu_runtime.device_count() if hasattr(xpu_runtime, "device_count") else 0
                return "xpu:0" if count > 0 else "xpu"

            return "cpu"

        if requested == "cpu":
            return "cpu"

        if requested.isdigit():
            index = int(requested)
            if torch.cuda.is_available() and 0 <= index < torch.cuda.device_count():
                return f"cuda:{index}"
            return fallback

        if requested.startswith("cuda"):
            if not torch.cuda.is_available():
                return fallback

            if requested == "cuda":
                return "cuda:0"

            if requested.startswith("cuda:"):
                suffix = requested.split(":", 1)[1]
            else:
                suffix = requested.replace("cuda", "", 1)

            try:
                index = int(suffix)
            except Exception:
                return fallback

            if index < 0 or index >= torch.cuda.device_count():
                return fallback

            return f"cuda:{index}"

        if requested in {"mps", "metal"}:
            mps_backend = getattr(torch.backends, "mps", None)
            return "mps" if mps_backend and mps_backend.is_available() else fallback

        if requested.startswith("xpu"):
            xpu_runtime = getattr(torch, "xpu", None)
            if not xpu_runtime or not xpu_runtime.is_available():
                return fallback

            if requested == "xpu":
                count = xpu_runtime.device_count() if hasattr(xpu_runtime, "device_count") else 0
                return "xpu:0" if count > 0 else "xpu"

            if not requested.startswith("xpu:"):
                return fallback

            try:
                index = int(requested.split(":", 1)[1])
            except Exception:
                return fallback

            count = xpu_runtime.device_count() if hasattr(xpu_runtime, "device_count") else 0
            if count > 0 and 0 <= index < count:
                return f"xpu:{index}"
            return fallback

        return fallback
        
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
        image: Optional[UploadFile] = None,
        media_input_path: Optional[str] = None,
        device: Optional[str] = None,
        confidence: float = 0.5,
        iou_threshold: float = 0.45,
        db: Optional[AsyncSession] = None,
        model_id: Optional[str] = None
    ) -> Dict:
        """Run inference on an uploaded image/video or an existing media path."""
        
        # Resolve requested device and load model
        run_device = self._resolve_device(device)
        model = await self.load_model(model_path)
        model.to(run_device)
        
        # Load db_model if available for custom colors
        db_model = None
        class_colors = {}
        if db and model_id:
            from sqlalchemy import select
            from app.db.models.model import Model as DBModel
            db_model_res = await db.execute(select(DBModel).where(DBModel.id == model_id))
            db_model = db_model_res.scalar_one_or_none()
            
            if db_model and getattr(db_model, 'classes', None):
                for cls in db_model.classes:
                    color_hex = cls.get('color', '#ef4444').lstrip('#')
                    try:
                        if len(color_hex) == 6:
                            r, g, b = int(color_hex[0:2], 16), int(color_hex[2:4], 16), int(color_hex[4:6], 16)
                        elif len(color_hex) == 3:
                            r, g, b = int(color_hex[0]*2, 16), int(color_hex[1]*2, 16), int(color_hex[2]*2, 16)
                        else:
                            r, g, b = 239, 68, 68
                        class_colors[cls.get('name')] = (b, g, r)
                        class_colors[cls.get('id', -1)] = (b, g, r)
                    except Exception:
                        pass

        input_dir = Path(settings.MEDIA_DIR) / "inputs"
        output_dir = Path(settings.MEDIA_DIR) / "outputs"
        input_dir.mkdir(parents=True, exist_ok=True)
        output_dir.mkdir(parents=True, exist_ok=True)

        if not image and not media_input_path:
            raise ValueError("Either image or media_input_path must be provided")

        content: bytes = b""

        if media_input_path:
            media_root = Path(settings.MEDIA_DIR).resolve()
            normalized = media_input_path.replace("\\", "/").lstrip("/")
            if normalized.startswith("media/"):
                normalized = normalized[len("media/") :]

            source_path = (media_root / normalized).resolve()
            if not str(source_path).startswith(str(media_root)):
                raise FileNotFoundError("Invalid media path")
            if not source_path.exists() or not source_path.is_file():
                raise FileNotFoundError(f"Media file not found: {media_input_path}")

            input_path = source_path
            filename = source_path.name
            content = source_path.read_bytes()
        else:
            # Prepare file paths
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_name = Path(image.filename or "upload.bin").name
            filename = f"{timestamp}_{safe_name}"
            input_path = input_dir / filename

            # Save input file
            content = await image.read()
            with open(input_path, "wb") as f:
                f.write(content)

        output_path = output_dir / filename  # Same name in outputs dir

        # Determine media type
        content_type = image.content_type if image and image.content_type else ""
        is_video = content_type.startswith('video/') or Path(filename).suffix.lower() in {".mp4", ".avi", ".mov", ".mkv", ".webm"}
        media_type = MediaType.VIDEO if is_video else MediaType.IMAGE
        
        start_time = time.time()
        detections = []
        orig_size = [0, 0]
        inference_error: Optional[Exception] = None
        
        try:
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
                        device=run_device,
                        verbose=False
                    )
                    
                    # Parse detections
                    current_detections = self._parse_detections(results[0], model)
                    
                    # Plot results manually with custom colors
                    annotated_frame = self._draw_custom_boxes(frame, current_detections, class_colors)
                    
                    # Write frame
                    out.write(annotated_frame)
                    
                    # Collect detections from first frame only (for simple summary)
                    # or we could aggregate, but for now let's just keep it simple
                    if len(detections) == 0 and len(current_detections) > 0:
                        detections = current_detections

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
                    device=run_device,
                    verbose=False
                )
                
                # Parse detections
                detections = self._parse_detections(results[0], model)
                
                # Plot manually with custom colors
                annotated_img = self._draw_custom_boxes(img, detections, class_colors)
                
                # Save output
                cv2.imwrite(str(output_path), annotated_img)
        except Exception as e:
            inference_error = e

        inference_time = (time.time() - start_time) * 1000
        
        # Save record to DB
        record = None
        if db and model_id:
            try:
                # Calculate relative paths for URL
                if media_input_path:
                    normalized = media_input_path.replace("\\", "/").lstrip("/")
                    rel_input_path = normalized if normalized.startswith("media/") else f"media/{normalized}"
                else:
                    rel_input_path = f"media/inputs/{filename}"
                rel_output_path = None if inference_error else f"media/outputs/{filename}"
                
                record = TestRecord(
                    model_id=model_id,
                    type=media_type,
                    input_path=rel_input_path,
                    output_path=rel_output_path,
                    inference_result={
                        "detections": detections,
                        "inference_time": inference_time,
                        "image_size": orig_size,
                        "error": str(inference_error) if inference_error else None,
                    }
                )
                db.add(record)
                await db.commit()
                await db.refresh(record)
            except Exception as e:
                print(f"Failed to save test record: {e}")
                # Don't fail the request if logging fails

        if inference_error:
            raise RuntimeError(str(inference_error))
        
        return {
            'image_size': orig_size,
            'inference_time': round(inference_time, 2),
            'detections': detections,
            'device': run_device,
            'input_url': f"/{record.input_path}" if record else f"/media/inputs/{filename}",
            'output_url': f"/{record.output_path}" if record else f"/media/outputs/{filename}",
            'type': media_type.value
        }

    def _draw_custom_boxes(self, img_bgr, detections, class_colors) -> np.ndarray:
        """Draw bounding boxes manually using custom colors from DB."""
        annotated = img_bgr.copy()
        for det in detections:
            bbox = det['bbox']
            x, y, w, h = bbox['x'], bbox['y'], bbox['width'], bbox['height']
            
            color = class_colors.get(det['class_id'], class_colors.get(det['class_name'], (0, 0, 255)))
            
            cv2.rectangle(annotated, (x, y), (x+w, y+h), color, 2)
            
            label = f"{det['class_name']} {det['confidence']:.2f}"
            (text_w, text_h), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            
            y_label = y if y - text_h - baseline - 2 > 0 else y + h + text_h + baseline + 2
            
            cv2.rectangle(annotated, (x, y_label - text_h - baseline - 2), (x + text_w, y_label), color, -1)
            cv2.putText(annotated, label, (x, y_label - baseline - 1), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
        return annotated

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
