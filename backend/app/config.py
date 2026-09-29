"""
Configuration settings for the AdaptiPing simulation backend.
All settings have strict defaults and security boundaries.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ADAPTIPING_")

    API_TITLE: str = "AdaptiPing Simulation API"
    API_VERSION: str = "0.1.0"
    API_DESCRIPTION: str = (
        "REST API for the AdaptiPing Low-Power Adaptive Sonar Transmitter "
        "(SIH 2026 PS SIH26058). Bench Simulation Mode."
    )
    
    # Exact CORS origins (No wildcards)
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # Resource limits to prevent CPU/memory exhaustion
    MAX_DURATION_MS: float = 50.0
    MIN_DURATION_MS: float = 0.1
    MIN_SAMPLE_RATE_HZ: float = 10_000.0
    MAX_SAMPLE_RATE_HZ: float = 2_000_000.0
    MAX_TOTAL_SAMPLES: int = 100_000
    MAX_HISTORY_RECORDS: int = 50
    
    # Hardware bench simulation parameters: 12-bit DAC @ 1 MSPS
    DAC_RESOLUTION_BITS: int = 12
    DEFAULT_SAMPLE_RATE_HZ: float = 1_000_000.0  # 1 MSPS bench DAC rate
    MODELED_FILTER_CUTOFF_HZ: float = 300_000.0


settings = Settings()
