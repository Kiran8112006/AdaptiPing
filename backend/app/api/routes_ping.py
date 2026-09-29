"""
Ping control and transmission simulation endpoints.
"""

from fastapi import APIRouter
from typing import Optional
from ..models.ping import PingConfiguration
from ..models.telemetry import AdaptationDecision, HistoryRecord
from ..services.simulation import simulation_manager

router = APIRouter()


@router.get("/ping/current", response_model=AdaptationDecision)
def get_current_ping() -> AdaptationDecision:
    """
    Returns current active ping configuration and deterministic adaptation decision.
    """
    return simulation_manager.adaptation_decision


@router.post("/simulation/ping", response_model=HistoryRecord)
def trigger_ping(config: Optional[PingConfiguration] = None) -> HistoryRecord:
    """
    Executes a simulated sonar transmit cycle.
    Computes electrical power/energy consumption and appends to in-memory history log.
    """
    return simulation_manager.trigger_ping(config)
