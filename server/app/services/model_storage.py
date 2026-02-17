"""Model file storage service."""

import os
import shutil
from pathlib import Path
from typing import Optional, Tuple
from fastapi import UploadFile
import aiofiles

from app.core.config import settings
from app.core.model_types import validate_file_format

class ModelStorageService:
    """Service for managing model file storage."""
    
    def __init__(self):
        self.base_path = Path(settings.MODELS_DIR)
        self._ensure_directories()
    
    def _ensure_directories(self):
        """Ensure all model type directories exist."""
        from app.core.model_types import MODEL_TYPES
        
        # Create base models directory
        self.base_path.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories for each model type
        for model_type in MODEL_TYPES.keys():
            type_dir = self.base_path / model_type
            type_dir.mkdir(exist_ok=True)
    
    def get_model_path(self, model_type: str, filename: str) -> Path:
        """Get full path for a model file."""
        return self.base_path / model_type / filename
    
    def get_relative_path(self, model_type: str, filename: str) -> str:
        """Get relative path for database storage."""
        return f"{model_type}/{filename}"
    
    async def save_model_file(
        self, 
        file: UploadFile, 
        model_type: str,
        custom_filename: Optional[str] = None
    ) -> Tuple[str, int]:
        """
        Save uploaded model file to storage.
        
        Returns:
            Tuple of (relative_path, file_size)
        """
        # Validate file format
        if not validate_file_format(file.filename, model_type):
            raise ValueError(f"Invalid file format for {model_type}")
        
        # Use custom filename or original
        filename = custom_filename or file.filename
        
        # Ensure unique filename
        file_path = self.get_model_path(model_type, filename)
        if file_path.exists():
            # Add timestamp to make unique
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            name, ext = os.path.splitext(filename)
            filename = f"{name}_{timestamp}{ext}"
            file_path = self.get_model_path(model_type, filename)
        
        # Save file
        file_size = 0
        async with aiofiles.open(file_path, 'wb') as f:
            while chunk := await file.read(1024 * 1024):  # Read 1MB at a time
                await f.write(chunk)
                file_size += len(chunk)
        
        relative_path = self.get_relative_path(model_type, filename)
        return relative_path, file_size
    
    def delete_model_file(self, relative_path: str) -> bool:
        """
        Delete model file from storage.
        
        Args:
            relative_path: Relative path like "yolov8/model.pt"
        
        Returns:
            True if deleted, False if file not found
        """
        file_path = self.base_path / relative_path
        
        if file_path.exists() and file_path.is_file():
            file_path.unlink()
            return True
        
        return False
    
    def get_file_size(self, relative_path: str) -> int:
        """Get file size in bytes."""
        file_path = self.base_path / relative_path
        
        if file_path.exists():
            return file_path.stat().st_size
        
        return 0
    
    def file_exists(self, relative_path: str) -> bool:
        """Check if model file exists."""
        file_path = self.base_path / relative_path
        return file_path.exists() and file_path.is_file()
    
    def list_models_in_type(self, model_type: str) -> list:
        """List all model files in a specific type directory."""
        type_dir = self.base_path / model_type
        
        if not type_dir.exists():
            return []
        
        return [
            {
                'filename': f.name,
                'size': f.stat().st_size,
                'modified': f.stat().st_mtime,
            }
            for f in type_dir.iterdir()
            if f.is_file()
        ]

# Singleton instance
model_storage = ModelStorageService()
