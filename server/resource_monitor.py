import time
import psutil
import torch
import os

def monitor():
    print(f"PID: {os.getpid()}")
    print("Monitoring resources... (Press Ctrl+C to stop)")
    print("-" * 60)
    print(f"{'Time':<10} | {'RAM (GB)':<10} | {'VRAM Alloc (MB)':<15} | {'VRAM Res (MB)':<15}")
    print("-" * 60)

    try:
        while True:
            # RAM
            vm = psutil.virtual_memory()
            ram_gb = vm.used / (1024**3)
            
            # VRAM
            if torch.cuda.is_available():
                vram_alloc = torch.cuda.memory_allocated(0) / (1024**2)
                vram_res = torch.cuda.memory_reserved(0) / (1024**2)
            else:
                vram_alloc = 0
                vram_res = 0

            print(f"{time.strftime('%H:%M:%S'):<10} | {ram_gb:<10.2f} | {vram_alloc:<15.2f} | {vram_res:<15.2f}")
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopped.")

if __name__ == "__main__":
    monitor()
