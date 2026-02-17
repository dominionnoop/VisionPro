from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timedelta

from app.db.session import get_db
from app.db.models.detection_log import DetectionLog

router = APIRouter()

@router.get("/", response_model=None)
async def get_detection_logs(
    skip: int = 0,
    limit: int = 50,
    camera_id: Optional[str] = None,
    model_id: Optional[str] = None,
    has_detections: Optional[bool] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detection logs with filtering and pagination
    """
    query = select(DetectionLog).order_by(desc(DetectionLog.timestamp))
    
    if camera_id:
        query = query.where(DetectionLog.camera_id == camera_id)
    if model_id:
        query = query.where(DetectionLog.model_id == model_id)
    if has_detections is not None:
        query = query.where(DetectionLog.has_detections == has_detections)
    if start_date:
        query = query.where(DetectionLog.timestamp >= start_date)
    if end_date:
        query = query.where(DetectionLog.timestamp <= end_date)
        
    # Get total count
    # count_query = select(func.count()).select_from(query.subquery())
    # total = await db.scalar(count_query)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return {
        "data": logs,
        "skip": skip,
        "limit": limit,
        # "total": total
    }

@router.get("/stats")
async def get_detection_stats(
    days: int = 7,
    db: AsyncSession = Depends(get_db)
):
    """
    Get aggregated statistics for the last N days
    """
    since = datetime.now() - timedelta(days=days)
    
    # Total count
    total_query = select(func.count(DetectionLog.id)).where(DetectionLog.timestamp >= since)
    total = await db.scalar(total_query)
    
    # Defect count (has_detections=True)
    defect_query = select(func.count(DetectionLog.id)).where(
        DetectionLog.timestamp >= since,
        DetectionLog.has_detections == True
    )
    defect_count = await db.scalar(defect_query)
    
    # Count by Camera
    cam_query = select(
        DetectionLog.camera_id, 
        func.count(DetectionLog.id)
    ).where(DetectionLog.timestamp >= since).group_by(DetectionLog.camera_id)
    cam_result = await db.execute(cam_query)
    by_camera = {r[0]: r[1] for r in cam_result.all()}
    
    return {
        "period_days": days,
        "total_inspections": total,
        "total_defects": defect_count,
        "defect_rate": (defect_count / total * 100) if total > 0 else 0,
        "by_camera": by_camera
    }

@router.delete("/")
async def clear_logs(
    older_than_days: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete logs. If older_than_days is provided, delete only old logs.
    Otherwise delete ALL logs.
    """
    if older_than_days:
        cutoff = datetime.now() - timedelta(days=older_than_days)
        query = delete(DetectionLog).where(DetectionLog.timestamp < cutoff)
    else:
        query = delete(DetectionLog)
        
    result = await db.execute(query)
    await db.commit()
    
    return {"deleted_count": result.rowcount}
