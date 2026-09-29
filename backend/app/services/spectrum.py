"""
Spectral processing service: Fast Fourier Transform (FFT) and Short-Time Fourier Transform (STFT/Spectrogram).
Outputs formatted for direct consumption by frontend Recharts / Canvas components.
"""

import numpy as np
from typing import List, Tuple
from ..models.telemetry import FFTPoint, SpectrogramPoint
from ..models.ping import PingConfiguration


class SpectralAnalyzer:
    """
    Computes spectral representations from synthesized acoustic waveforms.
    """

    @staticmethod
    def compute_fft(
        signal_array: np.ndarray,
        sample_rate_hz: float,
        num_points: int = 256,
    ) -> Tuple[List[float], List[float], List[FFTPoint]]:
        """
        Computes single-sided amplitude spectrum in dB scale.
        Returns:
            freq_khz_list, magnitude_db_list, fft_points_list
        """
        N = len(signal_array)
        if N == 0:
            return [], [], []

        # Standard windowed FFT
        window = np.hanning(N)
        windowed_sig = signal_array * window
        
        # Zero-pad or crop to appropriate power-of-two FFT length
        nfft = max(num_points * 2, 512)
        fft_complex = np.fft.rfft(windowed_sig, n=nfft)
        freqs_hz = np.fft.rfftfreq(nfft, d=1.0 / sample_rate_hz)

        # Single-sided normalized magnitude
        mag = np.abs(fft_complex) / (N / 2.0 + 1e-12)
        mag_db = 20.0 * np.log10(np.maximum(mag, 1e-6))
        # Normalize relative to max peak = 0 dB floor at -60 dB
        peak_db = np.max(mag_db)
        norm_mag_db = np.maximum(mag_db - peak_db, -60.0)

        # Downsample uniformly to `num_points` for clean JSON payload
        indices = np.linspace(0, len(freqs_hz) - 1, num_points, dtype=int)
        sampled_freqs_khz = (freqs_hz[indices] / 1000.0).round(1).tolist()
        sampled_mag_db = norm_mag_db[indices].round(1).tolist()

        fft_points = [
            FFTPoint(frequency=f, magnitude=m)
            for f, m in zip(sampled_freqs_khz, sampled_mag_db)
        ]

        return sampled_freqs_khz, sampled_mag_db, fft_points

    @staticmethod
    def compute_spectrogram(
        signal_array: np.ndarray,
        sample_rate_hz: float,
        duration_ms: float,
        time_bins: int = 40,
        freq_bins: int = 40,
    ) -> List[SpectrogramPoint]:
        """
        Computes 2D Short-Time Fourier Transform (time, frequency, intensity in dB).
        Outputs compact list of SpectrogramPoint models.
        """
        N = len(signal_array)
        if N < 32:
            return []

        nyquist_khz = (sample_rate_hz / 2.0) / 1000.0
        points: List[SpectrogramPoint] = []

        # Window segment size per time slice
        seg_len = max(16, int(N / time_bins * 2))
        win = np.hanning(seg_len)

        for t_idx in range(time_bins):
            t_ms = round((t_idx / time_bins) * duration_ms, 3)
            center = int((t_idx / time_bins) * N)
            start = max(0, center - seg_len // 2)
            end = min(N, start + seg_len)
            
            segment = signal_array[start:end]
            if len(segment) < seg_len:
                segment = np.pad(segment, (0, seg_len - len(segment)))

            seg_fft = np.fft.rfft(segment * win, n=freq_bins * 2)
            mag = np.abs(seg_fft[:freq_bins])
            mag_db = 20.0 * np.log10(np.maximum(mag, 1e-5))
            # Normalize to 0 to -60 dB
            norm_db = np.clip(mag_db - np.max(mag_db) if np.max(mag_db) > -60 else mag_db, -60.0, 0.0)

            for f_idx in range(freq_bins):
                f_khz = round((f_idx / freq_bins) * nyquist_khz, 1)
                points.append(
                    SpectrogramPoint(
                        time=t_ms,
                        frequency=f_khz,
                        magnitude=round(float(norm_db[f_idx]), 1),
                    )
                )

        return points
