"""Authentication API Router"""

import email
from fastapi import APIRouter, HTTPException, Request, Response, Depends, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
import bcrypt
import httpx
from fastapi.responses import JSONResponse
from app.supabase_client import supabase
from app.security.subscription_guard import enforce_active_subscription
from app.security.subscription_guard import enforce_active_firm_subscription
from app.security.session_guard import enforce_device_and_profile_limits
from app.security.jwt_utils import create_access_token
from app.security.cookie_auth import get_current_user_from_cookie
from app.security.cookie_auth import get_current_user_from_header_or_cookie
from app.security.admin_guard import get_current_admin
from app.security.jwt_utils import decode_access_token

from datetime import datetime, timedelta, date
from typing import Literal
import secrets
import os

# from email.message import EmailMessage



from app.security.audit_logger import log_audit_event
from app.security.audit_actions import (
    LOGIN,
    PLAN_RENEWED,
    PROFILE_LOGIN,
    LOGOUT,
    PLAN_UPGRADE_PRIME_TO_VIP
)


router = APIRouter(prefix="/api/auth", tags=["Authentication"])



# =========================================================
# ✅ CONSTANTS
# =========================================================

OTP_TTL_SECONDS = 900              # OTP validity window (15 minutes)
OTP_RESEND_COOLDOWN_SECONDS = 900   # Minimum gap between OTP sends per account (15 minutes)
OTP_CLEANUP_DAYS = 1               # Delete OTPs older than N days

# Cache plan names briefly to reduce repeated DB lookups on session restore and /me.
PLAN_NAME_CACHE_TTL_SECONDS = 300
_PLAN_NAME_CACHE: dict[int, tuple[str, float]] = {}

# =========================================================
# ✅ MODELS
# =========================================================



class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ClassicLoginRequest(BaseModel):
    email: EmailStr
    password: str
    device_id: str


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileLoginRequest(BaseModel):
    profile_id: int
    password: str
    device_id: str


class ClassicSignupStartRequest(BaseModel):
    email: EmailStr


class ClassicSignupCompleteRequest(BaseModel):
    account_id: int
    otp: str
    password: str


class CreateExtraProfileRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    device_id: str


class PaymentCompleteRequest(BaseModel):
    account_id: int
    plan_id: int
    payment_order_id: str
    payment_id: str
    payment_signature: str
    card_owner_name: str


# =========================================================
# ✅ HELPERS
# =========================================================

def generate_otp(length: int = 6) -> str:
    digits = "0123456789"
    return "".join(secrets.choice(digits) for _ in range(length))


# Import centralized email sender with rate limiting
from app.security.email_otp_sender import send_email_otp


def parse_db_timestamp_to_naive_utc(value) -> datetime:
    """
    Supabase returns timestamptz as either ISO string or datetime.
    Normalize to naive UTC datetime for safe comparison.
    """
    if isinstance(value, str):
        # handle possible trailing Z
        value = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(value)
    else:
        dt = value


    # strip tzinfo (DB is already in UTC)
    if dt.tzinfo is not None:
        dt = dt.replace(tzinfo=None)
    return dt


def get_plan_name_cached(plan_id: int) -> str:
    now_ts = datetime.utcnow().timestamp()
    cached = _PLAN_NAME_CACHE.get(plan_id)
    if cached and cached[1] > now_ts:
        return cached[0]

    plan_res = supabase.table("plans") \
        .select("name") \
        .eq("id", plan_id) \
        .execute()

    if not plan_res.data:
        raise HTTPException(500, "Plan not found")

    plan_name = plan_res.data[0]["name"]
    _PLAN_NAME_CACHE[plan_id] = (plan_name, now_ts + PLAN_NAME_CACHE_TTL_SECONDS)
    return plan_name


def issue_otp_for_account(account_id: int, email: str) -> None:
    """
    Secure OTP issuance:
    - Enforces resend cooldown
    - Hashes OTP
    - Marks older OTPs used
    - Deletes very old OTPs
    - Sends OTP via email
    """
    now = datetime.utcnow()

    # 🔹 Light cleanup: delete very old OTPs
    cutoff = now - timedelta(days=OTP_CLEANUP_DAYS)
    supabase.table("email_otps") \
        .delete() \
        .lt("expires_at", cutoff.isoformat()) \
        .execute()

    # 🔹 Check cooldown: last UNUSED OTP for this account
    # Only check unused OTPs - if user verified OTP (marked as used), allow new OTP immediately
    last_otp_res = supabase.table("email_otps") \
        .select("id, created_at") \
        .eq("account_id", account_id) \
        .eq("used", False) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()
    if last_otp_res.data:
        last = last_otp_res.data[0]
        created_at = parse_db_timestamp_to_naive_utc(last["created_at"])
        if (now - created_at).total_seconds() < OTP_RESEND_COOLDOWN_SECONDS:
            raise HTTPException(
                status_code=429,
                detail=f"OTP already sent. Please wait {OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting a new one."
            )
    

    # 🔹 Mark any existing unused OTPs as used (only keep latest active)
    supabase.table("email_otps") \
        .update({"used": True}) \
        .eq("account_id", account_id) \
        .eq("used", False) \
        .execute()
        

    # 🔹 Generate + hash OTP
    otp_plain = generate_otp()
    otp_hash = bcrypt.hashpw(otp_plain.encode(), bcrypt.gensalt()).decode()
    expires_at = now + timedelta(seconds=OTP_TTL_SECONDS)
    supabase.table("email_otps").insert({
    "account_id": account_id,
    "email": email,
    "otp": otp_hash,
    "expires_at": expires_at.isoformat(),
    "used": False
    }).execute()

    
    # 🔹 Send actual OTP email
    send_email_otp(email, otp_plain)


def validate_and_consume_otp(account_id: int, otp_input: str):
    """
    Fetch latest unused OTP for account, validate hash + expiry, then mark used.
    Returns the OTP row on success.
    """
    res = supabase.table("email_otps") \
        .select("*") \
        .eq("account_id", account_id) \
        .eq("used", False) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()
    
    if not res.data:
        raise HTTPException(400, "OTP not found or already used")
    
    otp_row = res.data[0]
    
    # ✅ Hash check
    if not bcrypt.checkpw(otp_input.encode(), otp_row["otp"].encode()):
        raise HTTPException(400, "Invalid OTP")
    
    # ✅ Expiry check
    expires_at = parse_db_timestamp_to_naive_utc(otp_row["expires_at"])
    now = datetime.utcnow()
    if now > expires_at:
        raise HTTPException(400, "OTP expired")
    
    # ✅ Mark used
    supabase.table("email_otps") \
        .update({"used": True}) \
        .eq("id", otp_row["id"]) \
        .execute()
    
    return otp_row


# =========================================================
# ✅ CLASSIC LOGIN
# =========================================================

# @router.post("/classic-login")
# def classic_login(payload: ClassicLoginRequest, request: Request, response: Response):

#     acc = supabase.table("accounts") \
#         .select("*") \
#         .eq("email", payload.email) \
#         .single() \
#         .execute()

#     if not acc.data:
#         raise HTTPException(401, "Invalid credentials")

#     account = acc.data

#     if not account["email_verified"]:
#         raise HTTPException(403, "Email not verified")

#     if not bcrypt.checkpw(
#         payload.password.encode(),
#         account["password_hash"].encode()
#     ):
#         raise HTTPException(401, "Invalid credentials")

#     # ✅ Active subscription required
#     enforce_active_subscription(account["id"])

#     # ✅ Device enforcement
#     enforce_device_and_profile_limits(
#         account_id=account["id"],
#         plan_id=account["plan_id"],
#         firm_id=account["firm_id"],
#         profile_id=None,
#         device_id=payload.device_id,
#         ip_address=request.client.host
#     )

#     # ✅ Device log
#     existing_device = supabase.table("devices") \
#         .select("id") \
#         .eq("account_id", account["id"]) \
#         .eq("device_id", payload.device_id) \
#         .execute()

#     if existing_device.data:
#         supabase.table("devices").update({
#             "last_login": datetime.utcnow().isoformat()
#         }).eq("id", existing_device.data[0]["id"]).execute()
#     else:
#         supabase.table("devices").insert({
#             "account_id": account["id"],
#             "device_id": payload.device_id,
#             "last_login": datetime.utcnow().isoformat()
#         }).execute()

#     # ✅ ✅ FIXED TOKEN
#     token = create_access_token({
#         "account_id": account["id"],
#         "plan_id": account["plan_id"],
#         "role": "classic",
#         "device_id": payload.device_id       # ✅ FIX
#     })

#     response.set_cookie(
#         key="access_token",
#         value=token,
#         httponly=True,
#         samesite="lax"
#     )

#     return {
#         "ok": True,
#         "message": "Classic login successful"
#     }


# # =========================================================
# # ✅ ADMIN LOGIN
# # =========================================================
# @router.post("/admin-login")
# def admin_login(payload: AdminLoginRequest, request: Request, response: Response):

#     account = supabase.table("accounts") \
#         .select("id, email, password_hash, plan_id, firm_id, email_verified") \
#         .eq("email", payload.email) \
#         .single() \
#         .execute().data

#     if not account:
#         raise HTTPException(401, "Invalid credentials")

#     if account["firm_id"] is None:
#         raise HTTPException(403, "Not Prime/VIP account")

#     if not account["email_verified"]:
#         raise HTTPException(403, "Email not verified")

#     if not bcrypt.checkpw(payload.password.encode(), account["password_hash"].encode()):
#         raise HTTPException(401, "Invalid credentials")

#     enforce_active_firm_subscription(account["firm_id"])


#     device_id = request.headers.get("x-device-id", "ADMIN-WEB")

#     # ✅ CREATE ADMIN SESSION (NO PROFILE)
#     supabase.table("active_sessions").insert({
#     "account_id": account["id"],
#     "firm_id": account["firm_id"],
#     "profile_id": None,
#     "device_id": device_id,
#     "ip_address": request.client.host,
#     "login_time": datetime.utcnow().isoformat(),
#     "last_seen": datetime.utcnow().isoformat(),
#     "is_active": True
#     }).execute()


#     # ✅ FULL ADMIN JWT
#     token = create_access_token({
#         "account_id": account["id"],
#         "firm_id": account["firm_id"],
#         "plan_id": account["plan_id"],
#         "device_id": device_id,
#         "role": "admin"
#     })

#     response.set_cookie(
#         key="access_token",
#         value=token,
#         httponly=True,
#         samesite="lax"
#     )

#     profiles = supabase.table("profiles") \
#         .select("id, username") \
#         .eq("firm_id", account["firm_id"]) \
#         .execute().data

#     return {
#         "ok": True,
#         "profiles": profiles
#     }






# =========================================================
# ✅ PRIME / VIP – ADMIN SIGNUP (STEP 1)
# =========================================================

class PrimeAdminSignupRequest(BaseModel):
    email: EmailStr


@router.post("/prime/signup-start")
def prime_admin_signup_start(payload: PrimeAdminSignupRequest):

    # Check if account already exists
    existing = supabase.table("accounts") \
        .select("id, email_verified, password_hash, firm_id, onboarding_status, plan_id") \
        .eq("email", payload.email) \
        .execute()

    if existing.data:
        acc = existing.data[0]

        # ✅ If email verified AND firm created AND onboarding complete → must login
        if acc["email_verified"] and acc["firm_id"] and acc["onboarding_status"] == "COMPLETE":
            raise HTTPException(400, "Account already exists. Please login.")

        # 🔄 If email verified AND payment is PENDING → resume payment
        if acc["email_verified"]:
            subscription = supabase.table("subscriptions") \
                .select("id, payment_status, plan_id") \
                .eq("account_id", acc["id"]) \
                .execute()
            
            if subscription.data and subscription.data[0]["payment_status"] == "PENDING":
                # Fetch plan details for resume
                plan_res = supabase.table("plans") \
                    .select("id, name, price") \
                    .eq("id", subscription.data[0]["plan_id"]) \
                    .execute()
                
                if not plan_res.data:
                    raise HTTPException(400, "Plan not found")
                
                plan = plan_res.data[0]
                
                return {
                    "ok": True,
                    "account_id": acc["id"],
                    "message": "Payment pending. Resume payment.",
                    "resume_payment": True,
                    "plan_id": plan["id"],
                    "plan_name": plan.data["name"],
                    "plan_price": plan.data["price"]
                }

        # ✅ If email verified AND payment done BUT firm NOT created → skip to onboarding
        if acc["email_verified"] and acc["onboarding_status"] == "PAYMENT_DONE" and not acc["firm_id"]:
            return {
                "ok": True,
                "account_id": acc["id"],
                "message": "Payment completed. Complete firm onboarding.",
                "skip_to_onboarding": True
            }

        # ✅ If email verified BUT no payment yet → skip OTP, go to payment
        if acc["email_verified"]:
            return {
                "ok": True,
                "account_id": acc["id"],
                "message": "Email already verified. Proceed to payment.",
                "skip_otp": True
            }

        # ✅ If NOT verified → Check for existing OTP or send new one
        now = datetime.utcnow()
        
        # Check if valid OTP already exists
        existing_otp = supabase.table("email_otps") \
            .select("id, created_at, expires_at") \
            .eq("account_id", acc["id"]) \
            .eq("used", False) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        
        if existing_otp.data:
            otp_row = existing_otp.data[0]
            expires_at = parse_db_timestamp_to_naive_utc(otp_row["expires_at"])
            created_at = parse_db_timestamp_to_naive_utc(otp_row["created_at"])
            
            # Check if OTP is still valid (not expired)
            if now < expires_at:
                # OTP is still valid - calculate remaining times
                remaining_validity_seconds = int((expires_at - now).total_seconds())
                time_since_creation = int((now - created_at).total_seconds())
                remaining_resend_cooldown = max(0, OTP_RESEND_COOLDOWN_SECONDS - time_since_creation)
                
                return {
                    "ok": True,
                    "account_id": acc["id"],
                    "message": "Valid OTP already exists",
                    "otp_exists": True,
                    "remaining_validity_seconds": remaining_validity_seconds,
                    "remaining_resend_cooldown_seconds": remaining_resend_cooldown
                }
        
        # No valid OTP exists - issue new one
        issue_otp_for_account(acc["id"], payload.email)
        return {"ok": True, "account_id": acc["id"], "message": "OTP re-sent"}

    # TEMP ACCOUNT CREATION (no firm yet, dummy plan)
    classic_plan_res = supabase.table("plans") \
        .select("id") \
        .eq("name", "CLASSIC") \
        .execute()
    
    if not classic_plan_res.data:
        raise HTTPException(500, "CLASSIC plan not configured")
    
    classic_plan = classic_plan_res.data[0]

    acc = supabase.table("accounts").insert({
        "email": payload.email,
        "full_name": "",
        "password_hash": "PENDING",
        "email_verified": False,
        "plan_id": classic_plan["id"],
        "firm_id": None,
        "onboarding_status": "SIGNUP_STARTED"
    }).execute().data[0]

    issue_otp_for_account(acc["id"], payload.email)

    return {"ok": True, "account_id": acc["id"], "message": "OTP sent"}



# =========================================================
# ✅ PRIME / VIP – OTP VERIFY (STEP 2)
# =========================================================

# class PrimeAdminVerifyOTPRequest(BaseModel):
#     account_id: int
#     otp: str

# @router.post("/prime/verify-otp")
# def prime_admin_verify_otp(
#     payload: PrimeAdminVerifyOTPRequest,
#     request: Request,
#     response: Response
# ):
#     account = supabase.table("accounts") \
#         .select("id, email_verified") \
#         .eq("id", payload.account_id) \
#         .single() \
#         .execute().data

#     if not account:
#         raise HTTPException(404, "Account not found")

#     # ✅ Validate OTP
#     validate_and_consume_otp(
#         account_id=payload.account_id,
#         otp_input=payload.otp
#     )

#     # ✅ Mark email verified
#     supabase.table("accounts").update({
#         "email_verified": True
#     }).eq("id", payload.account_id).execute()

#     # --------------------------------------------------
#     # 🔑 CREATE TEMP ADMIN SESSION (NO FIRM YET)
#     # --------------------------------------------------
#     device_id = "ONBOARDING"

#     supabase.table("active_sessions").insert({
#         "account_id": payload.account_id,
#         "firm_id": None,
#         "profile_id": None,
#         "device_id": device_id,
#         "ip_address": request.client.host,
#         "login_time": datetime.utcnow().isoformat(),
#         "last_seen": datetime.utcnow().isoformat(),
#         "is_active": True
#     }).execute()

#     # --------------------------------------------------
#     # 🔐 ISSUE TEMP ADMIN JWT
#     # --------------------------------------------------
#     token = create_access_token({
#         "account_id": payload.account_id,
#         "role": "admin",
#         "device_id": device_id
#     })

#     # response.set_cookie(
#     #     key="access_token",
#     #     value=token,
#     #     httponly=True,
#     #     samesite="lax"
#     # )

#     return {
#     "ok": True,
#     "token": token,
#     "message": "Email verified. Admin session started."
#     }




# # =========================================================
# # ✅ PRIME / VIP – ONBOARD COMPLETE (STEP 3)
# # =========================================================

# from app.security.admin_guard import get_current_admin

# class PrimeOnboardCompleteRequest(BaseModel):
#     admin_password: str
#     frn: str
#     proprietor_name: str
#     address: str
#     contact_number: str
#     ca_membership_no: str
#     plan_name: Literal["PRIME", "VIP"]
#     profile_username: str
#     profile_password: str
#     device_id: str


# @router.post("/prime/onboard-complete")
# def prime_onboard_complete(
#     payload: PrimeOnboardCompleteRequest,
#     request: Request,
#     response: Response,
#     user=Depends(get_current_user_from_header_or_cookie),
# ):
#     # ------------------------------------------------
#     # ✅ ALLOW TEMP ADMIN SESSION
#     # ------------------------------------------------
#     if user.get("role") != "admin":
#         raise HTTPException(403, "Admin login required")

#     account_id = user["account_id"]

#     # firm MUST NOT exist yet
#     if user.get("firm_id") is not None:
#         raise HTTPException(400, "Firm already onboarded")

#     # ------------------------------------------------
#     # ✅ VERIFY EMAIL
#     # ------------------------------------------------
#     account = (
#         supabase.table("accounts")
#         .select("email_verified")
#         .eq("id", account_id)
#         .single()
#         .execute()
#         .data
#     )

#     if not account or not account["email_verified"]:
#         raise HTTPException(403, "Email not verified")

#     # ------------------------------------------------
#     # ✅ FETCH PLAN (PRIME / VIP)
#     # ------------------------------------------------
#     plan = (
#         supabase.table("plans")
#         .select("*")
#         .eq("name", payload.plan_name)
#         .single()
#         .execute()
#         .data
#     )

#     if not plan:
#         raise HTTPException(400, "Selected plan not found")

#     # ------------------------------------------------
#     # ✅ HASH ADMIN PASSWORD & UPDATE ACCOUNT
#     # ------------------------------------------------
#     admin_pwd_hash = bcrypt.hashpw(
#         payload.admin_password.encode(), bcrypt.gensalt()
#     ).decode()

#     supabase.table("accounts").update(
#         {
#             "password_hash": admin_pwd_hash,
#         }
#     ).eq("id", account_id).execute()

#     # ------------------------------------------------
#     # ✅ CREATE FIRM
#     # ------------------------------------------------
#     firm = (
#         supabase.table("firms")
#         .insert(
#             {
#                 "frn": payload.frn,
#                 "proprietor_name": payload.proprietor_name,
#                 "address": payload.address,
#                 "contact_number": payload.contact_number,
#                 "ca_membership_no": payload.ca_membership_no,
#                 "plan_id": plan["id"],
#             }
#         )
#         .execute()
#         .data[0]
#     )

#     # ------------------------------------------------
#     # ✅ UPDATE ACCOUNT → FULL ADMIN WITH FIRM + PLAN
#     # ------------------------------------------------
#     supabase.table("accounts").update(
#         {
#             "firm_id": firm["id"],
#             "plan_id": plan["id"],
#         }
#     ).eq("id", account_id).execute()

#     # ------------------------------------------------
#     # ✅ CREATE FIRST PROFILE
#     # ------------------------------------------------
#     profile_pwd = bcrypt.hashpw(
#         payload.profile_password.encode(), bcrypt.gensalt()
#     ).decode()

#     profile = (
#         supabase.table("profiles")
#         .insert(
#             {
#                 "firm_id": firm["id"],
#                 "username": payload.profile_username,
#                 "password_hash": profile_pwd,
#             }
#         )
#         .execute()
#         .data[0]
#     )

#     # ------------------------------------------------
#     # ✅ CREATE SUBSCRIPTION
#     # ------------------------------------------------
#     start = date.today()
#     end = start + timedelta(days=30 * plan["duration_months"])

#     supabase.table("subscriptions").insert(
#         {
#             "account_id": account_id,
#             "firm_id": firm["id"],
#             "plan_id": plan["id"],
#             "status": "ACTIVE",
#             "start_date": start.isoformat(),
#             "end_date": end.isoformat(),
#         }
#     ).execute()

#     # ------------------------------------------------
#     # 🔥 UPGRADE TEMP SESSION → FULL SESSION
#     # ------------------------------------------------
#     supabase.table("active_sessions").update(
#         {
#             "firm_id": firm["id"],
#             "profile_id": profile["id"],
#             "device_id": payload.device_id,
#             "last_seen": datetime.utcnow().isoformat(),
#         }
#     ).eq("account_id", account_id).eq("is_active", True).execute()

#     # ------------------------------------------------
#     # 🔑 ISSUE FINAL PROFILE TOKEN
#     # ------------------------------------------------
#     token = create_access_token(
#         {
#             "account_id": account_id,
#             "firm_id": firm["id"],
#             "profile_id": profile["id"],
#             "plan_id": plan["id"],
#             "device_id": payload.device_id,
#             "role": "profile",
#         }
#     )

#     response.set_cookie(
#         key="access_token",
#         value=token,
#         httponly=True,
#         samesite="lax",
#     )

#     return {
#         "ok": True,
#         "message": "Prime/VIP onboarding complete",
#         "profile_id": profile["id"],
#     }


class PrimeAdminVerifyOTPRequest(BaseModel):
    account_id: int
    otp: str

@router.post("/prime/verify-otp")
def prime_admin_verify_otp(
    payload: PrimeAdminVerifyOTPRequest,
    request: Request,
    response: Response
):
    # -----------------------------
    # 1️⃣ FETCH ACCOUNT
    # -----------------------------
    account_res = supabase.table("accounts") \
        .select("id, email_verified") \
        .eq("id", payload.account_id) \
        .execute()
    
    if not account_res.data:
        raise HTTPException(404, "Account not found")
    
    account = account_res.data[0]

    # -----------------------------
    # 2️⃣ VALIDATE OTP
    # -----------------------------
    validate_and_consume_otp(
        account_id=payload.account_id,
        otp_input=payload.otp
    )

    # Mark verified
    supabase.table("accounts").update({
        "email_verified": True
    }).eq("id", payload.account_id).execute()

    # -----------------------------
    # 3️⃣ TEMP ADMIN SESSION
    # -----------------------------
    device_id = "ONBOARDING"

    supabase.table("active_sessions").insert({
        "account_id": payload.account_id,
        "firm_id": None,
        "profile_id": None,
        "device_id": device_id,
        "ip_address": request.client.host,
        "login_time": datetime.utcnow().isoformat(),
        "last_seen": datetime.utcnow().isoformat(),
        "is_active": True
    }).execute()

    # -----------------------------
    # 4️⃣ TEMP COOKIE TOKEN (NOT RETURNING TOKEN)
    # -----------------------------
    token = create_access_token({
        "account_id": payload.account_id,
        "role": "admin",
        "device_id": device_id
    })

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,  # Required for HTTPS
        samesite="lax",  # Required for cross-domain cookies
        # secure=True,  # Required for HTTPS #For production
        # samesite="none",  # Required for cross-domain cookies #For production
        max_age=30 * 24 * 60 * 60  # 30 days
    )

    return {
        "ok": True,
        "message": "Email verified — admin onboarding session started."
    }


from app.security.cookie_auth import get_current_user_from_cookie

class PrimeOnboardCompleteRequest(BaseModel):
    account_id: int
    admin_password: str
    frn: str
    proprietor_name: str
    address: str
    contact_number: str
    ca_membership_no: str
    plan_name: Literal["PRIME", "VIP"]
    profile_username: str
    profile_password: str
    device_id: str


@router.post("/prime/onboard-complete")
def prime_onboard_complete(
    payload: PrimeOnboardCompleteRequest,
    request: Request,
    response: Response
):
    # Verify account exists and email is verified
    account_res = (
        supabase.table("accounts")
        .select("id, email, email_verified, firm_id")
        .eq("id", payload.account_id)
        .execute()
    )
    
    if not account_res.data:
        raise HTTPException(404, "Account not found")
    
    account = account_res.data[0]
    
    if not account["email_verified"]:
        raise HTTPException(403, "Email not verified")

    # Firm must not exist yet
    if account.get("firm_id") is not None:
        raise HTTPException(400, "Firm already onboarded")

    account_id = account["id"]

    # -------------------------
    # FETCH PLAN
    # -------------------------
    plan_res = (
        supabase.table("plans")
        .select("*")
        .eq("name", payload.plan_name)
        .execute()
    )
    
    if not plan_res.data:
        raise HTTPException(400, "Selected plan not found")
    
    plan = plan_res.data[0]

    # -------------------------
    # UPDATE ADMIN PASSWORD
    # -------------------------
    admin_pwd_hash = bcrypt.hashpw(
        payload.admin_password.encode(),
        bcrypt.gensalt()
    ).decode()

    supabase.table("accounts").update({
        "password_hash": admin_pwd_hash
    }).eq("id", account_id).execute()

    # -------------------------
    # CREATE FIRM (with FRN uniqueness check)
    # -------------------------
    # Check if FRN already exists in database
    existing_firm = supabase.table("firms") \
        .select("*") \
        .eq("frn", payload.frn) \
        .execute()
    
    if existing_firm.data:
        raise HTTPException(400, "FRN already exists. Please use a unique FRN number.")
    
    # Create new firm
    try:
        firm = (
            supabase.table("firms")
            .insert({
                "frn": payload.frn,
                "proprietor_name": payload.proprietor_name,
                "address": payload.address,
                "contact_number": payload.contact_number,
                "ca_membership_no": payload.ca_membership_no,
                "plan_id": plan["id"],
            })
            .execute()
            .data[0]
        )
    except Exception as e:
        error_str = str(e)
        if '23505' in error_str or 'duplicate key' in error_str.lower() or 'already exists' in error_str.lower():
            raise HTTPException(400, "FRN already exists. Please use a unique FRN number.")
        raise

    # -------------------------
    # UPDATE ACCOUNT
    # -------------------------
    supabase.table("accounts").update({
        "firm_id": firm["id"],
        "plan_id": plan["id"],
        "onboarding_status": "COMPLETE"
    }).eq("id", account_id).execute()

    # -------------------------
    # CREATE FIRST PROFILE (with username uniqueness check)
    # -------------------------
    # Check if username already exists in this firm
    existing_profile = supabase.table("profiles") \
        .select("*") \
        .eq("firm_id", firm["id"]) \
        .eq("username", payload.profile_username) \
        .execute()
    
    if existing_profile.data:
        raise HTTPException(400, "Username already exists in this firm. Please choose a different username.")
    
    # Create new profile
    profile_pwd = bcrypt.hashpw(
        payload.profile_password.encode(),
        bcrypt.gensalt()
    ).decode()

    try:
        profile = (
            supabase.table("profiles")
            .insert({
                "firm_id": firm["id"],
                "username": payload.profile_username,
                "password_hash": profile_pwd
            })
            .execute()
            .data[0]
        )
    except Exception as e:
        error_str = str(e)
        if '23505' in error_str or 'duplicate key' in error_str.lower() or 'already exists' in error_str.lower():
            raise HTTPException(400, "Username already exists. Please choose a different username.")
        raise

    # -------------------------
    # CREATE SUBSCRIPTION
    # -------------------------
    start = date.today()
    end = start + timedelta(days=30 * plan["duration_months"])

    # Check if subscription already exists (from payment flow)
    existing_sub = supabase.table("subscriptions") \
        .select("id") \
        .eq("account_id", account_id) \
        .execute()

    if not existing_sub.data:
        # Create new subscription if it doesn't exist
        supabase.table("subscriptions").insert({
            "account_id": account_id,
            "firm_id": firm["id"],
            "plan_id": plan["id"],
            "status": "ACTIVE",
            "payment_status": "PAID",
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
        }).execute()
    else:
        # Update existing subscription with firm_id
        supabase.table("subscriptions").update({
            "firm_id": firm["id"],
            "status": "ACTIVE",
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
        }).eq("account_id", account_id).execute()

    # -------------------------
    # CREATE ACTIVE SESSION WITH PROFILE
    # -------------------------
    # First, deactivate the ONBOARDING session
    supabase.table("active_sessions").update({
        "is_active": False
    }).eq("account_id", account_id).eq("device_id", "ONBOARDING").execute()
    
    # Then create the real session
    enforce_device_and_profile_limits(
        account_id=account_id,
        plan_id=plan["id"],
        firm_id=firm["id"],
        profile_id=profile["id"],
        device_id=payload.device_id,
        ip_address=request.client.host
    )

    # -------------------------
    # ISSUE FINAL PROFILE COOKIE
    # -------------------------
    token = create_access_token({
        "account_id": account_id,
        "firm_id": firm["id"],
        "profile_id": profile["id"],
        "plan_id": plan["id"],
        "device_id": payload.device_id,
        "role": "profile"
    })

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,  # Required for HTTPS
        samesite="none",  # Required for cross-domain cookies
        max_age=30 * 24 * 60 * 60  # 30 days
    )

    return {
        "ok": True,
        "message": "Prime/VIP onboarding complete",
        "profile_id": profile["id"]
    }




@router.post("/signin")
def signin(payload: LoginRequest, request: Request, response: Response):

    # 1️⃣ Fetch account by email
    try:
        acc = supabase.table("accounts") \
            .select("id, email, password_hash, plan_id, firm_id, email_verified") \
            .eq("email", payload.email) \
            .execute()
    except Exception as e:
        print(f"❌ Supabase error in signin: {e}")
        raise HTTPException(500, f"Database connection error: {str(e)}")

    if not acc.data or len(acc.data) == 0:
        raise HTTPException(401, "Invalid credentials")
    
    account = acc.data[0]

    # 2️⃣ Email verification required for ALL login types
    if not account["email_verified"]:
        raise HTTPException(403, "Email not verified")

    # 3️⃣ Check password
    if not bcrypt.checkpw(payload.password.encode(), account["password_hash"].encode()):
        raise HTTPException(401, "Invalid credentials")

    # 4️⃣ Classic User Login (plan_id = classic → firm_id is NULL)
    if account["firm_id"] is None:
        return _classic_login_internal(account, payload, request, response)

    # 5️⃣ Admin Login for Prime/VIP (firm_id != NULL)
    return _admin_login_internal(account, payload, request, response)


def _classic_login_internal(account, payload, request, response):

    enforce_active_subscription(account["id"])

    # Device enforcement
    enforce_device_and_profile_limits(
        account_id=account["id"],
        plan_id=account["plan_id"],
        firm_id=None,
        profile_id=None,
        device_id=payload.device_id,
        ip_address=request.client.host
    )

    # DEVICE LOG
    existing = supabase.table("devices") \
        .select("id") \
        .eq("account_id", account["id"]) \
        .eq("device_id", payload.device_id) \
        .execute()

    if existing.data:
        supabase.table("devices").update({
            "last_login": datetime.utcnow().isoformat()
        }).eq("id", existing.data[0]["id"]).execute()
    else:
        supabase.table("devices").insert({
            "account_id": account["id"],
            "device_id": payload.device_id,
            "last_login": datetime.utcnow().isoformat()
        }).execute()

    # JWT
    token = create_access_token({
        "account_id": account["id"],
        "plan_id": account["plan_id"],
        "role": "classic",
        "device_id": payload.device_id
    })

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,  # Required for HTTPS
        samesite="none",  # Required for cross-domain cookies
        max_age=30 * 24 * 60 * 60  # 30 days
    )

    log_audit_event(
    action=LOGIN,
    account_id=account["id"],
    firm_id=None,
    ip_address=request.client.host,
    user_agent=request.headers.get("user-agent")
    )


    return {
        "ok": True,
        "role": "classic",
        "message": "Classic login successful"
    }



def _admin_login_internal(account, payload, request, response):

    enforce_active_firm_subscription(account["firm_id"])

    # Use device_id from payload (sent by frontend)
    device_id = payload.device_id or "ADMIN-WEB"

    # ✅ CHECK IF SESSION EXISTS ON SAME DEVICE
    existing_session = supabase.table("active_sessions") \
        .select("*") \
        .eq("device_id", device_id) \
        .eq("account_id", account["id"]) \
        .eq("is_active", True) \
        .execute()

    if existing_session.data:
        # ✅ SAME DEVICE RE-LOGIN (cookie wiped but session exists)
        # Convert profile session back to admin session by resetting profile_id to NULL
        print(f"✅ Admin re-login on same device - converting to admin session")
        supabase.table("active_sessions").update({
            "profile_id": None,  # Clear profile_id to make it an admin session
            "last_seen": datetime.utcnow().isoformat()
        }).eq("id", existing_session.data[0]["id"]).execute()
    else:
        # No session exists - create new admin session
        print(f"🆕 Creating new admin session")
        supabase.table("active_sessions").insert({
            "account_id": account["id"],
            "firm_id": account["firm_id"],
            "profile_id": None,
            "device_id": device_id,
            "ip_address": request.client.host,
            "login_time": datetime.utcnow().isoformat(),
            "last_seen": datetime.utcnow().isoformat(),
            "is_active": True
        }).execute()

    # JWT
    token = create_access_token({
        "account_id": account["id"],
        "firm_id": account["firm_id"],
        "plan_id": account["plan_id"],
        "device_id": device_id,
        "role": "admin"
    })

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,  # Required for HTTPS
        samesite="none",  # Required for cross-domain cookies
        max_age=30 * 24 * 60 * 60  # 30 days
    )

    # Send profile list for profile-login
    profiles = supabase.table("profiles") \
        .select("id, username") \
        .eq("firm_id", account["firm_id"]) \
        .execute().data
    
    # Get plan name
    plan_res = supabase.table("plans") \
        .select("name") \
        .eq("id", account["plan_id"]) \
        .execute()
    
    if not plan_res.data:
        raise HTTPException(500, "Plan not found")
    
    plan = plan_res.data[0]
    
    log_audit_event(
    action=LOGIN,
    account_id=account["id"],
    firm_id=account["firm_id"],
    ip_address=request.client.host,
    user_agent=request.headers.get("user-agent")
    )

    return {
        "ok": True,
        "role": "admin",
        "plan": plan["name"].lower(),
        "profiles": profiles
    }




# =========================================================
# ✅ PROFILE LOGIN
# =========================================================

@router.post("/profile-login")
def profile_login(payload: ProfileLoginRequest, request: Request, response: Response):

    # Use device_id from payload (frontend localStorage)
    device_id = payload.device_id
    
    # Get admin session from cookie (if exists)
    token = request.cookies.get("access_token")
    
    # If no cookie, check if session exists in DB using device_id
    if not token:
        # Try to find existing session by device_id
        try:
            session_res = supabase.table("active_sessions") \
                .select("*") \
                .eq("device_id", device_id) \
                .eq("is_active", True) \
                .execute()
        except (httpx.ReadTimeout, httpx.ConnectTimeout, Exception) as e:
            print(f"❌ Session fetch timeout/error: {e}")
            raise HTTPException(503, "Service temporarily unavailable. Please try again.")
        
        if not session_res.data:
            raise HTTPException(401, "No active session found. Please login as admin first.")
        
        session = session_res.data[0]
        account_id = session["account_id"]
        firm_id = session["firm_id"]
    else:
        # Cookie exists, decode it
        admin_payload = decode_access_token(token)
        account_id = admin_payload.get("account_id")
        firm_id = admin_payload.get("firm_id")
        
        # Verify device_id matches
        token_device_id = admin_payload.get("device_id")
        if token_device_id != device_id:
            raise HTTPException(401, "Device ID mismatch. Please login again.")
    
    if not account_id or not firm_id:
        raise HTTPException(401, "Invalid session")

    # Verify session is active in DB
    try:
        admin_session_res = (
            supabase.table("active_sessions")
            .select("*")
            .eq("device_id", device_id)
            .eq("account_id", account_id)
            .eq("is_active", True)
            .execute()
        )
    except (httpx.ReadTimeout, httpx.ConnectTimeout, Exception) as e:
        print(f"❌ Admin session verification timeout/error: {e}")
        raise HTTPException(503, "Service temporarily unavailable. Please try again.")

    if not admin_session_res.data:
        raise HTTPException(
            status_code=401,
            detail="No active session found. Please login as admin first."
        )
    
    # Get current session state
    current_session = admin_session_res.data[0]
    current_profile_id = current_session.get("profile_id")
    
    # ✅ If profile is already active on this device
    if current_profile_id is not None:
        # If trying to login to the SAME profile - allow (cookie recovery)
        if current_profile_id == payload.profile_id:
            # Just refresh the session and issue new cookie
            pass
        else:
            # Different profile - block and show error
            try:
                current_profile_res = supabase.table("profiles") \
                    .select("username") \
                    .eq("id", current_profile_id) \
                    .execute()
            except (httpx.ReadTimeout, httpx.ConnectTimeout, Exception) as e:
                print(f"❌ Current profile fetch timeout/error: {e}")
                raise HTTPException(503, "Service temporarily unavailable. Please try again.")
            
            if not current_profile_res.data:
                raise HTTPException(404, "Current profile not found")
            
            current_profile = current_profile_res.data[0]
            
            raise HTTPException(
                status_code=409,
                detail=f"Profile '{current_profile['username']}' is already active on this device. Logout first."
            )

    # -------------------------------
    # 1️⃣ Fetch Profile
    # -------------------------------
    try:
        profile_res = supabase.table("profiles") \
            .select("id, firm_id, username, password_hash") \
            .eq("id", int(payload.profile_id)) \
            .execute()
    except (httpx.ReadTimeout, httpx.ConnectTimeout, Exception) as e:
        print(f"❌ Profile fetch timeout/error: {e}")
        raise HTTPException(503, "Service temporarily unavailable. Please try again.")

    if not profile_res.data:
        raise HTTPException(404, "Profile not found")
    
    profile = profile_res.data[0]

    if not bcrypt.checkpw(payload.password.encode(), profile["password_hash"].encode()):
        # ✅ Password is wrong - refresh admin token to preserve session
        admin_token = create_access_token({
            "account_id": account_id,
            "firm_id": firm_id,
            "plan_id": admin_payload.get("plan_id"),
            "device_id": device_id,
            "role": "admin"
        })
        
        # Use 200 OK with error flag so browser accepts the cookie
        error_response = JSONResponse(
            status_code=200,
            content={"ok": False, "error": "Invalid profile credentials"}
        )
        error_response.set_cookie(
            key="access_token",
            value=admin_token,
            httponly=True,
            samesite="lax"
        )
        return error_response

    # -------------------------------
    # 2️⃣ Verify Profile belongs to Admin's Firm
    # -------------------------------
    if profile["firm_id"] != firm_id:
        raise HTTPException(403, "Profile does not belong to your firm")

    # ✅ ✅ FIRM-LEVEL SUBSCRIPTION CHECK (PRIME / VIP)
    enforce_active_firm_subscription(firm_id)

    # Get plan_id
    try:
        account_res = supabase.table("accounts") \
            .select("plan_id") \
            .eq("id", account_id) \
            .execute()
    except (httpx.ReadTimeout, httpx.ConnectTimeout, Exception) as e:
        print(f"❌ Account fetch timeout/error: {e}")
        raise HTTPException(503, "Service temporarily unavailable. Please try again.")
    
    if not account_res.data:
        raise HTTPException(404, "Account not found")
    
    plan_id = account_res.data[0]["plan_id"]

    # -------------------------------
    # 3️⃣ DEVICE & PROFILE ENFORCEMENT
    # -------------------------------
    enforce_device_and_profile_limits(
        account_id=account_id,
        plan_id=plan_id,
        firm_id=firm_id,
        profile_id=profile["id"],
        device_id=device_id,
        ip_address=request.client.host
    )

    # -------------------------------
    # 4️⃣ ATTACH PROFILE TO SAME SESSION
    # -------------------------------
    try:
        supabase.table("active_sessions").update({
            "profile_id": profile["id"],
            "last_seen": datetime.utcnow().isoformat()
        }).eq("device_id", device_id).eq("is_active", True).execute()
    except (httpx.ReadTimeout, httpx.ConnectTimeout, Exception) as e:
        print(f"❌ Session update timeout/error: {e}")
        raise HTTPException(503, "Service temporarily unavailable. Please try again.")

    # -------------------------------
    # 5️⃣ ISSUE PROFILE TOKEN
    # -------------------------------
    token = create_access_token({
        "account_id": account_id,
        "firm_id": firm_id,
        "profile_id": profile["id"],
        "plan_id": plan_id,
        "device_id": device_id,
        "role": "profile"
    })

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,  # Required for HTTPS
        samesite="none",  # Required for cross-domain cookies
        max_age=30 * 24 * 60 * 60  # 30 days
    )

    log_audit_event(
    action=PROFILE_LOGIN,
    account_id=account_id,
    firm_id=firm_id,
    profile_id=profile["id"],
    ip_address=request.client.host,
    user_agent=request.headers.get("user-agent")
    )


    return {
        "ok": True,
        "profile_id": profile["id"]
    }


# =========================================================
# ✅ LOGOUT
# =========================================================
@router.post("/logout")
def full_logout(request: Request, response: Response):

    token = request.cookies.get("access_token")

    if not token:
        response.delete_cookie("access_token")
        return {"ok": True, "message": "Already logged out"}

    try:
        payload = decode_access_token(token)
    except:
        response.delete_cookie("access_token")
        return {"ok": True, "message": "Session cleared"}

    device_id = payload.get("device_id")

    if not device_id:
        response.delete_cookie("access_token")
        return {"ok": True, "message": "Session cleared"}

    # ✅ HARD LOGOUT — DEVICE + PROFILE BOTH CLEARED
    supabase.table("active_sessions").update({
        "is_active": False,
        "profile_id": None,    # ✅ CRITICAL FIX
        "last_seen": datetime.utcnow().isoformat()
    }).eq("device_id", device_id).eq("is_active", True).execute()

    response.delete_cookie("access_token")


    log_audit_event(
    action=LOGOUT,
    account_id=payload.get("account_id"),
    firm_id=payload.get("firm_id"),
    profile_id=payload.get("profile_id")
    )


    return {
        "ok": True,
        "message": "Full logout successful. Device released."
    }

@router.get("/session/restore")
def restore_session(request: Request):
    """
    SESSION RESTORATION ENDPOINT
    
    Checks if user has an active session based on device_id in localStorage.
    Returns session details if active, null if no active session.
    
    This enables automatic login restoration when user:
    - Closes browser and returns
    - Refreshes page
    - Loses network connection
    
    Flow:
    1. Frontend sends device_id from localStorage
    2. Backend checks active_sessions table
    3. Returns session type and redirect info
    4. Frontend auto-restores auth state
    """
    try:
        # Get device_id from cookie JWT if exists
        auth_cookie = request.cookies.get("access_token")
        
        if not auth_cookie:
            print("❌ Session restore: No access_token cookie found")
            return {"ok": True, "session": None}
        
        # Decode JWT to get device_id and account_id
        try:
            payload = decode_access_token(auth_cookie)
        except Exception:
            return {"ok": True, "session": None}
        
        device_id = payload.get("device_id")
        account_id = payload.get("account_id")
        profile_id = payload.get("profile_id")
        
        if not device_id or not account_id:
            return {"ok": True, "session": None}
        
        # Check if session is active in database
        active_session = supabase.table("active_sessions") \
            .select("id") \
            .eq("account_id", account_id) \
            .eq("device_id", device_id) \
            .eq("is_active", True) \
            .execute()
        
        if not active_session.data:
            return {"ok": True, "session": None}
        
        # Fetch account details
        account_res = supabase.table("accounts") \
            .select("email, full_name, plan_id, firm_id") \
            .eq("id", account_id) \
            .execute()
        
        if not account_res.data:
            raise HTTPException(404, "Account not found")
        
        account = account_res.data[0]
        
        plan_name = get_plan_name_cached(account["plan_id"])  # CLASSIC, PRIME, VIP
        
        # Determine session type and redirect path
        session_type = None
        redirect_to = None
        profile_username = None
        
        if profile_id:
            # Profile login (PRIME/VIP)
            profile_res = supabase.table("profiles") \
                .select("username") \
                .eq("id", profile_id) \
                .execute()
            
            if profile_res.data:
                profile_username = profile_res.data[0]["username"]
                session_type = "profile"
                redirect_to = "/dashboard"  # or last visited tool page
        
        elif account["firm_id"]:
            # Admin login (PRIME/VIP) - has firm but no profile_id
            session_type = "admin"
            redirect_to = "/profile-selection"
            print(f"🔍 Session Restore: Admin detected - firm_id={account['firm_id']}, profile_id={profile_id}")
        
        else:
            # Classic login - no firm, no profile
            session_type = "classic"
            redirect_to = "/dashboard"
        
        print(f"✅ Session Restore Response: type={session_type}, redirect_to={redirect_to}, account_id={account_id}")
        
        return {
            "ok": True,
            "session": {
                "type": session_type,
                "account_id": account_id,
                "email": account["email"],
                "full_name": account.get("full_name"),
                "role": session_type,  # classic, admin, or profile
                "plan": plan_name,
                "profile_id": profile_id,
                "profile_username": profile_username,
                "redirect_to": redirect_to,
                "device_id": device_id
            }
        }
    
    except Exception as e:
        # Don't fail the app on restoration errors
        print(f"Session restoration error: {e}")
        return {"ok": True, "session": None}


@router.get("/me")
def get_current_user_api(request: Request):
    """
    Returns detailed user profile information based on JWT cookie.
    """
    # Handle plan expiration with auto-logout
    try:
        user = get_current_user_from_cookie(request)
    except HTTPException as e:
        print(f"🔍 /me endpoint caught HTTPException: status={e.status_code}, detail={e.detail}")
        
        # Handle plan expiration - auto logout (includes "Plan expired" and "No active subscription")
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
        # Re-raise other errors
        print(f"🔄 Re-raising non-plan-expiration error: {e.detail}")
        raise
    
    account_id = user.get("account_id")
    profile_id = user.get("profile_id")
    firm_id = user.get("firm_id")
    role = user.get("role")

    # Fetch account details
    account_res = supabase.table("accounts") \
        .select("email, full_name, plan_id, firm_id") \
        .eq("id", account_id) \
        .execute()
    
    if not account_res.data:
        raise HTTPException(404, "Account not found")
    
    account = account_res.data[0]

    plan_name = get_plan_name_cached(account["plan_id"])

    # Fetch profile name if logged in as profile
    profile_name = None
    if profile_id:
        profile_res = supabase.table("profiles") \
            .select("username") \
            .eq("id", profile_id) \
            .execute()
        
        if profile_res.data:
            profile_name = profile_res.data[0]["username"]

    # Fetch subscription end date
    subscription = supabase.table("subscriptions") \
        .select("end_date, status") \
        .eq("account_id", account_id) \
        .eq("status", "ACTIVE") \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()
    
    expires_at = None
    if subscription.data:
        expires_at = subscription.data[0].get("end_date")

    return {
        "ok": True,
        "account_id": account_id,
        "email": account["email"],
        "full_name": account.get("full_name"),
        "role": role,
        "plan": plan_name,
        "expires_at": expires_at,
        "profile_id": profile_id,
        "profile_name": profile_name,
        "firm_id": firm_id
    }


@router.get("/process-history")
def get_process_history(request: Request):
    """
    Get user's recent process history from audit logs
    Returns last 50 activities
    """
    try:
        user = get_current_user_from_cookie(request)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    account_id = user.get("account_id")
    profile_id = user.get("profile_id")
    
    # Fetch recent audit logs for this user
    query = supabase.table("audit_logs") \
        .select("action, metadata, created_at") \
        .eq("account_id", account_id) \
        .order("created_at", desc=True) \
        .limit(50)
    
    # Filter by profile if logged in as profile
    if profile_id:
        query = query.eq("profile_id", profile_id)
    
    logs = query.execute()
    
    # Format the activities
    activities = []
    for log in logs.data:
        activity = {
            "action": log["action"],
            "details": log.get("metadata", {}),
            "timestamp": log["created_at"]
        }
        activities.append(activity)
    
    return {
        "ok": True,
        "activities": activities
    }


@router.get("/profiles-list")
def get_profiles_list(request: Request):
    """
    Get list of all profiles under current account's firm
    For Classic plan users (no firm), returns empty list
    """
    try:
        user = get_current_user_from_cookie(request)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # For Classic users, there are no profiles (no firm)
    # Check if user has a firm
    account_res = supabase.table("accounts") \
        .select("firm_id") \
        .eq("id", user.get("account_id")) \
        .execute()
    
    if not account_res.data or not account_res.data[0].get("firm_id"):
        # Classic user - no firm, no profiles
        return {
            "ok": True,
            "profiles": [],
            "current_profile_id": user.get("profile_id")
        }
    
    firm_id = account_res.data[0]["firm_id"]
    
    # Fetch all profiles for this firm
    profiles = supabase.table("profiles") \
        .select("id, username, created_at") \
        .eq("firm_id", firm_id) \
        .order("created_at", desc=False) \
        .execute()
    
    return {
        "ok": True,
        "profiles": profiles.data or [],
        "current_profile_id": user.get("profile_id")
    }


# =========================================================
# ✅ CLASSIC SIGNUP – STEP 1
# =========================================================

@router.post("/classic/signup-start")
def classic_signup_start(payload: ClassicSignupStartRequest):

    # 1️⃣ Check if email already exists
    existing = supabase.table("accounts") \
        .select("id, email_verified, password_hash, onboarding_status, plan_id") \
        .eq("email", payload.email) \
        .execute()

    if existing.data:
        acc = existing.data[0]

        # ✅ If email verified AND password set AND onboarding complete → must login
        if acc["email_verified"] and acc["password_hash"] and acc["onboarding_status"] == "COMPLETE":
            raise HTTPException(
                status_code=400,
                detail="Email already registered and verified. Please login."
            )

        # 🔄 If email verified AND payment is PENDING → resume payment
        if acc["email_verified"]:
            # Check subscription payment status
            subscription = supabase.table("subscriptions") \
                .select("id, payment_status, plan_id") \
                .eq("account_id", acc["id"]) \
                .execute()
            
            if subscription.data and subscription.data[0]["payment_status"] == "PENDING":
                # Fetch plan details for resume
                plan_res = supabase.table("plans") \
                    .select("id, name, price") \
                    .eq("id", subscription.data[0]["plan_id"]) \
                    .execute()
                
                if not plan_res.data:
                    raise HTTPException(400, "Plan not found")
                
                plan = plan_res.data[0]
                
                return {
                    "ok": True,
                    "message": "Payment pending. Resume payment.",
                    "account_id": acc["id"],
                    "resume_payment": True,
                    "plan_id": plan.data["id"],
                    "plan_name": plan.data["name"],
                    "plan_price": plan.data["price"]
                }

        # ✅ If email verified BUT password NOT set AND payment done → skip to password
        if acc["email_verified"] and not acc["password_hash"] and acc["onboarding_status"] == "PAYMENT_DONE":
            return {
                "ok": True,
                "message": "Payment completed. Set your password.",
                "account_id": acc["id"],
                "skip_to_password": True
            }

        # ✅ If email verified BUT no payment yet → skip OTP, go to payment
        if acc["email_verified"]:
            return {
                "ok": True,
                "message": "Email already verified. Proceed to payment.",
                "account_id": acc["id"],
                "skip_otp": True
            }

        # ✅ If NOT verified → Check for existing OTP or send new one
        now = datetime.utcnow()
        
        # Check if valid OTP already exists
        existing_otp = supabase.table("email_otps") \
            .select("id, created_at, expires_at") \
            .eq("account_id", acc["id"]) \
            .eq("used", False) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        
        if existing_otp.data:
            otp_row = existing_otp.data[0]
            expires_at = parse_db_timestamp_to_naive_utc(otp_row["expires_at"])
            created_at = parse_db_timestamp_to_naive_utc(otp_row["created_at"])
            
            # Check if OTP is still valid (not expired)
            if now < expires_at:
                # OTP is still valid - calculate remaining times
                remaining_validity_seconds = int((expires_at - now).total_seconds())
                time_since_creation = int((now - created_at).total_seconds())
                remaining_resend_cooldown = max(0, OTP_RESEND_COOLDOWN_SECONDS - time_since_creation)
                
                return {
                    "ok": True,
                    "message": "Valid OTP already exists",
                    "account_id": acc["id"],
                    "otp_exists": True,
                    "remaining_validity_seconds": remaining_validity_seconds,
                    "remaining_resend_cooldown_seconds": remaining_resend_cooldown
                }
        
        # No valid OTP exists - issue new one
        issue_otp_for_account(acc["id"], payload.email)

        return {
            "ok": True,
            "message": "OTP re-sent to email",
            "account_id": acc["id"]
        }

    # ============================
    # ✅ NEW ACCOUNT CREATION FLOW
    # ============================

    # 2️⃣ Fetch CLASSIC plan ID
    plan_res = supabase.table("plans") \
        .select("id") \
        .eq("name", "CLASSIC") \
        .single() \
        .execute()

    if not plan_res.data:
        raise HTTPException(500, "CLASSIC plan not found in DB")

    classic_plan_id = plan_res.data["id"]

    # 3️⃣ Create Classic account (with plan, no firm)
    acc = supabase.table("accounts").insert({
        "email": payload.email,
        "full_name": "",
        "password_hash": "",
        "email_verified": False,
        "plan_id": classic_plan_id,
        "firm_id": None
    }).execute()

    account_id = acc.data[0]["id"]

    # 4️⃣ Issue OTP securely
    issue_otp_for_account(account_id, payload.email)

    return {
        "ok": True,
        "message": "OTP sent to email",
        "account_id": account_id   # required for step-2
    }


# # =========================================================
# # ✅ CLASSIC SIGNUP – STEP 2
# # =========================================================

# @router.post("/classic/signup-complete")
# def classic_signup_complete(payload: ClassicSignupCompleteRequest):

#     # 1️⃣ Fetch account
#     acc = supabase.table("accounts") \
#         .select("id, email, plan_id") \
#         .eq("id", payload.account_id) \
#         .single() \
#         .execute()

#     if not acc.data:
#         raise HTTPException(404, "Account not found")

#     account = acc.data

#     # 2️⃣ Validate OTP (hash + expiry) and consume it
#     validate_and_consume_otp(account_id=payload.account_id, otp_input=payload.otp)

#     # 3️⃣ Set password + verify email
#     pwd_hash = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode()

#     supabase.table("accounts") \
#         .update({
#             "password_hash": pwd_hash,
#             "email_verified": True
#         }) \
#         .eq("id", payload.account_id) \
#         .execute()

#     # 4️⃣ Auto-create Classic subscription
#     classic_plan = supabase.table("plans") \
#         .select("id, duration_months") \
#         .eq("name", "CLASSIC") \
#         .single() \
#         .execute()

#     if not classic_plan.data:
#         raise HTTPException(500, "Classic plan not found in DB")

#     plan_id = classic_plan.data["id"]
#     duration_months = classic_plan.data["duration_months"]

#     start_date = date.today()
#     end_date = start_date + timedelta(days=30 * duration_months)

#     supabase.table("subscriptions").insert({
#         "account_id": payload.account_id,
#         "plan_id": plan_id,
#         "firm_id": None,
#         "status": "ACTIVE",
#         "start_date": str(start_date),
#         "end_date": str(end_date)
#     }).execute()

#     return {
#         "ok": True,
#         "message": "Classic user signup complete. Subscription activated. Please login to start using tools."
#     }




class ClassicVerifyOTPRequest(BaseModel):
    account_id: int
    otp: str
@router.post("/classic/verify-otp")
def classic_verify_otp(payload: ClassicVerifyOTPRequest):

    # 1️⃣ Confirm account exists
    acc = supabase.table("accounts") \
        .select("id, email_verified") \
        .eq("id", payload.account_id) \
        .single() \
        .execute()

    if not acc.data:
        raise HTTPException(404, "Account not found")

    # 2️⃣ Validate OTP + consume
    validate_and_consume_otp(
        account_id=payload.account_id,
        otp_input=payload.otp
    )

    # 3️⃣ Mark email verified
    supabase.table("accounts") \
        .update({"email_verified": True}) \
        .eq("id", payload.account_id) \
        .execute()

    return {
        "ok": True,
        "message": "OTP verified — please set your password now."
    }


class ClassicSetPasswordRequest(BaseModel):
    account_id: int
    password: str
@router.post("/classic/set-password")
def classic_set_password(payload: ClassicSetPasswordRequest):

    # 1️⃣ confirm account exists + verified
    acc_res = supabase.table("accounts") \
        .select("id, email_verified, onboarding_status, plan_id") \
        .eq("id", payload.account_id) \
        .execute()

    if not acc_res.data:
        raise HTTPException(404, "Account not found")
    
    acc = acc_res.data[0]

    if not acc["email_verified"]:
        raise HTTPException(400, "Verify OTP first")

    # 2️⃣ hash password & update account with COMPLETE onboarding status
    pwd_hash = bcrypt.hashpw(
        payload.password.encode(),
        bcrypt.gensalt()
    ).decode()

    supabase.table("accounts") \
        .update({
            "password_hash": pwd_hash,
            "onboarding_status": "COMPLETE"
        }) \
        .eq("id", payload.account_id) \
        .execute()

    # 3️⃣ Check if subscription already exists (from payment flow)
    existing_sub = supabase.table("subscriptions") \
        .select("id, payment_status") \
        .eq("account_id", payload.account_id) \
        .execute()

    # 4️⃣ If subscription doesn't exist, create it (backwards compatibility)
    if not existing_sub.data:
        # fetch classic plan info
        classic_plan = supabase.table("plans") \
            .select("id, duration_months") \
            .eq("name", "CLASSIC") \
            .single() \
            .execute()

        if not classic_plan.data:
            raise HTTPException(500, "CLASSIC plan missing")

        plan_id = classic_plan.data["id"]
        duration_months = classic_plan.data["duration_months"]

        # start subscription
        start = date.today()
        end = start + timedelta(days=30 * duration_months)

        supabase.table("subscriptions").insert({
            "account_id": payload.account_id,
            "plan_id": plan_id,
            "firm_id": None,
            "status": "ACTIVE",
            "payment_status": "PAID",  # Mark as paid for backwards compatibility
            "start_date": start.isoformat(),
            "end_date": end.isoformat()
        }).execute()

    return {
        "ok": True,
        "message": "Password set — Classic account created. Please login."
    }



# =========================================================
# ✅ MULTIPLE PROFILES (ADMIN OR PROFILE SESSION)
# =========================================================
@router.post("/admin/create-profile")
def create_extra_profile(
    payload: CreateExtraProfileRequest,
    request: Request
):
    # Allow both admin and profile sessions to create new profiles
    # Handle plan expiration with auto-logout
    try:
        user = get_current_user_from_cookie(request)
    except HTTPException as e:
        # Handle plan expiration - auto logout
        if e.status_code == 403 and ("plan expired" in e.detail.lower() or "subscription expired" in e.detail.lower()):
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
        # Re-raise other errors
        raise

    firm_id = user["firm_id"]
    plan_id = user["plan_id"]

    # 1️⃣ Get plan limit
    plan_res = supabase.table("plans") \
        .select("max_profiles") \
        .eq("id", plan_id) \
        .execute()
    
    if not plan_res.data:
        raise HTTPException(500, "Plan not found")
    
    max_profiles = plan_res.data[0]["max_profiles"]

    # 2️⃣ Count existing profiles
    count = supabase.table("profiles") \
        .select("id") \
        .eq("firm_id", firm_id) \
        .execute()

    if len(count.data) >= max_profiles:
        raise HTTPException(403, f"Max profile limit reached ({max_profiles} profiles)")

    # 3️⃣ Create profile
    pwd_hash = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode()

    try:
        prof = supabase.table("profiles").insert({
            "firm_id": firm_id,
            "username": payload.username,
            "password_hash": pwd_hash
        }).execute()
    except Exception as e:
        # Check for duplicate username constraint violation
        error_str = str(e)
        if '23505' in error_str or 'duplicate key' in error_str.lower() or 'already exists' in error_str.lower():
            raise HTTPException(400, "Username already exists")
        # Re-raise other errors
        raise

    return {
        "ok": True,
        "message": "New profile created successfully",
        "profile_id": prof.data[0]["id"]
    }


# =========================================================
# ✅ DELETE PROFILE (ADMIN ONLY)
# =========================================================
class DeleteProfileRequest(BaseModel):
    profile_id: int


@router.delete("/admin/delete-profile")
def delete_profile(
    payload: DeleteProfileRequest,
    request: Request
):
    from app.security.admin_guard import get_current_admin

    admin = get_current_admin(request)

    firm_id = admin["firm_id"]

    # 1️⃣ Get profile details
    profile = supabase.table("profiles") \
        .select("id, username, firm_id") \
        .eq("id", payload.profile_id) \
        .single() \
        .execute()

    if not profile.data:
        raise HTTPException(404, "Profile not found")

    # 2️⃣ Verify profile belongs to same firm
    if profile.data["firm_id"] != firm_id:
        raise HTTPException(403, "Cannot delete profile from another firm")

    # 3️⃣ Cannot delete profile1 (primary profile)
    if profile.data["username"] == "profile1":
        raise HTTPException(403, "Cannot delete the primary profile (profile1)")

    # 4️⃣ Check if profile is currently active
    active_session = supabase.table("active_sessions") \
        .select("id") \
        .eq("profile_id", payload.profile_id) \
        .eq("is_active", True) \
        .execute()

    if active_session.data:
        raise HTTPException(409, "Cannot delete profile that is currently active. Please logout first.")

    # 5️⃣ Delete profile
    supabase.table("profiles") \
        .delete() \
        .eq("id", payload.profile_id) \
        .execute()

    return {
        "ok": True,
        "message": f"Profile '{profile.data['username']}' deleted successfully"
    }


# =========================================================
# ✅ LIST PROFILES (ADMIN OR PROFILE ACCESS)
# =========================================================
@router.get("/admin/list-profiles")
def list_profiles(request: Request):
    from app.security.cookie_auth import get_current_user_from_cookie

    try:
        user = get_current_user_from_cookie(request)
    except HTTPException as e:
        # Handle plan expiration - auto logout
        if e.status_code == 403 and ("plan expired" in e.detail.lower() or "subscription expired" in e.detail.lower()):
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
        # Log the error for debugging
        print(f"❌ list-profiles auth failed: {e.detail}")
        print(f"   Cookie: {request.cookies.get('access_token')[:50] if request.cookies.get('access_token') else 'None'}...")
        raise

    firm_id = user.get("firm_id")
    account_id = user.get("account_id")
    
    if not firm_id:
        raise HTTPException(403, "No firm access")

    # Get all profiles for this firm
    try:
        profiles = supabase.table("profiles") \
            .select("id, username, created_at") \
            .eq("firm_id", firm_id) \
            .order("created_at") \
            .execute()
    except (httpx.ReadTimeout, httpx.ConnectTimeout, Exception) as e:
        print(f"❌ Profiles fetch timeout/error: {e}")
        raise HTTPException(503, "Service temporarily unavailable. Please try again.")

    # Get current plan
    plan_name = ""
    try:
        plan_id = user.get("plan_id")
        if plan_id:
            plan_res = supabase.table("plans").select("name").eq("id", plan_id).execute()
            if plan_res.data:
                plan_name = plan_res.data[0].get("name", "")
    except (httpx.ReadTimeout, httpx.ConnectTimeout, Exception) as e:
        print(f"⚠️ Plan fetch timeout/error (non-critical): {e}")
        pass

    return {
        "ok": True,
        "profiles": profiles.data,
        "plan": plan_name
    }


@router.post("/profile-logout")
def profile_logout(request: Request, response: Response):

    token = request.cookies.get("access_token")
    if not token:
        return {"ok": True}

    payload = decode_access_token(token)
    device_id = payload.get("device_id")
    account_id = payload.get("account_id")
    firm_id = payload.get("firm_id")
    plan_id = payload.get("plan_id")

    # ✅ Detach profile but KEEP admin session alive
    try:
        supabase.table("active_sessions").update({
            "profile_id": None,
            "last_seen": datetime.utcnow().isoformat()
        }).eq("device_id", device_id).eq("is_active", True).execute()
    except (httpx.ReadTimeout, httpx.ConnectTimeout, Exception) as e:
        print(f"❌ Profile logout session update timeout/error: {e}")
        # Continue anyway - issue new token
        pass

    # ✅ ISSUE NEW ADMIN TOKEN
    admin_token = create_access_token({
        "account_id": account_id,
        "firm_id": firm_id,
        "plan_id": plan_id,
        "device_id": device_id,
        "role": "admin"
    })

    response.set_cookie(
        key="access_token",
        value=admin_token,
        httponly=True,
        secure=True,  # Required for HTTPS
        samesite="none"  # Required for cross-domain cookies
    )

    log_audit_event(
    action=LOGOUT,
    account_id=account_id,
    firm_id=firm_id,
    profile_id=payload.get("profile_id"),
    metadata={"type": "profile_logout"}
    )


    return {"ok": True, "message": "Returned to admin session"}


from datetime import date, timedelta
from fastapi import HTTPException
from datetime import date, timedelta
from fastapi import HTTPException
from app.supabase_client import supabase


@router.post("/renew-plan")
def renew_plan(account_id: int):

    today = date.today()

    # ✅ 1. Fetch latest subscription
    sub_res = supabase.table("subscriptions") \
        .select("id, plan_id") \
        .eq("account_id", account_id) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()

    if not sub_res.data:
        raise HTTPException(404, "No subscription found for renewal")

    sub = sub_res.data[0]
    plan_id = sub["plan_id"]
    sub_id = sub["id"]

    # ✅ 2. Decide duration based on plan
    # Classic = 4 months (120 days)
    # Prime/VIP = 6 months (180 days)
    if plan_id == 1:          # ✅ Classic
        new_end = today + timedelta(days=120)
    else:                     # ✅ Prime / VIP
        new_end = today + timedelta(days=180)

    # ✅ 3. Renew subscription
    supabase.table("subscriptions").update({
        "status": "ACTIVE",
        "start_date": today.isoformat(),
        "end_date": new_end.isoformat()
    }).eq("id", sub_id).execute()

    log_audit_event(
    action=PLAN_RENEWED,
    account_id=account_id,
    firm_id=None,
    metadata={
        "plan_id": plan_id,
        "new_end_date": new_end.isoformat(),
        "months": 4 if plan_id == 1 else 6
    }
    )

    

    return {
        "ok": True,
        "message": "Plan renewed successfully",
        "valid_till": new_end.isoformat(),
        "months": 4 if plan_id == 1 else 6
    }


@router.post("/validate-for-renew")
def validate_for_renew(
    email: str = Body(...),
    password: str = Body(...)
):
    """
    Validate email and password, return account_id if valid
    Used for plan renewal workflow
    """
    # ✅ 1. Find account by email
    account_res = supabase.table("accounts") \
        .select("id, email, password_hash") \
        .eq("email", email) \
        .limit(1) \
        .execute()

    if not account_res.data:
        raise HTTPException(404, "Account not found")

    account = account_res.data[0]

    # ✅ 2. Verify password
    if not bcrypt.checkpw(password.encode(), account["password_hash"].encode()):
        raise HTTPException(401, "Invalid credentials")

    # ✅ 3. Return account_id
    return {
        "ok": True,
        "account_id": account["id"],
        "email": account["email"]
    }


#Upgrade PRIME to VIP (admin only, no payment yet)
@router.post("/upgrade-to-vip")
def upgrade_prime_to_vip(
    user = Depends(get_current_user_from_cookie)
):
    """
    Upgrade PRIME firm to VIP
    Allowed for ADMIN and PROFILE sessions
    """

    # ------------------------------------------------
    # 1️⃣ AUTHORIZATION
    # ------------------------------------------------
    if user.get("role") not in ("admin", "profile"):
        raise HTTPException(
            status_code=403,
            detail="Admin or Profile login required"
        )

    account_id = user["account_id"]
    firm_id = user.get("firm_id")

    if not firm_id:
        raise HTTPException(status_code=400, detail="Firm context required")

    # ------------------------------------------------
    # 2️⃣ ACTIVE SUBSCRIPTION
    # ------------------------------------------------
    sub = (
        supabase.table("subscriptions")
        .select("*")
        .eq("firm_id", firm_id)
        .eq("status", "ACTIVE")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not sub.data:
        raise HTTPException(status_code=404, detail="No active subscription found")

    current_sub = sub.data[0]

    # ------------------------------------------------
    # 3️⃣ CURRENT PLAN
    # ------------------------------------------------
    plan_res = (
        supabase.table("plans")
        .select("id, name")
        .eq("id", current_sub["plan_id"])
        .execute()
    )
    
    if not plan_res.data:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    plan = plan_res.data[0]

    if plan["name"] == "VIP":
        raise HTTPException(status_code=400, detail="Already on VIP plan")

    if plan["name"] != "PRIME":
        raise HTTPException(status_code=400, detail="Only PRIME can upgrade")

    # ------------------------------------------------
    # 4️⃣ VIP PLAN
    # ------------------------------------------------
    vip_plan_res = (
        supabase.table("plans")
        .select("*")
        .eq("name", "VIP")
        .execute()
    )
    
    if not vip_plan_res.data:
        raise HTTPException(status_code=404, detail="VIP plan not found")
    
    vip_plan = vip_plan_res.data[0]

    # ------------------------------------------------
    # 5️⃣ EXPIRE CURRENT SUBSCRIPTION
    # ------------------------------------------------
    supabase.table("subscriptions").update({
        "status": "EXPIRED",
        "end_date": date.today().isoformat()
    }).eq("id", current_sub["id"]).execute()

    # ------------------------------------------------
    # 6️⃣ CREATE VIP SUBSCRIPTION
    # ------------------------------------------------
    start = date.today()
    end = start + timedelta(days=30 * vip_plan["duration_months"])

    supabase.table("subscriptions").insert({
        "account_id": account_id,
        "firm_id": firm_id,
        "plan_id": vip_plan["id"],
        "status": "ACTIVE",
        "start_date": start.isoformat(),
        "end_date": end.isoformat()
    }).execute()

    # ------------------------------------------------
    # 7️⃣ UPDATE PLAN REFERENCES
    # ------------------------------------------------
    supabase.table("firms").update({
        "plan_id": vip_plan["id"]
    }).eq("id", firm_id).execute()

    supabase.table("accounts").update({
        "plan_id": vip_plan["id"]
    }).eq("id", account_id).execute()


    log_audit_event(
    action=PLAN_UPGRADE_PRIME_TO_VIP,
    account_id=account_id,
    firm_id=firm_id,
    profile_id=user.get("profile_id"),
    metadata={
        "old_plan": "PRIME",
        "new_plan": "VIP"
    }
)


# =========================================================
# ✅ PAYMENT ENDPOINTS (DUMMY RAZORPAY-COMPATIBLE)
# =========================================================

@router.post("/payment/complete")
def complete_payment(payload: PaymentCompleteRequest):
    """
    DUMMY PAYMENT COMPLETION ENDPOINT
    
    Simulates Razorpay payment completion.
    Later, this will be called with real Razorpay IDs.
    
    Flow:
    1. Validate account and plan exist
    2. Create/update subscription with payment details
    3. Update account onboarding status
    4. Return next step (password setup or firm onboarding)
    """
    
    # 1️⃣ Validate account exists
    account_res = supabase.table("accounts") \
        .select("id, email, email_verified, firm_id, plan_id") \
        .eq("id", payload.account_id) \
        .execute()
    
    if not account_res.data:
        raise HTTPException(404, "Account not found")
    
    account = account_res.data[0]
    
    if not account["email_verified"]:
        raise HTTPException(400, "Email must be verified before payment")
    
    account_id = account["id"]
    
    # 2️⃣ Fetch plan details
    plan_res = supabase.table("plans") \
        .select("*") \
        .eq("id", payload.plan_id) \
        .execute()
    
    if not plan_res.data:
        raise HTTPException(404, "Plan not found")
    
    plan = plan_res.data[0]
    
    plan_name = plan["name"]  # CLASSIC, PRIME, VIP
    
    # 3️⃣ Check if subscription already exists for this account + plan
    try:
        existing_sub = supabase.table("subscriptions") \
            .select("*") \
            .eq("account_id", account_id) \
            .eq("plan_id", payload.plan_id) \
            .execute()
    except Exception as e:
        print(f"❌ Error fetching subscription: {e}")
        raise HTTPException(500, "Database error while checking subscription")
    
    # Calculate subscription dates
    start = date.today()
    end = start + timedelta(days=30 * plan["duration_months"])
    
    try:
        if existing_sub.data:
            # Update existing subscription
            subscription_id = existing_sub.data[0]["id"]
            
            supabase.table("subscriptions").update({
                "payment_status": "PAID",
                "payment_order_id": payload.payment_order_id,
                "payment_id": payload.payment_id,
                "payment_signature": payload.payment_signature,
                "payment_date": datetime.now().isoformat(),
                "status": "ACTIVE",
                "start_date": start.isoformat(),
                "end_date": end.isoformat()
            }).eq("id", subscription_id).execute()
        else:
            # Create new subscription
            supabase.table("subscriptions").insert({
                "account_id": account_id,
                "plan_id": payload.plan_id,
                "firm_id": account.get("firm_id"),  # Will be None for Classic
                "status": "ACTIVE",
                "payment_status": "PAID",
                "payment_order_id": payload.payment_order_id,
                "payment_id": payload.payment_id,
                "payment_signature": payload.payment_signature,
                "payment_date": datetime.now().isoformat(),
                "start_date": start.isoformat(),
                "end_date": end.isoformat()
            }).execute()
    except Exception as e:
        print(f"❌ Error creating/updating subscription: {e}")
        raise HTTPException(500, "Database error while processing subscription. Please try again.")
    
    # 4️⃣ Update account onboarding status and full name from card owner
    try:
        supabase.table("accounts").update({
            "onboarding_status": "PAYMENT_DONE",
            "plan_id": payload.plan_id,  # Update account's current plan
            "full_name": payload.card_owner_name  # Store full name from payment card
        }).eq("id", account_id).execute()
    except Exception as e:
        print(f"❌ Error updating account: {e}")
        raise HTTPException(500, "Database error while updating account. Payment recorded but please contact support.")
    
    # 5️⃣ Determine next step based on plan
    if plan_name == "CLASSIC":
        next_step = "CLASSIC_PASSWORD"
    else:  # PRIME or VIP
        next_step = "PRIME_ONBOARD"
    
    return {
        "ok": True,
        "message": "Payment successful (dummy).",
        "next_step": next_step,
        "plan_name": plan_name
    }



    return {
        "ok": True,
        "message": "Firm upgraded from PRIME to VIP",
        "new_plan": "VIP"
    }


# =========================================================
# ✅ GET ALL PLANS (PUBLIC)
# =========================================================
@router.get("/plans")
def get_plans():
    """Get all available plans with their details"""
    plans = supabase.table("plans") \
        .select("id, name, price, duration_months, max_profiles") \
        .order("price") \
        .execute()
    
    if not plans.data:
        raise HTTPException(500, "No plans found in database")
    
    return plans.data


# =========================================================
# ✅ CHECK IF EMAIL ALREADY PURCHASED PLAN
# =========================================================
class CheckPurchaseRequest(BaseModel):
    email: str

@router.post("/payment/check-purchase")
def check_purchase(payload: CheckPurchaseRequest):
    """Check if email already has an active paid subscription"""
    
    # Check if account exists
    account = supabase.table("accounts") \
        .select("id, email_verified, onboarding_status") \
        .eq("email", payload.email) \
        .execute()
    
    if not account.data:
        return {
            "ok": True,
            "already_purchased": False,
            "message": "No account found"
        }
    
    acc = account.data[0]
    
    # Check if has active paid subscription
    subscription = supabase.table("subscriptions") \
        .select("id, payment_status, status") \
        .eq("account_id", acc["id"]) \
        .execute()
    
    if subscription.data:
        sub = subscription.data[0]
        
        # If payment is PAID and onboarding is COMPLETE
        if sub["payment_status"] == "PAID" and acc["onboarding_status"] == "COMPLETE":
            return {
                "ok": True,
                "already_purchased": True,
                "message": "This email already has an active subscription. Please sign in instead."
            }
    
    return {
        "ok": True,
        "already_purchased": False,
        "message": "No active subscription found"
    }


# =========================================================
# ✅ FORGOT PASSWORD FLOW
# =========================================================

class ForgotPasswordInitiateRequest(BaseModel):
    email: EmailStr

@router.post("/forgot-password/initiate")
def forgot_password_initiate(payload: ForgotPasswordInitiateRequest):
    """
    Step 1: Initiate forgot password flow
    - Check if email exists in accounts table
    - Check if valid OTP already exists
    - If exists: return remaining time info without blocking
    - If not: send new OTP
    """
    
    # 1️⃣ Check if account exists
    account = supabase.table("accounts") \
        .select("id, email") \
        .eq("email", payload.email) \
        .execute()
    
    if not account.data:
        raise HTTPException(400, "Email not present")
    
    acc = account.data[0]
    account_id = acc["id"]
    
    # 2️⃣ Check if valid OTP already exists
    now = datetime.utcnow()
    
    existing_otp = supabase.table("email_otps") \
        .select("id, created_at, expires_at") \
        .eq("account_id", account_id) \
        .eq("used", False) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()
    
    if existing_otp.data:
        otp_row = existing_otp.data[0]
        expires_at = parse_db_timestamp_to_naive_utc(otp_row["expires_at"])
        created_at = parse_db_timestamp_to_naive_utc(otp_row["created_at"])
        
        # Check if OTP is still valid (not expired)
        if now < expires_at:
            # OTP is still valid - calculate remaining times
            remaining_validity_seconds = int((expires_at - now).total_seconds())
            time_since_creation = int((now - created_at).total_seconds())
            remaining_resend_cooldown = max(0, OTP_RESEND_COOLDOWN_SECONDS - time_since_creation)
            
            return {
                "ok": True,
                "message": "Valid OTP already exists",
                "account_id": account_id,
                "otp_exists": True,
                "remaining_validity_seconds": remaining_validity_seconds,
                "remaining_resend_cooldown_seconds": remaining_resend_cooldown
            }
    
    # 3️⃣ No valid OTP exists - issue new one
    issue_otp_for_account(account_id, payload.email)
    
    return {
        "ok": True,
        "message": "OTP sent to email",
        "account_id": acc["id"]
    }


class ForgotPasswordVerifyOTPRequest(BaseModel):
    account_id: int
    otp: str

@router.post("/forgot-password/verify-otp")
def forgot_password_verify_otp(payload: ForgotPasswordVerifyOTPRequest):
    """
    Step 2: Verify OTP for forgot password
    - Validates OTP using existing validation function
    """
    
    # 1️⃣ Validate OTP
    validate_and_consume_otp(
        account_id=payload.account_id,
        otp_input=payload.otp
    )
    
    return {
        "ok": True,
        "message": "OTP verified successfully"
    }


class ForgotPasswordResetRequest(BaseModel):
    account_id: int
    new_password: str

@router.post("/forgot-password/reset-password")
def forgot_password_reset(payload: ForgotPasswordResetRequest):
    """
    Step 3: Reset password after OTP verification
    - Update password in database
    """
    
    # 1️⃣ Verify account exists
    account = supabase.table("accounts") \
        .select("id") \
        .eq("id", payload.account_id) \
        .execute()
    
    if not account.data:
        raise HTTPException(404, "Account not found")
    
    # 2️⃣ Hash new password
    pwd_hash = bcrypt.hashpw(
        payload.new_password.encode(),
        bcrypt.gensalt()
    ).decode()
    
    # 3️⃣ Update password
    supabase.table("accounts") \
        .update({"password_hash": pwd_hash}) \
        .eq("id", payload.account_id) \
        .execute()
    
    return {
        "ok": True,
        "message": "Password updated successfully"
    }
