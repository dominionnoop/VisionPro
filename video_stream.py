"""
MP4 File -> HTTP MJPEG Stream
---------------------------------
Stream video frames from an MP4 file over HTTP as MJPEG.

Endpoints:
  GET /video_feed   MJPEG stream
  GET /info         { fps, width, height, status, source }
  GET /shutdown     Stop streaming loop

Run:
  python video_stream.py --file ./sample.mp4 --port 5002 --loop
"""

from __future__ import annotations

import argparse
import asyncio
import os
import signal
import threading
import time
from pathlib import Path
from typing import Optional

import cv2
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Stream MP4 file as MJPEG over HTTP")
    parser.add_argument("--file", required=True, help="Path to MP4 file")
    parser.add_argument("--host", default="0.0.0.0", help="Bind host")
    parser.add_argument("--port", type=int, default=5002, help="Bind port")
    parser.add_argument("--quality", type=int, default=70, help="JPEG quality (1-100)")
    parser.add_argument("--loop", action="store_true", help="Loop video when reaching EOF")
    parser.add_argument("--speed", type=float, default=1.0, help="Playback speed multiplier")
    return parser


ARGS = _build_parser().parse_args()
VIDEO_PATH = Path(ARGS.file).expanduser().resolve()
HOST = ARGS.host
PORT = ARGS.port
JPEG_QUALITY = max(1, min(int(ARGS.quality), 100))
LOOP_VIDEO = bool(ARGS.loop)
PLAYBACK_SPEED = max(float(ARGS.speed), 0.01)

app = FastAPI(title="Video File Stream")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# --- Shared state ---------------------------------------------------------------
_lock = threading.Lock()
_frame: Optional[bytes] = None
_stop = False
_stop_event = threading.Event()
_info = {
    "fps": 0,
    "width": 0,
    "height": 0,
    "status": "starting",
    "source": str(VIDEO_PATH),
}


def _capture_loop() -> None:
    global _frame, _stop

    if not VIDEO_PATH.exists() or not VIDEO_PATH.is_file():
        print(f"[Video] ERROR: file not found: {VIDEO_PATH}")
        _info["status"] = "error"
        return

    cap = cv2.VideoCapture(str(VIDEO_PATH))
    if not cap.isOpened():
        print(f"[Video] ERROR: cannot open file: {VIDEO_PATH}")
        _info["status"] = "error"
        return

    src_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    src_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    src_fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    effective_fps = src_fps if src_fps > 0 else 25.0
    frame_interval = max(1.0 / (effective_fps * PLAYBACK_SPEED), 0.001)

    _info.update({"width": src_w, "height": src_h, "status": "streaming"})
    print(
        f"[Video] opened {VIDEO_PATH.name} ({src_w}x{src_h} @ {effective_fps:.2f} FPS), "
        f"stream: http://{HOST}:{PORT}/video_feed"
    )

    count, t0 = 0, time.time()
    next_tick = time.perf_counter()

    while not _stop:
        ok, frame = cap.read()
        if not ok:
            if LOOP_VIDEO:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
            print("[Video] reached EOF")
            _info["status"] = "eof"
            break

        ret, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
        if ret:
            with _lock:
                _frame = buf.tobytes()

        count += 1
        elapsed = time.time() - t0
        if elapsed >= 1.0:
            _info["fps"] = round(count / elapsed)
            print(f"[Video] {_info['width']}x{_info['height']} @ {_info['fps']} FPS")
            count, t0 = 0, time.time()

        next_tick += frame_interval
        sleep_s = next_tick - time.perf_counter()
        if sleep_s > 0:
            time.sleep(sleep_s)

    cap.release()
    print("[Video] released")


async def _mjpeg_stream():
    try:
        while not _stop:
            with _lock:
                frame = _frame
            if frame is None:
                await asyncio.sleep(0.03)
                continue

            yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
            await asyncio.sleep(0)
    except (ConnectionResetError, BrokenPipeError, asyncio.CancelledError):
        return


@app.get("/")
def index():
    return {
        "status": _info.get("status", "unknown"),
        "stream_url": f"http://localhost:{PORT}/video_feed",
        "source": str(VIDEO_PATH),
    }


@app.get("/video_feed")
def video_feed():
    return StreamingResponse(_mjpeg_stream(), media_type="multipart/x-mixed-replace; boundary=frame")


@app.get("/info")
def info():
    return JSONResponse(_info)


@app.get("/shutdown")
def shutdown():
    global _stop
    _stop = True
    _stop_event.set()
    _info["status"] = "stopping"
    print("[Server] shutdown requested")
    return JSONResponse({"status": "stopping"})


def _sigint(_sig, _frame):
    global _stop
    print("\n[Server] Ctrl+C -> stopping...")
    _stop = True
    _stop_event.set()


signal.signal(signal.SIGINT, _sigint)


if __name__ == "__main__":
    print(f"  Source   -> {VIDEO_PATH}")
    print(f"  Stream   -> http://localhost:{PORT}/video_feed")
    print(f"  Info     -> http://localhost:{PORT}/info")
    print(f"  Shutdown -> http://localhost:{PORT}/shutdown\n")

    t = threading.Thread(target=_capture_loop, daemon=True)
    t.start()

    print("[Server] waiting first frame...")
    deadline = time.time() + 5
    while _frame is None and _info["status"] == "streaming" and time.time() < deadline:
        time.sleep(0.1)

    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")

