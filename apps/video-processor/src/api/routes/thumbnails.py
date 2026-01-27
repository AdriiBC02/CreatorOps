from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Literal
import uuid

from services.thumbnail_generator import ThumbnailGenerator

router = APIRouter()
generator = ThumbnailGenerator()


class ExtractFrameRequest(BaseModel):
    video_url: str
    timestamp: float  # seconds
    output_format: Literal["jpg", "png", "webp"] = "jpg"
    width: Optional[int] = None  # maintain aspect ratio if only one specified
    height: Optional[int] = None


class ExtractFrameResponse(BaseModel):
    output_url: str


class ExtractMultipleFramesRequest(BaseModel):
    video_url: str
    timestamps: list[float]  # list of timestamps in seconds
    output_format: Literal["jpg", "png", "webp"] = "jpg"
    width: Optional[int] = None
    height: Optional[int] = None


class ExtractMultipleFramesResponse(BaseModel):
    frames: list[ExtractFrameResponse]


class GenerateThumbnailGridRequest(BaseModel):
    video_url: str
    rows: int = 3
    cols: int = 3
    output_format: Literal["jpg", "png"] = "jpg"


class GenerateThumbnailGridResponse(BaseModel):
    output_url: str
    timestamps: list[float]


class ApplyWatermarkRequest(BaseModel):
    image_url: str
    watermark_url: str
    position: Literal["top-left", "top-right", "bottom-left", "bottom-right", "center"] = "bottom-right"
    opacity: float = 0.7  # 0.0 to 1.0
    scale: float = 0.2  # relative to image size
    margin: int = 20  # pixels


class ApplyWatermarkResponse(BaseModel):
    output_url: str


@router.post("/extract-frame")
async def extract_frame(request: ExtractFrameRequest) -> ExtractFrameResponse:
    """Extract a single frame from a video at specified timestamp."""
    try:
        output_url = await generator.extract_frame(
            video_url=request.video_url,
            timestamp=request.timestamp,
            output_format=request.output_format,
            width=request.width,
            height=request.height,
        )
        return ExtractFrameResponse(output_url=output_url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/extract-frames")
async def extract_multiple_frames(
    request: ExtractMultipleFramesRequest,
) -> ExtractMultipleFramesResponse:
    """Extract multiple frames from a video."""
    try:
        frames = await generator.extract_multiple_frames(
            video_url=request.video_url,
            timestamps=request.timestamps,
            output_format=request.output_format,
            width=request.width,
            height=request.height,
        )
        return ExtractMultipleFramesResponse(
            frames=[ExtractFrameResponse(output_url=url) for url in frames]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/grid")
async def generate_thumbnail_grid(
    request: GenerateThumbnailGridRequest,
) -> GenerateThumbnailGridResponse:
    """Generate a thumbnail grid from video frames."""
    try:
        result = await generator.generate_grid(
            video_url=request.video_url,
            rows=request.rows,
            cols=request.cols,
            output_format=request.output_format,
        )
        return GenerateThumbnailGridResponse(
            output_url=result["output_url"],
            timestamps=result["timestamps"],
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/watermark")
async def apply_watermark(request: ApplyWatermarkRequest) -> ApplyWatermarkResponse:
    """Apply watermark to an image."""
    try:
        output_url = await generator.apply_watermark(
            image_url=request.image_url,
            watermark_url=request.watermark_url,
            position=request.position,
            opacity=request.opacity,
            scale=request.scale,
            margin=request.margin,
        )
        return ApplyWatermarkResponse(output_url=output_url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/best-frames")
async def detect_best_frames(
    video_url: str,
    count: int = 5,
) -> ExtractMultipleFramesResponse:
    """Automatically detect and extract the best frames for thumbnails."""
    try:
        frames = await generator.detect_best_frames(
            video_url=video_url,
            count=count,
        )
        return ExtractMultipleFramesResponse(
            frames=[ExtractFrameResponse(output_url=url) for url in frames]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
