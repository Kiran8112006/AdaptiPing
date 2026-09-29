"""
Health check and system state endpoints.
"""

from fastapi import APIRouter
from typing import Dict, Any
from ..config import settings
from ..services.simulation import simulation_manager
from ..models.telemetry import SystemState

router = APIRouter()


@router.get("/health", response_model=Dict[str, Any])
def get_health() -> Dict[str, Any]:
    """
    Returns API health status. Clearly states BENCH_SIMULATION mode.
    """
    return {
        "status": "ok",
        "mode": "BENCH_SIMULATION",
        "service": settings.API_TITLE,
        "version": settings.API_VERSION,
    }


@router.get("/system/state", response_model=SystemState)
def get_system_state() -> SystemState:
    """
    Returns full central simulation state for client dashboard initialization.
    """
    return simulation_manager.get_system_state()
