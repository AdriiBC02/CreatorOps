from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Literal
import uuid

from services.shorts_creator import ShortsCreator

router = APIRouter()
creator = ShortsCreator()


class CreateShortRequest(BaseModel):
    input_url: str
    start_time: float
    end_time: float

    # Vertical crop settings
    crop_position: Literal["left", "center", "right", "auto"] = "center"

    # Loop settings for seamless shorts
    enable_loop: bool = False
    loop_crossfade: float = 0.5  # seconds

    # Text overlay
    text_overlay: Optional[str] = None
    text_position: Literal["top", "center", "bottom"] = "bottom"

    # Output settings
    max_duration: float = 60.0  # YouTube Shorts max
    output_format: str = "mp4"

    callback_url: Optional[str] = None


class CreateShortResponse(BaseModel):
    job_id: str
    status: str
    output_url: Optional[str] = None


class LoopAnalysisRequest(BaseModel):
    input_url: str
    start_time: float
    end_time: float
    search_window: float = 2.0  # seconds to search for loop point


class LoopPoint(BaseModel):
    timestamp: float
    confidence: float


class LoopAnalysisResponse(BaseModel):
    job_id: str
    status: str
    loop_points: list[LoopPoint] = []
    best_loop: Optional[LoopPoint] = None


@router.post("/create")
async def create_short(
    request: CreateShortRequest,
    background_tasks: BackgroundTasks,
) -> CreateShortResponse:
    """Create a YouTube Short from a video segment."""
    duration = request.end_time - request.start_time

    if duration <= 0:
        raise HTTPException(status_code=400, detail="Invalid time range")

    if duration > request.max_duration:
        raise HTTPException(
            status_code=400,
            detail=f"Duration ({duration}s) exceeds maximum ({request.max_duration}s)",
        )

    job_id = str(uuid.uuid4())

    background_tasks.add_task(
        creator.create_short,
        job_id=job_id,
        input_url=request.input_url,
        start_time=request.start_time,
        end_time=request.end_time,
        crop_position=request.crop_position,
        enable_loop=request.enable_loop,
        loop_crossfade=request.loop_crossfade,
        text_overlay=request.text_overlay,
        text_position=request.text_position,
        output_format=request.output_format,
        callback_url=request.callback_url,
    )

    return CreateShortResponse(job_id=job_id, status="processing")


@router.post("/analyze-loop")
async def analyze_loop_points(
    request: LoopAnalysisRequest,
    background_tasks: BackgroundTasks,
) -> LoopAnalysisResponse:
    """Analyze video segment to find optimal loop points for seamless looping."""
    job_id = str(uuid.uuid4())

    background_tasks.add_task(
        creator.analyze_loop_points,
        job_id=job_id,
        input_url=request.input_url,
        start_time=request.start_time,
        end_time=request.end_time,
        search_window=request.search_window,
    )

    return LoopAnalysisResponse(job_id=job_id, status="processing")


@router.post("/batch")
async def create_batch_shorts(
    requests: list[CreateShortRequest],
    background_tasks: BackgroundTasks,
) -> list[CreateShortResponse]:
    """Create multiple shorts in batch."""
    responses = []

    for req in requests:
        job_id = str(uuid.uuid4())

        background_tasks.add_task(
            creator.create_short,
            job_id=job_id,
            input_url=req.input_url,
            start_time=req.start_time,
            end_time=req.end_time,
            crop_position=req.crop_position,
            enable_loop=req.enable_loop,
            loop_crossfade=req.loop_crossfade,
            text_overlay=req.text_overlay,
            text_position=req.text_position,
            output_format=req.output_format,
            callback_url=req.callback_url,
        )

        responses.append(CreateShortResponse(job_id=job_id, status="processing"))

    return responses
