from datetime import datetime
from app.supabase_client import supabase


def hard_logout_by_device(device_id: str):
    """
    FULL logout:
    - clears active_sessions
    - releases profile
    - same behavior as /logout
    """
    print(f"🔴 hard_logout_by_device called for device_id: {device_id}")
    
    result = supabase.table("active_sessions").update({
        "is_active": False,
        "profile_id": None,
        "last_seen": datetime.utcnow().isoformat()
    }).eq("device_id", device_id).eq("is_active", True).execute()
    
    print(f"✅ Updated {len(result.data)} session(s) for device {device_id}")
    return result
