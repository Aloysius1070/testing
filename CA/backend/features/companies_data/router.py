"""Companies Data API router."""

import asyncio
import io
import uuid

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse

from app.security.cookie_auth import get_current_user_from_cookie
from app.security.jwt_utils import decode_access_token
from app.security.trial_auth import verify_trial_token
from features.trial.router import process_trial_phase

from .jobs import (
    create_job,
    get_job,
    get_job_status,
    update_job_completed,
    update_job_failed,
)
from .service import process_company_daybooks


router = APIRouter(prefix="/api/companies-data", tags=["Companies Data"])


async def process_job_async(
    job_id: str,
    company_name: str,
    purchase_file_bytes: bytes,
    sales_file_bytes: bytes,
    trial_info: dict | None = None,
):
    try:
        print(f"[companies-data] job started: {job_id} ({company_name})")
        loop = asyncio.get_event_loop()
        # Prevent indefinite processing if Excel parsing/conversion hangs on malformed/huge files.
        download_name, output_bytes = await asyncio.wait_for(
            loop.run_in_executor(
                None,
                process_company_daybooks,
                company_name,
                purchase_file_bytes,
                sales_file_bytes,
                job_id,
            ),
            timeout=8 * 60,
        )
        update_job_completed(job_id, output_bytes, download_name)
        print(f"[companies-data] job completed: {job_id}")

        if trial_info:
            try:
                process_trial_phase(trial_info, "post")
            except Exception as err:
                print(f"Warning: Failed to decrement trial run for companies-data job {job_id}: {err}")

    except asyncio.TimeoutError:
        update_job_failed(
            job_id,
            "Processing timed out. Please retry with smaller/cleaner DayBook files.",
        )
        print(f"[companies-data] job timed out: {job_id}")

    except Exception as err:
        update_job_failed(job_id, str(err))
        print(f"[companies-data] job failed: {job_id} -> {err}")


@router.post("/process")
async def process_companies_data(
    background_tasks: BackgroundTasks,
    request: Request,
    company_name: str = Form(...),
    purchase_file: UploadFile = File(...),
    sales_file: UploadFile = File(...),
):
    if not company_name.strip():
        raise HTTPException(status_code=400, detail="Company name is required")

    for file_obj, label in [(purchase_file, "purchase"), (sales_file, "sales")]:
        if not file_obj.filename:
            raise HTTPException(status_code=400, detail=f"{label} file is required")
        if not file_obj.filename.lower().endswith((".xlsx", ".xls")):
            raise HTTPException(status_code=400, detail=f"{label} file must be an Excel file")

    trial_info = None
    auth = request.headers.get("Authorization")

    if auth and auth.startswith("Bearer "):
        token = auth.split(" ")[1]
        try:
            payload = decode_access_token(token)
            if payload.get("role") == "trial":
                pre_check = process_trial_phase(payload, "pre")
                if not pre_check["ok"]:
                    raise HTTPException(
                        status_code=403,
                        detail="Your free trial has ended. Please purchase a plan.",
                    )
                trial_info = payload
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
    else:
        try:
            get_current_user_from_cookie(request)
        except HTTPException as exc:
            if exc.status_code == 403 and (
                "plan expired" in exc.detail.lower()
                or "subscription expired" in exc.detail.lower()
                or "no active subscription" in exc.detail.lower()
            ):
                from app.security.hard_logout import hard_logout_by_device

                token = request.cookies.get("access_token")
                if token:
                    try:
                        payload = decode_access_token(token)
                        device_id = payload.get("device_id")
                        if device_id:
                            hard_logout_by_device(device_id)
                    except Exception as logout_err:
                        print(f"Hard logout failed: {logout_err}")

                raise HTTPException(status_code=401, detail="Plan expired. Logged out.")
            raise

    job_id = str(uuid.uuid4())
    purchase_bytes = await purchase_file.read()
    sales_bytes = await sales_file.read()

    create_job(job_id, f"{company_name}_companies_data")
    background_tasks.add_task(
        process_job_async,
        job_id,
        company_name,
        purchase_bytes,
        sales_bytes,
        trial_info,
    )

    return JSONResponse(
        status_code=202,
        content={
            "job_id": job_id,
            "message": "Processing started",
            "status": "processing",
        },
    )


@router.get("/status/{job_id}")
async def companies_data_status(job_id: str):
    status = get_job_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    return JSONResponse(
        status_code=200,
        content=status,
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
    )


@router.get("/download/{job_id}")
async def companies_data_download(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"Job not completed. Current status: {job['status']}")

    output_bytes = job.get("output_bytes")
    download_name = job.get("download_name", "companies_data_output.xlsx")
    if not output_bytes:
        raise HTTPException(status_code=404, detail="Output file not found")

    return StreamingResponse(
        io.BytesIO(output_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={download_name}"},
    )


@router.get("/secure-test")
def secure_companies_data_test(request: Request):
    try:
        user = get_current_user_from_cookie(request)
        role = user.get("role")

        if role in ("classic", "profile"):
            return {"ok": True, "mode": role, "message": "Companies Data Tool Access Granted"}

        raise HTTPException(status_code=403, detail="Admins cannot access tools")

    except HTTPException as exc:
        if exc.status_code == 403 and (
            "plan expired" in exc.detail.lower()
            or "subscription expired" in exc.detail.lower()
            or "no active subscription" in exc.detail.lower()
        ):
            from app.security.hard_logout import hard_logout_by_device

            token = request.cookies.get("access_token")
            if token:
                try:
                    payload = decode_access_token(token)
                    device_id = payload.get("device_id")
                    if device_id:
                        hard_logout_by_device(device_id)
                except Exception as logout_err:
                    print(f"Hard logout failed: {logout_err}")

            raise HTTPException(status_code=401, detail="Plan expired. Logged out.")

        if exc.status_code == 403:
            raise

    trial = verify_trial_token(request)
    if trial:
        return {
            "ok": True,
            "mode": "trial",
            "message": "Companies Data Tool Access Granted (Trial Mode)",
        }

    raise HTTPException(status_code=401, detail="Login required")


@router.get("/health")
async def companies_data_health():
    return {"status": "ok", "service": "companies_data"}
