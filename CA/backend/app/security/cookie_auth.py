from fastapi import Request, HTTPException
from app.security.jwt_utils import decode_access_token
from app.supabase_client import supabase
from app.security.subscription_guard import (
    enforce_active_subscription,
    enforce_active_firm_subscription
)


def get_current_user_from_cookie(request: Request):
    token = request.cookies.get("access_token")
    
    if not token:
        auth = request.headers.get("Authorization")
        if auth and auth.startswith("Bearer "):
            token = auth.split(" ")[1]

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = decode_access_token(token)

        account_id = payload.get("account_id")
        profile_id = payload.get("profile_id")
        firm_id    = payload.get("firm_id")
        role       = payload.get("role")
        device_id  = payload.get("device_id")

        if not account_id or not role or not device_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        # ---------------------------------------------------
        # ✅ 1. SUBSCRIPTION ENFORCEMENT
        # ---------------------------------------------------
        if role == "classic":
            enforce_active_subscription(account_id)

        elif role == "admin":
            # 🔑 TEMP ADMIN (Prime/VIP onboarding) → allow
            if firm_id is not None:
                enforce_active_firm_subscription(firm_id)

        elif role == "profile":
            if not firm_id:
                raise HTTPException(status_code=401, detail="Invalid firm session")
            enforce_active_firm_subscription(firm_id)

        else:
            raise HTTPException(status_code=401, detail="Invalid role")

        # ---------------------------------------------------
        # ✅ 2. ACTIVE SESSION VALIDATION
        # ---------------------------------------------------
        query = (
            supabase.table("active_sessions")
            .select("id")
            .eq("account_id", account_id)
            .eq("device_id", device_id)
            .eq("is_active", True)
        )

        if role == "profile":
            query = query.eq("profile_id", profile_id)

        if role == "admin":
            query = query.is_("profile_id", "null")

        session_check = query.execute()

        if not session_check.data:
            print(f"❌ Session not found for account_id={account_id}, device_id={device_id}, role={role}")
            
            # Check if session was completely deactivated (force logout)
            deactivated_query = (
                supabase.table("active_sessions")
                .select("id, last_seen, is_active")
                .eq("account_id", account_id)
                .eq("device_id", device_id)
                .eq("is_active", False)
            )
            
            deactivated_check = deactivated_query.order("last_seen", desc=True).limit(1).execute()
            
            if deactivated_check.data:
                print(f"⚠️ Session was deactivated (force logout from another device)")
                raise HTTPException(
                    status_code=401, 
                    detail="SESSION_DEACTIVATED: You have been logged out from another device"
                )
            
            if role == "admin":
                # Debug: check what sessions exist
                all_sessions = supabase.table("active_sessions").select("*").eq("account_id", account_id).eq("is_active", True).execute()
                print(f"   Active sessions for account: {len(all_sessions.data)}")
                for s in all_sessions.data:
                    print(f"   - device_id={s['device_id']}, profile_id={s.get('profile_id')}, firm_id={s.get('firm_id')}")
            
            raise HTTPException(status_code=401, detail="Session expired or invalid")

        return payload

    except HTTPException:
        raise

    except Exception as e:
        print(f"❌ Token validation exception: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=401, detail="Invalid or expired token")



def get_current_user_from_header_or_cookie(request: Request):
    # 1) Header first
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        token = auth.split("Bearer ")[1]
        return decode_access_token(token)

    # 2) Cookie fallback
    token = request.cookies.get("access_token")
    if token:
        return decode_access_token(token)

    raise HTTPException(status_code=401, detail="Not authenticated")