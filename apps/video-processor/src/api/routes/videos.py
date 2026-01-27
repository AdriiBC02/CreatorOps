from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import uuid

from services.video_processor import VideoProcessor

router = APIRouter()
processor = VideoProcessor()


class VideoInfoRequest(BaseModel):
    url: str


class VideoInfoResponse(BaseModel):
    duration: float
    width: int
    height: int
    fps: float
    codec: str
    bitrate: Optional[int]
    size_bytes: int


class TranscodeRequest(BaseModel):
    input_url: str
    output_format: str = "mp4"
    video_codec: str = "h264"
    audio_codec: str = "aac"
    video_bitrate: Optional[str] = None
    audio_bitrate: str = "128k"
    resolution: Optional[str] = None  # e.g., "1920x1080"
    callback_url: Optional[str] = None


class TranscodeResponse(BaseModel):
    job_id: str
    status: str
    output_url: Optional[str] = None


class NormalizeAudioRequest(BaseModel):
    input_url: str
    target_lufs: float = -14.0  # YouTube standard
    callback_url: Optional[str] = None


@router.post("/info")
async def get_video_info(request: VideoInfoRequest) -> VideoInfoResponse:
    """Get video metadata."""
    try:
        info = await processor.get_video_info(request.url)
        return VideoInfoResponse(**info)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/transcode")
async def transcode_video(
    request: TranscodeRequest,
    background_tasks: BackgroundTasks,
) -> TranscodeResponse:
    """Transcode video to specified format."""
    job_id = str(uuid.uuid4())

    background_tasks.add_task(
        processor.transcode,
        job_id=job_id,
        input_url=request.input_url,
        output_format=request.output_format,
        video_codec=request.video_codec,
        audio_codec=request.audio_codec,
        video_bitrate=request.video_bitrate,
        audio_bitrate=request.audio_bitrate,
        resolution=request.resolution,
        callback_url=request.callback_url,
    )

    return TranscodeResponse(job_id=job_id, status="processing")


@router.post("/normalize-audio")
async def normalize_audio(
    request: NormalizeAudioRequest,
    background_tasks: BackgroundTasks,
) -> TranscodeResponse:
    """Normalize audio levels to target LUFS."""
    job_id = str(uuid.uuid4())

    background_tasks.add_task(
        processor.normalize_audio,
        job_id=job_id,
        input_url=request.input_url,
        target_lufs=request.target_lufs,
        callback_url=request.callback_url,
    )

    return TranscodeResponse(job_id=job_id, status="processing")


@router.get("/job/{job_id}")
async def get_job_status(job_id: str) -> dict:
    """Get status of a processing job."""
    status = await processor.get_job_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    return status
