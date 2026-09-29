"""
Domain services for adaptation, waveform synthesis, spectral processing, and simulation.
"""

from .adaptation import AdaptationEngine
from .waveform import WaveformGenerator
from .spectrum import SpectralAnalyzer
from .energy import EnergyModel
from .simulation import SimulationManager, simulation_manager

__all__ = [
    "AdaptationEngine",
    "WaveformGenerator",
    "SpectralAnalyzer",
    "EnergyModel",
    "SimulationManager",
    "simulation_manager",
]
