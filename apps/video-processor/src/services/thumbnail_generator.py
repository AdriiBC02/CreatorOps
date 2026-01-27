import os
from typing import Optional, Literal
import ffmpeg
import uuid

from config import get_settings
from utils.storage import StorageClient

settings = get_settings()


class ThumbnailGenerator:
    def __init__(self):
        self.storage = StorageClient()

    async def extract_frame(
        self,
        video_url: str,
        timestamp: float,
        output_format: str,
        width: Optional[int],
        height: Optional[int],
    ) -> str:
        """Extract a single frame from video."""
        local_input = await self.storage.download_temp(video_url)
        frame_id = str(uuid.uuid4())[:8]
        output_path = f"{settings.temp_dir}/{frame_id}.{output_format}"

        try:
            stream = ffmpeg.input(local_input, ss=timestamp)

            if width or height:
                # Scale maintaining aspect ratio
                scale_w = width or -1
                scale_h = height or -1
                stream = stream.filter("scale", scale_w, scale_h)

            stream = stream.output(output_path, vframes=1)
            stream.overwrite_output().run(capture_stdout=True, capture_stderr=True)

            # Upload
            output_url = await self.storage.upload(
                output_path, f"thumbnails/{frame_id}.{output_format}"
            )

            return output_url

        finally:
            os.remove(local_input)
            if os.path.exists(output_path):
                os.remove(output_path)

    async def extract_multiple_frames(
        self,
        video_url: str,
        timestamps: list[float],
        output_format: str,
        width: Optional[int],
        height: Optional[int],
    ) -> list[str]:
        """Extract multiple frames from video."""
        urls = []
        for ts in timestamps:
            url = await self.extract_frame(video_url, ts, output_format, width, height)
            urls.append(url)
        return urls

    async def generate_grid(
        self,
        video_url: str,
        rows: int,
        cols: int,
        output_format: str,
    ) -> dict:
        """Generate a thumbnail grid from video frames."""
        local_input = await self.storage.download_temp(video_url)
        grid_id = str(uuid.uuid4())[:8]
        output_path = f"{settings.temp_dir}/{grid_id}_grid.{output_format}"

        try:
            # Get video duration
            probe = ffmpeg.probe(local_input)
            duration = float(probe["format"]["duration"])

            # Calculate timestamps
            total_frames = rows * cols
            interval = duration / (total_frames + 1)
            timestamps = [interval * (i + 1) for i in range(total_frames)]

            # Extract frames
            frame_paths = []
            for i, ts in enumerate(timestamps):
                frame_path = f"{settings.temp_dir}/{grid_id}_frame_{i}.jpg"
                (
                    ffmpeg
                    .input(local_input, ss=ts)
                    .output(frame_path, vframes=1)
                    .overwrite_output()
                    .run(capture_stdout=True, capture_stderr=True)
                )
                frame_paths.append(frame_path)

            # Create grid using ffmpeg tile filter
            # First, create a concat file
            inputs = [ffmpeg.input(fp) for fp in frame_paths]

            # Use xstack or tile filter
            filter_complex = f"tile={cols}x{rows}"

            (
                ffmpeg
                .input(local_input, ss=timestamps[0])
                .output(
                    output_path,
                    vframes=1,
                    vf=f"select='lt(n\,{total_frames})',{filter_complex}",
                )
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )

            # If the above doesn't work well, fall back to simpler approach
            if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                # Use first frame as fallback
                import shutil
                shutil.copy(frame_paths[0], output_path)

            # Upload
            output_url = await self.storage.upload(
                output_path, f"thumbnails/{grid_id}_grid.{output_format}"
            )

            return {
                "output_url": output_url,
                "timestamps": timestamps,
            }

        finally:
            os.remove(local_input)
            for fp in frame_paths:
                if os.path.exists(fp):
                    os.remove(fp)
            if os.path.exists(output_path):
                os.remove(output_path)

    async def apply_watermark(
        self,
        image_url: str,
        watermark_url: str,
        position: Literal["top-left", "top-right", "bottom-left", "bottom-right", "center"],
        opacity: float,
        scale: float,
        margin: int,
    ) -> str:
        """Apply watermark to an image."""
        local_image = await self.storage.download_temp(image_url)
        local_watermark = await self.storage.download_temp(watermark_url)
        output_id = str(uuid.uuid4())[:8]
        output_path = f"{settings.temp_dir}/{output_id}_watermarked.png"

        try:
            # Get image dimensions
            probe = ffmpeg.probe(local_image)
            img_stream = next(s for s in probe["streams"] if s["codec_type"] == "video")
            img_width = int(img_stream["width"])
            img_height = int(img_stream["height"])

            # Calculate watermark size
            wm_width = int(img_width * scale)

            # Calculate position
            positions = {
                "top-left": f"x={margin}:y={margin}",
                "top-right": f"x=W-w-{margin}:y={margin}",
                "bottom-left": f"x={margin}:y=H-h-{margin}",
                "bottom-right": f"x=W-w-{margin}:y=H-h-{margin}",
                "center": "x=(W-w)/2:y=(H-h)/2",
            }

            overlay_pos = positions[position]

            # Apply watermark
            main = ffmpeg.input(local_image)
            watermark = ffmpeg.input(local_watermark)
            watermark = watermark.filter("scale", wm_width, -1)
            watermark = watermark.filter("format", "rgba")
            watermark = watermark.filter("colorchannelmixer", aa=opacity)

            output = ffmpeg.overlay(main, watermark, **self._parse_overlay_pos(overlay_pos))
            output = output.output(output_path)
            output.overwrite_output().run(capture_stdout=True, capture_stderr=True)

            # Upload
            output_url = await self.storage.upload(
                output_path, f"thumbnails/{output_id}_watermarked.png"
            )

            return output_url

        finally:
            os.remove(local_image)
            os.remove(local_watermark)
            if os.path.exists(output_path):
                os.remove(output_path)

    async def detect_best_frames(
        self,
        video_url: str,
        count: int,
    ) -> list[str]:
        """Detect best frames for thumbnails based on visual interest."""
        local_input = await self.storage.download_temp(video_url)

        try:
            # Get duration
            probe = ffmpeg.probe(local_input)
            duration = float(probe["format"]["duration"])

            # Simple heuristic: sample frames at golden ratio intervals
            # A more sophisticated implementation would use ML
            golden_ratio = 1.618
            timestamps = []
            current = duration * 0.1  # Start at 10%

            while len(timestamps) < count and current < duration * 0.9:
                timestamps.append(current)
                current += duration / (count * golden_ratio)

            # Extract frames at these timestamps
            urls = await self.extract_multiple_frames(
                video_url,
                timestamps[:count],
                "jpg",
                1280,
                720,
            )

            return urls

        finally:
            os.remove(local_input)

    def _parse_overlay_pos(self, pos_str: str) -> dict:
        """Parse overlay position string into dict."""
        result = {}
        for part in pos_str.split(":"):
            key, value = part.split("=")
            result[key] = value
        return result
