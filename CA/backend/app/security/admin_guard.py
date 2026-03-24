from fastapi import Request, HTTPException
from app.supabase_client import supabase
from app.security.jwt_utils import decode_access_token


def get_current_admin(request: Request):
    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(401, "Admin not logged in")

    try:
        payload = decode_access_token(token)
    except:
        raise HTTPException(401, "Invalid or expired admin session")

    if payload.get("role") != "admin":
        raise HTTPException(403, "Not an admin session")

    account_id = payload.get("account_id")
    firm_id    = payload.get("firm_id")
    device_id  = payload.get("device_id")
    plan_id    = payload.get("plan_id")

    if not all([account_id, firm_id, device_id, plan_id]):
        raise HTTPException(401, "Incomplete admin session token. Please re-login.")

    # ✅ Fetch all active sessions on THIS device for THIS admin
    sessions = supabase.table("active_sessions") \
        .select("*") \
        .eq("account_id", account_id) \
        .eq("firm_id", firm_id) \
        .eq("device_id", device_id) \
        .eq("is_active", True) \
        .execute() \
        .data

    if not sessions:
        # Check if session exists but is deactivated (force logout)
        deactivated = supabase.table("active_sessions") \
            .select("id, is_active") \
            .eq("account_id", account_id) \
            .eq("firm_id", firm_id) \
            .eq("device_id", device_id) \
            .eq("is_active", False) \
            .execute() \
            .data
        
        if deactivated:
            raise HTTPException(
                status_code=401, 
                detail="SESSION_DEACTIVATED: You have been logged out from another device"
            )
        
        raise HTTPException(401, "Admin session expired. Please login again.")

    # ✅ Find the ADMIN session (profile_id must be NULL)
    admin_session = None
    for s in sessions:
        if s.get("profile_id") is None:
            admin_session = s
            break

    if not admin_session:
        raise HTTPException(401, "No valid admin session found. Please login again.")

    return {
        "account_id": account_id,
        "firm_id": firm_id,
        "plan_id": plan_id,
        "device_id": device_id
    }
