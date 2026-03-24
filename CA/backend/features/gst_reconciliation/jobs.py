"""Job storage and management for async GST processing"""

from datetime import datetime
from typing import Dict, Any


# In-memory job storage (use Redis/database in production)
jobs: Dict[str, Dict[str, Any]] = {}


def create_job(job_id: str, filename: str):
    """Create a new job entry"""
    jobs[job_id] = {
        'job_id': job_id,
        'filename': filename,
        'status': 'processing',
        'progress': 0,
        'message': 'Starting processing...',
        'created_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat()
    }


def update_job_progress(job_id: str, progress: int, status: str = 'processing', message: str = ''):
    """Update job progress in memory (synchronous for use in ThreadPoolExecutor)"""
    if job_id in jobs:
        jobs[job_id]['progress'] = progress
        jobs[job_id]['status'] = status
        jobs[job_id]['message'] = message
        jobs[job_id]['updated_at'] = datetime.utcnow().isoformat()


def update_job_completed(job_id: str, output_bytes: bytes, download_name: str):
    """Mark job as completed with output data"""
    if job_id in jobs:
        jobs[job_id]['status'] = 'completed'
        jobs[job_id]['progress'] = 100
        jobs[job_id]['message'] = 'Processing complete!'
        jobs[job_id]['output_bytes'] = output_bytes
        jobs[job_id]['download_name'] = download_name
        jobs[job_id]['updated_at'] = datetime.utcnow().isoformat()


def update_job_failed(job_id: str, error: str):
    """Mark job as failed with error message"""
    if job_id in jobs:
        jobs[job_id]['status'] = 'failed'
        jobs[job_id]['error'] = error
        jobs[job_id]['updated_at'] = datetime.utcnow().isoformat()


def get_job(job_id: str):
    """Get job by ID"""
    return jobs.get(job_id)


def get_job_status(job_id: str):
    """Get minimal job status info (without file data)"""
    job = jobs.get(job_id)
    if not job:
        return None
    
    return {
        'job_id': job['job_id'],
        'status': job['status'],
        'progress': job['progress'],
        'message': job.get('message', ''),
        'error': job.get('error'),
        'created_at': job['created_at'],
        'updated_at': job['updated_at']
    }
