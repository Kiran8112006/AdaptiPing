"""
Hardware status and bench health telemetry endpoints.
"""

from fastapi import APIRouter
from typing import Dict, Any
from ..services.simulation import simulation_manager

router = APIRouter()


@router.get("/hardware/status", response_model=Dict[str, Any])
def get_hardware_status() -> Dict[str, Any]:
    """
    Returns hardware subsystem statuses and simulated electrical/thermal telemetry.
    Explicitly identifies BENCH SIMULATION and unattached transducer status.
    """
    return {
        "hardware": simulation_manager.hardware_status,
        "health": simulation_manager.health,
        "components": simulation_manager.hardware_status.components,
        "overallStatus": simulation_manager.hardware_status.overall_status,
        "mode": simulation_manager.hardware_status.mode,
    }
