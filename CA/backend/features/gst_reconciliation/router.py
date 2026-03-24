"""GST Reconciliation API Router"""

import io
import uuid
import asyncio
from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks,Request,Depends
from fastapi.responses import StreamingResponse, JSONResponse
from app.supabase_client import supabase
from app.security.subscription_guard import enforce_active_firm_subscription

from fastapi import Request, Depends
from app.security.tool_guard import tool_access_guard
from fastapi import Depends
from app.security.cookie_auth import get_current_user_from_cookie
from app.security.trial_auth import verify_trial_token
from .service import process_uploaded_excel
from .jobs import (
    create_job,
    get_job,
    get_job_status,
    update_job_completed,
    update_job_failed
)
from features.trial.router import process_trial_phase
from app.security.jwt_utils import decode_access_token


router = APIRouter(prefix="/api/gst", tags=["GST Reconciliation"])


async def process_job_async(job_id: str, file_bytes: bytes, filename: str, trial_info: dict = None):
    """Background task function to process GST check"""
    try:
        # Run CPU-intensive work in thread pool
        loop = asyncio.get_event_loop()
        download_name, output_bytes = await loop.run_in_executor(
            None, process_uploaded_excel, file_bytes, filename, job_id
        )
        # Update job status
        update_job_completed(job_id, output_bytes, download_name)
        
        # Decrement trial run ONLY on successful completion
        if trial_info:
            try:
                process_trial_phase(trial_info, "post")
            except Exception as e:
                # Log but don't fail the job
                print(f"Warning: Failed to decrement trial run for job {job_id}: {e}")
                
    except Exception as e:
        # Update job status on error
        update_job_failed(job_id, str(e))


@router.post('/check')
async def gst_check(background_tasks: BackgroundTasks, request: Request, file: UploadFile = File(...)):
    """Start async GST processing job with trial/subscriber validation"""
    if not file.filename:
        raise HTTPException(status_code=400, detail='No file provided')
    
    # =========================================================
    # AUTHENTICATION: Trial or Subscriber
    # =========================================================
    trial_info = None
    auth = request.headers.get("Authorization")
    authenticated = False

    # Try trial auth first (Bearer token)
    if auth and auth.startswith("Bearer "):
        token = auth.split(" ")[1]
        try:
            payload = decode_access_token(token)
            if payload.get("role") == "trial":
                # Validate trial PRE-phase (check if runs remain)
                pre_check = process_trial_phase(payload, "pre")
                if not pre_check["ok"]:
                    raise HTTPException(
                        status_code=403,
                        detail="Your free trial has ended. Please purchase a plan."
                    )
                # Store trial info for POST-phase decrement after successful job
                trial_info = payload
                authenticated = True
        except HTTPException:
            raise
        except Exception as e:
            # Bearer token is invalid - will try cookie auth as fallback
            print(f"⚠️ Bearer token validation failed: {e}, trying cookie auth")

    # Try subscriber cookie auth (if not already authenticated)
    if not authenticated:
        try:
            user = get_current_user_from_cookie(request)
            # Subscriber validated - no further checks needed
            authenticated = True
        except HTTPException as e:
            print(f"🔍 /check caught HTTPException: status={e.status_code}, detail={e.detail}")

            # Handle plan expiration - auto logout (includes "Plan expired" and "No active subscription")
            if e.status_code == 403 and (
                "plan expired" in e.detail.lower() or
                "subscription expired" in e.detail.lower() or
                "no active subscription" in e.detail.lower()
            ):
                from app.security.hard_logout import hard_logout_by_device

                print(f"✅ Matched plan expiration/no subscription - auto logout")

                token = request.cookies.get("access_token")
                if token:
                    try:
                        payload = decode_access_token(token)
                        device_id = payload.get("device_id")
                        if device_id:
                            print(f"🔴 Plan expired/no subscription - logging out device: {device_id}")
                            hard_logout_by_device(device_id)
                        else:
                            print(f"⚠️ No device_id in token payload")
                    except Exception as logout_err:
                        print(f"❌ Hard logout failed: {logout_err}")
                else:
                    print(f"⚠️ No access_token cookie found")

                raise HTTPException(status_code=401, detail="Plan expired. Logged out.")
            # Re-raise other errors
            print(f"🔄 Re-raising error: {e.detail}")
            raise
        except Exception:
            raise HTTPException(
                status_code=401,
                detail="Authentication required. Please log in or start a free trial."
            )
    
    # =========================================================
    # PROCESS JOB
    # =========================================================
    # Generate unique job ID
    job_id = str(uuid.uuid4())
    
    # Read file bytes
    file_bytes = await file.read()
    
    # Create job entry
    create_job(job_id, file.filename)
    
    # Start background processing (pass trial_info for POST-phase decrement)
    background_tasks.add_task(process_job_async, job_id, file_bytes, file.filename, trial_info)
    
    # Return job ID immediately
    return JSONResponse(
        status_code=202,
        content={
            'job_id': job_id,
            'message': 'Processing started',
            'status': 'processing'
        }
    )


@router.get('/status/{job_id}')
async def gst_status(job_id: str):
    """Check job status and progress"""
    job_status = get_job_status(job_id)
    
    if not job_status:
        raise HTTPException(status_code=404, detail='Job not found')
    
    return job_status


@router.get('/download/{job_id}')
async def gst_download(job_id: str):
    """Download processed file"""
    job = get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')
    
    if job['status'] != 'completed':
        raise HTTPException(
            status_code=400,
            detail=f"Job not completed. Current status: {job['status']}"
        )
    
    output_bytes = job.get('output_bytes')
    download_name = job.get('download_name', 'output.xlsx')
    
    if not output_bytes:
        raise HTTPException(status_code=404, detail='Output file not found')
    
    return StreamingResponse(
        io.BytesIO(output_bytes),
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': f'attachment; filename={download_name}'}
        
    )


# @router.get("/secure-test")
# def secure_gst_test(user = Depends(get_current_user_from_cookie)):
#     """
#     GST Tool access rules:

#     ✔ Classic users can access the tool
#     ✔ Profile users (Prime/VIP employees) can access the tool
#     ✖ Admin-only session cannot access the tool
#     """

#     role = user.get("role")

#     # Subscription already validated in get_current_user_from_cookie

#     if role in ("classic", "profile"):
#         return {"ok": True, "message": "GST Tool Access Granted"}

#     raise HTTPException(status_code=403, detail="Profile or Classic login required")


@router.get("/secure-test")
def secure_gst_test(request: Request):

    # --------------------------------------------------
    # 1️⃣ Attempt subscriber validation
    # --------------------------------------------------
    try:
        user = get_current_user_from_cookie(request)
        role = user.get("role")

        if role in ("classic", "profile"):
            return {"ok": True, "mode": role, "message": "GST Tool Access Granted"}

        # admin should not access tools
        raise HTTPException(status_code=403, detail="Admins cannot access tools")

    except HTTPException as e:
        print(f"🔍 /secure-test caught HTTPException: status={e.status_code}, detail={e.detail}")
        
        # Handle plan expiration - auto logout (includes "Plan expired" and "No active subscription")
        if e.status_code == 403 and (
            "plan expired" in e.detail.lower() or 
            "subscription expired" in e.detail.lower() or
            "no active subscription" in e.detail.lower()
        ):
            from app.security.hard_logout import hard_logout_by_device
            from app.security.jwt_utils import decode_access_token
            
            print(f"✅ Matched plan expiration/no subscription condition - auto logout")
            
            token = request.cookies.get("access_token")
            if token:
                try:
                    payload = decode_access_token(token)
                    device_id = payload.get("device_id")
                    if device_id:
                        print(f"🔴 Plan expired/no subscription - logging out device: {device_id}")
                        hard_logout_by_device(device_id)
                    else:
                        print(f"⚠️ No device_id in token payload")
                except Exception as logout_err:
                    print(f"❌ Hard logout failed: {logout_err}")
            else:
                print(f"⚠️ No access_token cookie found")
            
            raise HTTPException(status_code=401, detail="Plan expired. Logged out.")
        # Re-raise other 403 errors (admin access)
        if e.status_code == 403:
            print(f"🔄 Re-raising 403 (not plan expiration): {e.detail}")
            raise
        # Other errors (401 etc) - try trial validation
        print(f"🔄 Continuing to trial validation")
        pass


    # --------------------------------------------------
    # 2️⃣ Attempt free trial validation
    # --------------------------------------------------
    trial = verify_trial_token(request)

    if trial:
        return {
            "ok": True,
            "mode": "trial",
            "message": "GST Tool Access Granted (Trial Mode)"
        }

    # --------------------------------------------------
    # 3️⃣ If no auth worked → block
    # --------------------------------------------------
    raise HTTPException(status_code=401, detail="Login required")



