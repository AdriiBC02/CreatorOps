import os
from typing import Optional
import ffmpeg
import httpx

from config import get_settings
from utils.storage import StorageClient

settings = get_settings()


class ClipExtractor:
    def __init__(self):
        self.storage = StorageClient()
        self.jobs: dict[str, dict] = {}

    async def extract_clip(
        self,
        job_id: str,
        input_url: str,
        start_time: float,
        end_time: float,
        output_format: str,
        fade_in: float,
        fade_out: float,
        callback_url: Optional[str],
    ):
        """Extract a clip from a video."""
        self.jobs[job_id] = {"status": "processing", "progress": 0}

        try:
            local_input = await self.storage.download_temp(input_url)
            output_path = f"{settings.temp_dir}/{job_id}_clip.{output_format}"

            duration = end_time - start_time

            # Build filter chain
            stream = ffmpeg.input(local_input, ss=start_time, t=duration)

            # Apply fades if specified
            filters = []
            if fade_in > 0:
                filters.append(f"fade=t=in:st=0:d={fade_in}")
            if fade_out > 0:
                fade_start = duration - fade_out
                filters.append(f"fade=t=out:st={fade_start}:d={fade_out}")

            if filters:
                video = stream.video.filter("format", "yuv420p")
                for f in filters:
                    parts = f.split("=", 1)
                    filter_name = parts[0]
                    filter_args = parts[1] if len(parts) > 1 else ""
                    # Parse filter args
                    args_dict = {}
                    for arg in filter_args.split(":"):
                        if "=" in arg:
                            k, v = arg.split("=", 1)
                            args_dict[k] = v
                    video = video.filter(filter_name, **args_dict)
                stream = ffmpeg.output(video, stream.audio, output_path, c_a="aac")
            else:
                stream = stream.output(output_path, c="copy")

            stream.overwrite_output().run(capture_stdout=True, capture_stderr=True)

            # Upload result
            output_url = await self.storage.upload(output_path, f"clips/{job_id}.{output_format}")

            self.jobs[job_id] = {
                "status": "completed",
                "progress": 100,
                "output_url": output_url,
                "duration": duration,
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

    async def detect_clips(
        self,
        job_id: str,
        input_url: str,
        min_duration: float,
        max_duration: float,
        silence_threshold: float,
        callback_url: Optional[str],
    ):
        """Detect potential clip points based on audio analysis."""
        self.jobs[job_id] = {"status": "processing", "progress": 0}

        try:
            local_input = await self.storage.download_temp(input_url)

            # Get video duration
            probe = ffmpeg.probe(local_input)
            total_duration = float(probe["format"]["duration"])

            # Detect silence points using ffmpeg
            import subprocess
            import re

            cmd = [
                "ffmpeg", "-i", local_input,
                "-af", f"silencedetect=n={silence_threshold}dB:d=0.5",
                "-f", "null", "-"
            ]

            result = subprocess.run(cmd, capture_output=True, text=True)

            # Parse silence points
            silence_starts = []
            silence_ends = []

            for line in result.stderr.split("\n"):
                if "silence_start:" in line:
                    match = re.search(r"silence_start: ([\d.]+)", line)
                    if match:
                        silence_starts.append(float(match.group(1)))
                elif "silence_end:" in line:
                    match = re.search(r"silence_end: ([\d.]+)", line)
                    if match:
                        silence_ends.append(float(match.group(1)))

            # Generate clips between silence points
            clips = []
            prev_end = 0.0

            for start, end in zip(silence_starts, silence_ends):
                segment_duration = start - prev_end

                if min_duration <= segment_duration <= max_duration:
                    # Score based on duration (prefer closer to middle of range)
                    ideal_duration = (min_duration + max_duration) / 2
                    score = 1.0 - abs(segment_duration - ideal_duration) / ideal_duration

                    clips.append({
                        "start_time": prev_end,
                        "end_time": start,
                        "duration": segment_duration,
                        "score": round(score, 2),
                    })

                prev_end = end

            # Check last segment
            if prev_end < total_duration:
                segment_duration = total_duration - prev_end
                if min_duration <= segment_duration <= max_duration:
                    ideal_duration = (min_duration + max_duration) / 2
                    score = 1.0 - abs(segment_duration - ideal_duration) / ideal_duration
                    clips.append({
                        "start_time": prev_end,
                        "end_time": total_duration,
                        "duration": segment_duration,
                        "score": round(score, 2),
                    })

            # Sort by score
            clips.sort(key=lambda x: x["score"], reverse=True)

            self.jobs[job_id] = {
                "status": "completed",
                "progress": 100,
                "clips": clips[:20],  # Return top 20
            }

            os.remove(local_input)

            if callback_url:
                await self._send_callback(callback_url, self.jobs[job_id])

        except Exception as e:
            self.jobs[job_id] = {"status": "failed", "error": str(e)}
            if callback_url:
                await self._send_callback(callback_url, self.jobs[job_id])

    async def _send_callback(self, url: str, data: dict):
        try:
            async with httpx.AsyncClient() as client:
                await client.post(url, json=data, timeout=10)
        except Exception:
            pass
