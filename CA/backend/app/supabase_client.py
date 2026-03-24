import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load .env at startup
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Supabase URL or SERVICE_ROLE_KEY missing in .env")

# Create Supabase client (timeout handling is done in router.py with try-catch)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
