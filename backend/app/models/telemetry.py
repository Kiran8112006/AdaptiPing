"""
Telemetry, decision, hardware status, and waveform response models.
Synchronized with both Pythonic snake_case and UI camelCase representations.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict, model_validator

from .environment import EnvironmentInput
from .ping import PingConfiguration


class ExplanationLine(BaseModel):
    condition: str
    action: str


class AdaptationDecision(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    environment_state: str = Field(default="MID_TURBIDITY")
    environmentClass: str = Field(default="MID_TURBIDITY")
    energy_state: str = Field(default="NOMINAL")
    energyConstraint: str = Field(default="NOMINAL")
    configuration: PingConfiguration
    pingConfig: Optional[PingConfiguration] = None
    reason: str
    explanation: List[ExplanationLine] = Field(default_factory=list)
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @model_validator(mode="before")
    @classmethod
    def sync_dual_fields(cls, data):
        if not isinstance(data, dict):
            return data
        res = dict(data)
        env_val = res.get("environment_state") or res.get("environmentClass") or "MID_TURBIDITY"
        res["environment_state"] = env_val
        res["environmentClass"] = env_val

        energy_val = res.get("energy_state") or res.get("energyConstraint") or "NOMINAL"
        res["energy_state"] = energy_val
        res["energyConstraint"] = energy_val

        cfg = res.get("configuration") or res.get("pingConfig")
        res["configuration"] = cfg
        res["pingConfig"] = cfg
        return res


class HardwareComponentStatus(BaseModel):
    name: str
    category: str  # 'processor' | 'digital' | 'analog' | 'output' | 'monitoring'
    status: str    # 'READY' | 'ACTIVE' | 'SIMULATION' | 'NOT CONNECTED' | 'FAULT'
    detail: Optional[str] = None


class HardwareStatus(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    processor: str = "STM32G4 (ARM Cortex-M4F, 170 MHz) [SIMULATED]"
    timer: str = "READY"
    dma: str = "READY"
    dac: str = "READY (12-bit, SIMULATED)"
    filter: str = "SIMULATED (4th-order Butterworth LPF model)"
    amplifier: str = "SIMULATED (Class-AB 20W model)"
    transducer: str = "NOT_CONNECTED"
    mode: str = "BENCH_SIMULATION"
    components: List[HardwareComponentStatus] = Field(default_factory=list)
    overall_status: str = "SIMULATION"
    overallStatus: str = "SIMULATION"

    @model_validator(mode="before")
    @classmethod
    def sync_status(cls, data):
        if isinstance(data, dict):
            res = dict(data)
            st = res.get("overall_status") or res.get("overallStatus") or "SIMULATION"
            res["overall_status"] = st
            res["overallStatus"] = st
            return res
        return data


class HealthTelemetry(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    output_current_a: float = 0.65
    output_voltage_v: float = 9.0
    amplifier_temperature_c: float = 35.0
    output_amplitude: float = 3.6
    energy_per_ping_mj: float = 2.4
    battery: float = 72.0

    # Frontend camelCase mirrors
    outputCurrent: float = 650.0
    outputVoltage: float = 9.0
    amplifierTemperature: float = 35.0
    outputAmplitude: float = 3.6
    energyPerPing: float = 2.4

    isSimulated: bool = True
    measured: bool = False

    @model_validator(mode="before")
    @classmethod
    def sync_health(cls, data):
        if isinstance(data, dict):
            res = dict(data)
            v = res.get("output_voltage_v") or res.get("outputVoltage") or 9.0
            res["output_voltage_v"] = float(v)
            res["outputVoltage"] = float(v)

            temp = res.get("amplifier_temperature_c") or res.get("amplifierTemperature") or 35.0
            res["amplifier_temperature_c"] = float(temp)
            res["amplifierTemperature"] = float(temp)

            e = res.get("energy_per_ping_mj") or res.get("energyPerPing") or 2.4
            res["energy_per_ping_mj"] = float(e)
            res["energyPerPing"] = float(e)

            amp = res.get("output_amplitude") or res.get("outputAmplitude") or 3.6
            res["output_amplitude"] = float(amp)
            res["outputAmplitude"] = float(amp)

            curr_a = res.get("output_current_a") or (res.get("outputCurrent", 650.0) / 1000.0)
            res["output_current_a"] = float(curr_a)
            res["outputCurrent"] = float(curr_a * 1000.0)
            return res
        return data


class WaveformPoint(BaseModel):
    time: float  # ms
    amplitude: float


class FFTPoint(BaseModel):
    frequency: float  # kHz
    magnitude: float  # dB


class SpectrogramPoint(BaseModel):
    time: float       # ms
    frequency: float  # kHz
    magnitude: float  # dB


class WaveformResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    waveform: str
    sample_rate_hz: float
    duration_ms: float
    time: List[float] = Field(default_factory=list)
    amplitude: List[float] = Field(default_factory=list)
    fft_frequency: List[float] = Field(default_factory=list)
    fft_magnitude: List[float] = Field(default_factory=list)
    spectrogram_data: List[SpectrogramPoint] = Field(default_factory=list)

    # UI bindings directly matching Frontend components (both camelCase and snake_case)
    time_domain: List[WaveformPoint] = Field(default_factory=list)
    timeDomain: List[WaveformPoint] = Field(default_factory=list)
    fft: List[FFTPoint] = Field(default_factory=list)
    spectrogram: List[SpectrogramPoint] = Field(default_factory=list)

    metadata: Dict[str, Any] = Field(default_factory=dict)
    simulation: bool = True

    @model_validator(mode="before")
    @classmethod
    def sync_time_domain(cls, data):
        if isinstance(data, dict):
            res = dict(data)
            td = res.get("timeDomain") or res.get("time_domain") or []
            res["timeDomain"] = td
            res["time_domain"] = td
            return res
        return data


class HistoryRecord(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    timestamp: str
    environment_state: str = "MID_TURBIDITY"
    environmentClass: str = "MID_TURBIDITY"
    environment: EnvironmentInput
    waveform: str = "LFM"
    waveformType: str = "lfm"
    start_frequency_hz: float = 120_000.0
    startFrequency: float = 120.0
    stop_frequency_hz: float = 160_000.0
    stopFrequency: float = 160.0
    bandwidth_hz: float = 40_000.0
    bandwidth: float = 40.0
    duration_ms: float = 1.2
    pulseDuration: float = 1.2
    amplitude: float = 0.75
    energy_per_ping_mj: float = 2.4
    energyPerPing: float = 2.4
    status: str = "COMPLETED"

    @model_validator(mode="before")
    @classmethod
    def sync_history(cls, data):
        if isinstance(data, dict):
            res = dict(data)
            env_s = res.get("environment_state") or res.get("environmentClass") or "MID_TURBIDITY"
            res["environment_state"] = env_s
            res["environmentClass"] = env_s

            wf = res.get("waveform") or res.get("waveformType") or "LFM"
            res["waveform"] = str(wf).upper()
            res["waveformType"] = str(wf).lower().replace("_", "-")

            start_f = res.get("start_frequency_hz") or res.get("startFrequency") or 120_000.0
            if float(start_f) < 1000:
                res["start_frequency_hz"] = float(start_f) * 1000.0
                res["startFrequency"] = float(start_f)
            else:
                res["start_frequency_hz"] = float(start_f)
                res["startFrequency"] = float(start_f) / 1000.0

            stop_f = res.get("stop_frequency_hz") or res.get("stopFrequency") or 160_000.0
            if float(stop_f) < 1000:
                res["stop_frequency_hz"] = float(stop_f) * 1000.0
                res["stopFrequency"] = float(stop_f)
            else:
                res["stop_frequency_hz"] = float(stop_f)
                res["stopFrequency"] = float(stop_f) / 1000.0

            dur = res.get("duration_ms") or res.get("pulseDuration") or 1.2
            res["duration_ms"] = float(dur)
            res["pulseDuration"] = float(dur)

            e = res.get("energy_per_ping_mj") or res.get("energyPerPing") or 2.4
            res["energy_per_ping_mj"] = float(e)
            res["energyPerPing"] = float(e)
            return res
        return data


class SystemState(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    status: str = "ONLINE"
    mode: str = "BENCH_SIMULATION"
    processor: str = "STM32G4"
    dataSource: str = "BENCH SIMULATION"
    pingStatus: str = "READY"
    battery: float = 72.0
    api_connected: bool = True
    environment: EnvironmentInput
    current_ping: PingConfiguration
    currentPing: Optional[PingConfiguration] = None
    adaptation_decision: AdaptationDecision
    adaptationDecision: Optional[AdaptationDecision] = None
    hardware_status: HardwareStatus
    hardwareStatus: Optional[HardwareStatus] = None
    health: HealthTelemetry

    @model_validator(mode="before")
    @classmethod
    def sync_system_state(cls, data):
        if isinstance(data, dict):
            res = dict(data)
            cp = res.get("current_ping") or res.get("currentPing")
            res["current_ping"] = cp
            res["currentPing"] = cp

            ad = res.get("adaptation_decision") or res.get("adaptationDecision")
            res["adaptation_decision"] = ad
            res["adaptationDecision"] = ad

            hs = res.get("hardware_status") or res.get("hardwareStatus")
            res["hardware_status"] = hs
            res["hardwareStatus"] = hs
            return res
        return data
