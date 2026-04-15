from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from app.db import init_db
from app.routes import customers, vouchers, payments, auth, users, analytics, audit

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration from environment
SHOW_DOCS = os.environ.get("SHOW_DOCS", "true").lower() == "true"
logger.info(f"Swagger documentation enabled: {SHOW_DOCS}")

app = FastAPI(
    title="TK Plastic Press POS API",
    docs_url="/api/docs" if SHOW_DOCS else None,
    redoc_url="/api/redoc" if SHOW_DOCS else None,
    openapi_url="/api/openapi.json" if SHOW_DOCS else None
)

# CORS Middleware
# Set ALLOWED_ORIGINS in .env as a comma-separated list, e.g.:
#   ALLOWED_ORIGINS=http://localhost:5173,https://yourtunnel.trycloudflare.com
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

@app.on_event("startup")
def on_startup():
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized.")

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(vouchers.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(audit.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to Plastic Press POS API"}
