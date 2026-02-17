import cv2
import uvicorn
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import time

app = FastAPI()

# Configuration
CAMERA_INDEX = 0  # Default webcam
HOST = "0.0.0.0"
PORT = 5000

def generate_frames():
    try:
        camera = cv2.VideoCapture(CAMERA_INDEX)
        if not camera.isOpened():
            print(f"Error: Could not open video device {CAMERA_INDEX}")
            # Try fallback
            camera = cv2.VideoCapture(1)
            if not camera.isOpened():
                yield b''
                return

        # Optimize camera settings at hardware level
        camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        camera.set(cv2.CAP_PROP_FPS, 30)

        actual_w = camera.get(cv2.CAP_PROP_FRAME_WIDTH)
        actual_h = camera.get(cv2.CAP_PROP_FRAME_HEIGHT)
        actual_fps = camera.get(cv2.CAP_PROP_FPS)
        print(f"Camera Config: {actual_w}x{actual_h} @ {actual_fps} FPS")

        print(f"Camera opened successfully. Streaming on http://{HOST}:{PORT}/video_feed")

        frame_count = 0
        last_log_time = time.time()

        while True:
            # Measure loop time
            start_time = time.time()
            
            success, frame = camera.read()
            if not success:
                print("Error: Failed to read frame")
                time.sleep(0.1)
                continue

            # Frame is likely already 640x480, but resize ensures safety
            if frame.shape[1] != 640:
                 frame = cv2.resize(frame, (640, 480))
            
            # Encode as JPEG
            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
            if not ret:
                continue
                
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            
            # FPS Calculation
            frame_count += 1
            if time.time() - last_log_time >= 1.0:
                elapsed = time.time() - last_log_time
                fps = frame_count / elapsed
                print(f"📷 CAMERA SOURCE: {frame.shape[1]}x{frame.shape[0]} @ {fps:.1f} FPS")
                frame_count = 0
                last_log_time = time.time()

            # Smart sleep to maintain ~30FPS if hardware doesn't pace it
            # time.sleep(0.01) # Minimal sleep to yield CPU
            
    except Exception as e:
        print(f"Stream error: {e}")
    finally:
        try:
            camera.release()
        except:
            pass

@app.get("/")
def index():
    return {"status": "online", "stream_url": f"http://localhost:{PORT}/video_feed"}

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

if __name__ == "__main__":
    print(f"Starting Webcam Streamer on port {PORT}...")
    print(f"Use this URL in Aatron: http://localhost:{PORT}/video_feed")
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")
