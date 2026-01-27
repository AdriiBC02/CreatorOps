import os
from typing import Optional, Literal
import ffmpeg
import httpx

from config import get_settings
from utils.storage import StorageClient

settings = get_settings()

# YouTube Shorts dimensions
SHORTS_WIDTH = 1080
SHORTS_HEIGHT = 1920


class ShortsCreator:
    def __init__(self):
        self.storage = StorageClient()
        self.jobs: dict[str, dict] = {}

    async def create_short(
        self,
        job_id: str,
        input_url: str,
        start_time: float,
        end_time: float,
        crop_position: Literal["left", "center", "right", "auto"],
        enable_loop: bool,
        loop_crossfade: float,
        text_overlay: Optional[str],
        text_position: Literal["top", "center", "bottom"],
        output_format: str,
        callback_url: Optional[str],
    ):
        """Create a YouTube Short from a video segment."""
        self.jobs[job_id] = {"status": "processing", "progress": 0}

        try:
            local_input = await self.storage.download_temp(input_url)
            output_path = f"{settings.temp_dir}/{job_id}_short.{output_format}"

            duration = end_time - start_time

            # Get input dimensions
            probe = ffmpeg.probe(local_input)
            video_stream = next(s for s in probe["streams"] if s["codec_type"] == "video")
            in_width = int(video_stream["width"])
            in_height = int(video_stream["height"])

            # Calculate crop for 9:16 aspect ratio
            target_ratio = SHORTS_WIDTH / SHORTS_HEIGHT  # 0.5625
            current_ratio = in_width / in_height

            if current_ratio > target_ratio:
                # Video is wider than 9:16 - crop sides
                crop_height = in_height
                crop_width = int(in_height * target_ratio)

                if crop_position == "left":
                    x_offset = 0
                elif crop_position == "right":
                    x_offset = in_width - crop_width
                elif crop_position == "center":
                    x_offset = (in_width - crop_width) // 2
                else:  # auto - use center
                    x_offset = (in_width - crop_width) // 2

                crop_filter = f"crop={crop_width}:{crop_height}:{x_offset}:0"
            else:
                # Video is taller or equal - crop top/bottom
                crop_width = in_width
                crop_height = int(in_width / target_ratio)
                y_offset = (in_height - crop_height) // 2
                crop_filter = f"crop={crop_width}:{crop_height}:0:{y_offset}"

            # Build filter chain
            stream = ffmpeg.input(local_input, ss=start_time, t=duration)
            video = stream.video

            # Apply crop
            video = video.filter("crop", **self._parse_crop(crop_filter))

            # Scale to Shorts dimensions
            video = video.filter("scale", SHORTS_WIDTH, SHORTS_HEIGHT)

            # Apply loop crossfade if enabled
            if enable_loop and loop_crossfade > 0:
                # This is simplified - full loop implementation would need complex filtering
                video = video.filter("fade", t="in", st=0, d=loop_crossfade)
                video = video.filter("fade", t="out", st=duration - loop_crossfade, d=loop_crossfade)

            # Add text overlay if specified
            if text_overlay:
                y_pos = {
                    "top": "50",
                    "center": "(h-text_h)/2",
                    "bottom": "h-text_h-100",
                }[text_position]

                video = video.drawtext(
                    text=text_overlay,
                    fontsize=48,
                    fontcolor="white",
                    borderw=3,
                    bordercolor="black",
                    x="(w-text_w)/2",
                    y=y_pos,
                )

            # Output with proper encoding for Shorts
            output = ffmpeg.output(
                video,
                stream.audio,
                output_path,
                vcodec="libx264",
                acodec="aac",
                preset="medium",
                crf=23,
                movflags="+faststart",
            )

            output.overwrite_output().run(capture_stdout=True, capture_stderr=True)

            # Upload result
            output_url = await self.storage.upload(output_path, f"shorts/{job_id}.{output_format}")

            self.jobs[job_id] = {
                "status": "completed",
                "progress": 100,
                "output_url": output_url,
            }

            # Cleanup
            os.remove(local_input)
            os.remove(output_path)

            if callback_url:
                await self._send_callback(callback_url, self.jobs[job_id])

        except Exception as e:
            self.jobs[job_id] = {"status": "failed", "error": str(e)}
            if callback_url:
                await self._send_callback(callback_url, self.jobs[job_id])

    async def analyze_loop_points(
        self,
        job_id: str,
        input_url: str,
        start_time: float,
        end_time: float,
        search_window: float,
    ):
        """Analyze video to find good loop points."""
        self.jobs[job_id] = {"status": "processing", "progress": 0}

        try:
            # This is a simplified implementation
            # A full implementation would use audio analysis and visual similarity

            duration = end_time - start_time
            loop_points = []

            # Check evenly spaced points
            num_points = int(duration / search_window)
            for i in range(num_points):
                timestamp = start_time + (i * search_window)
                # In a real implementation, calculate similarity score
                confidence = 0.5 + (0.5 * (1 - abs(i - num_points / 2) / (num_points / 2)))
                loop_points.append({
                    "timestamp": round(timestamp, 2),
                    "confidence": round(confidence, 2),
                })

            # Sort by confidence
            loop_points.sort(key=lambda x: x["confidence"], reverse=True)

            self.jobs[job_id] = {
                "status": "completed",
                "progress": 100,
                "loop_points": loop_points[:10],
                "best_loop": loop_points[0] if loop_points else None,
            }

        except Exception as e:
            self.jobs[job_id] = {"status": "failed", "error": str(e)}

    def _parse_crop(self, crop_str: str) -> dict:
        """Parse crop filter string into dict."""
        # crop=w:h:x:y
        parts = crop_str.replace("crop=", "").split(":")
        return {
            "w": int(parts[0]),
            "h": int(parts[1]),
            "x": int(parts[2]),
            "y": int(parts[3]),
        }

    async def _send_callback(self, url: str, data: dict):
        try:
            async with httpx.AsyncClient() as client:
                await client.post(url, json=data, timeout=10)
        except Exception:
            pass
