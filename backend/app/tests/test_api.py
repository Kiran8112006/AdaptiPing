"""
API integration and validation tests using FastAPI TestClient.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["mode"] == "BENCH_SIMULATION"
    assert "AdaptiPing" in data["service"]


def test_get_system_state():
    response = client.get("/api/system/state")
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "BENCH_SIMULATION"
    assert "environment" in data
    assert "currentPing" in data or "current_ping" in data


def test_get_environment():
    response = client.get("/api/environment")
    assert response.status_code == 200
    data = response.json()
    assert "turbidity" in data
    assert "depth_m" in data or "depth" in data


def test_update_environment_muddy():
    payload = {
        "depth_m": 8.0,
        "turbidity": 80.0,
        "temperature_c": 26.0,
        "salinity_psu": 25.0,
        "battery_pct": 85.0,
    }
    response = client.post("/api/simulation/environment", json=payload)
    assert response.status_code == 200
    data = response.json()
    # Check that adaptation switched to MUDDY_ESTUARY
    decision = data.get("adaptation_decision") or data.get("adaptationDecision")
    assert decision["environment_state"] == "MUDDY_ESTUARY"


def test_update_environment_low_battery():
    payload = {
        "depth_m": 12.0,
        "turbidity": 20.0,
        "temperature_c": 25.0,
        "salinity_psu": 35.0,
        "battery_pct": 12.0,
    }
    response = client.post("/api/simulation/environment", json=payload)
    assert response.status_code == 200
    data = response.json()
    decision = data.get("adaptation_decision") or data.get("adaptationDecision")
    assert decision["energy_state"] == "CRITICAL"


def test_get_current_ping():
    response = client.get("/api/ping/current")
    assert response.status_code == 200
    data = response.json()
    assert "configuration" in data or "pingConfig" in data
    assert "reason" in data


def test_trigger_ping():
    response = client.post("/api/simulation/ping")
    assert response.status_code == 200
    record = response.json()
    assert "id" in record
    assert "energy_per_ping_mj" in record or "energyPerPing" in record


def test_get_current_waveform():
    response = client.get("/api/waveform/current")
    assert response.status_code == 200
    data = response.json()
    assert data["simulation"] is True
    assert len(data["timeDomain"]) > 0
    assert len(data["fft"]) > 0
    assert len(data["spectrogram"]) > 0


def test_generate_waveform():
    config = {
        "waveform": "LFM",
        "start_frequency_hz": 120_000,
        "stop_frequency_hz": 160_000,
        "duration_ms": 2.0,
        "amplitude": 0.6,
        "window": "HAMMING",
        "sample_rate_hz": 500_000,
    }
    response = client.post("/api/waveform/generate", json=config)
    assert response.status_code == 200
    data = response.json()
    assert data["waveform"] == "LFM"
    assert data["duration_ms"] == 2.0


def test_hardware_status():
    response = client.get("/api/hardware/status")
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "BENCH_SIMULATION"
    assert "health" in data
    assert data["health"]["isSimulated"] is True


def test_history():
    response = client.get("/api/history")
    assert response.status_code == 200
    records = response.json()
    assert isinstance(records, list)
    assert len(records) >= 1


# --- Validation Constraint Tests (HTTP 422) ---

def test_validation_negative_frequency():
    payload = {
        "waveform": "LFM",
        "start_frequency_hz": -50000.0,
        "stop_frequency_hz": 100000.0,
        "duration_ms": 1.0,
        "amplitude": 0.5,
    }
    response = client.post("/api/waveform/generate", json=payload)
    assert response.status_code == 422


def test_validation_stop_frequency_less_than_start():
    payload = {
        "waveform": "LFM",
        "start_frequency_hz": 150000.0,
        "stop_frequency_hz": 100000.0,
        "duration_ms": 1.0,
        "amplitude": 0.5,
    }
    response = client.post("/api/waveform/generate", json=payload)
    assert response.status_code == 422


def test_validation_amplitude_greater_than_one():
    payload = {
        "waveform": "LFM",
        "start_frequency_hz": 100000.0,
        "stop_frequency_hz": 150000.0,
        "duration_ms": 1.0,
        "amplitude": 1.5,
    }
    response = client.post("/api/waveform/generate", json=payload)
    assert response.status_code == 422


def test_validation_invalid_waveform():
    payload = {
        "waveform": "NON_EXISTENT_WAVEFORM",
        "start_frequency_hz": 100000.0,
        "stop_frequency_hz": 150000.0,
        "duration_ms": 1.0,
        "amplitude": 0.5,
    }
    response = client.post("/api/waveform/generate", json=payload)
    assert response.status_code == 422


def test_validation_invalid_window():
    payload = {
        "waveform": "LFM",
        "start_frequency_hz": 100000.0,
        "stop_frequency_hz": 150000.0,
        "duration_ms": 1.0,
        "amplitude": 0.5,
        "window": "NON_EXISTENT_WINDOW",
    }
    response = client.post("/api/waveform/generate", json=payload)
    assert response.status_code == 422


def test_validation_negative_duration():
    payload = {
        "waveform": "LFM",
        "start_frequency_hz": 100000.0,
        "stop_frequency_hz": 150000.0,
        "duration_ms": -2.0,
        "amplitude": 0.5,
    }
    response = client.post("/api/waveform/generate", json=payload)
    assert response.status_code == 422


def test_validation_huge_sample_request():
    # 50 ms at 2,000,000 Hz = 100,000 samples (at limit). Duration 60 ms exceeds limit
    payload = {
        "waveform": "LFM",
        "start_frequency_hz": 100000.0,
        "stop_frequency_hz": 150000.0,
        "duration_ms": 60.0,  # exceeds max duration 50 ms
        "amplitude": 0.5,
        "sample_rate_hz": 2000000.0,
    }
    response = client.post("/api/waveform/generate", json=payload)
    assert response.status_code == 422


def test_validation_nyquist_violation():
    # Sample rate 500 kHz -> Nyquist 250 kHz. Stop freq 300 kHz violates Nyquist
    payload = {
        "waveform": "LFM",
        "start_frequency_hz": 100000.0,
        "stop_frequency_hz": 300000.0,
        "duration_ms": 1.0,
        "amplitude": 0.5,
        "sample_rate_hz": 500000.0,
    }
    response = client.post("/api/waveform/generate", json=payload)
    assert response.status_code == 422
    assert "nyquist" in response.text.lower()

