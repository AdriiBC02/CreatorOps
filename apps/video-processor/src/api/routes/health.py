from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str


@router.get("/health")
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        timestamp=datetime.utcnow(),
        version="0.1.0",
    )


@router.get("/ready")
async def readiness_check() -> dict:
    # Check dependencies (ffmpeg, etc.)
    import shutil

    ffmpeg_available = shutil.which("ffmpeg") is not None
    ffprobe_available = shutil.which("ffprobe") is not None

    return {
        "ready": ffmpeg_available and ffprobe_available,
        "checks": {
            "ffmpeg": ffmpeg_available,
            "ffprobe": ffprobe_available,
        },
    }
