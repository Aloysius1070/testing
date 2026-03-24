from fastapi import Request, HTTPException
from app.security.jwt_utils import decode_access_token


def verify_trial_token(request: Request):
    """Verify trial token from Authorization header. Returns payload if valid, None otherwise."""
    auth = request.headers.get("Authorization")

    if not auth or not auth.startswith("Bearer "):
        return None

    try:
        token = auth.split(" ")[1]
        payload = decode_access_token(token)

        if payload.get("role") != "trial":
            return None

        trial_id = payload.get("trial_id")

        if not trial_id:
            return None

        return payload
    except Exception as e:
        # Invalid token - return None instead of raising error
        # This allows the secure-test flow to continue to the 401 fallback
        return None
