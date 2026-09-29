"""
Energy and electrical load simulation service.
Models:
    E_ping = integral(V(t) * I(t) dt)
Over the synthesized transmission pulse under bench simulated load.
"""

import numpy as np
from typing import Dict, Any
from ..models.ping import PingConfiguration
from ..models.environment import EnvironmentInput
from ..models.telemetry import HealthTelemetry


class EnergyModel:
    """
    Computes bench simulation electrical consumption and thermal telemetry.
    All outputs represent simulated models of a Class-AB push-pull amplifier driving 50-ohm test load.
    """

    NOMINAL_RAIL_VOLTAGE: float = 12.0  # Volts
    LOAD_IMPEDANCE_OHMS: float = 50.0   # Bench dummy load

    @classmethod
    def compute_energy_and_health(
        cls,
        signal_array: np.ndarray,
        config: PingConfiguration,
        env: EnvironmentInput,
    ) -> HealthTelemetry:
        duration_s = config.duration_ms / 1000.0
        
        # Output voltage across transducer load V(t) = amplitude_scalar * Rail * signal(t)
        v_peak = config.amplitude * cls.NOMINAL_RAIL_VOLTAGE
        v_t = v_peak * signal_array
        
        # Current I(t) = V(t) / R_load
        i_t = v_t / cls.LOAD_IMPEDANCE_OHMS  # in Amperes
        
        # Instantaneous power P(t) = V(t) * I(t)
        p_t = np.abs(v_t * i_t)
        
        # Energy = integral(P(t) dt) = mean(P(t)) * duration_s (Joules)
        energy_joules = np.mean(p_t) * duration_s if len(p_t) > 0 else 0.0
        energy_mj = energy_joules * 1000.0

        i_peak = np.max(np.abs(i_t)) if len(i_t) > 0 else 0.0
        i_avg = np.mean(np.abs(i_t)) if len(i_t) > 0 else 0.0

        # Simulated thermal dissipation: water ambient + amplifier self-heating
        temp_rise = (config.amplitude ** 2) * 12.5
        amplifier_temp = env.temperature_c + temp_rise

        return HealthTelemetry(
            output_current_a=round(float(i_peak), 3),
            output_voltage_v=round(float(v_peak), 2),
            amplifier_temperature_c=round(float(amplifier_temp), 1),
            output_amplitude=round(float(v_peak * 0.4), 2),
            energy_per_ping_mj=round(float(energy_mj), 2),
            battery=round(env.battery_pct, 1),
            outputCurrent=round(float(i_peak * 1000.0), 1),
            isSimulated=True,
            measured=False,
        )
