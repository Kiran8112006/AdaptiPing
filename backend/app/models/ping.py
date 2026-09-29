"""
Ping configuration models and validation rules.
Internal storage is strictly in Hz for frequencies and ms for duration.
Includes programmatic Nyquist validation (stop_frequency < sample_rate / 2).
"""

from enum import Enum
from pydantic import BaseModel, Field, ConfigDict, model_validator, computed_field


class WaveformTypeEnum(str, Enum):
    LFM = "LFM"
    GEOMETRIC = "GEOMETRIC"
    PHASE_CODED = "PHASE_CODED"


class WindowTypeEnum(str, Enum):
    HANN = "HANN"
    HAMMING = "HAMMING"
    BLACKMAN = "BLACKMAN"


class PingConfiguration(BaseModel):
    """
    Sonar ping transmission parameters.
    Internal engineering representation:
    - Frequency: Hz
    - Duration: ms
    - Amplitude: normalized 0.0 to 1.0
    - Sample rate: Hz (bench default 1 MSPS, Nyquist = 500 kHz)
    """
    model_config = ConfigDict(populate_by_name=True)

    waveform: WaveformTypeEnum = Field(
        default=WaveformTypeEnum.LFM,
        description="Waveform modulation scheme",
    )
    start_frequency_hz: float = Field(
        default=120_000.0,
        gt=0.0,
        description="Chirp start frequency in Hz",
    )
    stop_frequency_hz: float = Field(
        default=160_000.0,
        gt=0.0,
        description="Chirp stop frequency in Hz",
    )
    bandwidth_hz: float = Field(
        default=40_000.0,
        ge=0.0,
        description="Chirp bandwidth in Hz (stop - start)",
    )
    duration_ms: float = Field(
        default=1.2,
        gt=0.0,
        le=50.0,
        description="Pulse duration in milliseconds (max 50ms for bench test)",
    )
    amplitude: float = Field(
        default=0.75,
        ge=0.0,
        le=1.0,
        description="Normalized transmit amplitude scalar (0.0 to 1.0)",
    )
    window: WindowTypeEnum = Field(
        default=WindowTypeEnum.HANN,
        description="Tapering window function",
    )
    sample_rate_hz: float = Field(
        default=1_000_000.0,
        gt=0.0,
        le=2_000_000.0,
        description="DAC sample rate in Hz (bench simulation rate: 1 MSPS)",
    )

    @computed_field
    @property
    def start_frequency_khz(self) -> float:
        return round(self.start_frequency_hz / 1000.0, 1)

    @computed_field
    @property
    def stop_frequency_khz(self) -> float:
        return round(self.stop_frequency_hz / 1000.0, 1)

    @computed_field
    @property
    def bandwidth_khz(self) -> float:
        return round(self.bandwidth_hz / 1000.0, 1)

    @computed_field
    @property
    def startFrequency(self) -> float:
        """UI camelCase mirror in kHz"""
        return self.start_frequency_khz

    @computed_field
    @property
    def stopFrequency(self) -> float:
        """UI camelCase mirror in kHz"""
        return self.stop_frequency_khz

    @computed_field
    @property
    def bandwidth(self) -> float:
        """UI camelCase mirror in kHz"""
        return self.bandwidth_khz

    @computed_field
    @property
    def pulseDuration(self) -> float:
        """UI camelCase mirror in ms"""
        return self.duration_ms

    @computed_field
    @property
    def sampleRate(self) -> float:
        """UI camelCase mirror in kHz"""
        return round(self.sample_rate_hz / 1000.0, 1)

    @computed_field
    @property
    def waveformType(self) -> str:
        """UI lowercase format e.g. 'lfm'"""
        return self.waveform.value.lower().replace("_", "-")

    @computed_field
    @property
    def windowType(self) -> str:
        """UI lowercase format e.g. 'hann'"""
        return self.window.value.lower()

    @model_validator(mode="before")
    @classmethod
    def normalize_inputs(cls, data):
        if not isinstance(data, dict):
            return data
        res = dict(data)

        # Normalize waveform enum string
        wf = res.get("waveform") or res.get("waveformType")
        if wf:
            if isinstance(wf, WaveformTypeEnum):
                res["waveform"] = wf.value
            else:
                res["waveform"] = str(wf).upper().replace("-", "_")
            res.pop("waveformType", None)

        # Normalize window enum string
        win = res.get("window") or res.get("windowType")
        if win:
            if isinstance(win, WindowTypeEnum):
                res["window"] = win.value
            else:
                res["window"] = str(win).upper()
            res.pop("windowType", None)

        # Support start/stop frequency in kHz if passed as kHz (< 1000)
        start_f = res.get("start_frequency_hz") if "start_frequency_hz" in res else res.get("startFrequency")
        stop_f = res.get("stop_frequency_hz") if "stop_frequency_hz" in res else res.get("stopFrequency")

        if start_f is not None:
            start_val = float(start_f)
            # If value is less than 1000, caller passed kHz (e.g. 90 kHz -> 90,000 Hz)
            if 0 < start_val < 1000:
                start_val *= 1000.0
            res["start_frequency_hz"] = start_val
            res.pop("startFrequency", None)

        if stop_f is not None:
            stop_val = float(stop_f)
            if 0 < stop_val < 1000:
                stop_val *= 1000.0
            res["stop_frequency_hz"] = stop_val
            res.pop("stopFrequency", None)

        dur = res.get("duration_ms") if "duration_ms" in res else res.get("pulseDuration")
        if dur is not None:
            res["duration_ms"] = float(dur)
            res.pop("pulseDuration", None)

        sr = res.get("sample_rate_hz") if "sample_rate_hz" in res else res.get("sampleRate")
        if sr is not None:
            sr_val = float(sr)
            if 0 < sr_val < 10_000:  # e.g. 1000 passed for 1 MSPS
                sr_val *= 1000.0
            res["sample_rate_hz"] = sr_val
            res.pop("sampleRate", None)

        # Auto-compute bandwidth in Hz
        if "start_frequency_hz" in res and "stop_frequency_hz" in res:
            res["bandwidth_hz"] = float(res["stop_frequency_hz"]) - float(res["start_frequency_hz"])
            res.pop("bandwidth", None)

        return res

    @model_validator(mode="after")
    def validate_frequency_and_samples(self):
        # Frequency ordering
        if self.stop_frequency_hz <= self.start_frequency_hz:
            raise ValueError(
                f"stop_frequency_hz ({self.stop_frequency_hz} Hz) must be strictly greater than "
                f"start_frequency_hz ({self.start_frequency_hz} Hz)."
            )

        # Part 3: Programmatic Nyquist criterion check (stop_frequency < sample_rate / 2)
        nyquist_hz = self.sample_rate_hz / 2.0
        if self.stop_frequency_hz >= nyquist_hz:
            raise ValueError(
                f"Requested stop frequency ({self.stop_frequency_hz} Hz / {self.stop_frequency_hz/1000:.1f} kHz) "
                f"violates the Nyquist criterion for sample rate {self.sample_rate_hz} Hz (1 MSPS). "
                f"Maximum allowed frequency is below Nyquist ({nyquist_hz} Hz / {nyquist_hz/1000:.1f} kHz)."
            )
        if self.start_frequency_hz >= nyquist_hz:
            raise ValueError(
                f"Requested start frequency ({self.start_frequency_hz} Hz / {self.start_frequency_hz/1000:.1f} kHz) "
                f"violates the Nyquist criterion: must be strictly less than {nyquist_hz} Hz."
            )

        # Ensure bandwidth_hz matches exactly stop - start
        self.bandwidth_hz = round(self.stop_frequency_hz - self.start_frequency_hz, 1)

        # Guard against excessive sample buffer allocation
        total_samples = int((self.duration_ms / 1000.0) * self.sample_rate_hz)
        if total_samples > 100_000:
            raise ValueError(
                f"Requested duration ({self.duration_ms} ms) and sample rate "
                f"({self.sample_rate_hz} Hz) produce {total_samples} samples, "
                f"exceeding the memory limit of 100,000 samples."
            )

        return self
