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
    def __init__(self, camera_id: str, model_id: str, model_path: str, connection_string: str, confidence: float, iou: float, fps: int, device: str = "auto", **kwargs):
        self.camera_id = camera_id
        self.model_id = model_id
        self.model_path = model_path
        self.connection_string = connection_string
        self.confidence = confidence
        self.iou = iou
        self.iou = iou
        self.fps = fps
        self.device = device
        
        # Dynamic Configuration (Class filters & colors)
        # Format: { 'class_name': { 'visible': True, 'color': '#00FF00' } }
        self.class_config = {}
        model_classes = kwargs.get('model_classes') or []
        for cls in model_classes:
            self.class_config[cls.get('name')] = {
                'visible': True,
                'color': cls.get('color', '#00ff00'),
                'isDefect': False
            }
            
        self.config_lock = threading.Lock()
        
        # State
        self.latest_frame = None # JPEG bytes (Annotated)
        self.latest_detections = []
        self.latest_log_events = []
        self.last_update = None
        self.is_running = False
        self.stop_event = threading.Event()
        
        # Debounce/Tracking State
        self.tracker_objects = {} # dict of id -> { 'class_id': c, 'bbox': [], 'frames_present': int, 'frames_missing': int, 'logged': bool }
        self.tracker_id_counter = 0
        self.debounce_frames_enter = 3  # Must be seen for 3 frames to trigger "entered"
        self.debounce_frames_exit = 15  # Must be missing for 15 frames to be "exited" and forgotten
        
        # Reader State
        self.raw_frame = None # Latest raw frame from camera
        self.raw_frame_lock = threading.Lock()
        self.reader_thread = None
        self.inference_thread = None
        
        # Profiling
        self.fps_tracker = 0
        self.inference_ms = 0

        # Persistent Stats for this stream
        self.total_inspections = 0
        self.pass_count = 0
        self.fail_count = 0
        self.class_counts = {} # Record[str, int]

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

        # Best-effort low-latency tuning (backend dependent; safe if unsupported)
        try:
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        except Exception:
            pass
        
        while not self.stop_event.is_set():
            ret, frame = cap.read()
            if not ret:
                print(f"⚠️ [Stream {self.camera_id}] Frame read failed, reconnecting...")
                with self.raw_frame_lock:
                    self.raw_frame = None
                cap.release()
                time.sleep(0.3) # Short reconnect interval keeps preview responsive
                cap = cv2.VideoCapture(self.connection_string)
                try:
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                except Exception:
                    pass
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
        device = self._resolve_device(self.device)
        print(f"🧠 [Stream {self.camera_id}] Loading model {self.model_id} on {device}...")
        try:
            self.model = stream_manager.get_model(self.model_path, device)
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
                    
                    # Check for defect based on class config
                    is_defect = False
                    with self.config_lock:
                        if label in self.class_config:
                            is_defect = self.class_config[label].get('isDefect', False)
                    
                    if is_defect:
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
            
            # Tracking Algorithm (Frame Debouncing)
            # Match current frame detections to tracked objects
            matched_tracker_ids = set()
            new_log_events = [] # Detections that just became "stable" this frame
            
            for d in detections:
                c_id = d["classId"]
                bbox = d["boundingBox"]
                bx, by, bw, bh = bbox["x"], bbox["y"], bbox["width"], bbox["height"]
                cx, cy = bx + bw/2, by + bh/2
                
                # Find best matching existing tracker
                best_match_id = None
                min_dist = float('inf')
                
                for tid, t_obj in self.tracker_objects.items():
                    if tid in matched_tracker_ids or t_obj['class_id'] != c_id:
                        continue
                    
                    # Simple centroid distance matching
                    tcx, tcy = t_obj['cx'], t_obj['cy']
                    dist = ((cx - tcx)**2 + (cy - tcy)**2)**0.5
                    
                    # Threshold for matching (e.g., max distance allowed to move per frame)
                    # Let's say it can't move more than the width/height of itself per frame roughly
                    if dist < max(bw, bh) * 1.5 and dist < min_dist:
                        min_dist = dist
                        best_match_id = tid
                        
                if best_match_id is not None:
                    # Update existing
                    t_obj = self.tracker_objects[best_match_id]
                    t_obj['cx'], t_obj['cy'] = cx, cy
                    t_obj['frames_present'] += 1
                    t_obj['frames_missing'] = 0
                    t_obj['last_bbox'] = bbox
                    matched_tracker_ids.add(best_match_id)
                    
                    # Check if it just became stable
                    if t_obj['frames_present'] >= self.debounce_frames_enter and not t_obj['logged']:
                        t_obj['logged'] = True
                        new_log_events.append(d)
                        
                        # Update persistent stream stats on every new stable detection
                        self.total_inspections += 1
                        
                        # Check if this specific object is a defect
                        obj_label = d["className"]
                        obj_is_defect = False
                        with self.config_lock:
                            if obj_label in self.class_config:
                                obj_is_defect = self.class_config[obj_label].get('isDefect', False)
                        
                        if obj_is_defect:
                            self.fail_count += 1
                        else:
                            self.pass_count += 1

                        # Update per-class counters
                        self.class_counts[obj_label] = self.class_counts.get(obj_label, 0) + 1
                else:
                    # Create new tracker
                    self.tracker_id_counter += 1
                    self.tracker_objects[self.tracker_id_counter] = {
                        'class_id': c_id,
                        'cx': cx,
                        'cy': cy,
                        'frames_present': 1,
                        'frames_missing': 0,
                        'logged': False,
                        'last_bbox': bbox
                    }
                    
            # Update missing and clean up old trackers
            lost_ids = []
            for tid, t_obj in self.tracker_objects.items():
                if tid not in matched_tracker_ids:
                    t_obj['frames_missing'] += 1
                    if t_obj['frames_missing'] >= self.debounce_frames_exit:
                        lost_ids.append(tid)
                        
            for tid in lost_ids:
                del self.tracker_objects[tid]

            # Prepare payload
            import uuid
            
            # Use only NEW stable events for the log count payload.
            # However, for live drawing/realtime count, we still want ALL detections.
            # We will separate "realtime_detections" and "log_events"
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
                "has_detections": len(new_log_events) > 0,
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
                    } for d in new_log_events
                ],
                "total_count": len(new_log_events),
                "class_counts": class_counts
            }

            # Update stats
            stream_manager.update_stats(has_defects)
            
            # Save all raw detections to context for WebRTC rendering
            self.latest_detections = detections
            self.latest_log_events = new_log_events
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

                # Convert hex to BGR properly handling different formats
                color_hex = color_hex.lstrip('#')
                if len(color_hex) == 6:
                    r = int(color_hex[0:2], 16)
                    g = int(color_hex[2:4], 16)
                    b = int(color_hex[4:6], 16)
                elif len(color_hex) == 3:
                    r = int(color_hex[0]*2, 16)
                    g = int(color_hex[1]*2, 16)
                    b = int(color_hex[2]*2, 16)
                else:
                    r, g, b = 0, 255, 0 # fallback green
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

    def _resolve_device(self, requested: Optional[str]) -> str:
        """Resolve requested device into a runtime-safe device string."""
        fallback = 'cuda:0' if torch.cuda.is_available() else 'cpu'
        if not requested:
            return fallback

        req = str(requested).strip().lower()
        if req in {"", "auto", "default", "gpu", "accelerator"}:
            return fallback
        if req == "cpu":
            return "cpu"

        if req.isdigit():
            idx = int(req)
            if torch.cuda.is_available() and 0 <= idx < torch.cuda.device_count():
                return f"cuda:{idx}"
            return fallback

        if req == "cuda":
            return "cuda:0" if torch.cuda.is_available() else fallback

        if req.startswith("cuda"):
            if not torch.cuda.is_available():
                return fallback
            suffix = req.split(":", 1)[1] if ":" in req else req.replace("cuda", "", 1)
            if suffix == "":
                return "cuda:0"
            if not suffix.isdigit():
                return fallback
            idx = int(suffix)
            if 0 <= idx < torch.cuda.device_count():
                return f"cuda:{idx}"
            return fallback

        return fallback


class StreamManager:
    def __init__(self):
        self.streams: Dict[str, StreamContext] = {}
        self.stats = {
            "total_inspections": 0,
            "total_defects": 0,
            "start_time": datetime.now()
        }
        self.stats_lock = threading.Lock()
        
        self.model_cache = {} # Dict[str, YOLO]
        self.model_cache_lock = threading.Lock()
        
        # Start MQTT Service
        from app.services.mqtt_service import mqtt_service
        mqtt_service.start()
        
    def get_model(self, model_path: str, device: str) -> YOLO:
        with self.model_cache_lock:
            key = f"{model_path}_{device}"
            if key not in self.model_cache:
                print(f"📦 [Cache] Loading new YOLO model into memory: {model_path} -> {device}")
                model = YOLO(model_path)
                model.to(device)
                self.model_cache[key] = model
            else:
                print(f"⚡ [Cache] Reusing existing YOLO model from memory: {model_path} -> {device}")
            return self.model_cache[key]
        
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
                fps=kwargs.get('fps', 10),
                device=kwargs.get('device', 'auto')
            )
            self.streams[key] = stream
            stream.start()
        else:
            # Update existing stream parameters if changed
            stream = self.streams[key]
            new_fps = kwargs.get('fps', 10)
            new_conf = kwargs.get('confidence', 0.5)
            new_iou = kwargs.get('iou', 0.45)
            new_device = kwargs.get('device', 'auto')
            
            if stream.fps != new_fps:
                print(f"⚡ [Stream {camera_id}] Updating FPS: {stream.fps} -> {new_fps}")
                stream.fps = new_fps
                
            if stream.confidence != new_conf:
                stream.confidence = new_conf
                
            if stream.iou != new_iou:
                stream.iou = new_iou

            if stream.device != new_device:
                stream.device = new_device
                
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
        """Updates the class configuration and thresholds for a specific stream"""
        key = f"{camera_id}_{model_id}"
        if key in self.streams:
            stream = self.streams[key]
            
            # Update global thresholds if present
            if 'confidence' in config:
                stream.confidence = float(config.pop('confidence'))
            if 'iou' in config:
                stream.iou = float(config.pop('iou'))
            if 'frame_buffer' in config:
                val = int(config.pop('frame_buffer'))
                stream.debounce_frames_enter = val
                stream.debounce_frames_exit = val * 5
                
            with stream.config_lock:
                # Merge new config with existing class config
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

