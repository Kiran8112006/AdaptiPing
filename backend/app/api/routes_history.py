"""
Ping history logging endpoints.
"""

from fastapi import APIRouter
from typing import List
from ..models.telemetry import HistoryRecord
from ..services.simulation import simulation_manager

router = APIRouter()


@router.get("/history", response_model=List[HistoryRecord])
def get_history() -> List[HistoryRecord]:
    """
    Returns recent simulated transmission history log (capped at 50 records).
    """
    return simulation_manager.history
