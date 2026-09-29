"""
Tests for waveform synthesis pipeline, windowing, DAC model, and spectral analysis.
"""

import numpy as np
import pytest
from app.models.ping import PingConfiguration, WaveformTypeEnum, WindowTypeEnum
from app.models.environment import EnvironmentInput
from app.services.waveform import WaveformGenerator
from app.services.spectrum import SpectralAnalyzer
from app.services.energy import EnergyModel


@pytest.fixture
def base_config():
    return PingConfiguration(
        waveform=WaveformTypeEnum.LFM,
        start_frequency_hz=100_000.0,
        stop_frequency_hz=150_000.0,
        bandwidth_hz=50_000.0,
        duration_ms=1.0,
        amplitude=0.8,
        window=WindowTypeEnum.HANN,
        sample_rate_hz=500_000.0,
    )


def test_lfm_synthesis(base_config):
    t, sig, meta = WaveformGenerator.synthesize_pipeline(base_config)
    assert len(t) == 500  # 1ms * 500kS/s = 500 samples
    assert len(sig) == 500
    assert np.max(np.abs(sig)) <= 1.0
    assert meta["synthesis_mode"] == "BENCH_SIMULATION"


def test_geometric_synthesis(base_config):
    base_config.waveform = WaveformTypeEnum.GEOMETRIC
    t, sig, meta = WaveformGenerator.synthesize_pipeline(base_config)
    assert len(sig) == 500
    assert np.max(np.abs(sig)) <= 1.0


def test_phase_coded_synthesis(base_config):
    base_config.waveform = WaveformTypeEnum.PHASE_CODED
    t, sig, meta = WaveformGenerator.synthesize_pipeline(base_config)
    assert len(sig) == 500
    assert np.max(np.abs(sig)) <= 1.0


def test_window_types(base_config):
    for win_type in [WindowTypeEnum.HANN, WindowTypeEnum.HAMMING, WindowTypeEnum.BLACKMAN]:
        base_config.window = win_type
        t, sig, _ = WaveformGenerator.synthesize_pipeline(base_config)
        assert len(sig) > 0
        assert not np.isnan(sig).any()


def test_dac_quantization():
    test_sig = np.sin(np.linspace(0, 2 * np.pi, 1000))
    quantized = WaveformGenerator.model_dac_quantization(test_sig, bits=12)
    assert len(quantized) == len(test_sig)
    # Check that output values conform to 4096 discrete steps
    diffs = np.unique(np.round(quantized, 6))
    assert len(diffs) <= 4096


def test_spectral_analyzer(base_config):
    t, sig, _ = WaveformGenerator.synthesize_pipeline(base_config)
    freqs, mags, fft_points = SpectralAnalyzer.compute_fft(sig, base_config.sample_rate_hz, num_points=128)
    
    assert len(freqs) == 128
    assert len(mags) == 128
    assert len(fft_points) == 128
    # Max magnitude is normalized to 0 dB
    assert max(mags) <= 0.05
    assert min(mags) >= -60.0


def test_spectrogram(base_config):
    t, sig, _ = WaveformGenerator.synthesize_pipeline(base_config)
    spec_points = SpectralAnalyzer.compute_spectrogram(
        sig,
        sample_rate_hz=base_config.sample_rate_hz,
        duration_ms=base_config.duration_ms,
        time_bins=20,
        freq_bins=20,
    )
    assert len(spec_points) == 20 * 20
    assert spec_points[0].time >= 0.0
    assert spec_points[0].magnitude <= 0.0


def test_energy_model(base_config):
    env = EnvironmentInput(depth_m=10.0, turbidity=20.0, temperature_c=25.0, salinity_psu=35.0, battery_pct=75.0)
    t, sig, _ = WaveformGenerator.synthesize_pipeline(base_config)
    health = EnergyModel.compute_energy_and_health(sig, base_config, env)
    
    assert health.energy_per_ping_mj > 0.0
    assert health.output_voltage_v > 0.0
    assert health.output_current_a > 0.0
    assert health.isSimulated is True
    assert health.measured is False
