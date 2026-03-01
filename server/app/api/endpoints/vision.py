from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
import aiohttp
import asyncio
import os
import time
import subprocess
import threading
from fractions import Fraction
from typing import Dict, List, Optional
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import uuid
from pydantic import BaseModel
from ultralytics import YOLO
import cv2
import numpy as np
import torch
from app.db.session import get_db
from app.db.models.vision import Project, Camera, Model, ModelStatus, ProjectStatus, CameraStatus
from app.db.models.test_record import TestRecord
from app.services.model_storage import model_storage
from app.core.model_types import get_all_model_types, validate_file_format
from app.core.config import settings
from app.services.stream_manager import stream_manager

try:
    from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
    from av import VideoFrame
    WEBRTC_AVAILABLE = True
except Exception:
    RTCPeerConnection = None
    RTCSessionDescription = None
    VideoStreamTrack = object
    VideoFrame = None
    WEBRTC_AVAILABLE = False

router = APIRouter()


DEFAULT_CLASS_COLORS = [
    "#22c55e",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#a855f7",
    "#06b6d4",
    "#84cc16",
    "#f97316",
]


def _enum_value(value, default: str):
    """Return enum .value if enum-like, else string value, else default."""
    if value is None:
        return default
    return value.value if hasattr(value, "value") else str(value)


_camera_probe_cache_lock = threading.Lock()
_camera_probe_cache: dict[str, tuple[str, float]] = {}
_CAMERA_PROBE_TTL_SECONDS = 8.0


_webrtc_peers_lock = threading.Lock()
_webrtc_peers: dict[str, "RTCPeerConnection"] = {}


def _model_path_candidates(model_record: Model) -> list[Path]:
    models_base = Path(settings.MODELS_DIR)
    file_path_raw = str(model_record.file_path or "").strip()
    model_type = str(model_record.model_type or "").strip()
    filename = str(model_record.filename or "").strip()

    candidates: list[Path] = []

    # 1) absolute path in DB
    if file_path_raw:
        fp = Path(file_path_raw)
        if fp.is_absolute():
            candidates.append(fp)

    # 2) canonical current relative path
    if file_path_raw:
        candidates.append(models_base / file_path_raw)

    # 3) common legacy variants
    if file_path_raw and model_type:
        candidates.append(models_base / model_type / file_path_raw)
        candidates.append(models_base / model_type / Path(file_path_raw).name)
    if filename:
        candidates.append(models_base / filename)
        if model_type:
            candidates.append(models_base / model_type / filename)

    # 4) best-effort discovery by filename (legacy moved files)
    if filename:
        discovered = list(models_base.rglob(filename))
        if discovered:
            candidates.extend(discovered)

    return candidates


def _resolve_model_path(model_record: Model) -> tuple[Optional[Path], Optional[str]]:
    models_base = Path(settings.MODELS_DIR).resolve()
    candidates = _model_path_candidates(model_record)
    model_path = next((p for p in candidates if p.exists() and p.is_file()), None)
    if model_path is None:
        return None, None

    resolved = model_path.resolve()
    relative_path: Optional[str] = None
    try:
        relative_path = str(resolved.relative_to(models_base)).replace("\\", "/")
    except Exception:
        relative_path = str(resolved)

    return resolved, relative_path


def _infer_model_classes(model_record: Model, model_path: Optional[Path] = None) -> list[Dict]:
    resolved_path = model_path
    if resolved_path is None:
        resolved_path, _ = _resolve_model_path(model_record)
    if resolved_path is None:
        return []

    try:
        yolo_model = YOLO(str(resolved_path))
        names = getattr(yolo_model, "names", {})
        if isinstance(names, dict):
            entries = sorted(names.items(), key=lambda kv: int(kv[0]))
        elif isinstance(names, list):
            entries = list(enumerate(names))
        else:
            entries = []

        classes: list[Dict] = []
        for idx_raw, class_name in entries:
            idx = int(idx_raw)
            classes.append(
                {
                    "id": idx,
                    "name": str(class_name),
                    "color": DEFAULT_CLASS_COLORS[idx % len(DEFAULT_CLASS_COLORS)],
                }
            )
        return classes
    except Exception:
        return []


class WebRTCOfferRequest(BaseModel):
    sdp: str
    type: str
    confidence: float = 0.5
    iou_threshold: float = 0.45
    fps: int = 10
    device: str = "auto"


class StreamVideoTrack(VideoStreamTrack):
    """Bridge StreamManager JPEG frames into a WebRTC video track."""

    def __init__(self, stream):
        super().__init__()
        self.stream = stream
        self._last_bytes: Optional[bytes] = None
        self._frame_index = 0

    async def recv(self):
        # Target pacing from stream fps
        fps = max(1, int(getattr(self.stream, "fps", 10)))
        await asyncio.sleep(1.0 / fps)

        frame_bytes = self.stream.latest_frame or self._last_bytes
        if frame_bytes is None:
            # No frame available yet; return a small black frame.
            black = np.zeros((360, 640, 3), dtype=np.uint8)
            video_frame = VideoFrame.from_ndarray(black, format="bgr24")
        else:
            self._last_bytes = frame_bytes
            np_arr = np.frombuffer(frame_bytes, dtype=np.uint8)
            bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if bgr is None:
                bgr = np.zeros((360, 640, 3), dtype=np.uint8)
            video_frame = VideoFrame.from_ndarray(bgr, format="bgr24")

        self._frame_index += 1
        video_frame.pts = self._frame_index
        video_frame.time_base = Fraction(1, fps)
        return video_frame


async def _get_or_start_inference_stream(
    camera_id: str,
    model_id: str,
    confidence: float,
    iou_threshold: float,
    fps: int,
    device: str,
    db: AsyncSession,
):
    """Shared stream bootstrap for MJPEG and WebRTC paths."""
    # Get camera
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    # Get model
    result = await db.execute(select(Model).where(Model.id == model_id))
    model_record = result.scalar_one_or_none()
    if not model_record:
        raise HTTPException(status_code=404, detail="Model not found")

    model_path, resolved_relative = _resolve_model_path(model_record)
    if model_path is None:
        raise HTTPException(status_code=404, detail="Model file not found")

    # Self-heal stale DB path if file was moved/renamed
    if resolved_relative and (model_record.file_path or "") != resolved_relative:
        model_record.file_path = resolved_relative
        await db.commit()

    return stream_manager.get_stream(
        camera_id=camera_id,
        model_id=model_id,
        model_path=str(model_path),
        connection_string=camera.connection_string,
        confidence=confidence,
        iou=iou_threshold,
        fps=fps,
        device=device,
        model_classes=model_record.classes,
    )


def _read_camera_frame(camera: Camera):
    """Capture a single frame from a stored camera config."""
    source: int | str = camera.connection_string
    if camera.protocol == "USB":
        raw = (camera.connection_string or "").strip()
        source = int(raw) if raw.isdigit() else raw

    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        cap.release()
        raise HTTPException(status_code=400, detail=f"Unable to open camera source: {camera.connection_string}")

    ok, frame = cap.read()
    cap.release()
    if not ok or frame is None:
        raise HTTPException(status_code=400, detail="Failed to capture frame from camera")

    return frame


async def _is_http_camera_reachable(url: str) -> bool:
    """Lightweight HTTP camera probe for MJPEG/snapshot endpoints."""
    timeout = aiohttp.ClientTimeout(total=3, connect=2, sock_read=2)
    try:
        async with aiohttp.ClientSession(timeout=timeout, connector=aiohttp.TCPConnector(ssl=False)) as session:
            async with session.get(url) as resp:
                if resp.status >= 400:
                    return False

                content_type = (resp.headers.get("Content-Type") or "").lower()
                if "multipart/x-mixed-replace" in content_type or content_type.startswith("image/"):
                    return True

                # Some endpoints may omit content-type but still stream bytes.
                chunk = await resp.content.read(16)
                return len(chunk) > 0
    except Exception:
        return False


async def _build_live_inference_stream_response(
    request: Request,
    camera_id: str,
    model_id: str,
    confidence: float,
    iou_threshold: float,
    fps: int,
    device: str,
    db: AsyncSession,
):
    """Reusable MJPEG inference stream response for live preview and model testing."""
    stream = await _get_or_start_inference_stream(
        camera_id=camera_id,
        model_id=model_id,
        confidence=confidence,
        iou_threshold=iou_threshold,
        fps=fps,
        device=device,
        db=db,
    )

    async def frame_generator():
        """Yields latest frame from the background stream."""
        last_frame_time = None
        while True:
            if await request.is_disconnected():
                break

            # Yield only if frame is new to save bandwidth and reduce latency
            if stream.latest_frame and stream.last_update != last_frame_time:
                last_frame_time = stream.last_update
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + stream.latest_frame + b"\r\n"
                )

            # Poll frequently (10ms) to catch new frames immediately
            await asyncio.sleep(0.01)

    return StreamingResponse(
        frame_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )

# ==================== Projects ====================

@router.get("/projects")
async def get_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project))
    projects = result.scalars().all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            "status": p.status.value if p.status else "active",
            "cameras": p.cameras or [],
            "models": p.models or []
        }
        for p in projects
    ]

@router.get("/projects/{project_id}")
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None,
        "status": project.status.value if project.status else "active",
        "cameras": project.cameras or [],
        "models": project.models or []
    }

@router.post("/projects")
async def create_project(
    name: str = Form(...),
    description: str = Form(""),
    status: str = Form("active"),
    db: AsyncSession = Depends(get_db)
):
    """Create a new project."""
    if status not in [
        ProjectStatus.ACTIVE.value,
        ProjectStatus.INACTIVE.value,
        ProjectStatus.ARCHIVED.value,
    ]:
        raise HTTPException(status_code=400, detail="Invalid project status")

    # Check for duplicate project name
    existing = await db.execute(select(Project).where(Project.name == name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A project with this name already exists")

    new_project = Project(
        id=f"proj-{uuid.uuid4().hex[:8]}",
        name=name,
        description=description,
        status=ProjectStatus(status),
        cameras=[],
        models=[],
    )

    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)

    return {
        "id": new_project.id,
        "name": new_project.name,
        "description": new_project.description,
        "created_at": new_project.created_at.isoformat() if new_project.created_at else None,
        "updated_at": new_project.updated_at.isoformat() if new_project.updated_at else None,
        "status": new_project.status.value if new_project.status else "active",
        "cameras": new_project.cameras or [],
        "models": new_project.models or [],
    }

@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a project."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    await db.delete(project)
    await db.commit()
    
    return {"message": "Project deleted successfully"}

# ==================== Cameras ====================

@router.get("/cameras")
async def get_cameras(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera))
    cameras = result.scalars().all()

    # Refresh live status for camera types we can quickly probe from backend.
    # IMPORTANT: avoid flipping to disconnected on transient read failure
    # (e.g. tab switch / short stream hiccup). We only promote to connected.
    changed = False
    for c in cameras:
        if c.protocol not in ["HTTP", "USB"]:
            continue

        cached_status: str | None = None
        now = time.time()
        with _camera_probe_cache_lock:
            cached = _camera_probe_cache.get(c.id)
            if cached and (now - cached[1]) < _CAMERA_PROBE_TTL_SECONDS:
                cached_status = cached[0]

        if cached_status is not None:
            next_status = cached_status
        elif c.protocol == "HTTP":
            # Keep HTTP probe lightweight to avoid UI lag on /api/vision/cameras
            next_status = "connected" if await _is_http_camera_reachable(c.connection_string) else "disconnected"
        else:
            try:
                _read_camera_frame(c)
                next_status = "connected"
            except Exception:
                next_status = "disconnected"

        with _camera_probe_cache_lock:
            _camera_probe_cache[c.id] = (next_status, now)

        current_status = _enum_value(c.status, "disconnected")
        if current_status != next_status:
            c.status = CameraStatus.CONNECTED if next_status == "connected" else CameraStatus.DISCONNECTED
            changed = True

    if changed:
        await db.commit()

    return [
        {
            "id": c.id,
            "name": c.name,
            "protocol": c.protocol,
            "connection_string": c.connection_string,
            "status": _enum_value(c.status, "disconnected"),
            "mode": _enum_value(c.mode, "auto"),
            "settings": c.settings or {},
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in cameras
    ]

@router.post("/cameras")
async def create_camera(
    name: str = Form(...),
    protocol: str = Form(...),
    connection_string: str = Form(...),
    mode: str = Form("auto"),
    db: AsyncSession = Depends(get_db)
):
    """Create a new camera configuration."""
    # Basic validation
    if protocol not in ["GigE", "RTSP", "HTTP", "USB"]:
        raise HTTPException(status_code=400, detail="Invalid protocol")

    import uuid
    new_camera = Camera(
        id=f"cam-{uuid.uuid4().hex[:8]}",
        name=name,
        protocol=protocol,
        connection_string=connection_string,
        mode=mode,
        status=CameraStatus.DISCONNECTED
    )
    
    db.add(new_camera)
    await db.commit()
    await db.refresh(new_camera)
    
    return {
        "id": new_camera.id,
        "name": new_camera.name,
        "protocol": new_camera.protocol,
        "connection_string": new_camera.connection_string,
        "status": _enum_value(new_camera.status, "disconnected"),
        "mode": _enum_value(new_camera.mode, "auto"),
        "created_at": new_camera.created_at.isoformat() if new_camera.created_at else None
    }


@router.get("/cameras/{camera_id}/snapshot")
async def camera_snapshot(camera_id: str, db: AsyncSession = Depends(get_db)):
    """Capture and return one JPEG frame from saved camera config."""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    if _enum_value(camera.status, "disconnected") != "connected":
        raise HTTPException(status_code=400, detail="Camera is not connected")

    try:
        frame = _read_camera_frame(camera)
        camera.status = CameraStatus.CONNECTED
        await db.commit()
    except HTTPException:
        camera.status = CameraStatus.DISCONNECTED
        await db.commit()
        raise

    ok, encoded = cv2.imencode(".jpg", frame)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to encode camera frame")

    return Response(content=encoded.tobytes(), media_type="image/jpeg")

@router.put("/cameras/{camera_id}")
async def update_camera(
    camera_id: str,
    name: Optional[str] = Form(None),
    protocol: Optional[str] = Form(None),
    connection_string: Optional[str] = Form(None),
    mode: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    """Update a camera configuration."""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
        
    if name: camera.name = name
    if protocol: camera.protocol = protocol
    if connection_string: camera.connection_string = connection_string
    if mode: camera.mode = mode
    
    await db.commit()
    await db.refresh(camera)
    
    return {
        "id": camera.id,
        "name": camera.name,
        "protocol": camera.protocol,
        "connection_string": camera.connection_string,
        "status": _enum_value(camera.status, "disconnected"),
        "mode": _enum_value(camera.mode, "auto"),
        "created_at": camera.created_at.isoformat() if camera.created_at else None
    }

@router.delete("/cameras/{camera_id}")
async def delete_camera(camera_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a camera."""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
        
    await db.delete(camera)
    await db.commit()
    
    return {"message": "Camera deleted successfully"}

# ==================== Models ====================

@router.get("/models")
async def get_models(
    model_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get all models, optionally filtered by type."""
    query = select(Model)
    if model_type:
        query = query.where(Model.model_type == model_type)
    
    result = await db.execute(query)
    models = result.scalars().all()
    
    should_commit = False
    payload = []

    for m in models:
        resolved_path, resolved_relative = _resolve_model_path(m)
        if resolved_relative and (m.file_path or "") != resolved_relative:
            m.file_path = resolved_relative
            should_commit = True

        classes = m.classes or []
        if not classes:
            inferred = _infer_model_classes(m, resolved_path)
            if inferred:
                classes = inferred
                m.classes = inferred
                should_commit = True

        payload.append(
            {
                "id": m.id,
                "name": m.name,
                "filename": m.filename,
                "file_size": m.file_size,
                "model_type": m.model_type,
                "file_format": m.file_format,
                "framework": m.framework,
                "version": m.version,
                "classes": classes,
                "confidence": m.confidence,
                "roi": m.roi,
                "status": m.status,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
        )

    if should_commit:
        await db.commit()

    return payload

@router.get("/models/types")
async def get_model_types():
    """Get all available model types."""
    return get_all_model_types()

@router.post("/models/upload")
async def upload_model(
    file: UploadFile = File(...),
    name: str = Form(...),
    model_type: str = Form(...),
    description: Optional[str] = Form(None),
    confidence: Optional[float] = Form(0.5),
    db: AsyncSession = Depends(get_db)
):
    """Upload a new model file."""
    
    # Validate file format
    if not validate_file_format(file.filename, model_type):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file format for {model_type}"
        )
    
    try:
        # Save file to storage
        file_path, file_size = await model_storage.save_model_file(
            file, model_type
        )
        
        # Get file extension
        import os
        file_format = os.path.splitext(file.filename)[1]
        
        # Create database record
        model_id = f"model-{uuid.uuid4().hex[:8]}"
        new_model = Model(
            id=model_id,
            name=name,
            filename=file.filename,
            description=description,
            model_type=model_type,
            file_path=file_path,
            file_size=file_size,
            file_format=file_format,
            confidence=confidence,
            status='ready'
        )
        
        db.add(new_model)
        await db.commit()
        await db.refresh(new_model)
        
        return {
            "id": new_model.id,
            "name": new_model.name,
            "filename": new_model.filename,
            "file_size": new_model.file_size,
            "model_type": new_model.model_type,
            "file_format": new_model.file_format,
            "status": new_model.status,
            "created_at": new_model.created_at.isoformat() if new_model.created_at else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/models/{model_id}")
async def delete_model(model_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a model and its file."""
    
    # Get model from database
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Delete file from storage
    file_deleted = model_storage.delete_model_file(model.file_path)
    
    # Delete from database
    await db.delete(model)
    await db.commit()
    
    return {
        "message": "Model deleted successfully",
        "file_deleted": file_deleted
    }

@router.get("/models/{model_id}")
async def get_model(model_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific model by ID."""
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    resolved_path, resolved_relative = _resolve_model_path(model)
    should_commit = False
    if resolved_relative and (model.file_path or "") != resolved_relative:
        model.file_path = resolved_relative
        should_commit = True

    classes = model.classes or []
    if not classes:
        inferred = _infer_model_classes(model, resolved_path)
        if inferred:
            classes = inferred
            model.classes = inferred
            should_commit = True

    if should_commit:
        await db.commit()

    return {
        "id": model.id,
        "name": model.name,
        "filename": model.filename,
        "file_size": model.file_size,
        "model_type": model.model_type,
        "file_format": model.file_format,
        "framework": model.framework,
        "version": model.version,
        "classes": classes,
        "confidence": model.confidence,
        "roi": model.roi,
        "status": model.status,
        "created_at": model.created_at.isoformat() if model.created_at else None
    }

@router.post("/models/{model_id}/test")
async def test_model(
    model_id: str,
    image: Optional[UploadFile] = File(None),
    media_path: Optional[str] = Form(None),
    camera_id: Optional[str] = Form(None),
    device: Optional[str] = Form(None),
    confidence: float = Form(0.5),
    iou_threshold: float = Form(0.45),
    db: AsyncSession = Depends(get_db)
):
    """Test a model with an uploaded image.
    
    Args:
        model_id: ID of the model to test
        image: Image file to run inference on
        media_path: Existing media path (e.g. media/inputs/xxx.jpg) to run inference on
        camera_id: Camera ID saved in system. Backend will capture one frame and run inference.
        device: Inference device id (e.g. cpu, cuda:0)
        confidence: Confidence threshold (0-1)
        iou_threshold: IoU threshold for NMS
        
    Returns:
        Inference results with detections
    """
    from app.services.inference_service import inference_service
    
    # Get model from database
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Validate model status
    if model.status != ModelStatus.READY:
        raise HTTPException(status_code=400, detail=f"Model is not ready (status: {model.status.value})")
    
    # Validate request payload (must provide at least one source)
    if not image and not media_path and not camera_id:
        raise HTTPException(status_code=400, detail="Either image file, media_path or camera_id is required")

    # Validate uploaded file type
    if image and (not image.content_type or (not image.content_type.startswith('image/') and not image.content_type.startswith('video/'))):
        raise HTTPException(status_code=400, detail="File must be an image or video")
    
    # Validate confidence
    if not 0 <= confidence <= 1:
        raise HTTPException(status_code=400, detail="Confidence must be between 0 and 1")

    # If camera_id is provided, capture one frame on backend then run as media_path
    if camera_id and not image and not media_path:
        cam_result = await db.execute(select(Camera).where(Camera.id == camera_id))
        camera = cam_result.scalar_one_or_none()
        if not camera:
            raise HTTPException(status_code=404, detail="Camera not found")

        try:
            frame = _read_camera_frame(camera)
            camera.status = CameraStatus.CONNECTED
            await db.commit()
        except HTTPException:
            camera.status = CameraStatus.DISCONNECTED
            await db.commit()
            raise

        inputs_dir = Path(settings.MEDIA_DIR) / "inputs"
        inputs_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{int(time.time() * 1000)}_{camera.id}.jpg"
        saved_path = inputs_dir / filename
        cv2.imwrite(str(saved_path), frame)
        media_path = f"media/inputs/{filename}"
    
    try:
        # Run inference
        results = await inference_service.run_inference(
            model_path=model.file_path,
            image=image,
            media_input_path=media_path,
            device=device,
            confidence=confidence,
            iou_threshold=iou_threshold,
            db=db,
            model_id=model.id
        )
        
        # Add model info to results
        results['model_id'] = model.id
        results['model_name'] = model.name
        results['model_type'] = model.model_type
        
        return results
        
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        import traceback
        print(f"ERROR in test_model: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")


@router.post("/media/upload")
async def upload_media(file: UploadFile = File(...)):
    """Upload input media file into media/inputs and return saved path for later inference."""
    if not file.content_type or (not file.content_type.startswith('image/') and not file.content_type.startswith('video/')):
        raise HTTPException(status_code=400, detail="File must be an image or video")

    from app.core.config import settings
    from pathlib import Path
    from datetime import datetime
    import uuid

    input_dir = Path(settings.MEDIA_DIR) / "inputs"
    input_dir.mkdir(parents=True, exist_ok=True)

    safe_name = Path(file.filename or "upload.bin").name
    filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}_{safe_name}"
    save_path = input_dir / filename

    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    rel_path = f"media/inputs/{filename}"
    return {
        "filename": filename,
        "media_path": rel_path,
        "url": f"/{rel_path}",
        "content_type": file.content_type,
        "size": len(content),
    }

@router.get("/models/{model_id}/info")
async def get_model_info(model_id: str, db: AsyncSession = Depends(get_db)):
    """Get detailed information about a model including inference capabilities.
    
    Args:
        model_id: ID of the model
        
    Returns:
        Model metadata and inference information
    """
    from app.services.inference_service import inference_service
    
    # Get model from database
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    try:
        resolved_path, resolved_relative = _resolve_model_path(model)
        if resolved_path is None:
            raise FileNotFoundError("Model file not found")

        should_commit = False
        if resolved_relative and (model.file_path or "") != resolved_relative:
            model.file_path = resolved_relative
            should_commit = True

        if not (model.classes or []):
            inferred = _infer_model_classes(model, resolved_path)
            if inferred:
                model.classes = inferred
                should_commit = True

        if should_commit:
            await db.commit()

        # Get model info from inference service
        inference_info = await inference_service.get_model_info(model.file_path)
        
        return {
            "id": model.id,
            "name": model.name,
            "model_type": model.model_type,
            "file_format": model.file_format,
            "framework": model.framework,
            "status": model.status,
            "inference": inference_info
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model info: {str(e)}")

@router.get("/devices")
async def get_devices():
    """Get list of available inference devices (CPU/GPU/MPS/XPU)."""
    def _detect_nvidia_smi_gpus() -> list[dict]:
        """Best-effort NVIDIA GPU detection via driver (even if torch is CPU build)."""
        try:
            res = subprocess.run(
                [
                    "nvidia-smi",
                    "--query-gpu=index,name",
                    "--format=csv,noheader,nounits",
                ],
                capture_output=True,
                text=True,
                timeout=2,
                check=True,
            )

            detected: list[dict] = []
            for row in (res.stdout or "").splitlines():
                parts = [p.strip() for p in row.split(",", 1)]
                if len(parts) != 2:
                    continue

                idx_raw, gpu_name = parts
                try:
                    idx = int(idx_raw)
                except ValueError:
                    continue

                detected.append(
                    {
                        "id": f"cuda:{idx}",
                        "name": f"{gpu_name} (driver detected)",
                        "type": "gpu",
                        "runtime": "nvidia-smi",
                        "usable": False,
                    }
                )

            return detected
        except Exception:
            return []

    devices = [
        {"id": "cpu", "name": "CPU", "type": "cpu"}
    ]
    seen_ids = {"cpu"}
    
    if torch.cuda.is_available():
        count = torch.cuda.device_count()
        for i in range(count):
            name = torch.cuda.get_device_name(i)
            # Docker/PyTorch usually maps the visible GPU to index 0, 
            # but if we had multiple, they would be cuda:0, cuda:1 etc.
            devices.append({
                "id": f"cuda:{i}", 
                "name": name, 
                "type": "gpu",
                "runtime": "torch-cuda",
                "usable": True,
            })
            seen_ids.add(f"cuda:{i}")
    else:
        # Torch may be CPU-only while NVIDIA driver is still present on host.
        for gpu in _detect_nvidia_smi_gpus():
            if gpu["id"] in seen_ids:
                continue
            devices.append(gpu)
            seen_ids.add(gpu["id"])

    mps_backend = getattr(torch.backends, "mps", None)
    if mps_backend and mps_backend.is_available():
        devices.append({
            "id": "mps",
            "name": "Apple Metal (MPS)",
            "type": "gpu"
        })

    xpu_runtime = getattr(torch, "xpu", None)
    if xpu_runtime and xpu_runtime.is_available():
        count = xpu_runtime.device_count() if hasattr(xpu_runtime, "device_count") else 0
        if count > 0:
            for i in range(count):
                devices.append({
                    "id": f"xpu:{i}",
                    "name": f"Intel XPU {i}",
                    "type": "gpu"
                })
        else:
            devices.append({
                "id": "xpu",
                "name": "Intel XPU",
                "type": "gpu"
            })
             
    return devices

# ==================== Stream Relay (Data Channel) ====================
# Global dictionary to store the latest frame for each stream ID
# Key: stream_id, Value: bytes (JPEG)
active_streams = {}

@router.post("/relay/{stream_id}")
async def upload_stream_frame(stream_id: str, file: UploadFile = File(...)):
    """
    Receive a frame from the frontend client.
    """
    content = await file.read()
    active_streams[stream_id] = content
    return {"status": "ok", "size": len(content)}

@router.get("/relay/{stream_id}")
async def get_stream_feed(stream_id: str):
    """
    Serve the frames as an MJPEG stream. 
    This allows OpenCV or other consumers to treat it as a standard HTTP camera.
    """
    async def iter_frames():
        while True:
            if stream_id in active_streams:
                frame_data = active_streams[stream_id]
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_data + b'\r\n')
            else:
                # If no frame yet, yield empty or wait
                pass
            await asyncio.sleep(0.03) # ~30 FPS

    return StreamingResponse(iter_frames(), media_type="multipart/x-mixed-replace; boundary=frame")


@router.get("/proxy/{camera_id}")
async def proxy_camera_stream(camera_id: str, db: AsyncSession = Depends(get_db)):
    """
    Proxies a camera stream (MJPEG) from the backend to the client.
    Useful for accessing local Docker network resources (host.docker.internal) from the browser.
    """
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()

    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    target_url = camera.connection_string
    
    # If it's already a relative API URL, don't proxy (it's internal)
    if target_url.startswith("/"):
         # For our own relay endpoints, we can just redirect? 
         # Or better, just return the stream directly if logic allows, 
         # but actually frontend should handle relative URLs directly.
         # This proxy is specifically for "http://..." URLs that browser can't reach.
         pass

    async def iter_stream():
        timeout = aiohttp.ClientTimeout(total=None, connect=5)
        # Disable SSL verification for internal/local streams for ease of use
        async with aiohttp.ClientSession(timeout=timeout, connector=aiohttp.TCPConnector(ssl=False)) as session:
            try:
                async with session.get(target_url) as resp:
                    # Propagate content type if possible, or assume MJPEG
                    # media_type = resp.headers.get('Content-Type', "multipart/x-mixed-replace; boundary=frame")
                    async for chunk in resp.content.iter_chunked(4096):
                        yield chunk
            except Exception as e:
                print(f"Proxy error for {target_url}: {e}")
                
    return StreamingResponse(iter_stream(), media_type="multipart/x-mixed-replace; boundary=frame")


# ==================== Media Library ====================

@router.get("/media")
async def get_media(db: AsyncSession = Depends(get_db)):
    """List all test media records."""
    stmt = (
        select(TestRecord)
        .options(selectinload(TestRecord.model))
        .order_by(TestRecord.created_at.desc())
    )
    result = await db.execute(stmt)
    records = result.scalars().all()
    
    return [
        {
            "id": rec.id,
            "type": rec.type.value,
            "input_url": f"/{rec.input_path}",
            "output_url": f"/{rec.output_path}" if rec.output_path else None,
            "created_at": rec.created_at,
            "model_name": rec.model.name if rec.model else "Unknown Model"
        }
        for rec in records
    ]

@router.delete("/media/{record_id}")
async def delete_media(record_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a test media record and its files."""
    result = await db.execute(select(TestRecord).where(TestRecord.id == record_id))
    record = result.scalar_one_or_none()
    
    if not record:
        raise HTTPException(status_code=404, detail="Media record not found")
        
    # Delete files
    try:
        from app.core.config import settings
        from pathlib import Path
        
        if record.input_path:
            input_filename = Path(record.input_path).name
            input_file = Path(settings.MEDIA_DIR) / "inputs" / input_filename
            if input_file.exists():
                os.remove(input_file)
                
        if record.output_path:
            output_filename = Path(record.output_path).name
            output_file = Path(settings.MEDIA_DIR) / "outputs" / output_filename
            if output_file.exists():
                os.remove(output_file)
                
    except Exception as e:
        print(f"Error deleting files: {e}")
        # Continue to delete DB record
        
    await db.delete(record)
    await db.commit()
    return {"status": "success"}



# ==================== Live Inference Stream ====================

@router.get("/inference/live/stream/{camera_id}/{model_id}")
async def live_inference_stream(
    request: Request,
    camera_id: str,
    model_id: str,
    confidence: float = 0.5,
    iou_threshold: float = 0.45,
    fps: int = 10,
    device: str = 'gpu',
    db: AsyncSession = Depends(get_db)
):
    """
    Stream live inference results as MJPEG.
    Uses background thread via StreamManager to decouple inference from connection.
    """
    return await _build_live_inference_stream_response(
        request=request,
        camera_id=camera_id,
        model_id=model_id,
        confidence=confidence,
        iou_threshold=iou_threshold,
        fps=fps,
        device=device,
        db=db,
    )


@router.get("/models/{model_id}/test/live/{camera_id}")
async def test_model_live_stream(
    request: Request,
    model_id: str,
    camera_id: str,
    confidence: float = 0.5,
    iou_threshold: float = 0.45,
    fps: int = 10,
    device: str = "gpu",
    db: AsyncSession = Depends(get_db),
):
    """Model-test specific live stream endpoint (reuses BE live preview pipeline)."""
    return await _build_live_inference_stream_response(
        request=request,
        camera_id=camera_id,
        model_id=model_id,
        confidence=confidence,
        iou_threshold=iou_threshold,
        fps=fps,
        device=device,
        db=db,
    )


@router.post("/inference/live/webrtc/offer/{camera_id}/{model_id}")
async def create_webrtc_offer(
    camera_id: str,
    model_id: str,
    payload: WebRTCOfferRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create WebRTC answer for live inference stream (backend signaling + video track)."""
    if not WEBRTC_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="WebRTC backend is unavailable. Install aiortc and av in server environment.",
        )

    stream = await _get_or_start_inference_stream(
        camera_id=camera_id,
        model_id=model_id,
        confidence=payload.confidence,
        iou_threshold=payload.iou_threshold,
        fps=payload.fps,
        device=payload.device,
        db=db,
    )

    pc = RTCPeerConnection()
    peer_id = f"webrtc-{uuid.uuid4().hex[:12]}"

    with _webrtc_peers_lock:
        _webrtc_peers[peer_id] = pc

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        if pc.connectionState in {"failed", "closed", "disconnected"}:
            with _webrtc_peers_lock:
                _webrtc_peers.pop(peer_id, None)
            await pc.close()

    pc.addTrack(StreamVideoTrack(stream))

    offer = RTCSessionDescription(sdp=payload.sdp, type=payload.type)
    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return {
        "peer_id": peer_id,
        "sdp": pc.localDescription.sdp,
        "type": pc.localDescription.type,
    }


@router.get("/inference/live/webrtc/offer/{camera_id}/{model_id}")
async def get_webrtc_offer_preview_stream(
    request: Request,
    camera_id: str,
    model_id: str,
    confidence: float = 0.5,
    iou_threshold: float = 0.45,
    fps: int = 10,
    device: str = "auto",
    db: AsyncSession = Depends(get_db),
):
    """
    Browser-friendly GET fallback for quick manual testing.

    NOTE:
    - Real WebRTC signaling still requires POST with SDP offer.
    - This GET route returns MJPEG stream so opening the URL in a browser tab works.
    """
    return await _build_live_inference_stream_response(
        request=request,
        camera_id=camera_id,
        model_id=model_id,
        confidence=confidence,
        iou_threshold=iou_threshold,
        fps=fps,
        device=device,
        db=db,
    )


@router.post("/inference/live/webrtc/close/{peer_id}")
async def close_webrtc_peer(peer_id: str):
    """Close a WebRTC peer connection."""
    with _webrtc_peers_lock:
        pc = _webrtc_peers.pop(peer_id, None)

    if pc is None:
        return {"status": "not_found", "peer_id": peer_id}

    await pc.close()
    return {"status": "closed", "peer_id": peer_id}

@router.get("/inference/live/stream/{camera_id}/{model_id}/results")
async def get_specific_stream_results(camera_id: str, model_id: str):
    """
    Get the latest inference results for a specific camera and model stream.
    """
    try:
        key = f"{camera_id}_{model_id}"
        stream = stream_manager.streams.get(key)
        
        if not stream:
            return {
                "status": "inactive",
                "camera_id": camera_id,
                "model_id": model_id,
                "data": None
            }
            
        return {
            "status": "active" if stream.is_running else "stopped",
            "camera_id": camera_id,
            "model_id": model_id,
            "data": {
                "detections": stream.latest_detections,
                "log_events": getattr(stream, 'latest_log_events', []),
                "inference_time_ms": stream.inference_ms,
                "fps": stream.fps_tracker,
                "timestamp": stream.last_update.isoformat() if stream.last_update else None,
                "config": getattr(stream, 'class_config', {}),
                "confidence": stream.confidence,
                "iou": stream.iou,
                "frame_buffer": getattr(stream, 'debounce_frames_enter', 3),
                "total_inspections": getattr(stream, 'total_inspections', 0),
                "pass_count": getattr(stream, 'pass_count', 0),
                "fail_count": getattr(stream, 'fail_count', 0),
                "class_counts": getattr(stream, 'class_counts', {})
            }
        }
    except Exception as e:
        import traceback
        print(f"API Error: {e}")
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }



@router.get("/inference/results/raw")
async def get_raw_inference_results():
    """
    Get the latest inference detections from any active stream.
    Simplified endpoint for external consumers.
    """
    try:
        # Find the first active stream
        active_stream = None
        for stream in stream_manager.streams.values():
            if stream.is_running:
                active_stream = stream
                break
        
        if not active_stream:
            return []
            
        return active_stream.latest_detections
    except Exception as e:
        return []


async def stop_inference_stream(camera_id: str, model_id: str):
    """
    Stop an active inference stream.
    """
    try:
        stream_manager.stop_stream(camera_id, model_id)
        return {
            "status": "success",
            "message": f"Stream {camera_id}_{model_id} stopped"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }



@router.post("/inference/live/config/{camera_id}/{model_id}")
async def update_stream_config(camera_id: str, model_id: str, config: dict):
    """
    Update stream configuration (class filters, colors).
    Config format: { 'class_name': { 'visible': bool, 'color': '#HEX' } }
    """
    try:
        success = stream_manager.update_stream_config(camera_id, model_id, config)
        if not success:
            return {
                "status": "error",
                "message": "Stream not found or not active"
            }
            
        return {
            "status": "success",
            "message": f"Config updated for {camera_id}_{model_id}",
            "config": config
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


@router.get("/inference/live/detections")
async def get_live_inference_detections():
    """
    Get the latest live inference detection results as JSON.
    This endpoint returns the most recent detections from the active stream.
    """
    # Find the most recently updated stream
    active_stream = None
    latest_time = None
    
    for stream in stream_manager.streams.values():
        if stream.last_update and (latest_time is None or stream.last_update > latest_time):
            latest_time = stream.last_update
            active_stream = stream
            
    if active_stream and active_stream.last_update:
        return {
            "detections": active_stream.latest_detections,
            "camera_id": active_stream.camera_id,
            "model_id": active_stream.model_id,
            "timestamp": active_stream.last_update.isoformat(),
            "status": "ok",
            "total_detections": len(active_stream.latest_detections)
        }
    
    return {
        "detections": [],
        "camera_id": None,
        "model_id": None,
        "timestamp": None,
        "status": "waiting"
    }
