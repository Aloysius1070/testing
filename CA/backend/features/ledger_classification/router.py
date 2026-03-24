"""Ledger Classification API Router"""

from fastapi import APIRouter, File, UploadFile, HTTPException, Request
from app.security.cookie_auth import get_current_user_from_cookie
from app.security.trial_auth import verify_trial_token

router = APIRouter(prefix="/api/ledger", tags=["Ledger Classification"])


@router.post('/classify')
async def classify_ledger(file: UploadFile = File(...)):
    """Classify ledger entries"""
    if not file.filename:
        raise HTTPException(status_code=400, detail='No file provided')
    
    # TODO: Implement ledger classification logic
    return {
        'message': 'Ledger classification endpoint - Coming soon!',
        'filename': file.filename
    }


@router.get('/health')
async def ledger_health():
    """Health check for ledger classification service"""
    return {'status': 'ok', 'service': 'ledger_classification'}


@router.get("/secure-test")
def secure_ledger_test(request: Request):
    # 1️⃣ Attempt subscriber validation
    try:
        user = get_current_user_from_cookie(request)
        role = user.get("role")

        if role in ("classic", "profile"):
            return {"ok": True, "mode": role, "message": "Ledger Tool Access Granted"}

        # admin should not access tools
        raise HTTPException(status_code=403, detail="Admins cannot access tools")

    except HTTPException as e:
        # Handle plan expiration - auto logout (includes "Plan expired" and "No active subscription")
        if e.status_code == 403 and (
            "plan expired" in e.detail.lower() or 
            "subscription expired" in e.detail.lower() or
            "no active subscription" in e.detail.lower()
        ):
            from app.security.hard_logout import hard_logout_by_device
            from app.security.jwt_utils import decode_access_token
            
            token = request.cookies.get("access_token")
            if token:
                try:
                    payload = decode_access_token(token)
                    device_id = payload.get("device_id")
                    if device_id:
                        print(f"🔴 Plan expired - logging out device: {device_id}")
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
            raise
        # Other errors (401 etc) - try trial validation
        pass

    # 2️⃣ Attempt free trial validation
    trial = verify_trial_token(request)

    if trial:
        return {
            "ok": True,
            "mode": "trial",
            "message": "Ledger Tool Access Granted (Trial Mode)"
        }

    # 3️⃣ If no auth worked → block
    raise HTTPException(status_code=401, detail="Login required")
