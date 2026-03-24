"""Job storage and management for async invoice extraction processing"""

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
        'message': 'Starting invoice extraction...',
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
        jobs[job_id]['message'] = 'Invoice extraction complete!'
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


# Orchestration functions for parallel PDF processing
import asyncio
from concurrent.futures import ProcessPoolExecutor
from typing import List, Tuple, Callable


def chunk_ranges(total: int, size: int) -> List[Tuple[int, int]]:
    """Split a range into chunks"""
    out = []
    i = 0
    while i < total:
        out.append((i, min(i + size, total)))
        i += size
    return out


async def orchestrate_pdf_jobs(
    total_pages: int,
    pdf_bytes: bytes,
    parser_fn: Callable[[int, int, bytes], List[dict]],
    *,
    max_workers: int = 6,
    outer_batch: int = 200,
    inner_job: int = 50
) -> List[dict]:
    """
    Orchestrate parallel PDF processing with progress tracking
    
    Args:
        total_pages: Total number of PDF pages
        pdf_bytes: PDF file as bytes
        parser_fn: Function to parse a range of pages
        max_workers: Max parallel workers
        outer_batch: Outer batch size
        inner_job: Inner job size
        
    Returns:
        List of extracted invoice dictionaries
    """
    all_rows = []
    outer_ranges = chunk_ranges(total_pages, outer_batch)

    for outer_start, outer_end in outer_ranges:
        inner_ranges = chunk_ranges(outer_end - outer_start, inner_job)

        tasks = []
        loop = asyncio.get_running_loop()

        # Create ONE executor per outer batch
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            for rel_start, rel_end in inner_ranges:
                start = outer_start + rel_start
                end = outer_start + rel_end
                tasks.append(loop.run_in_executor(executor, parser_fn, start, end, pdf_bytes))

            results = await asyncio.gather(*tasks)
            for part in results:
                all_rows.extend(part)

    return all_rows
