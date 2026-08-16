"""Thread-safe in-memory job storage for caption processing tasks."""

import json
import logging
import os
import threading
import uuid
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

VALID_STATUSES = {"pending", "uploading", "processing", "completed", "failed"}
VALID_PHASES = {"uploading", "transcribing", "burning", "finalizing"}


class JobStorage:
    """Thread-safe store for background caption processing jobs."""

    def __init__(self, persist_path: str | None = None) -> None:
        self._lock = threading.Lock()
        self._jobs: dict[str, dict[str, Any]] = {}
        self._persist_path = persist_path

        if self._persist_path and os.path.exists(self._persist_path):
            self._load()

    def create_job(
        self,
        video_path: str,
        caption_style: str,
        caption_position: int,
        original_filename: str,
        file_size: int,
        language_hint: str | None = None,
        model_size: str | None = None,
        words_per_segment: int | None = None,
        max_lines: int = 2,
        font_family: str | None = None,
        font_size_scale: float = 1.0,
        text_transform: str = "uppercase",
        primary_color: str | None = None,
        highlight_color: str | None = None,
    ) -> str:
        job_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        job: dict[str, Any] = {
            "id": job_id,
            "job_id": job_id,
            "status": "pending",
            "progress": 0,
            "current_phase": None,
            "video_path": video_path,
            "output_path": None,
            "caption_style": caption_style,
            "caption_position": caption_position,
            "original_filename": original_filename,
            "file_size": file_size,
            "duration_seconds": None,
            "language": language_hint,
            "model_size": model_size,
            "words_per_segment": words_per_segment,
            "max_lines": max_lines,
            "font_family": font_family,
            "font_size_scale": font_size_scale,
            "text_transform": text_transform,
            "primary_color": primary_color,
            "highlight_color": highlight_color,
            "error_message": None,
            "processing_time_ms": None,
            "created_at": now,
            "updated_at": now,
        }

        with self._lock:
            self._jobs[job_id] = job
            self._persist()

        return job_id

    def get_job(self, job_id: str) -> dict[str, Any] | None:
        with self._lock:
            job = self._jobs.get(job_id)
            return dict(job) if job else None

    def update_status(
        self,
        job_id: str,
        status: str | None = None,
        progress: int | None = None,
        phase: str | None = None,
        output_path: str | None = None,
        duration: float | None = None,
        language: str | None = None,
        error: str | None = None,
        processing_time_ms: int | None = None,
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()

        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                logger.warning("Attempted to update non-existent job: %s", job_id)
                return

            if status is not None:
                if status not in VALID_STATUSES:
                    raise ValueError(f"Invalid status: {status}")
                job["status"] = status

            if progress is not None:
                job["progress"] = max(0, min(100, progress))

            if phase is not None:
                if phase not in VALID_PHASES:
                    raise ValueError(f"Invalid phase: {phase}")
                job["current_phase"] = phase

            if output_path is not None:
                job["output_path"] = output_path
            if duration is not None:
                job["duration_seconds"] = duration
            if language is not None:
                job["language"] = language
            if error is not None:
                job["error_message"] = error
            if processing_time_ms is not None:
                job["processing_time_ms"] = processing_time_ms

            job["updated_at"] = now
            self._persist()

    def delete_job(self, job_id: str) -> bool:
        with self._lock:
            if job_id in self._jobs:
                del self._jobs[job_id]
                self._persist()
                return True
            return False

    def list_jobs(self) -> list[dict[str, Any]]:
        with self._lock:
            return [dict(j) for j in self._jobs.values()]

    def active_job_count(self) -> int:
        with self._lock:
            return sum(
                1 for j in self._jobs.values()
                if j["status"] in ("pending", "processing")
            )

    def _persist(self) -> None:
        if not self._persist_path:
            return
        try:
            temp_path = self._persist_path + ".tmp"
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(self._jobs, f, indent=2)
            os.replace(temp_path, self._persist_path)
        except Exception:
            logger.exception("Failed to persist job storage to %s", self._persist_path)

    def _load(self) -> None:
        if not self._persist_path or not os.path.exists(self._persist_path):
            return
        try:
            with open(self._persist_path, "r", encoding="utf-8") as f:
                self._jobs = json.load(f)
        except Exception:
            logger.exception("Failed to load job storage from %s", self._persist_path)
            self._jobs = {}
