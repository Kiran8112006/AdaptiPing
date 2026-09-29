"""
Tests for deterministic rule-based adaptation engine.
Verifies:
- Clear shallow preset adaptation
- Mid turbidity preset adaptation
- Muddy estuary preset adaptation
- Low battery constraint activation
- Custom environment interpolation
- Explainability rationale presence
"""

import pytest
from app.models.environment import EnvironmentInput
from app.services.adaptation import AdaptationEngine


def test_clear_shallow_adaptation():
    env = EnvironmentInput(
        depth_m=10.0,
        turbidity=12.0,
        temperature_c=25.0,
        salinity_psu=35.0,
        battery_pct=80.0,
    )
    decision = AdaptationEngine.compute_adaptation(env)
    
    assert decision.environment_state == "CLEAR_SHALLOW"
    assert decision.energy_state == "NOMINAL"
    # Bandwidth around 150-200 kHz
    assert decision.configuration.start_frequency_hz == 150_000.0
    assert decision.configuration.stop_frequency_hz == 200_000.0
    assert decision.configuration.duration_ms == 0.6
    assert decision.configuration.amplitude == 0.50
    assert len(decision.explanation) >= 3
    assert "clear shallow" in decision.reason.lower()


def test_mid_turbidity_adaptation():
    env = EnvironmentInput(
        depth_m=20.0,
        turbidity=45.0,
        temperature_c=22.0,
        salinity_psu=34.0,
        battery_pct=70.0,
    )
    decision = AdaptationEngine.compute_adaptation(env)
    
    assert decision.environment_state == "MID_TURBIDITY"
    assert decision.configuration.start_frequency_hz == 120_000.0
    assert decision.configuration.stop_frequency_hz == 160_000.0
    assert decision.configuration.duration_ms == 1.2
    assert decision.configuration.amplitude == 0.75
    assert "mid turbidity" in decision.reason.lower()


def test_muddy_estuary_adaptation():
    env = EnvironmentInput(
        depth_m=8.0,
        turbidity=85.0,
        temperature_c=28.0,
        salinity_psu=20.0,
        battery_pct=90.0,
    )
    decision = AdaptationEngine.compute_adaptation(env)
    
    assert decision.environment_state == "MUDDY_ESTUARY"
    assert decision.configuration.start_frequency_hz == 90_000.0
    assert decision.configuration.stop_frequency_hz == 130_000.0
    assert decision.configuration.duration_ms == 2.0
    assert decision.configuration.amplitude == 1.00
    assert "muddy estuary" in decision.reason.lower()


def test_low_battery_critical_constraint():
    env = EnvironmentInput(
        depth_m=15.0,
        turbidity=15.0,
        temperature_c=25.0,
        salinity_psu=35.0,
        battery_pct=15.0,  # Critical < 20%
    )
    decision = AdaptationEngine.compute_adaptation(env)
    
    assert decision.energy_state == "CRITICAL"
    assert decision.configuration.amplitude <= 0.40
    assert decision.configuration.duration_ms <= 0.8
    assert "energy constraint active" in decision.reason.lower()


def test_battery_constrained():
    env = EnvironmentInput(
        depth_m=8.0,
        turbidity=80.0,
        temperature_c=25.0,
        salinity_psu=30.0,
        battery_pct=35.0,  # Constrained 20-40%
    )
    decision = AdaptationEngine.compute_adaptation(env)
    
    assert decision.energy_state == "CONSTRAINED"
    assert decision.configuration.amplitude <= 0.70


def test_custom_environment():
    env = EnvironmentInput(
        depth_m=50.0,
        turbidity=25.0,
        temperature_c=20.0,
        salinity_psu=33.0,
        battery_pct=60.0,
    )
    decision = AdaptationEngine.compute_adaptation(env)
    
    assert decision.environment_state == "CUSTOM"
    assert decision.configuration.start_frequency_hz > 0
    assert decision.configuration.stop_frequency_hz > decision.configuration.start_frequency_hz
    assert len(decision.reason) > 0
