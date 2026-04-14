"""CA Automation Backend - Main Application Entry Point"""

import os
import uvicorn
from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.cors import setup_cors
from features.gst_reconciliation.router import router as gst_router
from features.invoice_extraction.router import router as invoice_router
from features.tds_calculation.router import router as tds_router
from features.ledger_classification.router import router as ledger_router
from features.auth.router import router as auth_router
from features.companies_data.router import router as companies_data_router

from features.trial.router import router as trial_router
from features.execute.router import router as execute_router


from app.supabase_client import supabase
from app.security.session_guard import enforce_device_and_profile_limits
from app.security.subscription_guard import enforce_active_subscription

# ---------------------------------------------------------
# 🔥 MIDDLEWARE: CLEAR AUTH COOKIE ON 401
# ---------------------------------------------------------
class ClearAuthCookieOn401Middleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        if response.status_code == 401:
            response.delete_cookie("access_token")

        return response


def create_app() -> FastAPI:

    app = FastAPI(
        title="CA Automation - Backend API",
        version="1.0.0",
        description="Modular backend for CA automation tools"
    )

    # -----------------------------------------------------
    # Setup CORS
    # -----------------------------------------------------
    setup_cors(app)

    # -----------------------------------------------------
    # Global middleware
    # -----------------------------------------------------
    app.add_middleware(ClearAuthCookieOn401Middleware)

    # -----------------------------------------------------
    # Register feature routers
    # -----------------------------------------------------
    app.include_router(gst_router)
    app.include_router(invoice_router)
    app.include_router(tds_router)
    app.include_router(ledger_router)
    app.include_router(auth_router)
    app.include_router(companies_data_router)

    # -----------------------------------------------------
    # NEW FREE TRIAL + EXECUTE ROUTES HERE
    # -----------------------------------------------------
    app.include_router(trial_router)      # <– FIX
    app.include_router(execute_router)    # <– FIX

    # -----------------------------------------------------
    # Health check endpoint
    # -----------------------------------------------------
    @app.get("/health")
    async def health():
        return {"status": "ok", "message": "CA Automation Backend is running"}

    @app.get("/api/supabase-test")
    def supabase_test():
        try:
            data = supabase.table("plans").select("*").limit(1).execute()
            return {"ok": True, "supabase_response": data.data}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    @app.get("/api/accounts-test")
    def accounts_test():
        try:
            data = supabase.table("accounts") \
                .select("id, email, plan_id, firm_id") \
                .limit(5) \
                .execute()
            return {"ok": True, "data": data.data}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    @app.get("/api/subscription-test")
    def subscription_test():
        try:
            data = supabase.table("subscriptions") \
                .select("id, account_id, plan_id, firm_id, status, start_date, end_date") \
                .limit(5) \
                .execute()
            return {"ok": True, "data": data.data}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    @app.get("/api/profiles-test")
    def profiles_test():
        try:
            data = supabase.table("profiles") \
                .select("id, firm_id, username") \
                .limit(10) \
                .execute()
            return {"ok": True, "data": data.data}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    @app.get("/api/sessions-test")
    def sessions_test():
        try:
            data = supabase.table("active_sessions") \
                .select("id, account_id, profile_id, firm_id, device_id, is_active") \
                .limit(10) \
                .execute()
            return {"ok": True, "data": data.data}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    @app.post("/api/session-guard-test")
    def session_guard_test():
        try:
            enforce_device_and_profile_limits(
                account_id=1,
                plan_id=2,
                firm_id=1,
                profile_id=1,
                device_id="DEV_TEST_002",
                ip_address="127.0.0.2"
            )
            return {"ok": True, "message": "New session allowed"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    @app.get("/api/protected-tool-test")
    def protected_tool_test():
        try:
            sub = enforce_active_subscription(account_id=1)
            return {
                "ok": True,
                "message": "Access granted to tool",
                "subscription": sub
            }
        except Exception as e:
            return {
                "ok": False,
                "error": str(e)
            }

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
