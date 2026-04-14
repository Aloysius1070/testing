"""Job storage and status tracking for Companies Data feature."""

from datetime import datetime
from typing import Any, Dict


jobs: Dict[str, Dict[str, Any]] = {}


def create_job(job_id: str, filename: str):
    jobs[job_id] = {
        "job_id": job_id,
        "filename": filename,
        "status": "processing",
        "progress": 0,
        "message": "Starting processing...",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }


def update_job_progress(job_id: str, progress: int, message: str = ""):
    if job_id in jobs:
        jobs[job_id]["progress"] = progress
        jobs[job_id]["message"] = message
        jobs[job_id]["updated_at"] = datetime.utcnow().isoformat()


def update_job_completed(job_id: str, output_bytes: bytes, download_name: str):
    if job_id in jobs:
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["message"] = "Processing complete!"
        jobs[job_id]["output_bytes"] = output_bytes
        jobs[job_id]["download_name"] = download_name
        jobs[job_id]["updated_at"] = datetime.utcnow().isoformat()


def update_job_failed(job_id: str, error: str):
    if job_id in jobs:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = error
        jobs[job_id]["updated_at"] = datetime.utcnow().isoformat()


def get_job(job_id: str):
    return jobs.get(job_id)


def get_job_status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        return None

    return {
        "job_id": job["job_id"],
        "status": job["status"],
        "progress": job["progress"],
        "message": job.get("message", ""),
        "error": job.get("error"),
        "created_at": job["created_at"],
        "updated_at": job["updated_at"],
    }
