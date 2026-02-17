"""
Quick test to check database and create test inference URL
"""
import sqlite3
from pathlib import Path

# Find database
db_path = Path("app.db")
if not db_path.exists():
    db_path = Path("server.db")
if not db_path.exists():
    db_path = Path("aatron.db")

if db_path.exists():
    print(f"Found database: {db_path}")
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Check cameras
    print("\n=== Cameras ===")
    try:
        cursor.execute("SELECT id, name, stream_url FROM cameras LIMIT 5")
        cameras = cursor.fetchall()
        for cam in cameras:
            print(f"ID: {cam[0]}")
            print(f"Name: {cam[1]}")
            print(f"URL: {cam[2]}")
            print()
    except Exception as e:
        print(f"Error reading cameras: {e}")
    
    # Check models
    print("=== Models ===")
    try:
        cursor.execute("SELECT id, name, file_path, status FROM vision_models LIMIT 5")
        models = cursor.fetchall()
        for model in models:
            print(f"ID: {model[0]}")
            print(f"Name: {model[1]}")
            print(f"Path: {model[2]}")
            print(f"Status: {model[3]}")
            print()
    except Exception as e:
        print(f"Error reading models: {e}")
    
    # Generate test URLs
    if cameras and models:
        camera_id = cameras[0][0]
        model_id = models[0][0]
        
        print("\n" + "="*60)
        print("TEST URLs:")
        print("="*60)
        print(f"\n1. MJPEG Stream (แสดงรูป + bounding boxes):")
        print(f"   http://localhost:8000/api/vision/inference/live/stream/{camera_id}/{model_id}?fps=10")
        
        print(f"\n2. JSON Detections (ข้อมูล detections):")
        print(f"   http://localhost:8000/api/vision/inference/live/detections")
        
        print(f"\n3. Frontend Live View:")
        print(f"   http://localhost:3000/live")
        
        print("\n" + "="*60)
    
    conn.close()
else:
    print("Database not found. Please check database location.")
    print("Looking in:", Path.cwd())
