from app.supabase_client import supabase
from datetime import datetime
from fastapi import HTTPException


def enforce_device_and_profile_limits(
    *,
    account_id: int,
    plan_id: int,
    firm_id: int | None,
    profile_id: int | None,
    device_id: str,
    ip_address: str,
):
    """
    ✅ Classic:
        - ONLY 1 active device
        - Second device BLOCKED

    ✅ Prime / VIP:
        - ADMIN login creates base session
        - Profile login UPDATES same session
        - 1 active session per device
        - 1 active session per profile
    """

    # -----------------------------------
    # 1️⃣ GET PLAN DEVICE LIMIT
    # -----------------------------------
    plan = supabase.table("plans") \
        .select("max_devices") \
        .eq("id", plan_id) \
        .execute()
    
    if not plan.data:
        raise HTTPException(500, "Plan not found")

    max_devices = plan.data[0]["max_devices"]

    # -----------------------------------
    # 2️⃣ GET ACTIVE SESSIONS
    # -----------------------------------
    if firm_id:
        active = supabase.table("active_sessions") \
            .select("*") \
            .eq("firm_id", firm_id) \
            .eq("is_active", True) \
            .execute().data
    else:
        active = supabase.table("active_sessions") \
            .select("*") \
            .eq("account_id", account_id) \
            .eq("is_active", True) \
            .execute().data

    # -----------------------------------
    # 3️⃣ CLASSIC STRICT RULE WITH SAME-DEVICE RECOVERY
    # -----------------------------------
    if firm_id is None:
        # Debug logging
        print(f"🔍 Classic login - device_id: {device_id}")
        print(f"🔍 Active sessions: {len(active)}")
        for s in active:
            print(f"  - Session device_id: {s['device_id']}, matches: {s['device_id'] == device_id}")
        
        # Check if session exists for THIS EXACT device_id
        same_device_session = [s for s in active if s["device_id"] == device_id]
        
        if same_device_session:
            # ✅ SAME DEVICE RE-LOGIN (cookie wiped but device_id matches)
            # Update existing session instead of blocking
            print(f"✅ Same device re-login detected - updating session")
            supabase.table("active_sessions").update({
                "last_seen": datetime.utcnow().isoformat(),
                "ip_address": ip_address,
                "login_time": datetime.utcnow().isoformat()
            }).eq("id", same_device_session[0]["id"]).execute()
            return True
        
        # Check if session exists for DIFFERENT device_id
        if active:
            # ✅ AUTO-LOGOUT old device and login with new device_id
            # This happens when user clears browser data (localStorage cleared)
            # Since they have valid credentials, trust them and move the session
            print(f"🔄 Different device_id detected - deactivating old session and creating new one")
            
            # Deactivate all old sessions
            supabase.table("active_sessions").update({
                "is_active": False,
                "last_seen": datetime.utcnow().isoformat()
            }).eq("account_id", account_id).eq("is_active", True).execute()
            
            # Continue to create new session below
            # (don't return or raise, let it fall through)

        # New device login
        supabase.table("active_sessions").insert({
            "account_id": account_id,
            "profile_id": None,
            "firm_id": None,
            "device_id": device_id,
            "ip_address": ip_address,
            "login_time": datetime.utcnow().isoformat(),
            "last_seen": datetime.utcnow().isoformat(),
            "is_active": True
        }).execute()

        return True

    # -----------------------------------
    # 4️⃣ PRIME / VIP — PROFILE ALREADY ACTIVE CHECK
    # -----------------------------------
    if profile_id is not None:
        existing_profile = supabase.table("active_sessions") \
            .select("id, device_id") \
            .eq("profile_id", profile_id) \
            .eq("is_active", True) \
            .execute()

        if existing_profile.data:
            # ✅ SAME device_id = cookie recovery, allow
            if existing_profile.data[0]["device_id"] == device_id:
                print(f"✅ Profile re-login on same device - updating session")
                supabase.table("active_sessions").update({
                    "last_seen": datetime.utcnow().isoformat()
                }).eq("id", existing_profile.data[0]["id"]).execute()
                return True
            else:
                # 🔄 DIFFERENT device_id = FORCE LOGOUT (deactivate entire session)
                print(f"🔄 Profile login from new device - FORCE LOGOUT old device")
                print(f"   Old device: {existing_profile.data[0]['device_id']} → Session DEACTIVATED")
                print(f"   New device: {device_id} → New session will be created")
                
                # Deactivate the ENTIRE session on old device
                # User will be completely logged out on Device1
                supabase.table("active_sessions").update({
                    "is_active": False,
                    "last_seen": datetime.utcnow().isoformat()
                }).eq("id", existing_profile.data[0]["id"]).execute()
                
                # Continue below to create new session for Device2

    # -----------------------------------
    # 5️⃣ PRIME / VIP — DEVICE LIMIT CHECK
    # -----------------------------------
    if len(active) >= max_devices:
        raise HTTPException(
            status_code=409,
            detail="Maximum device limit reached for your plan. Please logout from another device."
        )

    # -----------------------------------
    # 6️⃣ EXISTING DEVICE SESSION?
    # -----------------------------------
    existing_device = supabase.table("active_sessions") \
        .select("*") \
        .eq("device_id", device_id) \
        .eq("is_active", True) \
        .execute().data

    if existing_device:
        # ✅ UPDATE EXISTING ADMIN SESSION → ATTACH PROFILE
        supabase.table("active_sessions").update({
            "profile_id": profile_id,
            "last_seen": datetime.utcnow().isoformat()
        }).eq("id", existing_device[0]["id"]).execute()

    else:
        # ✅ NEW DEVICE LOGIN
        supabase.table("active_sessions").insert({
            "account_id": account_id,
            "profile_id": profile_id,
            "firm_id": firm_id,
            "device_id": device_id,
            "ip_address": ip_address,
            "login_time": datetime.utcnow().isoformat(),
            "last_seen": datetime.utcnow().isoformat(),
            "is_active": True
        }).execute()

    return True
