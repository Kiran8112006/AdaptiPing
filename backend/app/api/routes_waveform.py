"""
Waveform generation and spectral synthesis endpoints.
"""

from fastapi import APIRouter
from ..models.ping import PingConfiguration
from ..models.telemetry import WaveformResponse
from ..services.simulation import simulation_manager

router = APIRouter()


@router.get("/waveform/current", response_model=WaveformResponse)
def get_current_waveform() -> WaveformResponse:
    """
    Returns time-domain, FFT, and spectrogram representation for current active ping.
    Includes modeled DAC quantization and analog reconstruction filter effects.
    """
    return simulation_manager.waveform_response


@router.post("/waveform/generate", response_model=WaveformResponse)
def generate_waveform(config: PingConfiguration) -> WaveformResponse:
    """
    Synthesizes custom waveform on demand (LFM, Geometric, or Phase-Coded).
    Strictly validates all parameters and memory sample bounds.
    """
    return simulation_manager.generate_custom_waveform(config)
