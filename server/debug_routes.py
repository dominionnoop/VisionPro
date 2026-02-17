import sys
import os

# Ensure we can import from app
sys.path.append(os.getcwd())

from app.main import app

print("\n=== Registered Routes ===")
for route in app.routes:
    if hasattr(route, "methods"):
        methods = ",".join(route.methods)
        print(f"{methods:<20} {route.path}")
    else:
        print(f"{'Unknown':<20} {route.path}")
print("=========================\n")
