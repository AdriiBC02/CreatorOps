from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Literal
import uuid

from services.subtitle_generator import SubtitleGenerator

router = APIRouter()
generator = SubtitleGenerator()


class GenerateSubtitlesRequest(BaseModel):
    input_url: str
    language: str = "auto"  # auto-detect or ISO 639-1 code
    model_size: Literal["tiny", "base", "small", "medium", "large"] = "base"
    output_format: Literal["srt", "vtt", "json"] = "srt"

    # Options
    word_timestamps: bool = False  # Get word-level timestamps
    translate_to: Optional[str] = None  # Translate to this language

    callback_url: Optional[str] = None


class SubtitleSegment(BaseModel):
    start: float
    end: float
    text: str


class GenerateSubtitlesResponse(BaseModel):
    job_id: str
    status: str
    language: Optional[str] = None
    output_url: Optional[str] = None
    segments: list[SubtitleSegment] = []


class BurnSubtitlesRequest(BaseModel):
    video_url: str
    subtitles_url: str  # URL to SRT/VTT file

    # Style options
    font_name: str = "Arial"
    font_size: int = 24
    font_color: str = "white"
    outline_color: str = "black"
    outline_width: int = 2
    position: Literal["top", "center", "bottom"] = "bottom"
    margin_v: int = 30  # vertical margin

    callback_url: Optional[str] = None


class BurnSubtitlesResponse(BaseModel):
    job_id: str
    status: str
    output_url: Optional[str] = None


@router.post("/generate")
async def generate_subtitles(
    request: GenerateSubtitlesRequest,
    background_tasks: BackgroundTasks,
) -> GenerateSubtitlesResponse:
    """Generate subtitles using Whisper AI."""
    job_id = str(uuid.uuid4())

    background_tasks.add_task(
        generator.generate,
        job_id=job_id,
        input_url=request.input_url,
        language=request.language,
        model_size=request.model_size,
        output_format=request.output_format,
        word_timestamps=request.word_timestamps,
        translate_to=request.translate_to,
        callback_url=request.callback_url,
    )

    return GenerateSubtitlesResponse(job_id=job_id, status="processing")


@router.post("/burn")
async def burn_subtitles(
    request: BurnSubtitlesRequest,
    background_tasks: BackgroundTasks,
) -> BurnSubtitlesResponse:
    """Burn subtitles into video (hardcode)."""
    job_id = str(uuid.uuid4())

    background_tasks.add_task(
        generator.burn_subtitles,
        job_id=job_id,
        video_url=request.video_url,
        subtitles_url=request.subtitles_url,
        font_name=request.font_name,
        font_size=request.font_size,
        font_color=request.font_color,
        outline_color=request.outline_color,
        outline_width=request.outline_width,
        position=request.position,
        margin_v=request.margin_v,
        callback_url=request.callback_url,
    )

    return BurnSubtitlesResponse(job_id=job_id, status="processing")


@router.get("/job/{job_id}")
async def get_subtitle_job(job_id: str) -> dict:
    """Get status of a subtitle generation job."""
    status = await generator.get_job_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    return status
