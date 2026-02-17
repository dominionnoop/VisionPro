from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Aatron Vision Backend"
    API_V1_STR: str = "/api"
    # Allow localhost:3000 (Next.js default), 3002/3003 (our configured ports)
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3002",
        "http://localhost:3003"
    ]
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://aatron:aatron_dev@postgres:5432/aatron_vision"
    
    # Models Storage
    MODELS_DIR: str = "models"  # Relative to server root
    MEDIA_DIR: str = "media"    # Relative to server root
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-this-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15

    # MQTT
    MQTT_BROKER: str = "mqtt"
    MQTT_PORT: int = 1883
    MQTT_TOPIC_PREFIX: str = "vision"
    MQTT_PUBLISH_MODE: str = "all"  # all, on_detection, on_change
    
    # Retention
    RETENTION_DAYS: int = 30
    RECORDING_PATH: str = "/app/recordings"

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
