"""
AdaptiPing — Main FastAPI Application
SIH 2026 Problem Statement SIH26058
Bench Simulation Mode
"""

import logging
import time
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from .config import settings
from .api import api_router

# Configure clean structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("adaptiping.api")

app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description=settings.API_DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Explicit CORS configuration (No wildcards)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    """
    Structured request logging middleware without exposing confidential parameters.
    """
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_time) * 1000.0
    logger.info(
        f"API Request: {request.method} {request.url.path} "
        f"Status: {response.status_code} ({duration_ms:.1f}ms)"
    )
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Safe structured validation error handler.
    Prevents leaking internal implementation details while providing actionable field errors.
    """
    clean_errors = []
    for err in exc.errors():
        clean_errors.append({
            "field": ".".join(str(loc) for loc in err.get("loc", [])),
            "message": err.get("msg", "Invalid parameter value"),
            "type": err.get("type", "value_error"),
        })
    logger.warning(f"Validation failure on {request.url.path}: {clean_errors}")
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error",
            "message": "The submitted parameters failed validation constraints.",
            "details": clean_errors,
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Catch-all error handler.
    Guarantees no stack traces, paths, or secrets leak into responses.
    """
    logger.error(f"Internal error processing {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An error occurred while processing the acoustic simulation request.",
        },
    )


# Register all API endpoints
app.include_router(api_router)


@app.get("/")
def root():
    return {
        "service": settings.API_TITLE,
        "mode": "BENCH_SIMULATION",
        "documentation": "/docs",
        "health": "/api/health",
        "version": settings.API_VERSION,
    }
