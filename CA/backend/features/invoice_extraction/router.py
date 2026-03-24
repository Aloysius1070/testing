"""Invoice Extraction API Router"""

import io
import uuid
import asyncio
import fitz
from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks, Request, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from app.security.cookie_auth import get_current_user_from_cookie
from app.security.trial_auth import verify_trial_token
from app.security.jwt_utils import decode_access_token
from features.trial.router import process_trial_phase

from .service import parse_invoice_pages
from .jobs import (
    create_job,
    get_job,
    get_job_status,
    update_job_completed,
    update_job_failed,
    orchestrate_pdf_jobs
)
from .excel_utils import export_excel


router = APIRouter(prefix="/api/invoice", tags=["Invoice Extraction"])


async def process_job_async(job_id: str, file_bytes: bytes, filename: str, trial_info: dict = None):
    """Background task function to process invoice extraction"""
    try:
        # Get total pages
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        total_pages = doc.page_count
        doc.close()
        
        # Run CPU-intensive work with parallel processing
        extracted_rows = await orchestrate_pdf_jobs(
            total_pages=total_pages,
            pdf_bytes=file_bytes,
            parser_fn=parse_invoice_pages,
            max_workers=6,
            outer_batch=200,
            inner_job=50
        )
        
        # Export to Excel
        output_bytes = export_excel(extracted_rows)
        download_name = f"{filename.rsplit('.', 1)[0]}_invoices.xlsx"
        
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


@router.post('/extract')
async def extract_invoice(background_tasks: BackgroundTasks, request: Request, file: UploadFile = File(...)):
    """Start async invoice extraction job with trial/subscriber validation"""
    if not file.filename:
        raise HTTPException(status_code=400, detail='No file provided')
    
    # Validate file type (PDF only)
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail='Only PDF files are supported')
    
    # =========================================================
    # AUTHENTICATION: Trial or Subscriber
    # =========================================================
    trial_info = None
    auth = request.headers.get("Authorization")
    
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
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
    else:
        # Try subscriber cookie auth
        try:
            user = get_current_user_from_cookie(request)
            # Subscriber validated - no further checks needed
        except HTTPException as e:
            print(f"🔍 /extract caught HTTPException: status={e.status_code}, detail={e.detail}")
            
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
async def invoice_status(job_id: str):
    """Check job status and progress"""
    job_status = get_job_status(job_id)
    
    if not job_status:
        raise HTTPException(status_code=404, detail='Job not found')
    
    return job_status


@router.get('/download/{job_id}')
async def invoice_download(job_id: str):
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
    download_name = job.get('download_name', 'invoices_output.xlsx')
    
    if not output_bytes:
        raise HTTPException(status_code=404, detail='Output file not found')
    
    return StreamingResponse(
        io.BytesIO(output_bytes),
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': f'attachment; filename={download_name}'}
    )


@router.get('/health')
async def invoice_health():
    """Health check for invoice extraction service"""
    return {'status': 'ok', 'service': 'invoice_extraction'}


@router.get("/secure-test")
def secure_invoice_test(request: Request):
    """
    Invoice Tool access validation endpoint
    Tests both subscriber (cookie) and trial (Bearer token) authentication
    """
    # --------------------------------------------------
    # 1️⃣ Attempt subscriber validation
    # --------------------------------------------------
    try:
        user = get_current_user_from_cookie(request)
        role = user.get("role")

        if role in ("classic", "profile"):
            return {"ok": True, "mode": role, "message": "Invoice Tool Access Granted"}

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
            "message": "Invoice Tool Access Granted (Trial Mode)"
        }

    # --------------------------------------------------
    # 3️⃣ If no auth worked → block
    # --------------------------------------------------
    raise HTTPException(status_code=401, detail="Login required")
