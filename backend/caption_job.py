"""Caption job processing pipeline.

Runs the full video captioning workflow:
  1. Probe video for dimensions and duration (ffprobe)
  2. Transcribe audio with word-level timestamps (faster-whisper)
  3. Generate ASS and SRT subtitle files with custom formatting
  4. Burn subtitles into video (ffmpeg)
  5. Clean up raw temp files and mark job completed
"""

import json
import logging
import os
import shutil
import subprocess
import time

import pysubs2

logger = logging.getLogger(__name__)

# Default Whisper model settings
_WHISPER_MODEL_SIZE = os.environ.get("WHISPER_MODEL_SIZE", "base")
_WHISPER_DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")
_WHISPER_COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")

# In-memory model cache to avoid re-allocating model weights per job
_MODEL_CACHE: dict = {}

# Local bundled FFmpeg paths
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_BUNDLED_FFMPEG_DIR = os.path.join(_PROJECT_ROOT, "tools", "ffmpeg", "bin")
if os.path.isdir(_BUNDLED_FFMPEG_DIR) and _BUNDLED_FFMPEG_DIR not in os.environ.get("PATH", ""):
    os.environ["PATH"] = _BUNDLED_FFMPEG_DIR + os.pathsep + os.environ.get("PATH", "")


def get_whisper_model(model_size: str | None = None):
    """Retrieve or initialize a cached WhisperModel with automatic CUDA/CPU fallback."""
    from faster_whisper import WhisperModel  # type: ignore[import]

    size = model_size or _WHISPER_MODEL_SIZE
    device = _WHISPER_DEVICE
    compute_type = _WHISPER_COMPUTE_TYPE

    cache_key = f"{size}_{device}_{compute_type}"
    if cache_key in _MODEL_CACHE:
        return _MODEL_CACHE[cache_key]

    try:
        model = WhisperModel(size, device=device, compute_type=compute_type)
        _MODEL_CACHE[cache_key] = model
        return model
    except Exception as exc:
        if device != "cpu":
            logger.warning(
                "Failed to initialize Whisper with device=%r (%s). Falling back to CPU.",
                device,
                exc,
            )
            fallback_key = f"{size}_cpu_int8"
            if fallback_key in _MODEL_CACHE:
                return _MODEL_CACHE[fallback_key]
            model = WhisperModel(size, device="cpu", compute_type="int8")
            _MODEL_CACHE[fallback_key] = model
            return model
        raise


def probe_video(video_path: str) -> tuple[int, int, float]:
    """Return (width, height, duration_seconds) for *video_path* via ffprobe."""
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        video_path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    except FileNotFoundError as exc:
        raise RuntimeError("ffprobe not found; please install ffmpeg") from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"ffprobe failed: {exc.stderr.strip()}") from exc

    data = json.loads(result.stdout)
    video_stream = next(
        (s for s in data.get("streams", []) if s.get("codec_type") == "video"),
        None,
    )
    if video_stream is None:
        raise ValueError(f"No video stream found in {video_path!r}")

    width = int(video_stream["width"])
    height = int(video_stream["height"])

    duration_str = video_stream.get("duration") or data.get("format", {}).get("duration")
    if duration_str is None:
        raise ValueError(f"Could not determine duration of {video_path!r}")
    duration = float(duration_str)

    return width, height, duration


def transcribe_audio(
    video_path: str,
    model_size: str | None = None,
    language: str | None = None,
) -> dict:
    """Transcribe *video_path* using faster-whisper with word-level timestamps."""
    from transliterate import devanagari_to_hinglish

    model = get_whisper_model(model_size)
    
    transcribe_kwargs = {"word_timestamps": True}
    is_hinglish = language and language.strip().lower() == "hinglish"

    if is_hinglish:
        transcribe_kwargs["language"] = "hi"
        transcribe_kwargs["initial_prompt"] = "Kya haal hai? Aap kaise ho? Main theek hoon. Yeh Hinglish video captions hain."
    elif language and language.strip().lower() != "auto":
        transcribe_kwargs["language"] = language.strip().lower()

    try:
        segments_iter, info = model.transcribe(video_path, **transcribe_kwargs)
        segments = []
        for seg in segments_iter:
            words = []
            for w in (seg.words or []):
                w_text = devanagari_to_hinglish(w.word) if is_hinglish else w.word
                words.append({"word": w_text, "start": w.start, "end": w.end})
            seg_text = devanagari_to_hinglish(seg.text.strip()) if is_hinglish else seg.text.strip()
            segments.append({
                "start": seg.start,
                "end": seg.end,
                "text": seg_text,
                "words": words,
            })
    except RuntimeError as exc:
        if "cublas" in str(exc).lower() or "cuda" in str(exc).lower():
            logger.warning("CUDA runtime error during transcription (%s). Retrying on CPU.", exc)
            from faster_whisper import WhisperModel
            cpu_model = WhisperModel(model_size or _WHISPER_MODEL_SIZE, device="cpu", compute_type="int8")
            segments_iter, info = cpu_model.transcribe(video_path, **transcribe_kwargs)
            segments = []
            for seg in segments_iter:
                words = []
                for w in (seg.words or []):
                    words.append({"word": w.word, "start": w.start, "end": w.end})
                segments.append({
                    "start": seg.start,
                    "end": seg.end,
                    "text": seg.text.strip(),
                    "words": words,
                })
        else:
            raise

    return {
        "language": info.language,
        "segments": segments,
    }


def generate_ass_from_transcript(
    transcript: dict,
    duration: float,
    output_path: str,
    caption_style: str,
    caption_position: int,
    language: str,
    video_width: int,
    video_height: int,
    words_per_segment: int | None = None,
    max_lines: int = 2,
    font_family: str | None = None,
    font_size_scale: float = 1.0,
    text_transform: str = "uppercase",
    primary_color: str | None = None,
    highlight_color: str | None = None,
    outline_enabled: bool = True,
    outline_color: str | None = None,
    outline_size: float | None = None,
    animation_type: str | None = None,
) -> bool:
    """Generate an ASS subtitle file from a transcript dict."""
    import subtitles

    return subtitles.generate_ass(
        transcript,
        0,
        duration,
        output_path,
        caption_style=caption_style,
        caption_position=caption_position,
        language=language,
        video_width=video_width,
        video_height=video_height,
        words_per_segment=words_per_segment,
        max_lines=max_lines,
        font_family=font_family,
        font_size_scale=font_size_scale,
        text_transform=text_transform,
        primary_color_override=primary_color,
        highlight_color_override=highlight_color,
        outline_enabled=outline_enabled,
        outline_color=outline_color,
        outline_size=outline_size,
        animation_type=animation_type,
    )


def burn_subtitles(video_path: str, ass_path: str, output_path: str) -> bool:
    """Burn ASS subtitles into *video_path* and write to *output_path*."""
    escaped_ass = ass_path.replace("\\", "/").replace(":", r"\:")
    fonts_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "fonts"))
    if os.path.exists(fonts_dir):
        escaped_fonts_dir = fonts_dir.replace("\\", "/").replace(":", r"\:")
        ass_filter = f"ass='{escaped_ass}':fontsdir='{escaped_fonts_dir}'"
    else:
        ass_filter = f"ass='{escaped_ass}'"
    cmd = [
        "ffmpeg",
        "-y",
        "-i", video_path,
        "-vf", ass_filter,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "18",
        "-c:a", "copy",
        output_path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    except FileNotFoundError as exc:
        raise RuntimeError("ffmpeg not found; please install ffmpeg") from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"ffmpeg failed: {exc.stderr[-500:]}") from exc

    return True


def process_caption_job(
    storage,
    job_id: str,
    video_path: str,
    caption_style: str,
    caption_position: int,
    data_dir: str,
    language_hint: str | None = None,
    model_size: str | None = None,
    words_per_segment: int | None = None,
    max_lines: int = 2,
    font_family: str | None = None,
    font_size_scale: float = 1.0,
    text_transform: str = "uppercase",
    primary_color: str | None = None,
    highlight_color: str | None = None,
    outline_enabled: bool = True,
    outline_color: str | None = None,
    outline_size: float | None = None,
    animation_type: str | None = None,
) -> None:
    """Run the full captioning pipeline for a job."""
    temp_job_dir = os.path.join(data_dir, "temp", job_id)
    ass_path = os.path.join(temp_job_dir, "subtitles.ass")
    output_dir = os.path.join(data_dir, "output", job_id)
    output_path = os.path.join(output_dir, "captioned.mp4")
    out_ass_path = os.path.join(output_dir, "subtitles.ass")
    out_srt_path = os.path.join(output_dir, "subtitles.srt")

    start_time = time.time()

    try:
        # Phase 1: Probe
        storage.update_status(
            job_id,
            status="processing",
            phase="transcribing",
            progress=5,
        )

        width, height, duration = probe_video(video_path)
        storage.update_status(job_id, duration=duration)

        # Phase 2: Transcribe
        transcript = transcribe_audio(
            video_path,
            model_size=model_size,
            language=language_hint,
        )
        detected_language = transcript.get("language", "en")
        storage.update_status(job_id, language=detected_language, progress=40, transcript=transcript)

        # Phase 3: Generate Subtitles
        storage.update_status(job_id, phase="burning", progress=50)

        os.makedirs(temp_job_dir, exist_ok=True)
        os.makedirs(output_dir, exist_ok=True)

        has_subtitles = generate_ass_from_transcript(
            transcript=transcript,
            duration=duration,
            output_path=ass_path,
            caption_style=caption_style,
            caption_position=caption_position,
            language=detected_language,
            video_width=width,
            video_height=height,
            words_per_segment=words_per_segment,
            max_lines=max_lines,
            font_family=font_family,
            font_size_scale=font_size_scale,
            text_transform=text_transform,
            primary_color=primary_color,
            highlight_color=highlight_color,
            outline_enabled=outline_enabled,
            outline_color=outline_color,
            outline_size=outline_size,
            animation_type=animation_type,
        )

        if has_subtitles and os.path.isfile(ass_path):
            try:
                shutil.copyfile(ass_path, out_ass_path)
                subs = pysubs2.load(ass_path)
                subs.save(out_srt_path)
            except Exception as e:
                logger.warning("Could not export auxiliary subtitle files: %s", e)

            # Phase 4: Burn Subtitles
            storage.update_status(job_id, phase="finalizing", progress=90)
            burn_subtitles(video_path, ass_path, output_path)
        else:
            logger.info("No speech detected in video for job %s, preserving video.", job_id)
            storage.update_status(job_id, phase="finalizing", progress=90)
            shutil.copyfile(video_path, output_path)
            with open(out_ass_path, "w", encoding="utf-8") as f:
                f.write("[Script Info]\nTitle: No Speech Detected\n")
            with open(out_srt_path, "w", encoding="utf-8") as f:
                f.write("")

        # Phase 5: Cleanup & Complete
        if os.path.isdir(temp_job_dir):
            shutil.rmtree(temp_job_dir, ignore_errors=True)

        if os.path.isfile(video_path):
            try:
                os.remove(video_path)
            except OSError:
                pass

        storage.update_status(
            job_id,
            status="completed",
            progress=100,
            output_path=output_path,
            processing_time_ms=int((time.time() - start_time) * 1000),
        )

    except Exception as exc:  # noqa: BLE001
        logger.exception("Job %s failed: %s", job_id, exc)
        storage.update_status(job_id, status="failed", error=str(exc))


def rerender_caption_job(
    storage,
    job_id: str,
    updated_transcript: dict,
    data_dir: str,
) -> bool:
    """Re-generate subtitles and re-burn video from an updated transcript."""
    import pysubs2

    job = storage.get_job(job_id)
    if not job:
        raise ValueError(f"Job not found: {job_id}")

    video_path = job["video_path"]
    temp_job_dir = os.path.join(data_dir, "temp", job_id)
    ass_path = os.path.join(temp_job_dir, "subtitles.ass")
    output_dir = os.path.join(data_dir, "output", job_id)
    output_path = os.path.join(output_dir, "captioned.mp4")
    out_ass_path = os.path.join(output_dir, "subtitles.ass")
    out_srt_path = os.path.join(output_dir, "subtitles.srt")

    os.makedirs(temp_job_dir, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)

    width, height, duration = probe_video(video_path)

    has_subtitles = generate_ass_from_transcript(
        transcript=updated_transcript,
        duration=duration,
        output_path=ass_path,
        caption_style=job.get("caption_style", "hormozi"),
        caption_position=job.get("caption_position", 10),
        language=job.get("language", "en"),
        video_width=width,
        video_height=height,
        words_per_segment=job.get("words_per_segment", 2),
        max_lines=job.get("max_lines", 1),
        font_family=job.get("font_family"),
        font_size_scale=job.get("font_size_scale", 1.0),
        text_transform=job.get("text_transform", "uppercase"),
        primary_color=job.get("primary_color"),
        highlight_color=job.get("highlight_color"),
        outline_enabled=job.get("outline_enabled", False),
        outline_color=job.get("outline_color"),
        outline_size=job.get("outline_size"),
        animation_type=job.get("animation_type"),
    )

    if has_subtitles and os.path.isfile(ass_path):
        try:
            shutil.copyfile(ass_path, out_ass_path)
            subs = pysubs2.load(ass_path)
            subs.save(out_srt_path)
        except Exception:
            pass

        success = burn_subtitles(video_path, ass_path, output_path)
        if success:
            storage.update_status(
                job_id,
                status="completed",
                progress=100,
                output_path=output_path,
                transcript=updated_transcript,
            )
            return True

    return False
