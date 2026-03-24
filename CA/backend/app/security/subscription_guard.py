from datetime import date
from fastapi import HTTPException
from app.supabase_client import supabase


def enforce_active_subscription(account_id: int):

    sub = (
        supabase.table("subscriptions")
        .select("*")
        .eq("account_id", account_id)
        .eq("status", "ACTIVE")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not sub.data:
        raise HTTPException(status_code=403, detail="No active subscription found.")

    sub = sub.data[0]

    end_date = (
        sub["end_date"]
        if isinstance(sub["end_date"], date)
        else date.fromisoformat(sub["end_date"])
    )

    # -----------------------------------------
    #  EXPIRED?
    # -----------------------------------------
    if end_date < date.today():

        # 1️⃣  Mark this subscription as expired
        supabase.table("subscriptions") \
            .update({"status": "EXPIRED"}) \
            .eq("id", sub["id"]) \
            .execute()

        # 2️⃣ Raise error for auto-logout handling
        print(f"🔴 Plan expired for account_id={account_id}")
        raise HTTPException(
            status_code=403,
            detail="Plan expired"
        )

    return sub
def enforce_active_firm_subscription(firm_id: int):

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
        raise HTTPException(403, "Firm subscription expired.")

    sub = sub.data[0]

    raw_end = str(sub["end_date"])
    end_date = date.fromisoformat(raw_end.split("T")[0])

    # -------------------------------------------------------
    # EXPIRED?
    # -------------------------------------------------------
    if end_date < date.today():

        # 1) Mark subscription as expired
        supabase.table("subscriptions") \
            .update({"status": "EXPIRED"}) \
            .eq("id", sub["id"]) \
            .execute()

        # 2) Raise error WITHOUT auto-logout
        raise HTTPException(
            status_code=403,
            detail="Plan expired"
        )

    return sub
