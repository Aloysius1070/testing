"""TDS job tracking and async processing"""

import uuid
from datetime import datetime
from typing import Optional
from ..auth.models import get_supabase


async def create_job(user_id: str, filename: str) -> str:
    """
    Create a new TDS job record in the database
    
    Args:
        user_id: User ID
        filename: Uploaded filename
    
    Returns:
        Job ID (UUID)
    """
    try:
        supabase = get_supabase()
        job_id = str(uuid.uuid4())
        
        data = {
            'job_id': job_id,
            'user_id': user_id,
            'filename': filename,
            'status': 'pending',
            'progress': 0,
            'progress_message': 'Initializing...',
            'download_name': None,
            'error_message': None,
            'created_at': datetime.utcnow().isoformat(),
            'completed_at': None
        }
        
        response = supabase.table('tds_jobs').insert(data).execute()
        return job_id
        
    except Exception as e:
        print(f"Error creating TDS job: {str(e)}")
        raise


async def get_job(job_id: str) -> dict:
    """
    Get a specific job by ID
    
    Args:
        job_id: Job ID
    
    Returns:
        Job record as dict
    """
    try:
        supabase = get_supabase()
        response = supabase.table('tds_jobs').select('*').eq('job_id', job_id).execute()
        
        if response.data:
            return response.data[0]
        else:
            return None
            
    except Exception as e:
        print(f"Error getting TDS job: {str(e)}")
        return None


async def get_job_status(job_id: str) -> dict:
    """
    Get job status for progress tracking
    
    Args:
        job_id: Job ID
    
    Returns:
        Status dict with progress, message, status, error
    """
    job = await get_job(job_id)
    
    if not job:
        return {
            'found': False,
            'status': 'not_found'
        }
    
    return {
        'found': True,
        'status': job.get('status'),
        'progress': job.get('progress', 0),
        'message': job.get('progress_message'),
        'error': job.get('error_message')
    }


async def update_job_progress(job_id: str, progress: int, message: str = None):
    """
    Update job progress
    
    Args:
        job_id: Job ID
        progress: Progress percentage (0-100)
        message: Progress message
    """
    try:
        supabase = get_supabase()
        
        update_data = {
            'progress': min(progress, 100),
            'progress_message': message or 'Processing...'
        }
        
        supabase.table('tds_jobs').update(update_data).eq('job_id', job_id).execute()
        
    except Exception as e:
        print(f"Error updating TDS job progress: {str(e)}")


async def update_job_completed(job_id: str, download_name: str):
    """
    Mark job as completed
    
    Args:
        job_id: Job ID
        download_name: Generated filename for download
    """
    try:
        supabase = get_supabase()
        
        update_data = {
            'status': 'completed',
            'progress': 100,
            'progress_message': 'Completed!',
            'download_name': download_name,
            'completed_at': datetime.utcnow().isoformat()
        }
        
        supabase.table('tds_jobs').update(update_data).eq('job_id', job_id).execute()
        
    except Exception as e:
        print(f"Error completing TDS job: {str(e)}")


async def update_job_failed(job_id: str, error_message: str):
    """
    Mark job as failed
    
    Args:
        job_id: Job ID
        error_message: Error details
    """
    try:
        supabase = get_supabase()
        
        update_data = {
            'status': 'failed',
            'progress_message': 'Failed',
            'error_message': error_message,
            'completed_at': datetime.utcnow().isoformat()
        }
        
        supabase.table('tds_jobs').update(update_data).eq('job_id', job_id).execute()
        
    except Exception as e:
        print(f"Error updating TDS job status: {str(e)}")


async def cleanup_old_jobs(days: int = 7):
    """
    Clean up old jobs from database (keeps last N days)
    
    Args:
        days: Number of days to keep
    """
    try:
        from datetime import timedelta
        
        supabase = get_supabase()
        cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        supabase.table('tds_jobs').delete().lt('created_at', cutoff_date).execute()
        
    except Exception as e:
        print(f"Error cleaning up TDS jobs: {str(e)}")
