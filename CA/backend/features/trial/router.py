# app/features/trial/router.py

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from typing import Literal
from datetime import datetime
import bcrypt

from app.supabase_client import supabase
from app.security.jwt_utils import create_access_token, decode_access_token
from app.security.email_otp_sender import send_email_otp  # your existing SMTP helper #Resend API (no SMTP)

router = APIRouter(prefix="/api/trial", tags=["Free Trial"])

DEFAULT_TRIAL_USES = 5


# =========================
# Models
# =========================

class TrialStartRequest(BaseModel):
    email: EmailStr


class TrialVerifyRequest(BaseModel):
    trial_id: str
    otp: str


class TrialUseRequest(BaseModel):
    phase: Literal["pre", "post"]


# =========================
# Helpers
# =========================

def _generate_otp(length: int = 6) -> str:
    import secrets
    digits = "0123456789"
    return "".join(secrets.choice(digits) for _ in range(length))


def _get_trial_by_id(trial_id: str):
    res = (
        supabase.table("free_trials")
        .select("*")
        .eq("id", trial_id)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Trial session not found")
    return res.data


def _get_latest_trial_by_email(email: str):
    res = (
        supabase.table("free_trials")
        .select("*")
        .eq("email", email)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not res.data:
        return None
    return res.data[0]


def process_trial_phase(token_payload: dict, phase: str):
    """
    Core free-trial usage logic.

    phase = "pre":
        - If remaining_uses == 0 → TRIAL_ENDED
        - If > 0 → TRIAL_ALLOWED

    phase = "post":
        - Only called after successful tool run
        - Decrement remaining_uses by 1
        - If becomes 0 → TRIAL_JUST_ENDED
        - Else → TRIAL_REMAINING
    """
    if token_payload.get("role") != "trial":
        raise HTTPException(status_code=403, detail="Trial token required")

    trial_id = token_payload.get("trial_id")
    if not trial_id:
        raise HTTPException(status_code=400, detail="Invalid trial token")

    trial = _get_trial_by_id(trial_id)

    if not trial["otp_verified"]:
        # OTP not verified → trial not activated
        raise HTTPException(
            status_code=403,
            detail="Free trial not activated. Please verify OTP."
        )

    remaining = int(trial["remaining_uses"])

    # --------------------------------
    # PRE PHASE
    # --------------------------------
    if phase == "pre":
        if remaining <= 0:
            # Trial already fully consumed
            return {
                "ok": False,
                "phase": "pre",
                "status": "TRIAL_ENDED",
                "remaining_uses": 0,
                "message": "Your free trial has ended. Please purchase a plan."
            }

        return {
            "ok": True,
            "phase": "pre",
            "status": "TRIAL_ALLOWED",
            "remaining_uses": remaining
        }

    # --------------------------------
    # POST PHASE (success only)
    # --------------------------------
    if phase == "post":
        if remaining <= 0:
            # Should normally not happen if pre-phase passed
            return {
                "ok": True,
                "phase": "post",
                "status": "TRIAL_ENDED",
                "remaining_uses": 0,
                "message": "Free trial already ended."
            }

        new_remaining = remaining - 1

        supabase.table("free_trials").update({
            "remaining_uses": new_remaining,
            "created_at": datetime.utcnow().isoformat()  # simple touch
        }).eq("id", trial["id"]).execute()

        if new_remaining == 0:
            # Trial just exhausted
            return {
                "ok": True,
                "phase": "post",
                "status": "TRIAL_JUST_ENDED",
                "remaining_uses": 0,
                "message": "This was your last free trial run."
            }

        return {
            "ok": True,
            "phase": "post",
            "status": "TRIAL_REMAINING",
            "remaining_uses": new_remaining
        }

    # Should never reach here
    raise HTTPException(status_code=400, detail="Invalid trial phase")
    

# =========================
# Routes
# =========================

@router.post("/start")
def trial_start(payload: TrialStartRequest):
    """
    Start free trial:
    - If email already has a verified trial → block (one-time trial)
    - If email exists but not verified → resend OTP on same row
    - Else create new free_trials row
    """
    email = payload.email

    existing = _get_latest_trial_by_email(email)

    # Trial already activated before → no second chance
    if existing and existing.get("otp_verified"):
        raise HTTPException(
            status_code=400,
            detail="Free trial already used for this email. Please purchase a plan."
        )

    # Generate new OTP and hash
    otp_plain = _generate_otp()
    otp_hash = bcrypt.hashpw(otp_plain.encode(), bcrypt.gensalt()).decode()

    if existing and not existing.get("otp_verified"):
        # Resend OTP, update existing row
        supabase.table("free_trials").update({
            "otp": otp_hash,
            "created_at": datetime.utcnow().isoformat(),
            "remaining_uses": DEFAULT_TRIAL_USES  # reset if you want; or keep as is
        }).eq("id", existing["id"]).execute()

        trial_id = existing["id"]
    else:
        # New trial row
        now = datetime.utcnow().isoformat()
        res = supabase.table("free_trials").insert({
            "email": email,
            "otp": otp_hash,
            "otp_verified": False,
            "remaining_uses": DEFAULT_TRIAL_USES,
            "created_at": now
        }).execute()
        trial_id = res.data[0]["id"]

    # Send OTP email
    send_email_otp(email, otp_plain)

    return {
        "ok": True,
        "trial_id": trial_id,
        "message": "OTP sent to your email for free trial activation."
    }


@router.post("/verify")
def trial_verify(payload: TrialVerifyRequest):
    """
    Verify OTP and activate free trial.
    Issues TRIAL JWT (no re-login flow; one-time use controlled by remaining_uses).
    """
    trial = _get_trial_by_id(payload.trial_id)

    if trial.get("otp_verified"):
        raise HTTPException(status_code=400, detail="Trial already verified")

    # Validate OTP
    otp_hash = trial["otp"]
    if not bcrypt.checkpw(payload.otp.encode(), otp_hash.encode()):
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # Mark verified
    supabase.table("free_trials").update({
        "otp_verified": True
    }).eq("id", trial["id"]).execute()

    # Issue TRIAL JWT
    # NOTE: Uses the same expiry mechanism as other tokens, but **business side**
    # trial validity is ONLY controlled through remaining_uses and lack of re-login APIs.
    token = create_access_token({
        "role": "trial",
        "trial_id": str(trial["id"]),
        "email": trial["email"]
    })

    return {
        "ok": True,
        "trial_jwt_token": token,  # Match frontend expectation
        "remaining_runs": DEFAULT_TRIAL_USES,  # Initial run count
        "message": "Free trial activated"
    }


@router.post("/use")
def trial_use(body: TrialUseRequest, request: Request):
    """
    HTTP endpoint for trial usage (optional for debugging).
    /execute will internally use the same core function process_trial_phase().
    """
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing trial token")

    token = auth.split(" ")[1]
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired trial token")

    if payload.get("role") != "trial":
        raise HTTPException(status_code=403, detail="Trial token required")

    return process_trial_phase(payload, body.phase)


@router.get("/status")
def trial_status(request: Request):
    """
    Returns current trial remaining_uses.
    Reads from Authorization bearer trial token.
    """

    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing trial token")

    token = auth.split(" ")[1]

    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if payload.get("role") != "trial":
        raise HTTPException(status_code=403, detail="Trial token required")

    trial_id = payload.get("trial_id")
    if not trial_id:
        raise HTTPException(400, "Invalid trial token")

    trial = _get_trial_by_id(trial_id)

    return {
        "ok": True,
        "trial_id": trial_id,
        "email": trial["email"],
        "otp_verified": trial["otp_verified"],
        "remaining_uses": trial["remaining_uses"],
        "status":
            "EXPIRED" if trial["remaining_uses"] == 0
            else "ACTIVE"
    }


@router.post("/revoke")
def revoke_trial(request: Request):
    """
    Immediately kills this trial session.
    Used when user closes browser, leaves platform,
    or cancels before finishing runs.

    Removes remaining uses so token becomes invalid forever.
    """

    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing trial token")

    token = auth.split(" ")[1]

    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if payload.get("role") != "trial":
        raise HTTPException(status_code=403, detail="Trial token required")

    trial_id = payload.get("trial_id")
    if not trial_id:
        raise HTTPException(400, "Invalid trial token")

    supabase.table("free_trials").update({
        "remaining_uses": 0
    }).eq("id", trial_id).execute()

    return {
        "ok": True,
        "message": "Trial session revoked permanently.",
        "remaining_uses": 0
    }
