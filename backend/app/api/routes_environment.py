"""
Environment telemetry and adaptation simulation endpoints.
"""

from fastapi import APIRouter
from typing import Dict, Any
from ..models.environment import EnvironmentInput
from ..models.telemetry import SystemState
from ..services.simulation import simulation_manager
from ..data.presets import DEMO_PRESETS

router = APIRouter()


@router.get("/environment", response_model=EnvironmentInput)
def get_current_environment() -> EnvironmentInput:
    """
    Returns current simulated oceanographic environment telemetry.
    """
    return simulation_manager.environment


@router.post("/simulation/environment", response_model=SystemState)
def update_environment(env: EnvironmentInput) -> SystemState:
    """
    Updates environment parameters (depth, turbidity, temp, salinity, battery).
    Triggers deterministic adaptation, recomputes transmit waveform,
    and updates simulation telemetry.
    """
    return simulation_manager.update_environment(env)


@router.get("/presets", response_model=Dict[str, Any])
def get_presets() -> Dict[str, Any]:
    """
    Returns pre-configured oceanographic demo presets.
    """
    return DEMO_PRESETS
