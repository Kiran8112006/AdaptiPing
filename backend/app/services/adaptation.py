"""
Deterministic rule-based adaptation engine.
No machine learning. All decisions are fully explainable, deterministic,
and generated directly from actual selected parameters.
"""

from datetime import datetime, timezone
from typing import List
from ..models.environment import EnvironmentInput
from ..models.ping import PingConfiguration, WaveformTypeEnum, WindowTypeEnum
from ..models.telemetry import AdaptationDecision, ExplanationLine


class AdaptationEngine:
    """
    Computes optimal sonar transmit parameters based on environmental inputs
    and payload energy constraints.
    """

    @staticmethod
    def classify_environment(env: EnvironmentInput) -> str:
        """
        Classifies water body based on depth and turbidity.
        """
        if env.turbidity >= 65.0:
            return "MUDDY_ESTUARY"
        elif env.turbidity >= 30.0:
            return "MID_TURBIDITY"
        elif env.turbidity < 30.0 and env.depth_m <= 30.0:
            return "CLEAR_SHALLOW"
        return "CUSTOM"

    @staticmethod
    def determine_energy_constraint(battery_pct: float) -> str:
        """
        Evaluates battery state of charge into constraint tiers.
        """
        if battery_pct < 20.0:
            return "CRITICAL"
        elif battery_pct < 40.0:
            return "CONSTRAINED"
        return "NOMINAL"

    @classmethod
    def compute_adaptation(cls, env: EnvironmentInput) -> AdaptationDecision:
        """
        Deterministic decision pipeline.
        Returns PingConfiguration and dynamically generated human-readable explanation rationale.
        """
        env_class = cls.classify_environment(env)
        energy_state = cls.determine_energy_constraint(env.battery_pct)

        # Base acoustic set-points based on environment classification
        if env_class == "MUDDY_ESTUARY":
            start_freq = 90_000.0   # 90 kHz
            stop_freq = 130_000.0   # 130 kHz
            pulse_duration = 2.0    # 2.0 ms
            amplitude = 1.0
        elif env_class == "MID_TURBIDITY":
            start_freq = 120_000.0  # 120 kHz
            stop_freq = 160_000.0   # 160 kHz
            pulse_duration = 1.2    # 1.2 ms
            amplitude = 0.75
        elif env_class == "CLEAR_SHALLOW":
            start_freq = 150_000.0  # 150 kHz
            stop_freq = 200_000.0   # 200 kHz
            pulse_duration = 0.6    # 0.6 ms
            amplitude = 0.50
        else:  # CUSTOM
            t = min(max(env.turbidity / 100.0, 0.0), 1.0)
            start_freq = (150.0 - t * 60.0) * 1000.0
            stop_freq = (200.0 - t * 70.0) * 1000.0
            pulse_duration = 0.6 + t * 1.4
            amplitude = 0.50 + t * 0.50

        # Thermal protection rule
        temp_derated = False
        if env.temperature_c > 35.0:
            amplitude = max(amplitude * 0.9, 0.3)
            temp_derated = True

        # Energy constraint rules
        if energy_state == "CRITICAL":
            amplitude = min(amplitude, 0.40)
            pulse_duration = min(pulse_duration, 0.8)
        elif energy_state == "CONSTRAINED":
            amplitude = min(amplitude, 0.70)

        # Deep water propagation rule
        deep_adjusted = False
        if env.depth_m > 100.0:
            start_freq = max(start_freq - 10_000.0, 50_000.0)
            stop_freq = max(stop_freq - 10_000.0, 80_000.0)
            deep_adjusted = True

        bandwidth_hz = round(stop_freq - start_freq, 1)
        pulse_duration = round(pulse_duration, 2)
        amplitude = round(amplitude, 2)

        # Build PingConfiguration with 1 MSPS bench DAC rate
        config = PingConfiguration(
            waveform=WaveformTypeEnum.LFM,
            start_frequency_hz=round(start_freq, 1),
            stop_frequency_hz=round(stop_freq, 1),
            bandwidth_hz=bandwidth_hz,
            duration_ms=pulse_duration,
            amplitude=amplitude,
            window=WindowTypeEnum.HANN,
            sample_rate_hz=1_000_000.0,  # 1 MSPS bench simulation rate
        )

        start_khz = round(start_freq / 1000.0, 1)
        stop_khz = round(stop_freq / 1000.0, 1)
        bw_khz = round(bandwidth_hz / 1000.0, 1)

        # Dynamically generate "WHY THIS PING?" explanation strictly from actual parameters
        explanation: List[ExplanationLine] = []

        if env_class == "MUDDY_ESTUARY":
            explanation.append(
                ExplanationLine(
                    condition="High turbidity condition (>=65 NTU)",
                    action=f"Lower operating band ({start_khz:.0f}–{stop_khz:.0f} kHz, BW: {bw_khz:.0f} kHz) selected for penetration-oriented mode",
                )
            )
            explanation.append(
                ExplanationLine(
                    condition="High acoustic attenuation",
                    action=f"Extended pulse duration ({pulse_duration:.1f} ms) increases pulse energy and time-bandwidth product.",
                )
            )
            explanation.append(
                ExplanationLine(
                    condition="Transmit level",
                    action=f"Set to {amplitude:.2f} (maximum permitted by simulated energy/hardware constraints).",
                )
            )

        elif env_class == "MID_TURBIDITY":
            explanation.append(
                ExplanationLine(
                    condition="Moderate turbidity (30–65 NTU)",
                    action=f"Mid-frequency band ({start_khz:.0f}–{stop_khz:.0f} kHz, BW: {bw_khz:.0f} kHz) balanced between resolution and range",
                )
            )
            explanation.append(
                ExplanationLine(
                    condition="Balanced channel losses",
                    action=f"Medium pulse duration ({pulse_duration:.1f} ms) provides nominal processing gain.",
                )
            )
            explanation.append(
                ExplanationLine(
                    condition="Transmit level",
                    action=f"Set to {amplitude:.2f} (balanced simulated transmit setting within energy budget).",
                )
            )

        elif env_class == "CLEAR_SHALLOW":
            explanation.append(
                ExplanationLine(
                    condition="Clear shallow water (<30 NTU, <=30m depth)",
                    action=f"Higher operating band ({start_khz:.0f}–{stop_khz:.0f} kHz, BW: {bw_khz:.0f} kHz) for fine range resolution",
                )
            )
            explanation.append(
                ExplanationLine(
                    condition="Low volumetric attenuation",
                    action=f"Short pulse duration ({pulse_duration:.1f} ms) for fine range gate resolution.",
                )
            )
            explanation.append(
                ExplanationLine(
                    condition="Transmit level",
                    action=f"Reduced transmit level ({amplitude:.2f}) sufficient for low-attenuation channel.",
                )
            )

        else:  # CUSTOM
            explanation.append(
                ExplanationLine(
                    condition=f"Custom environment parameters (Turbidity: {env.turbidity:.1f} NTU)",
                    action=f"Interpolated operating band ({start_khz:.0f}–{stop_khz:.0f} kHz, BW: {bw_khz:.0f} kHz)",
                )
            )
            explanation.append(
                ExplanationLine(
                    condition="Custom acoustic channel model",
                    action=f"Pulse duration: {pulse_duration:.2f} ms, Transmit level: {amplitude:.2f}",
                )
            )

        if temp_derated:
            explanation.append(
                ExplanationLine(
                    condition=f"Elevated water temperature ({env.temperature_c:.1f}°C)",
                    action="Transmit amplitude scaled by 0.90 to simulate amplifier thermal protection",
                )
            )

        if energy_state == "CRITICAL":
            explanation.append(
                ExplanationLine(
                    condition=f"Battery critically low ({env.battery_pct:.1f}%)",
                    action=f"Energy constraint CRITICAL active → Transmit level capped at {amplitude:.2f}, pulse duration capped at {pulse_duration:.2f} ms",
                )
            )
        elif energy_state == "CONSTRAINED":
            explanation.append(
                ExplanationLine(
                    condition=f"Battery level constrained ({env.battery_pct:.1f}%)",
                    action=f"Energy constraint ACTIVE → Transmit level capped at {amplitude:.2f}",
                )
            )

        if deep_adjusted:
            explanation.append(
                ExplanationLine(
                    condition=f"Deep water environment ({env.depth_m:.0f} m)",
                    action="Operating frequency band shifted down by 10 kHz for extended range propagation",
                )
            )

        # Build concise human-readable summary
        state_labels = {
            "MUDDY_ESTUARY": "Simulated Muddy Estuary",
            "MID_TURBIDITY": "Simulated Mid Turbidity",
            "CLEAR_SHALLOW": "Simulated Clear Shallow Reef",
            "CUSTOM": "Simulated Custom Channel",
        }
        env_label = state_labels.get(env_class, "Simulated Environment")
        reason = (
            f"{env_label} condition → operating band {start_khz:.0f}–{stop_khz:.0f} kHz "
            f"({bw_khz:.0f} kHz BW, {pulse_duration:.1f} ms pulse). "
            f"Transmit level set to {amplitude:.2f} within simulated constraints."
        )
        if energy_state != "NOMINAL":
            reason += f" Energy constraint active ({energy_state}) to respect payload battery budget."

        return AdaptationDecision(
            environment_state=env_class,
            energy_state=energy_state,
            configuration=config,
            reason=reason,
            explanation=explanation,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
