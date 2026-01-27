from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import uuid

from services.clip_extractor import ClipExtractor

router = APIRouter()
extractor = ClipExtractor()


class ExtractClipRequest(BaseModel):
    input_url: str
    start_time: float  # seconds
    end_time: float  # seconds
    output_format: str = "mp4"
    fade_in: float = 0.0  # seconds
    fade_out: float = 0.0  # seconds
    callback_url: Optional[str] = None


class ExtractClipResponse(BaseModel):
    job_id: str
    status: str
    output_url: Optional[str] = None
    duration: Optional[float] = None


class DetectClipsRequest(BaseModel):
    input_url: str
    min_clip_duration: float = 15.0  # seconds
    max_clip_duration: float = 60.0  # seconds
    silence_threshold: float = -40.0  # dB
    callback_url: Optional[str] = None


class DetectedClip(BaseModel):
    start_time: float
    end_time: float
    duration: float
    score: float  # relevance score


class DetectClipsResponse(BaseModel):
    job_id: str
    status: str
    clips: list[DetectedClip] = []


@router.post("/extract")
async def extract_clip(
    request: ExtractClipRequest,
    background_tasks: BackgroundTasks,
) -> ExtractClipResponse:
    """Extract a clip from a video."""
    if request.end_time <= request.start_time:
        raise HTTPException(status_code=400, detail="end_time must be greater than start_time")

    job_id = str(uuid.uuid4())

    background_tasks.add_task(
        extractor.extract_clip,
        job_id=job_id,
        input_url=request.input_url,
        start_time=request.start_time,
        end_time=request.end_time,
        output_format=request.output_format,
        fade_in=request.fade_in,
        fade_out=request.fade_out,
        callback_url=request.callback_url,
    )

    return ExtractClipResponse(
        job_id=job_id,
        status="processing",
        duration=request.end_time - request.start_time,
    )


@router.post("/detect")
async def detect_clips(
    request: DetectClipsRequest,
    background_tasks: BackgroundTasks,
) -> DetectClipsResponse:
    """Automatically detect potential clip points in a video."""
    job_id = str(uuid.uuid4())

    background_tasks.add_task(
        extractor.detect_clips,
        job_id=job_id,
        input_url=request.input_url,
        min_duration=request.min_clip_duration,
        max_duration=request.max_clip_duration,
        silence_threshold=request.silence_threshold,
        callback_url=request.callback_url,
    )

    return DetectClipsResponse(job_id=job_id, status="processing")


@router.post("/batch")
async def extract_batch_clips(
    clips: list[ExtractClipRequest],
    background_tasks: BackgroundTasks,
) -> list[ExtractClipResponse]:
    """Extract multiple clips from a video."""
    responses = []

    for clip_request in clips:
        job_id = str(uuid.uuid4())

        background_tasks.add_task(
            extractor.extract_clip,
            job_id=job_id,
            input_url=clip_request.input_url,
            start_time=clip_request.start_time,
            end_time=clip_request.end_time,
            output_format=clip_request.output_format,
            fade_in=clip_request.fade_in,
            fade_out=clip_request.fade_out,
            callback_url=clip_request.callback_url,
        )

        responses.append(ExtractClipResponse(
            job_id=job_id,
            status="processing",
            duration=clip_request.end_time - clip_request.start_time,
        ))

    return responses
