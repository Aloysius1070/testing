from app.supabase_client import supabase


def log_audit_event(
    *,
    action: str,
    account_id: int | None = None,
    firm_id: int | None = None,
    profile_id: int | None = None,
    metadata: dict | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
):
    """
    Append-only audit logger.
    MUST NEVER raise.
    """
    try:
        supabase.table("audit_logs").insert({
            "action": action,
            "account_id": account_id,
            "firm_id": firm_id,
            "profile_id": profile_id,
            "metadata": metadata,
            "ip_address": ip_address,
            "user_agent": user_agent,
        }).execute()
    except Exception as e:
        # Audit logging should NEVER break app flow
        print("AUDIT LOG FAILED:", e)
