"""
Presets and default hardware definitions for bench simulation.
Clearly differentiates target architecture from currently simulated environment.
"""

from typing import Dict, Any, List
from ..models.telemetry import HardwareComponentStatus

DEMO_PRESETS: Dict[str, Dict[str, Any]] = {
    "clear_shallow": {
        "name": "clear_shallow",
        "label": "Simulated Clear Shallow Reef",
        "environment": {
            "depth_m": 10.0,
            "turbidity": 12.0,
            "temperature_c": 27.0,
            "salinity_psu": 36.0,
            "battery_pct": 72.0,
        },
        "expected_start_freq_khz": 150.0,
        "expected_stop_freq_khz": 200.0,
        "expected_pulse_duration_ms": 0.6,
        "expected_amplitude": 0.5,
    },
    "mid_turbidity": {
        "name": "mid_turbidity",
        "label": "Simulated Mid Turbidity",
        "environment": {
            "depth_m": 20.0,
            "turbidity": 45.0,
            "temperature_c": 24.0,
            "salinity_psu": 34.0,
            "battery_pct": 72.0,
        },
        "expected_start_freq_khz": 120.0,
        "expected_stop_freq_khz": 160.0,
        "expected_pulse_duration_ms": 1.2,
        "expected_amplitude": 0.75,
    },
    "muddy_estuary": {
        "name": "muddy_estuary",
        "label": "Simulated Muddy Estuary",
        "environment": {
            "depth_m": 8.0,
            "turbidity": 80.0,
            "temperature_c": 28.0,
            "salinity_psu": 25.0,
            "battery_pct": 72.0,
        },
        "expected_start_freq_khz": 90.0,
        "expected_stop_freq_khz": 130.0,
        "expected_pulse_duration_ms": 2.0,
        "expected_amplitude": 1.0,
    },
    "low_battery": {
        "name": "low_battery",
        "label": "Simulated Low Battery Mode",
        "environment": {
            "depth_m": 15.0,
            "turbidity": 20.0,
            "temperature_c": 26.0,
            "salinity_psu": 35.0,
            "battery_pct": 15.0,
        },
        "expected_start_freq_khz": 150.0,
        "expected_stop_freq_khz": 200.0,
        "expected_pulse_duration_ms": 0.6,
        "expected_amplitude": 0.4,
    },
}

DEFAULT_COMPONENTS: List[HardwareComponentStatus] = [
    HardwareComponentStatus(
        name="STM32G4 MCU",
        category="processor",
        status="SIMULATION",
        detail="ARM Cortex-M4F @ 170 MHz (Target Platform - Simulated)",
    ),
    HardwareComponentStatus(
        name="Hardware Timer (TIM1)",
        category="digital",
        status="READY",
        detail="DMA trigger synchronization (Simulated)",
    ),
    HardwareComponentStatus(
        name="DMA Controller",
        category="digital",
        status="READY",
        detail="Memory-to-DAC transfer (Simulated)",
    ),
    HardwareComponentStatus(
        name="DAC (12-bit)",
        category="digital",
        status="SIMULATION",
        detail="12-bit resolution @ 1 MSPS (Quantized Model)",
    ),
    HardwareComponentStatus(
        name="Reconstruction LPF",
        category="analog",
        status="SIMULATION",
        detail="Modeled 4th-order active Butterworth filter (fc=300 kHz)",
    ),
    HardwareComponentStatus(
        name="Buffer Op-Amp",
        category="analog",
        status="NOT CONNECTED",
        detail="High slew-rate driver stage",
    ),
    HardwareComponentStatus(
        name="Power Amplifier",
        category="analog",
        status="NOT CONNECTED",
        detail="Class-AB push-pull 20W bench prototype (Simulated Load)",
    ),
    HardwareComponentStatus(
        name="Piezo Transducer",
        category="output",
        status="NOT CONNECTED",
        detail="PZT underwater projector (Bench Simulation - Dry)",
    ),
    HardwareComponentStatus(
        name="Current Sensor",
        category="monitoring",
        status="SIMULATION",
        detail="INA219 I2C high-side shunt model",
    ),
    HardwareComponentStatus(
        name="Voltage Monitor",
        category="monitoring",
        status="SIMULATION",
        detail="Analog sensing divider model",
    ),
    HardwareComponentStatus(
        name="Temperature Sensor",
        category="monitoring",
        status="SIMULATION",
        detail="NTC thermistor thermal feedback model",
    ),
    HardwareComponentStatus(
        name="Battery Monitor",
        category="monitoring",
        status="SIMULATION",
        detail="Payload coulomb counter simulation model",
    ),
]
