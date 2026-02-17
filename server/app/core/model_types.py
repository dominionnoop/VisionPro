"""Model type configuration and definitions."""

from typing import Dict, List

# Supported model types and their configurations
MODEL_TYPES = {
    'yolov8': {
        'name': 'YOLOv8',
        'description': 'Ultralytics YOLOv8 - Latest YOLO version',
        'formats': ['.pt', '.onnx', '.engine'],
        'framework': 'ultralytics',
        'color': '#00D4FF',  # For UI badges
    },
    # Future model types (disabled for now)
    # 'yolov5': {
    #     'name': 'YOLOv5',
    #     'description': 'Ultralytics YOLOv5 - Stable and widely used',
    #     'formats': ['.pt', '.onnx', '.engine'],
    #     'framework': 'ultralytics',
    #     'color': '#4ECDC4',
    # },
    # 'yolov7': {
    #     'name': 'YOLOv7',
    #     'description': 'YOLOv7 - High performance detection',
    #     'formats': ['.pt', '.onnx'],
    #     'framework': 'yolov7',
    #     'color': '#FFE66D',
    # },
    # 'yolov9': {
    #     'name': 'YOLOv9',
    #     'description': 'YOLOv9 - Advanced architecture',
    #     'formats': ['.pt', '.onnx'],
    #     'framework': 'yolov9',
    #     'color': '#95E1D3',
    # },
    # 'custom': {
    #     'name': 'Custom Model',
    #     'description': 'Custom trained models',
    #     'formats': ['.onnx', '.tflite', '.pt', '.engine'],
    #     'framework': 'custom',
    #     'color': '#F38181',
    # },
}

# File format configurations
FILE_FORMATS = {
    '.pt': {
        'name': 'PyTorch',
        'description': 'PyTorch model format',
        'mime_type': 'application/octet-stream',
    },
    '.onnx': {
        'name': 'ONNX',
        'description': 'Open Neural Network Exchange format',
        'mime_type': 'application/octet-stream',
    },
    '.engine': {
        'name': 'TensorRT',
        'description': 'NVIDIA TensorRT engine',
        'mime_type': 'application/octet-stream',
    },
    # '.tflite': {
    #     'name': 'TensorFlow Lite',
    #     'description': 'TensorFlow Lite model format',
    #     'mime_type': 'application/octet-stream',
    # },
}

def get_model_type_info(model_type: str) -> Dict:
    """Get information about a model type."""
    return MODEL_TYPES.get(model_type, MODEL_TYPES.get('yolov8'))

def get_supported_formats(model_type: str) -> List[str]:
    """Get supported file formats for a model type."""
    type_info = get_model_type_info(model_type)
    return type_info.get('formats', [])

def validate_file_format(filename: str, model_type: str) -> bool:
    """Validate if file format is supported for the model type."""
    import os
    ext = os.path.splitext(filename)[1].lower()
    supported = get_supported_formats(model_type)
    return ext in supported

def get_all_model_types() -> List[Dict]:
    """Get list of all available model types."""
    return [
        {
            'id': key,
            'name': value['name'],
            'description': value['description'],
            'formats': value['formats'],
            'color': value['color'],
        }
        for key, value in MODEL_TYPES.items()
    ]
