from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.api_v1 import api_router
import os
from app.services.mqtt_service import mqtt_service

app = FastAPI(title=settings.PROJECT_NAME)

# Ensure media directory exists
os.makedirs(settings.MEDIA_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.MEDIA_DIR, "inputs"), exist_ok=True)
os.makedirs(os.path.join(settings.MEDIA_DIR, "outputs"), exist_ok=True)

# Mount static files
app.mount("/media", StaticFiles(directory=settings.MEDIA_DIR), name="media")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup_event():
    # Start MQTT
    mqtt_service.start()

    print("\n\n" + "="*50)
    print("DEBUG: REGISTERED ROUTES:")
    for route in app.routes:
        if hasattr(route, "methods"):
            methods = ",".join(route.methods)
            print(f"{methods:<10} {route.path}")
        else:
             print(f"Unknown    {route.path}")
    print("="*50 + "\n\n")

@app.get("/health")
def health_check():
    return {"status": "ok"}
