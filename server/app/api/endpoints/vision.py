from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import StreamingResponse
import aiohttp
import asyncio
import os
import time
from typing import List, Optional
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import uuid
from ultralytics import YOLO
import cv2
import numpy as np
import torch
from app.db.session import get_db
from app.db.models.vision import Project, Camera, Model, ModelStatus
from app.db.models.test_record import TestRecord
from app.services.model_storage import model_storage
from app.core.model_types import get_all_model_types, validate_file_format
from app.core.config import settings
from app.services.stream_manager import stream_manager

router = APIRouter()

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

# ==================== Cameras ====================

@router.get("/cameras")
async def get_cameras(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera))
    cameras = result.scalars().all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "protocol": c.protocol,
            "connection_string": c.connection_string,
            "status": c.status.value if c.status else "disconnected",
            "mode": c.mode.value if c.mode else "auto",
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
        status='disconnected'
    )
    
    db.add(new_camera)
    await db.commit()
    await db.refresh(new_camera)
    
    return {
        "id": new_camera.id,
        "name": new_camera.name,
        "protocol": new_camera.protocol,
        "connection_string": new_camera.connection_string,
        "status": new_camera.status.value if new_camera.status else "disconnected",
        "mode": new_camera.mode.value if new_camera.mode else "auto",
        "created_at": new_camera.created_at.isoformat() if new_camera.created_at else None
    }

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
        "status": camera.status.value if camera.status else "disconnected",
        "mode": camera.mode.value if camera.mode else "auto",
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
    
    return [
        {
            "id": m.id,
            "name": m.name,
            "filename": m.filename,
            "file_size": m.file_size,
            "model_type": m.model_type,
            "file_format": m.file_format,
            "framework": m.framework,
            "version": m.version,
            "classes": m.classes or [],
            "confidence": m.confidence,
            "roi": m.roi,
            "status": m.status,
            "created_at": m.created_at.isoformat() if m.created_at else None
        }
        for m in models
    ]

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
    
    return {
        "id": model.id,
        "name": model.name,
        "filename": model.filename,
        "file_size": model.file_size,
        "model_type": model.model_type,
        "file_format": model.file_format,
        "framework": model.framework,
        "version": model.version,
        "classes": model.classes or [],
        "confidence": model.confidence,
        "roi": model.roi,
        "status": model.status,
        "created_at": model.created_at.isoformat() if model.created_at else None
    }

@router.post("/models/{model_id}/test")
async def test_model(
    model_id: str,
    image: UploadFile = File(...),
    confidence: float = Form(0.5),
    iou_threshold: float = Form(0.45),
    db: AsyncSession = Depends(get_db)
):
    """Test a model with an uploaded image.
    
    Args:
        model_id: ID of the model to test
        image: Image file to run inference on
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
    
    # Validate image file
    # Validate file type
    if not image.content_type or (not image.content_type.startswith('image/') and not image.content_type.startswith('video/')):
        raise HTTPException(status_code=400, detail="File must be an image or video")
    
    # Validate confidence
    if not 0 <= confidence <= 1:
        raise HTTPException(status_code=400, detail="Confidence must be between 0 and 1")
    
    try:
        # Run inference
        results = await inference_service.run_inference(
            model_path=model.file_path,
            image=image,
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
    """Get list of available inference devices (CPU/GPU)."""
    devices = [
        {"id": "cpu", "name": "CPU", "type": "cpu"}
    ]
    
    if torch.cuda.is_available():
        count = torch.cuda.device_count()
        for i in range(count):
            name = torch.cuda.get_device_name(i)
            # Docker/PyTorch usually maps the visible GPU to index 0, 
            # but if we had multiple, they would be cuda:0, cuda:1 etc.
            devices.append({
                "id": f"cuda:{i}", 
                "name": name, 
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
    from fastapi.responses import StreamingResponse
    import asyncio
    
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
    
    # Resolve model path
    model_path = Path(settings.MODELS_DIR) / model_record.file_path
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="Model file not found")
    
    # Start/Get stream from manager
    stream = stream_manager.get_stream(
        camera_id=camera_id,
        model_id=model_id,
        model_path=str(model_path),
        connection_string=camera.connection_string,
        confidence=confidence,
        iou=iou_threshold,
        fps=fps
    )
    
    async def frame_generator():
        """Yields latest frame from the background stream"""
        last_frame_time = None
        while True:
            if await request.is_disconnected():
                break
                
            # Yield only if frame is new to save bandwidth and reduce latency
            if stream.latest_frame and stream.last_update != last_frame_time:
                last_frame_time = stream.last_update
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + stream.latest_frame + b'\r\n')
            
            # Poll frequently (10ms) to catch new frames immediately
            # blocked waiting for 1/fps is what caused the lag
            await asyncio.sleep(0.01)
            
    return StreamingResponse(
        frame_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        }
    )

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
                "inference_time_ms": stream.inference_ms,
                "fps": stream.fps_tracker,
                "timestamp": stream.last_update.isoformat() if stream.last_update else None
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



@router.post("/inference/live/stop/{camera_id}/{model_id}")
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
