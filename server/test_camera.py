"""
Test live inference with camera stream
"""
import asyncio
import aiohttp
import cv2
import numpy as np
from pathlib import Path

async def test_camera_stream():
    """Test if camera stream is accessible"""
    camera_url = "http://host.docker.internal:5000/video_feed"
    
    print(f"Testing camera stream: {camera_url}")
    
    try:
        timeout = aiohttp.ClientTimeout(total=5)
        async with aiohttp.ClientSession(timeout=timeout, connector=aiohttp.TCPConnector(ssl=False)) as session:
            async with session.get(camera_url) as resp:
                print(f"Status: {resp.status}")
                print(f"Content-Type: {resp.headers.get('Content-Type')}")
                
                if resp.status == 200:
                    # Try to read one frame
                    content = b""
                    if "multipart" in resp.headers.get("Content-Type", ""):
                        print("MJPEG stream detected")
                        async for chunk in resp.content.iter_chunked(4096):
                            content += chunk
                            start = content.find(b'\xff\xd8')
                            end = content.find(b'\xff\xd9')
                            if start != -1 and end != -1 and end > start:
                                frame_data = content[start:end+2]
                                print(f"Frame captured: {len(frame_data)} bytes")
                                
                                # Decode to check validity
                                nparr = np.frombuffer(frame_data, np.uint8)
                                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                                if img is not None:
                                    print(f"Frame decoded successfully: {img.shape}")
                                    return True
                                break
                    else:
                        print("Single image stream")
                        content = await resp.read()
                        nparr = np.frombuffer(content, np.uint8)
                        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                        if img is not None:
                            print(f"Image decoded successfully: {img.shape}")
                            return True
                else:
                    print(f"Failed to connect: HTTP {resp.status}")
                    return False
                    
    except Exception as e:
        print(f"Error: {e}")
        return False
    
    return False

if __name__ == "__main__":
    result = asyncio.run(test_camera_stream())
    if result:
        print("\n✅ Camera stream is working!")
        print("\nYou can test live inference at:")
        print("http://localhost:3000/live")
        print("\nOr directly access the stream endpoint:")
        print("http://localhost:8000/api/vision/inference/live/stream/{camera_id}/{model_id}?fps=10")
    else:
        print("\n❌ Camera stream test failed")
