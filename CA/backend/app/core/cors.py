"""CORS configuration for the application"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

def setup_cors(app: FastAPI):
    """Configure CORS middleware (Cookie + JWT Safe)"""
    
    # Specific allowed origins
    allowed_origins = [
        "http://localhost:5173",           # Local Vite dev
        "http://localhost:5174",           # Alternate Vite port
        "http://localhost:3000",           # Local Next.js
        "https://fisclytic.vercel.app",   # Production frontend
        # "https://ca-backend-jdg9.onrender.com",  # Backend
    ]
    
    # Regex to allow all Vercel preview deployments
    allow_origin_regex = r"https://.*\.vercel\.app"
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=allow_origin_regex,  # Allow all *.vercel.app domains
        allow_credentials=True,           # Required for cookies
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=[
            "Content-Type",
            "Authorization",
            "Accept",
            "Origin",
            "X-Requested-With"
        ],
        expose_headers=[
            "Content-Disposition"
        ],
        max_age=3600  # Cache preflight requests for 1 hour
    )
