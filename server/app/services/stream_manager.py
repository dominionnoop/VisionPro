import cv2
import time
import asyncio
import threading
import torch
import numpy as np
import aiohttp
from typing import Dict, Optional, List
from datetime import datetime
from ultralytics import YOLO
from pathlib import Path
from app.core.config import settings

class StreamContext:
    def __init__(self, camera_id: str, model_id: str, model_path: str, connection_string: str, confidence: float, iou: float, fps: int):
        self.camera_id = camera_id
        self.model_id = model_id
        self.model_path = model_path
        self.connection_string = connection_string
        self.confidence = confidence
        self.iou = iou
        self.iou = iou
        self.fps = fps
        
        # Dynamic Configuration (Class filters & colors)
        # Format: { 'class_name': { 'visible': True, 'color': '#00FF00' } }
        self.class_config = {}
        self.config_lock = threading.Lock()
        
        # State
        self.latest_frame = None # JPEG bytes (Annotated)
        self.latest_detections = []
        self.last_update = None
        self.is_running = False
        self.stop_event = threading.Event()
        
        # Reader State
        self.raw_frame = None # Latest raw frame from camera
        self.raw_frame_lock = threading.Lock()
        self.reader_thread = None
        self.inference_thread = None
        
        # Profiling
        self.fps_tracker = 0
        self.inference_ms = 0

    def start(self):
        if self.is_running:
            return
        self.stop_event.clear()
        self.is_running = True
        
        # Start Reader Thread (Fetches frames as fast as possible)
        self.reader_thread = threading.Thread(target=self._run_reader, daemon=True)
        self.reader_thread.start()
        
        # Start Inference Thread (Processes frames at target FPS)
        self.inference_thread = threading.Thread(target=self._run_inference, daemon=True)
        self.inference_thread.start()

    def stop(self):
        self.is_running = False
        self.stop_event.set()
        
        if self.inference_thread:
            self.inference_thread.join(timeout=2.0)
            self.inference_thread = None
            
        if self.reader_thread:
            # Reader might be blocked on IO, so join might timeout
            self.reader_thread.join(timeout=1.0)
            self.reader_thread = None

    def _run_reader(self):
        """Continuously reads frames to prevent buffer buildup"""
        print(f"📷 [Stream {self.camera_id}] Reader started: {self.connection_string}")
        cap = cv2.VideoCapture(self.connection_string)
        
        while not self.stop_event.is_set():
            ret, frame = cap.read()
            if not ret:
                print(f"⚠️ [Stream {self.camera_id}] Frame read failed, reconnecting...")
                cap.release()
                time.sleep(2) # Wait before reconnect
                cap = cv2.VideoCapture(self.connection_string)
                continue
            
            # Update latest raw frame atomically
            with self.raw_frame_lock:
                self.raw_frame = frame
                
            # Minor sleep to prevent CPU hogging in tight loop, but small enough to drain buffer
            time.sleep(0.005) 
            
        cap.release()
        print(f"📷 [Stream {self.camera_id}] Reader stopped")

    def _run_inference(self):
        """Runs inference at target FPS"""
        # Load model locally in thread
        device = 'cuda:0' if torch.cuda.is_available() else 'cpu'
        print(f"🧠 [Stream {self.camera_id}] Loading model {self.model_id} on {device}...")
        try:
            self.model = YOLO(self.model_path)
            self.model.to(device)
        except Exception as e:
            print(f"❌ [Stream {self.camera_id}] Failed to load model: {e}")
            self.is_running = False
            return

        print(f"🚀 [Stream {self.camera_id}] Inference loop started")
        
        p_frame_count = 0
        p_last_log = time.time()

        while not self.stop_event.is_set():
            t_start = time.time()
            
            # Get latest raw frame
            frame = None
            with self.raw_frame_lock:
                if self.raw_frame is not None:
                    frame = self.raw_frame.copy()
            
            if frame is None:
                # No frame yet, wait
                time.sleep(0.1)
                continue

            # Inference
            t_infer_start = time.time()
            # Run inference
            results = self.model(frame, verbose=False)
            t_infer_end = time.time()
            self.inference_ms = (t_infer_end - t_infer_start) * 1000
            
            # Parse results
            detections = []
            has_defects = False
            
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    c = int(box.cls)
                    conf = float(box.conf)
                    
                    # Filter by confidence
                    if conf < self.confidence:
                        continue
                        
                    label = self.model.names[c]
                    
                    # Check Config for Visibility & Color
                    is_visible = True
                    color_hex = "#FF0000" if label.lower() != "ok" else "#00FF00"
                    
                    with self.config_lock:
                        if label in self.class_config:
                            is_visible = self.class_config[label].get('visible', True)
                            if 'color' in self.class_config[label]:
                                color_hex = self.class_config[label]['color']
                    
                    # Skip if hidden
                    if not is_visible:
                        continue
                    
                    # Check for defect (anything not 'scratch' or 'dent' is pass? 
                    # Actually typically defect models detect defects. 
                    # Let's assume ANY detection is a "defect" for now unless specified.
                    # Or if label is NOT "OK".
                    if label.lower() != "ok":
                        has_defects = True
                    
                    # Normalize coordinates
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    w = x2 - x1
                    h = y2 - y1
                    
                    detections.append({
                        "classId": c,
                        "className": label,
                        "confidence": conf,
                        "boundingBox": {
                            "x": x1, 
                            "y": y1, 
                            "width": w, 
                            "height": h
                        },
                        "color": color_hex
                    })
            
            # Prepare payload
            import uuid
            
            # Calculate class counts
            class_counts = {}
            for d in detections:
                c_name = d["className"]
                class_counts[c_name] = class_counts.get(c_name, 0) + 1

            payload = {
                "inference_id": str(uuid.uuid4()),
                "timestamp": datetime.now().isoformat(),
                "camera_id": self.camera_id,
                "model_id": self.model_id,
                "fps": round(self.fps_tracker, 2),
                "inference_ms": round(self.inference_ms, 2),
                "has_detections": len(detections) > 0,
                "detections": [
                    {
                        "class_id": d["classId"],
                        "class_name": d["className"],
                        "confidence": round(d["confidence"], 4),
                        "bbox": {
                            "x": int(d["boundingBox"]["x"]),
                            "y": int(d["boundingBox"]["y"]),
                            "width": int(d["boundingBox"]["width"]),
                            "height": int(d["boundingBox"]["height"])
                        }
                    } for d in detections
                ],
                "total_count": len(detections),
                "class_counts": class_counts
            }

            # Update stats
            stream_manager.update_stats(has_defects)
            
            # Save to context
            self.latest_detections = detections
            self.last_update = datetime.now()

            # Publish to MQTT based on mode
            should_publish = False
            mode = settings.MQTT_PUBLISH_MODE.lower()
            
            if mode == 'all':
                should_publish = True
            elif mode == 'on_detection':
                if len(detections) > 0:
                    should_publish = True
            # TODO: Implement on_change if needed (requires tracking previous state)

            if should_publish:
                try:
                    from app.services.mqtt_service import mqtt_service
                    # Topic: prefix/{camera_id}/results
                    topic = f"{settings.MQTT_TOPIC_PREFIX}/{self.camera_id}/results"
                    mqtt_service.publish(topic, payload)
                except Exception as e:
                    print(f"MQTT Publish Error: {e}")

            # Annotate Frame (Draw bounding boxes)
            for det in detections:
                x = int(det['boundingBox']['x'])
                y = int(det['boundingBox']['y'])
                w = int(det['boundingBox']['width'])
                h = int(det['boundingBox']['height'])
                
                # Color is already processed in detection loop
                color_hex = det['color']

                # Convert hex to BGR
                color_hex = color_hex.lstrip('#')
                r = int(color_hex[0:2], 16)
                g = int(color_hex[2:4], 16)
                b = int(color_hex[4:6], 16)
                color = (b, g, r) # BGR
                
                cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
                label_text = f"{det['className']} {det['confidence']:.2f}"
                cv2.putText(frame, label_text, (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            
            # FPS calc
            p_frame_count += 1
            if time.time() - p_last_log >= 1.0:
                self.fps_tracker = p_frame_count / (time.time() - p_last_log)
                p_frame_count = 0
                p_last_log = time.time()
                
            # Overlay
            cv2.putText(frame, f"FPS: {self.fps_tracker:.1f} | Infer: {self.inference_ms:.1f}ms", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

            # Encode
            _, buffer = cv2.imencode('.jpg', frame)
            self.latest_frame = buffer.tobytes()
            
            # FPS Control
            t_elapsed = time.time() - t_start
            t_target = 1.0 / self.fps
            t_sleep = max(0, t_target - t_elapsed)
            if t_sleep > 0:
                time.sleep(t_sleep)

            # Update global stats
            stream_manager.update_stats(len(detections) > 0)
                
        print(f"🛑 [Stream {self.camera_id}] Inference stopped")


class StreamManager:
    def __init__(self):
        self.streams: Dict[str, StreamContext] = {}
        self.stats = {
            "total_inspections": 0,
            "total_defects": 0,
            "start_time": datetime.now()
        }
        self.stats_lock = threading.Lock()
        
        # Start MQTT Service
        from app.services.mqtt_service import mqtt_service
        mqtt_service.start()
        
    def update_stats(self, has_defects: bool):
        with self.stats_lock:
            self.stats["total_inspections"] += 1
            if has_defects:
                self.stats["total_defects"] += 1

    def get_stream(self, camera_id: str, model_id: str, model_path: str, connection_string: str, **kwargs) -> StreamContext:
        key = f"{camera_id}_{model_id}"
        
        if key not in self.streams:
            # Create new stream
            stream = StreamContext(
                camera_id, model_id, model_path, connection_string,
                confidence=kwargs.get('confidence', 0.5),
                iou=kwargs.get('iou', 0.45),
                fps=kwargs.get('fps', 10)
            )
            self.streams[key] = stream
            stream.start()
        else:
            # Update existing stream parameters if changed
            stream = self.streams[key]
            new_fps = kwargs.get('fps', 10)
            new_conf = kwargs.get('confidence', 0.5)
            new_iou = kwargs.get('iou', 0.45)
            
            if stream.fps != new_fps:
                print(f"⚡ [Stream {camera_id}] Updating FPS: {stream.fps} -> {new_fps}")
                stream.fps = new_fps
                
            if stream.confidence != new_conf:
                stream.confidence = new_conf
                
            if stream.iou != new_iou:
                stream.iou = new_iou
                
            # Ensure it's running (in case it crashed or was stopped but not deleted?)
            if not stream.is_running:
                stream.start()
        
        return self.streams[key]

    def stop_stream(self, camera_id: str, model_id: str):
        key = f"{camera_id}_{model_id}"
        if key in self.streams:
            self.streams[key].stop()
            del self.streams[key]

    def update_stream_config(self, camera_id: str, model_id: str, config: Dict):
        """Updates the class configuration for a specific stream"""
        key = f"{camera_id}_{model_id}"
        if key in self.streams:
            stream = self.streams[key]
            with stream.config_lock:
                # Merge new config with existing
                # Config format: { 'class_name': { 'visible': bool, 'color': '#HEX' } }
                for class_name, settings in config.items():
                    if class_name not in stream.class_config:
                        stream.class_config[class_name] = {}
                    stream.class_config[class_name].update(settings)
            print(f"⚙️ [Stream {camera_id}] Updated config: {config}")
            return True
        return False
            
    def get_global_stats(self):
        with self.stats_lock:
            uptime = datetime.now() - self.stats["start_time"]
            return {
                "active_streams": len(self.streams),
                "total_inspections": self.stats["total_inspections"],
                "total_defects": self.stats["total_defects"],
                "uptime_seconds": int(uptime.total_seconds())
            }

# Singleton
stream_manager = StreamManager()

