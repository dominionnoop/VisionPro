import cv2
import time

def test_camera(index=0):
    print(f"--- Testing Camera Index {index} ---")
    cap = cv2.VideoCapture(index, cv2.CAP_DSHOW) # Try DirectShow backend for Windows
    
    if not cap.isOpened():
        print(f"[FAIL] Failed to open camera {index}. It might be in use or invalid index.")
        # Try without DirectShow
        print(f"    Retrying without CAP_DSHOW...")
        cap = cv2.VideoCapture(index)
        if not cap.isOpened():
            print(f"    [FAIL] Still failed.")
            return False

    print(f"[OK] Camera {index} opened successfully!")
    
    # Try reading a frame
    ret, frame = cap.read()
    if ret:
        print(f"[OK] Frame capture successful (Resolution: {frame.shape[1]}x{frame.shape[0]})")
    else:
        print(f"[FAIL] Opened camera but failed to read frame (Stream usage error?)")
    
    cap.release()
    return True

print("Scanning cameras...")
found = False
for i in range(3):
    if test_camera(i):
        found = True

if not found:
    print("\n[FAIL] No working cameras found on indices 0-2.")
    print("Possibilities:")
    print("1. Windows Privacy Settings blocking access (Check 'Camera privacy settings')")
    print("2. Another app is holding the camera lock")
    print("3. Driver issue")
else:
    print("\n[OK] At least one camera is working at the OS level.")
    print("If Browser still fails, it is a Browser Permission/Privacy issue.")
