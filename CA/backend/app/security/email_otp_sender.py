import os
import requests
from datetime import datetime, timedelta
from fastapi import HTTPException
from dotenv import load_dotenv
from app.supabase_client import supabase
# Load env vars
load_dotenv()
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "Fisclytic <no-reply@mail.fisclytic.com>")


# Rate limiting constants
MAX_OTPS_PER_WINDOW = 3 # Max 3 OTPs
RATE_LIMIT_WINDOW_MINUTES = 15 # Per 15 minutes
def send_email_otp(email: str, otp: str):
   """
   Sends OTP email using Resend API with rate limiting.

   Rate limiting: Max 3 OTPs per 15 minutes per email to prevent abuse
   and stay within Resend's sending limits.

   Args:
      email: Recipient email address
      otp: One-time password to send

   Raises:
      HTTPException: If rate limit is exceeded or email sending fails
   """
   # Check rate limiting
   now = datetime.utcnow()
   window_start = now - timedelta(minutes=RATE_LIMIT_WINDOW_MINUTES)

   # Count OTPs sent to this email in the last 15 minutes
   recent_otps = (
      supabase.table("email_otps")
      .select("id")
      .eq("email", email)
      .gte("created_at", window_start.isoformat())
      .execute()
   )

   if recent_otps.data and len(recent_otps.data) >= MAX_OTPS_PER_WINDOW:
      raise HTTPException(
         status_code=429,
         detail=f"Too many OTP requests. Please wait {RATE_LIMIT_WINDOW_MINUTES} minutes before requesting again."
      )

   # Send email via Resend API
   try:
      response = requests.post(
         "https://api.resend.com/emails",
         headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
         },
         json={
            "from": EMAIL_FROM,
            "to": [email],
            "subject": "Verify your email",
            "html": f"""
            <p>Your <b>Fisclytic</b> verification OTP is:</p>
            <h2>{otp}</h2>
            <p>This OTP expires in 15 minutes.</p>
            <p>If you did not request this, please ignore.</p>
            """
         },
         timeout=10
      )
      response.raise_for_status()
   except requests.exceptions.RequestException as e:
      raise HTTPException(
         status_code=500,
         detail=f"Failed to send OTP email: {str(e)}"
      )