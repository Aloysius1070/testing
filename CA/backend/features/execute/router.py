# app/features/execute/router.py

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Any, Optional

from app.security.jwt_utils import decode_access_token
from app.security.cookie_auth import get_current_user_from_cookie
from app.supabase_client import supabase
from features.trial.router import process_trial_phase


router = APIRouter(prefix="/api", tags=["Execute"])


class ExecuteRequest(BaseModel):
    tool: str
    payload: Optional[dict[str, Any]] = None


@router.post("/execute")
def execute_tool(body: ExecuteRequest, request: Request):
    """
    Universal tool execution endpoint.

    Priority:
    1) If Authorization header contains TRIAL token → Free trial flow
    2) Else use cookie-based subscriber session → CLASSIC / PRIME / VIP
    """

    auth = request.headers.get("Authorization")

    # =========================================================
    # 1️⃣ FREE TRIAL PATH (HEADER-BASED)
    # =========================================================
    if auth and auth.startswith("Bearer "):
        token = auth.split(" ")[1]
        try:
            payload = decode_access_token(token)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        if payload.get("role") == "trial":
            # -------- PRE PHASE --------
            pre = process_trial_phase(payload, "pre")
            if not pre["ok"]:
                # Trial ended, do not execute tool
                return {
                    "ok": False,
                    "mode": "TRIAL",
                    "reason": "TRIAL_ENDED",
                    "trial": pre
                }

            # -------- TOOL EXECUTION (SIMULATED) --------
            # You can later plug in real logic based on `body.tool`
            simulated_result = {
                "tool": body.tool,
                "status": "SIMULATED_SUCCESS",
                "payload_echo": body.payload or {}
            }

            # Only successful tools call POST phase
            post = process_trial_phase(payload, "post")

            return {
                "ok": True,
                "mode": "TRIAL",
                "result": simulated_result,
                "trial": post
            }

        # If Authorization exists but is NOT trial, we just fall through
        # to subscriber path, where cookie_auth will also look at header
        # if needed.

    # =========================================================
    # 2️⃣ SUBSCRIBER PATH (CLASSIC / PRIME / VIP) – COOKIE-BASED
    # =========================================================
    # This function ALREADY enforces:
    # - active subscription (classic / firm)
    # - active session
    # - device/profile rules
    user = get_current_user_from_cookie(request)

    role = user.get("role")
    account_id = user.get("account_id")
    plan_id = user.get("plan_id")
    firm_id = user.get("firm_id")
    profile_id = user.get("profile_id")
    device_id = user.get("device_id")

    if not role:
        raise HTTPException(status_code=401, detail="Invalid subscriber session")

    # ---------------------------------------------------------
    # Map to CLASSIC / PRIME / VIP strings for response only
    # ---------------------------------------------------------
    mode = "SUBSCRIBER"

    if role == "classic":
        mode = "CLASSIC"
    elif role in ("admin", "profile"):
        if not plan_id:
            raise HTTPException(
                status_code=401,
                detail="Plan context missing for Prime/VIP session"
            )

        plan_res = (
            supabase.table("plans")
            .select("name")
            .eq("id", plan_id)
            .single()
            .execute()
        )
        if plan_res.data and plan_res.data.get("name"):
            # Typically "PRIME" or "VIP"
            mode = plan_res.data["name"].upper()
        else:
            mode = "SUBSCRIBER"

    else:
        raise HTTPException(
            status_code=403,
            detail="Unsupported role for tool execution"
        )

    # ---------------------------------------------------------
    # TOOL EXECUTION (SIMULATED)
    # ---------------------------------------------------------
    # For now, we just pretend the tool ran successfully.
    # Later you can plug in your real GST / TDS / Ledger / Invoice logic here.
    simulated_result = {
        "tool": body.tool,
        "status": "SIMULATED_SUCCESS",
        "payload_echo": body.payload or {},
        "meta": {
            "account_id": account_id,
            "firm_id": firm_id,
            "profile_id": profile_id,
            "device_id": device_id
        }
    }

    return {
        "ok": True,
        "mode": mode,  # "CLASSIC" / "PRIME" / "VIP" / "SUBSCRIBER"
        "result": simulated_result
    }
