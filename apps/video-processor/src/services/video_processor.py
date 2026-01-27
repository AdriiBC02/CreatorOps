import os
import json
import asyncio
import subprocess
from typing import Optional
import httpx
import ffmpeg

from config import get_settings
from utils.storage import StorageClient

settings = get_settings()


class VideoProcessor:
    def __init__(self):
        self.storage = StorageClient()
        self.jobs: dict[str, dict] = {}

    async def get_video_info(self, url: str) -> dict:
        """Get video metadata using ffprobe."""
        local_path = await self.storage.download_temp(url)

        try:
            probe = ffmpeg.probe(local_path)
            video_stream = next(
                (s for s in probe["streams"] if s["codec_type"] == "video"), None
            )

            if not video_stream:
                raise ValueError("No video stream found")

            # Get file size
            size_bytes = os.path.getsize(local_path)

            # Calculate FPS
            fps_parts = video_stream.get("r_frame_rate", "30/1").split("/")
            fps = float(fps_parts[0]) / float(fps_parts[1]) if len(fps_parts) == 2 else 30.0

            return {
                "duration": float(probe["format"].get("duration", 0)),
                "width": int(video_stream.get("width", 0)),
                "height": int(video_stream.get("height", 0)),
                "fps": fps,
                "codec": video_stream.get("codec_name", "unknown"),
                "bitrate": int(probe["format"].get("bit_rate", 0)) or None,
                "size_bytes": size_bytes,
            }
        finally:
            os.remove(local_path)

    async def transcode(
        self,
        job_id: str,
        input_url: str,
        output_format: str,
        video_codec: str,
        audio_codec: str,
        video_bitrate: Optional[str],
        audio_bitrate: str,
        resolution: Optional[str],
        callback_url: Optional[str],
    ):
        """Transcode video to specified format."""
        self.jobs[job_id] = {"status": "processing", "progress": 0}

        try:
            local_input = await self.storage.download_temp(input_url)
            output_path = f"{settings.temp_dir}/{job_id}.{output_format}"

            # Build ffmpeg command
            stream = ffmpeg.input(local_input)

            # Video settings
            video_opts = {"c:v": video_codec}
            if video_bitrate:
                video_opts["b:v"] = video_bitrate
            if resolution:
                width, height = resolution.split("x")
                stream = stream.filter("scale", width, height)

            # Audio settings
            audio_opts = {"c:a": audio_codec, "b:a": audio_bitrate}

            # Run transcoding
            stream = stream.output(output_path, **video_opts, **audio_opts)
            stream.overwrite_output().run(capture_stdout=True, capture_stderr=True)

            # Upload result
            output_url = await self.storage.upload(output_path, f"processed/{job_id}.{output_format}")

            self.jobs[job_id] = {
                "status": "completed",
                "progress": 100,
                "output_url": output_url,
            }

            # Cleanup
            os.remove(local_input)
            os.remove(output_path)

            # Callback
            if callback_url:
                await self._send_callback(callback_url, self.jobs[job_id])

        except Exception as e:
            self.jobs[job_id] = {"status": "failed", "error": str(e)}
            if callback_url:
                await self._send_callback(callback_url, self.jobs[job_id])

    async def normalize_audio(
        self,
        job_id: str,
        input_url: str,
        target_lufs: float,
        callback_url: Optional[str],
    ):
        """Normalize audio levels to target LUFS."""
        self.jobs[job_id] = {"status": "processing", "progress": 0}

        try:
            local_input = await self.storage.download_temp(input_url)
            output_path = f"{settings.temp_dir}/{job_id}_normalized.mp4"

            # First pass: analyze loudness
            analyze_cmd = [
                "ffmpeg", "-i", local_input,
                "-af", f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11:print_format=json",
                "-f", "null", "-"
            ]

            result = subprocess.run(
                analyze_cmd,
                capture_output=True,
                text=True,
            )

            # Parse loudness info from stderr
            stderr_lines = result.stderr.split("\n")
            json_start = None
            for i, line in enumerate(stderr_lines):
                if "{" in line:
                    json_start = i
                    break

            if json_start is not None:
                json_str = "\n".join(stderr_lines[json_start:])
                json_str = json_str[json_str.index("{"):json_str.rindex("}") + 1]
                loudness_info = json.loads(json_str)

                # Second pass: apply normalization
                measured_i = loudness_info.get("input_i", "-24")
                measured_lra = loudness_info.get("input_lra", "7")
                measured_tp = loudness_info.get("input_tp", "-2")
                measured_thresh = loudness_info.get("input_thresh", "-34")

                filter_str = (
                    f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11:"
                    f"measured_I={measured_i}:measured_LRA={measured_lra}:"
                    f"measured_tp={measured_tp}:measured_thresh={measured_thresh}:"
                    f"linear=true:print_format=summary"
                )

                (
                    ffmpeg
                    .input(local_input)
                    .output(output_path, af=filter_str, c_v="copy")
                    .overwrite_output()
                    .run(capture_stdout=True, capture_stderr=True)
                )
            else:
                # Fallback: simple normalization
                (
                    ffmpeg
                    .input(local_input)
                    .output(output_path, af=f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11", c_v="copy")
                    .overwrite_output()
                    .run(capture_stdout=True, capture_stderr=True)
                )

            # Upload result
            output_url = await self.storage.upload(output_path, f"processed/{job_id}_normalized.mp4")

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

    async def get_job_status(self, job_id: str) -> Optional[dict]:
        """Get status of a processing job."""
        return self.jobs.get(job_id)

    async def _send_callback(self, url: str, data: dict):
        """Send callback to notify job completion."""
        try:
            async with httpx.AsyncClient() as client:
                await client.post(url, json=data, timeout=10)
        except Exception:
            pass  # Ignore callback errors
