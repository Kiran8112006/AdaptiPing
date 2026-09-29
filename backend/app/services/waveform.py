"""
NumPy/SciPy Waveform synthesis pipeline.
Includes:
- LFM chirp
- Geometric sweep
- Phase-coded (13-bit Barker)
- Windowing (Hann, Hamming, Blackman)
- 12-bit DAC quantization model
- Modeled analog reconstruction filter (4th-order Butterworth LPF)
"""

import numpy as np
from scipy import signal
from typing import Tuple, Dict, Any
from ..models.ping import PingConfiguration, WaveformTypeEnum, WindowTypeEnum
from ..config import settings

# 13-bit Barker sequence
BARKER_13 = np.array([1, 1, 1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1], dtype=np.float64)


class WaveformGenerator:
    """
    Synthesizes and processes acoustic transmit waveforms through modeled hardware stages.
    """

    @staticmethod
    def get_window(window_type: WindowTypeEnum, length: int) -> np.ndarray:
        if length <= 1:
            return np.ones(length, dtype=np.float64)
        if window_type == WindowTypeEnum.HAMMING:
            return np.hamming(length)
        elif window_type == WindowTypeEnum.BLACKMAN:
            return np.blackman(length)
        else:  # HANN
            return np.hanning(length)

    @classmethod
    def generate_raw_signal(cls, config: PingConfiguration) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generates continuous raw mathematical waveform array.
        Returns (time_array_seconds, signal_array).
        """
        duration_s = config.duration_ms / 1000.0
        fs = config.sample_rate_hz
        num_samples = int(duration_s * fs)
        if num_samples < 16:
            num_samples = 16

        t = np.linspace(0.0, duration_s, num_samples, endpoint=False)
        f0 = config.start_frequency_hz
        f1 = config.stop_frequency_hz

        if config.waveform == WaveformTypeEnum.GEOMETRIC:
            # Geometric / Exponential frequency chirp
            ratio = f1 / f0
            if abs(ratio - 1.0) < 1e-6:
                phase = 2.0 * np.pi * f0 * t
            else:
                phase = 2.0 * np.pi * f0 * duration_s * (np.power(ratio, t / duration_s) - 1.0) / np.log(ratio)
            raw = np.sin(phase)

        elif config.waveform == WaveformTypeEnum.PHASE_CODED:
            # 13-bit Barker phase-coded sequence
            fc = (f0 + f1) / 2.0
            chip_duration = duration_s / len(BARKER_13)
            chip_indices = np.minimum((t / chip_duration).astype(int), len(BARKER_13) - 1)
            carrier_phase = 2.0 * np.pi * fc * t
            biphase_modulation = BARKER_13[chip_indices]
            raw = biphase_modulation * np.sin(carrier_phase)

        else:
            # Linear Frequency Modulation (LFM)
            # chirp: phase = 2*pi*(f0*t + 0.5*k*t^2)
            k = (f1 - f0) / duration_s
            phase = 2.0 * np.pi * (f0 * t + 0.5 * k * (t ** 2))
            raw = np.sin(phase)

        # Apply Window function
        win = cls.get_window(config.window, num_samples)
        windowed = raw * win * config.amplitude

        return t, windowed

    @staticmethod
    def model_dac_quantization(signal_in: np.ndarray, bits: int = 12) -> np.ndarray:
        """
        Simulates quantization noise of an N-bit DAC (e.g. STM32G4 12-bit DAC).
        Converts floating point range [-1.0, 1.0] into 2^N discrete levels.
        """
        levels = 2 ** bits
        # Offset and scale to DAC codes [0, levels - 1]
        clamped = np.clip(signal_in, -1.0, 1.0)
        dac_codes = np.round(((clamped + 1.0) / 2.0) * (levels - 1))
        # Re-convert to normalized reconstructed voltage [-1.0, 1.0]
        reconstructed = (dac_codes / (levels - 1)) * 2.0 - 1.0
        return reconstructed

    @staticmethod
    def model_reconstruction_filter(
        signal_in: np.ndarray,
        sample_rate_hz: float,
        cutoff_hz: float = 300_000.0,
    ) -> np.ndarray:
        """
        Digital model of a 4th-order active Butterworth reconstruction low-pass filter.
        Removes DAC sampling staircase artifacts.
        """
        nyquist = sample_rate_hz / 2.0
        # If cutoff is at or above Nyquist, set safe cutoff at 0.9 * Nyquist
        effective_cutoff = min(cutoff_hz, nyquist * 0.90)
        norm_cutoff = effective_cutoff / nyquist

        if norm_cutoff <= 0.01 or norm_cutoff >= 0.99 or len(signal_in) < 32:
            return signal_in

        sos = signal.butter(4, norm_cutoff, btype="low", output="sos")
        filtered = signal.sosfilt(sos, signal_in)
        return filtered

    @classmethod
    def synthesize_pipeline(cls, config: PingConfiguration) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
        """
        Executes complete bench simulation synthesis pipeline:
        Raw Math -> Window -> DAC 12-bit Model -> Reconstruction LPF Model
        """
        t, raw_windowed = cls.generate_raw_signal(config)
        quantized = cls.model_dac_quantization(raw_windowed, bits=settings.DAC_RESOLUTION_BITS)
        filtered = cls.model_reconstruction_filter(
            quantized,
            sample_rate_hz=config.sample_rate_hz,
            cutoff_hz=settings.MODELED_FILTER_CUTOFF_HZ,
        )

        metadata = {
            "synthesis_mode": "BENCH_SIMULATION",
            "dac_model": f"{settings.DAC_RESOLUTION_BITS}-bit DAC quantization",
            "reconstruction_filter": "Modeled 4th-order active Butterworth LPF",
            "total_samples_computed": len(filtered),
            "sample_rate_hz": config.sample_rate_hz,
        }

        return t, filtered, metadata
