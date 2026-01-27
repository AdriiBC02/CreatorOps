from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "CreatorOps Video Processor"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000

    # Redis
    redis_url: str = "redis://localhost:6379"

    # MinIO / S3
    minio_endpoint: str = "localhost"
    minio_port: int = 9000
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "creatorops-videos"
    minio_use_ssl: bool = False

    # Processing
    temp_dir: str = "/tmp/creatorops-processor"
    max_concurrent_jobs: int = 2

    # Whisper
    whisper_model: str = "base"  # tiny, base, small, medium, large

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
