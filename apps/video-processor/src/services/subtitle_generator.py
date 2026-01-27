import os
from typing import Optional, Literal
import ffmpeg
import httpx

from config import get_settings
from utils.storage import StorageClient

settings = get_settings()


class SubtitleGenerator:
    def __init__(self):
        self.storage = StorageClient()
        self.jobs: dict[str, dict] = {}
        self._whisper_model = None

    def _get_whisper_model(self, model_size: str):
        """Lazy load Whisper model."""
        if self._whisper_model is None or self._whisper_model_size != model_size:
            import whisper
            self._whisper_model = whisper.load_model(model_size)
            self._whisper_model_size = model_size
        return self._whisper_model

    async def generate(
        self,
        job_id: str,
        input_url: str,
        language: str,
        model_size: str,
        output_format: str,
        word_timestamps: bool,
        translate_to: Optional[str],
        callback_url: Optional[str],
    ):
        """Generate subtitles using Whisper."""
        self.jobs[job_id] = {"status": "processing", "progress": 0}

        try:
            local_input = await self.storage.download_temp(input_url)

            # Extract audio for Whisper
            audio_path = f"{settings.temp_dir}/{job_id}_audio.wav"
            (
                ffmpeg
                .input(local_input)
                .output(audio_path, acodec="pcm_s16le", ac=1, ar=16000)
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )

            self.jobs[job_id]["progress"] = 20

            # Load model and transcribe
            model = self._get_whisper_model(model_size)

            transcribe_options = {
                "word_timestamps": word_timestamps,
                "verbose": False,
            }

            if language != "auto":
                transcribe_options["language"] = language

            if translate_to:
                transcribe_options["task"] = "translate"

            result = model.transcribe(audio_path, **transcribe_options)

            self.jobs[job_id]["progress"] = 80

            # Format output
            detected_language = result.get("language", language)
            segments = []

            for segment in result["segments"]:
                segments.append({
                    "start": segment["start"],
                    "end": segment["end"],
                    "text": segment["text"].strip(),
                })

            # Generate subtitle file
            output_path = f"{settings.temp_dir}/{job_id}_subtitles.{output_format}"

            if output_format == "srt":
                self._write_srt(output_path, segments)
            elif output_format == "vtt":
                self._write_vtt(output_path, segments)
            else:  # json
                import json
                with open(output_path, "w") as f:
                    json.dump({"language": detected_language, "segments": segments}, f)

            # Upload result
            output_url = await self.storage.upload(
                output_path, f"subtitles/{job_id}.{output_format}"
            )

            self.jobs[job_id] = {
                "status": "completed",
                "progress": 100,
                "language": detected_language,
                "output_url": output_url,
                "segments": segments,
            }

            # Cleanup
            os.remove(local_input)
            os.remove(audio_path)
            os.remove(output_path)

            if callback_url:
                await self._send_callback(callback_url, self.jobs[job_id])

        except Exception as e:
            self.jobs[job_id] = {"status": "failed", "error": str(e)}
            if callback_url:
                await self._send_callback(callback_url, self.jobs[job_id])

    async def burn_subtitles(
        self,
        job_id: str,
        video_url: str,
        subtitles_url: str,
        font_name: str,
        font_size: int,
        font_color: str,
        outline_color: str,
        outline_width: int,
        position: str,
        margin_v: int,
        callback_url: Optional[str],
    ):
        """Burn subtitles into video."""
        self.jobs[job_id] = {"status": "processing", "progress": 0}

        try:
            local_video = await self.storage.download_temp(video_url)
            local_subs = await self.storage.download_temp(subtitles_url)
            output_path = f"{settings.temp_dir}/{job_id}_burned.mp4"

            # Build subtitle filter
            alignment = {"top": 6, "center": 10, "bottom": 2}[position]

            subtitle_filter = (
                f"subtitles={local_subs}:force_style='"
                f"FontName={font_name},"
                f"FontSize={font_size},"
                f"PrimaryColour=&H{self._color_to_ass(font_color)},"
                f"OutlineColour=&H{self._color_to_ass(outline_color)},"
                f"Outline={outline_width},"
                f"Alignment={alignment},"
                f"MarginV={margin_v}'"
            )

            (
                ffmpeg
                .input(local_video)
                .output(output_path, vf=subtitle_filter, c_a="copy")
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )

            # Upload result
            output_url = await self.storage.upload(output_path, f"processed/{job_id}_burned.mp4")

            self.jobs[job_id] = {
                "status": "completed",
                "progress": 100,
                "output_url": output_url,
            }

            # Cleanup
            os.remove(local_video)
            os.remove(local_subs)
            os.remove(output_path)

            if callback_url:
                await self._send_callback(callback_url, self.jobs[job_id])

        except Exception as e:
            self.jobs[job_id] = {"status": "failed", "error": str(e)}
            if callback_url:
                await self._send_callback(callback_url, self.jobs[job_id])

    async def get_job_status(self, job_id: str) -> Optional[dict]:
        return self.jobs.get(job_id)

    def _write_srt(self, path: str, segments: list):
        """Write SRT subtitle file."""
        with open(path, "w", encoding="utf-8") as f:
            for i, seg in enumerate(segments, 1):
                start = self._format_timestamp_srt(seg["start"])
                end = self._format_timestamp_srt(seg["end"])
                f.write(f"{i}\n{start} --> {end}\n{seg['text']}\n\n")

    def _write_vtt(self, path: str, segments: list):
        """Write WebVTT subtitle file."""
        with open(path, "w", encoding="utf-8") as f:
            f.write("WEBVTT\n\n")
            for seg in segments:
                start = self._format_timestamp_vtt(seg["start"])
                end = self._format_timestamp_vtt(seg["end"])
                f.write(f"{start} --> {end}\n{seg['text']}\n\n")

    def _format_timestamp_srt(self, seconds: float) -> str:
        """Format timestamp for SRT (HH:MM:SS,mmm)."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

    def _format_timestamp_vtt(self, seconds: float) -> str:
        """Format timestamp for VTT (HH:MM:SS.mmm)."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"

    def _color_to_ass(self, color: str) -> str:
        """Convert color name to ASS format (BGR hex)."""
        colors = {
            "white": "FFFFFF",
            "black": "000000",
            "red": "0000FF",
            "green": "00FF00",
            "blue": "FF0000",
            "yellow": "00FFFF",
        }
        return colors.get(color.lower(), "FFFFFF")

    async def _send_callback(self, url: str, data: dict):
        try:
            async with httpx.AsyncClient() as client:
                await client.post(url, json=data, timeout=10)
        except Exception:
            pass
