"""TDS Calculation API Router"""

import io
import os
from fastapi import APIRouter, File, UploadFile, HTTPException, Request
from fastapi.responses import StreamingResponse
from app.security.cookie_auth import get_current_user_from_cookie
from app.security.trial_auth import verify_trial_token
from .service import process_tds_file

router = APIRouter(prefix="/api/tds", tags=["TDS Calculation"])

# Path to ledger reference file
LEDGER_FILE_PATH = os.path.join(os.path.dirname(__file__), 'sheet.csv')


@router.post('/calculate')
async def calculate_tds(request: Request, file: UploadFile = File(...)):
    """
    Calculate and match TDS entries from uploaded CSV
    Processes synchronously and returns Excel file directly
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail='No file provided')
    
    # AUTHENTICATION
    try:
        user = get_current_user_from_cookie(request)
        role = user.get("role")
        
        if role not in ("classic", "profile"):
            raise HTTPException(status_code=403, detail="Unauthorized")
    except HTTPException as e:
        if e.status_code == 403:
            raise
        # Try trial auth
        trial = verify_trial_token(request)
        if not trial:
            raise HTTPException(status_code=401, detail="Login required")
    
    # VALIDATE FILE
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail='File must be CSV format')
    
    try:
        # Read uploaded file
        file_bytes = await file.read()
        
        # Process TDS synchronously
        output_bytes, download_name = process_tds_file(
            file_bytes,
            LEDGER_FILE_PATH
        )
        
        # Return file directly
        return StreamingResponse(
            iter([output_bytes]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={download_name}"}
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error in TDS processing: {str(e)}")
        raise HTTPException(status_code=500, detail=f'Processing failed: {str(e)}')




@router.get("/secure-test")
def secure_tds_test(request: Request):
    """
    Verify user access to TDS tool
    Checks: 1) Cookie auth (classic/profile users), 2) Trial token
    """
    # --------------------------------------------------
    # 1️⃣ Attempt subscriber validation
    # --------------------------------------------------
    try:
        user = get_current_user_from_cookie(request)
        role = user.get("role")

        if role in ("classic", "profile"):
            return {"ok": True, "mode": role, "message": "TDS Tool Access Granted"}

        # admin should not access tools
        raise HTTPException(status_code=403, detail="Admins cannot access tools")

    except HTTPException as e:
        print(f"🔍 /secure-test caught HTTPException: status={e.status_code}, detail={e.detail}")
        
        # Handle plan expiration - auto logout
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
            "message": "TDS Tool Access Granted (Trial Mode)"
        }

    # --------------------------------------------------
    # 3️⃣ No valid auth found
    # --------------------------------------------------
    raise HTTPException(status_code=401, detail="Login required")


@router.get('/health')
async def tds_health():
    """Health check for TDS calculation service"""
    return {'status': 'ok', 'service': 'tds_calculation'}

