import torch

print(f"CUDA Available: {torch.cuda.is_available()}")
count = torch.cuda.device_count()
print(f"Device Count: {count}")

for i in range(count):
    print(f"Device {i}: {torch.cuda.get_device_name(i)}")
    props = torch.cuda.get_device_properties(i)
    print(f"  - Memory: {props.total_memory / 1024**3:.2f} GB")
    print(f"  - Multi-Processor Count: {props.multi_processor_count}")

if count == 0:
    print("No CUDA devices found.")
elif count == 1:
    print("\nNOTE: Even if this GPU is #1 on Windows Task Manager, Docker usually maps it as #0 because it's the only one passed through.")
