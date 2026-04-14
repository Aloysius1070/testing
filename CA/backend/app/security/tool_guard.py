from fastapi import HTTPException, Request
from jose import jwt, JWTError
from app.security.jwt_utils import SECRET_KEY, ALGORITHM
from app.security.subscription_guard import enforce_active_subscription
from app.supabase_client import supabase


def tool_access_guard(request: Request):
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = auth.split(" ")[1]

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    account_id = payload.get("account_id")
    profile_id = payload.get("profile_id")

    enforce_active_subscription(account_id)

    session = supabase.table("active_sessions") \
        .select("id") \
        .eq("account_id", account_id) \
        .eq("is_active", True)

    if profile_id:
        session = session.eq("profile_id", profile_id)

    session = session.execute()

    if not session.data:
        raise HTTPException(status_code=401, detail="No active session found")

    return True
