"""
API Route Handlers for the AdaptiPing backend.
"""

from fastapi import APIRouter
from .routes_health import router as health_router
from .routes_environment import router as env_router
from .routes_ping import router as ping_router
from .routes_waveform import router as waveform_router
from .routes_hardware import router as hardware_router
from .routes_history import router as history_router

api_router = APIRouter(prefix="/api")

api_router.include_router(health_router, tags=["Health"])
api_router.include_router(env_router, tags=["Environment & Adaptation"])
api_router.include_router(ping_router, tags=["Ping Control"])
api_router.include_router(waveform_router, tags=["Waveforms"])
api_router.include_router(hardware_router, tags=["Hardware & Health"])
api_router.include_router(history_router, tags=["History"])

__all__ = ["api_router"]
