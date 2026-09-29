"""
Central simulation manager holding in-memory state:
- Environment telemetry
- Adaptive ping configuration & decision
- Synthesized waveform, FFT, spectrogram
- Hardware status & health telemetry
- Historical ping log (max 50 records)
"""

import uuid
import numpy as np
from datetime import datetime, timezone
from typing import List, Optional

from ..config import settings
from ..models.environment import EnvironmentInput
from ..models.ping import PingConfiguration
from ..models.telemetry import (
    AdaptationDecision,
    HardwareStatus,
    HealthTelemetry,
    WaveformResponse,
    WaveformPoint,
    HistoryRecord,
    SystemState,
)
from ..data.presets import DEFAULT_COMPONENTS
from .adaptation import AdaptationEngine
from .waveform import WaveformGenerator
from .spectrum import SpectralAnalyzer
from .energy import EnergyModel


class SimulationManager:
    """
    Stateful bench simulation manager.
    Designed so future STM32 telemetry drivers can replace simulation
    without altering frontend schema.
    """

    def __init__(self):
        # Initial default environment
        self.environment = EnvironmentInput(
            depth_m=15.0,
            turbidity=20.0,
            temperature_c=26.0,
            salinity_psu=35.0,
            battery_pct=72.0,
        )

        # Run initial adaptation
        self.adaptation_decision = AdaptationEngine.compute_adaptation(self.environment)
        self.current_ping = self.adaptation_decision.configuration

        # Initial hardware status
        self.hardware_status = HardwareStatus(
            processor="STM32G4 [TARGET MCU - NOT CONNECTED]",
            timer="READY (SIMULATED)",
            dma="READY (SIMULATED)",
            dac="READY (12-bit, SIMULATED)",
            filter="SIMULATED (4th-order Butterworth LPF)",
            amplifier="SIMULATED (Class-AB 20W bench model)",
            transducer="NOT_CONNECTED",
            mode="BENCH_SIMULATION",
            components=DEFAULT_COMPONENTS,
            overall_status="SIMULATION",
        )

        # In-memory history (max 50 items)
        self.history: List[HistoryRecord] = []

        # Cached waveform and health data
        self.waveform_response: WaveformResponse = self._generate_waveform_response(self.current_ping)
        self.health = EnergyModel.compute_energy_and_health(
            np.array(self.waveform_response.amplitude),
            self.current_ping,
            self.environment,
        )

        # Add initial seed history record
        self._record_history_entry(self.current_ping, self.health.energy_per_ping_mj)

    def _generate_waveform_response(self, config: PingConfiguration) -> WaveformResponse:
        """
        Executes synthesis pipeline, computes FFT and Spectrogram, and packs into WaveformResponse.
        """
        t, filtered, meta = WaveformGenerator.synthesize_pipeline(config)

        # Downsample for UI graphing (512 points) to keep network transfers lightweight
        num_display_points = 512
        if len(t) > num_display_points:
            indices = np.linspace(0, len(t) - 1, num_display_points, dtype=int)
            t_disp = t[indices]
            filtered_disp = filtered[indices]
        else:
            t_disp = t
            filtered_disp = filtered

        time_ms_list = (t_disp * 1000.0).round(3).tolist()
        amp_list = filtered_disp.round(4).tolist()

        time_domain_points = [
            WaveformPoint(time=t_val, amplitude=a_val)
            for t_val, a_val in zip(time_ms_list, amp_list)
        ]

        # FFT & Spectrogram
        freqs, mags, fft_points = SpectralAnalyzer.compute_fft(
            filtered,
            sample_rate_hz=config.sample_rate_hz,
            num_points=256,
        )

        spectrogram_points = SpectralAnalyzer.compute_spectrogram(
            filtered,
            sample_rate_hz=config.sample_rate_hz,
            duration_ms=config.duration_ms,
            time_bins=40,
            freq_bins=40,
        )

        return WaveformResponse(
            waveform=config.waveform.value,
            sample_rate_hz=config.sample_rate_hz,
            duration_ms=config.duration_ms,
            time=time_ms_list,
            amplitude=amp_list,
            fft_frequency=freqs,
            fft_magnitude=mags,
            spectrogram_data=spectrogram_points,
            timeDomain=time_domain_points,
            fft=fft_points,
            spectrogram=spectrogram_points,
            metadata=meta,
            simulation=True,
        )

    def _record_history_entry(self, config: PingConfiguration, energy_mj: float, status: str = "COMPLETED"):
        rec = HistoryRecord(
            id=f"PING-{uuid.uuid4().hex[:8].upper()}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            environment_state=self.adaptation_decision.environment_state,
            environmentClass=self.adaptation_decision.environment_state,
            environment=self.environment,
            waveform=config.waveform.value,
            waveformType=config.waveform.value.lower().replace("_", "-"),
            start_frequency_hz=config.start_frequency_hz,
            startFrequency=round(config.start_frequency_hz / 1000.0, 1),
            stop_frequency_hz=config.stop_frequency_hz,
            stopFrequency=round(config.stop_frequency_hz / 1000.0, 1),
            bandwidth_hz=config.bandwidth_hz,
            bandwidth=round(config.bandwidth_hz / 1000.0, 1),
            duration_ms=config.duration_ms,
            pulseDuration=config.duration_ms,
            amplitude=config.amplitude,
            energy_per_ping_mj=energy_mj,
            energyPerPing=energy_mj,
            status=status,
        )
        self.history.insert(0, rec)
        if len(self.history) > settings.MAX_HISTORY_RECORDS:
            self.history = self.history[: settings.MAX_HISTORY_RECORDS]

    def update_environment(self, new_env: EnvironmentInput) -> SystemState:
        """
        Updates environment inputs, executes deterministic adaptation,
        and regenerates active waveform and health telemetry.
        """
        self.environment = new_env
        self.adaptation_decision = AdaptationEngine.compute_adaptation(self.environment)
        self.current_ping = self.adaptation_decision.configuration
        self.waveform_response = self._generate_waveform_response(self.current_ping)
        self.health = EnergyModel.compute_energy_and_health(
            np.array(self.waveform_response.amplitude),
            self.current_ping,
            self.environment,
        )
        self._record_history_entry(self.current_ping, self.health.energy_per_ping_mj)
        return self.get_system_state()

    def trigger_ping(self, custom_config: Optional[PingConfiguration] = None) -> HistoryRecord:
        """
        Simulates an explicit transmit ping cycle.
        """
        config = custom_config or self.current_ping
        self.current_ping = config
        self.waveform_response = self._generate_waveform_response(config)
        self.health = EnergyModel.compute_energy_and_health(
            np.array(self.waveform_response.amplitude),
            config,
            self.environment,
        )
        
        status = "COMPLETED"
        if self.adaptation_decision.energy_state == "CRITICAL":
            status = "CONSTRAINED"

        self._record_history_entry(config, self.health.energy_per_ping_mj, status=status)
        return self.history[0]

    def generate_custom_waveform(self, config: PingConfiguration) -> WaveformResponse:
        """
        Generates arbitrary waveform on demand without necessarily triggering a transmission.
        """
        return self._generate_waveform_response(config)

    def get_system_state(self) -> SystemState:
        """
        Returns full state bundle for one-shot UI initialization.
        """
        return SystemState(
            status="ONLINE",
            mode="BENCH_SIMULATION",
            processor="STM32G4 [TARGET MCU - NOT CONNECTED]",
            dataSource="BENCH SIMULATION",
            pingStatus="READY",
            battery=self.environment.battery_pct,
            api_connected=True,
            environment=self.environment,
            current_ping=self.current_ping,
            adaptation_decision=self.adaptation_decision,
            hardware_status=self.hardware_status,
            health=self.health,
        )


# Central simulation manager singleton instance
simulation_manager = SimulationManager()
