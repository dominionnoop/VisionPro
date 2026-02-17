import cv2
import torch
from ultralytics import YOLO
import time
import sys

def run_inference_on_cuda1():
    print("="*50)
    print("FORCE CUDA:1 INFERENCE TEST")
    print("="*50)
    
    # 1. Check Devices
    print(f"PyTorch Version: {torch.__version__}")
    print(f"CUDA Available: {torch.cuda.is_available()}")
    device_count = torch.cuda.device_count()
    print(f"CUDA Device Count: {device_count}")
    
    for i in range(device_count):
        print(f"  - Device {i}: {torch.cuda.get_device_name(i)}")

    target_device = 'cuda:1'
    
    if device_count < 2:
        print("\n[WARNING] System reports fewer than 2 CUDA devices.")
        print(f"Requesting '{target_device}' might fail or fallback to CPU.")
    
    try:
        # 2. Open Camera
        # Use the internal stream URL strictly
        camera_url = "http://host.docker.internal:5000/video_feed"
        print(f"\n1. Opening Camera URL: {camera_url}")
        cap = cv2.VideoCapture(camera_url)
        
        if not cap.isOpened():
            print("   ❌ Failed to open camera URL.")
            print("   (This confirms the URL is reachable or not, but unrelated to GPU)")
            return

        # 3. Load Model
        print(f"\n2. Loading Model to {target_device}...")
        # Using a standard model path or download new one
        model = YOLO("yolov8n.pt") 
        
        # FORCE MOVE TO CUDA:1
        model.to(target_device)
        print(f"   ✅ Model successfully moved to {target_device}!")
        print(f"   Verify device: {model.device}")

        # 4. Inference Loop
        print("\n3. Starting Inference Loop...")
        frame_count = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                print("   Failed to read frame.")
                break

            start = time.time()
            results = model(frame, verbose=False)
            end = time.time()
            
            frame_count += 1
            if frame_count % 10 == 0:
                print(f"   Frame {frame_count}: Inference took {(end-start)*1000:.1f}ms on {results[0].orig_shape}")

            # Stop after 50 frames for this test
            if frame_count >= 50:
                print("\nTest completed successfully.")
                break

    except Exception as e:
        print("\n❌ ERROR OCCURRED:")
        print(f"   {e}")
        print("\nAnalysis:")
        if "device >= 0 && device < num_gpus" in str(e) or "Invalid device" in str(e):
            print("   -> The system officially confirms 'cuda:1' does not exist in this environment.")
            print("   -> Inside Docker, your RTX 4050 is mapped to 'cuda:0'.")
        else:
            print("   -> An unexpected error occurred.")

    finally:
        if 'cap' in locals() and cap.isOpened():
            cap.release()

if __name__ == "__main__":
    run_inference_on_cuda1()
