"""Flask Application for AI Video Caption Generation."""

import logging
import os
import shutil
import threading
import uuid

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

from caption_job import process_caption_job, rerender_caption_job
from caption_styles import is_valid_caption_style
from job_storage import JobStorage

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {"mp4", "mov", "webm"}


def create_app(testing: bool = False) -> Flask:
    """Create and configure the Flask application."""
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    bundled_ffmpeg_dir = os.path.join(project_root, "tools", "ffmpeg", "bin")
    if os.path.isdir(bundled_ffmpeg_dir) and bundled_ffmpeg_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = bundled_ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")

    max_content_length = int(os.environ.get("MAX_CONTENT_LENGTH", 500 * 1024 * 1024))
    data_dir = os.environ.get("DATA_DIR", os.path.join(os.path.dirname(__file__), "data"))
    max_concurrent_jobs = int(os.environ.get("MAX_CONCURRENT_JOBS", 10))

    app = Flask(__name__)
    app.config["TESTING"] = testing
    app.config["MAX_CONTENT_LENGTH"] = max_content_length
    app.config["DATA_DIR"] = data_dir
    app.config["MAX_CONCURRENT_JOBS"] = max_concurrent_jobs
    app.config["MAX_CONCURRENT"] = max_concurrent_jobs

    CORS(app, origins="*")

    os.makedirs(os.path.join(data_dir, "uploads"), exist_ok=True)
    os.makedirs(os.path.join(data_dir, "output"), exist_ok=True)
    os.makedirs(os.path.join(data_dir, "temp"), exist_ok=True)

    persist_path = None if testing else os.path.join(data_dir, "jobs.json")
    storage = JobStorage(persist_path=persist_path)
    app.config["STORAGE"] = storage
    app.storage = storage  # type: ignore[attr-defined]

    def allowed_file(filename: str) -> bool:
        return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "ok",
            "version": "0.1.0",
            "service": "ai-video-captions-backend",
            "active_jobs": storage.active_job_count(),
        })

    @app.route("/api/process", methods=["POST"])
    def submit_job():
        limit = app.config.get("MAX_CONCURRENT") or app.config.get("MAX_CONCURRENT_JOBS", 3)
        if storage.active_job_count() >= limit:
            return jsonify({
                "error": f"Server busy: maximum concurrent jobs ({limit}) reached. Please try again shortly."
            }), 429

        if "file" not in request.files:
            return jsonify({"error": "No file field in request"}), 400

        file = request.files["file"]
        if not file or not file.filename:
            return jsonify({"error": "No file selected"}), 400

        if not allowed_file(file.filename):
            return jsonify({
                "error": f"Unsupported file type. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            }), 400

        caption_style = request.form.get("captionStyle", "hormozi")
        if not is_valid_caption_style(caption_style):
            return jsonify({"error": f"Invalid caption style: {caption_style}"}), 400

        try:
            caption_position = int(request.form.get("captionPosition", 10))
            if not (5 <= caption_position <= 90):
                return jsonify({"error": "captionPosition must be between 5 and 90"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "captionPosition must be an integer between 5 and 90"}), 400

        language_hint = request.form.get("language")
        model_size = request.form.get("modelSize", "base")
        
        words_per_segment_raw = request.form.get("wordsPerSegment")
        words_per_segment = int(words_per_segment_raw) if words_per_segment_raw and words_per_segment_raw.isdigit() else None
        
        max_lines_raw = request.form.get("maxLines", "2")
        max_lines = int(max_lines_raw) if max_lines_raw in ("1", "2") else 2

        font_family = request.form.get("fontFamily")
        
        try:
            font_size_scale = float(request.form.get("fontSizeScale", "1.0"))
        except (ValueError, TypeError):
            font_size_scale = 1.0

        text_transform = request.form.get("textTransform", "uppercase")
        primary_color = request.form.get("primaryColor")
        highlight_color = request.form.get("highlightColor")

        outline_enabled_raw = request.form.get("outlineEnabled", "false").lower()
        outline_enabled = outline_enabled_raw in ("true", "1", "yes", "on")
        outline_color = request.form.get("outlineColor")
        outline_size_raw = request.form.get("outlineSize")
        try:
            outline_size = float(outline_size_raw) if outline_size_raw not in (None, "", "default") else None
        except (ValueError, TypeError):
            outline_size = None
        animation_type = request.form.get("animationType")

        safe_original_name = secure_filename(file.filename) or "video.mp4"
        upload_id = str(uuid.uuid4())
        ext = safe_original_name.rsplit(".", 1)[-1].lower() if "." in safe_original_name else "mp4"
        saved_filename = f"{upload_id}.{ext}"
        video_path = os.path.join(data_dir, "uploads", saved_filename)

        try:
            file.save(video_path)
            file_size = os.path.getsize(video_path)
        except Exception as exc:
            logger.exception("Failed to save uploaded file: %s", exc)
            return jsonify({"error": "Failed to save uploaded file"}), 500

        job_id = storage.create_job(
            video_path=video_path,
            caption_style=caption_style,
            caption_position=caption_position,
            original_filename=safe_original_name,
            file_size=file_size,
            language_hint=language_hint,
            model_size=model_size,
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

        if not app.config.get("TESTING"):
            thread = threading.Thread(
                target=process_caption_job,
                kwargs={
                    "storage": storage,
                    "job_id": job_id,
                    "video_path": video_path,
                    "caption_style": caption_style,
                    "caption_position": caption_position,
                    "data_dir": data_dir,
                    "language_hint": language_hint,
                    "model_size": model_size,
                    "words_per_segment": words_per_segment,
                    "max_lines": max_lines,
                    "font_family": font_family,
                    "font_size_scale": font_size_scale,
                    "text_transform": text_transform,
                    "primary_color": primary_color,
                    "highlight_color": highlight_color,
                    "outline_enabled": outline_enabled,
                    "outline_color": outline_color,
                    "outline_size": outline_size,
                    "animation_type": animation_type,
                },
                daemon=True,
            )
            thread.start()

        return jsonify({"jobId": job_id, "status": "pending"}), 200

    @app.route("/api/status/<job_id>", methods=["GET"])
    def get_status(job_id: str):
        job = storage.get_job(job_id)
        if not job:
            return jsonify({"error": f"Job not found: {job_id}"}), 404

        return jsonify({
            "jobId": job["id"],
            "status": job["status"],
            "progress": job["progress"],
            "currentPhase": job.get("current_phase"),
            "language": job.get("language"),
            "durationSeconds": job.get("duration_seconds"),
            "errorMessage": job.get("error_message"),
            "processingTimeMs": job.get("processing_time_ms"),
        })

    @app.route("/api/download/<job_id>", methods=["GET"])
    def download_output(job_id: str):
        job = storage.get_job(job_id)
        if not job:
            return jsonify({"error": f"Job not found: {job_id}"}), 404

        if job["status"] != "completed":
            return jsonify({
                "error": f"Job is not completed (current status: {job['status']})"
            }), 409

        fmt = request.args.get("format", "mp4").lower()
        job_output_dir = os.path.join(data_dir, "output", job_id)

        if fmt == "srt":
            srt_path = os.path.join(job_output_dir, "subtitles.srt")
            if not os.path.exists(srt_path):
                return jsonify({"error": "SRT subtitle file not found"}), 404
            base_name = os.path.splitext(job["original_filename"])[0]
            return send_file(
                srt_path,
                mimetype="text/plain",
                as_attachment=True,
                download_name=f"{base_name}.srt",
            )

        if fmt == "ass":
            ass_path = os.path.join(job_output_dir, "subtitles.ass")
            if not os.path.exists(ass_path):
                return jsonify({"error": "ASS subtitle file not found"}), 404
            base_name = os.path.splitext(job["original_filename"])[0]
            return send_file(
                ass_path,
                mimetype="text/plain",
                as_attachment=True,
                download_name=f"{base_name}.ass",
            )

        output_path = job.get("output_path") or os.path.join(job_output_dir, "captioned.mp4")
        if not os.path.exists(output_path):
            return jsonify({"error": "Output video file not found on disk"}), 404

        download_name = f"captioned_{job['original_filename']}"
        return send_file(
            output_path,
            mimetype="video/mp4",
            as_attachment=True,
            download_name=download_name,
        )

    @app.route("/api/jobs/<job_id>", methods=["DELETE"])
    def delete_job(job_id: str):
        job = storage.get_job(job_id)
        if not job:
            return jsonify({"error": f"Job not found: {job_id}"}), 404

        output_dir = os.path.join(data_dir, "output", job_id)
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir, ignore_errors=True)

        if job.get("video_path") and os.path.exists(job["video_path"]):
            try:
                os.remove(job["video_path"])
            except OSError:
                pass

        storage.delete_job(job_id)
        return jsonify({"message": f"Job {job_id} deleted successfully", "deleted": True})


    @app.route("/api/cleanup", methods=["POST"])
    def cleanup_cache():
        """Clean temporary files and cached processing artifacts."""
        freed_bytes = 0
        temp_dir = os.path.join(data_dir, "temp")
        uploads_dir = os.path.join(data_dir, "uploads")

        for target_folder in [temp_dir, uploads_dir]:
            if os.path.exists(target_folder):
                for root, dirs, files in os.walk(target_folder, topdown=False):
                    for name in files:
                        file_path = os.path.join(root, name)
                        try:
                            freed_bytes += os.path.getsize(file_path)
                            os.remove(file_path)
                        except Exception:
                            pass
                    for name in dirs:
                        dir_path = os.path.join(root, name)
                        try:
                            os.rmdir(dir_path)
                        except Exception:
                            pass

        # Clear any stale jobs in storage
        try:
            with storage._lock:
                for j in storage._jobs.values():
                    if j.get("status") in ("pending", "processing"):
                        j["status"] = "failed"
                        j["error_message"] = "Job cancelled during cache cleanup"
                storage._persist()
        except Exception:
            pass

        freed_mb = round(freed_bytes / (1024 * 1024), 2)
        return jsonify({
            "status": "ok",
            "freedMB": freed_mb,
            "message": f"Successfully freed {freed_mb} MB of temporary files and cache."
        }), 200


    @app.route("/api/transcript/<job_id>", methods=["GET"])
    def get_job_transcript(job_id: str):
        """Retrieve the word-level transcript for a job."""
        job = storage.get_job(job_id)
        if not job:
            return jsonify({"error": f"Job not found: {job_id}"}), 404
        return jsonify({
            "jobId": job_id,
            "language": job.get("language"),
            "transcript": job.get("transcript"),
        }), 200

    @app.route("/api/rerender/<job_id>", methods=["POST"])
    def rerender_job(job_id: str):
        """Re-render video and subtitles with an edited transcript."""
        job = storage.get_job(job_id)
        if not job:
            return jsonify({"error": f"Job not found: {job_id}"}), 404

        data = request.get_json() or {}
        updated_transcript = data.get("transcript")
        if not updated_transcript:
            return jsonify({"error": "No transcript provided"}), 400

        try:
            success = rerender_caption_job(
                storage=storage,
                job_id=job_id,
                updated_transcript=updated_transcript,
                data_dir=data_dir,
            )
            if success:
                return jsonify({
                    "status": "completed",
                    "jobId": job_id,
                    "message": "Captions updated and re-rendered successfully"
                }), 200
            else:
                return jsonify({"error": "Failed to re-render video subtitles"}), 500
        except Exception as exc:
            logger.exception("Error during caption re-rendering: %s", exc)
            return jsonify({"error": str(exc)}), 500

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() in ("true", "1")
    app.run(host="0.0.0.0", port=port, debug=debug)
