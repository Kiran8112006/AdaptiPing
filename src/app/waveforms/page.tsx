'use client';

import React, { useState, useEffect } from 'react';

import WaveformControls from '../../components/waveform/WaveformControls';
import TimeDomainChart from '../../components/charts/TimeDomainChart';
import FFTChart from '../../components/charts/FFTChart';
import SpectrogramChart from '../../components/charts/SpectrogramChart';

import { PingConfiguration, WaveformData } from '../../lib/types';
import { generateWaveformData as localGenerateWaveformData } from '../../lib/simulation/waveform';
import { generateWaveform as apiGenerateWaveform } from '../../lib/api';

const DEFAULT_WAVEFORM_CONFIG: PingConfiguration = {
  waveformType: 'lfm',
  startFrequency: 120,
  stopFrequency: 160,
  bandwidth: 40,
  pulseDuration: 1.2,
  amplitude: 0.75,
  windowType: 'hann',
  sampleRate: 500,
};

export default function WaveformPage() {
  const [config, setConfig] = useState<PingConfiguration>(DEFAULT_WAVEFORM_CONFIG);
  const [waveformData, setWaveformData] = useState<WaveformData>(() =>
    localGenerateWaveformData(DEFAULT_WAVEFORM_CONFIG)
  );
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isBackend, setIsBackend] = useState(false);

  useEffect(() => {
    let mounted = true;

    apiGenerateWaveform(config)
      .then((data) => {
        if (!mounted) return;
        setWaveformData(data);
        setIsBackend(true);
      })
      .catch(() => {
        if (!mounted) return;
        setWaveformData(localGenerateWaveformData(config));
        setIsBackend(false);
      });

    return () => {
      mounted = false;
    };
  }, [config]);

  const handleConfigChange = (newConfig: PingConfiguration) => {
    const updated = {
      ...newConfig,
      bandwidth: Math.abs(newConfig.stopFrequency - newConfig.startFrequency),
    };
    setConfig(updated);
  };

  const handleManualSynthesize = () => {
    setIsSynthesizing(true);
    apiGenerateWaveform(config)
      .then((data) => {
        setWaveformData(data);
        setIsBackend(true);
      })
      .catch(() => {
        setWaveformData(localGenerateWaveformData(config));
        setIsBackend(false);
      })
      .finally(() => {
        setIsSynthesizing(false);
      });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Waveform Analysis</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={handleManualSynthesize}
            disabled={isSynthesizing}
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '3px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isSynthesizing ? 'Synthesizing...' : 'Synthesize Waveform'}
          </button>
          <span
            className="badge"
            style={{
              fontSize: '11px',
              padding: '3px 8px',
              background: isBackend ? '#e0f2fe' : '#f3f4f6',
              color: isBackend ? '#0369a1' : '#4b5563',
              border: `1px solid ${isBackend ? '#bae6fd' : '#d1d5db'}`,
              borderRadius: '3px',
              fontWeight: 600,
            }}
          >
            {isBackend ? 'ENGINE: FASTAPI / NUMPY / SCIPY' : 'ENGINE: LOCAL ESTIMATE'}
          </span>
        </div>
      </div>

      <div className="grid-sidebar">
        {/* Left: Controls */}
        <div>
          <div className="panel">
            <div className="panel__header">
              <h2 className="panel__title">Waveform Parameters</h2>
            </div>
            <div className="panel__body">
              <WaveformControls config={config} onConfigChange={handleConfigChange} />
            </div>
          </div>

          {/* Metadata */}
          <div className="panel">
            <div className="panel__header">
              <h3 className="panel__title">Waveform Metadata</h3>
            </div>
            <div className="panel__body" style={{ padding: 0 }}>
              <table className="data-table">
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600, width: '50%' }}>Waveform</td>
                    <td className="mono">{config.waveformType.toUpperCase()}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Sample Rate</td>
                    <td className="mono">{config.sampleRate} kHz</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Bandwidth</td>
                    <td className="mono">{config.bandwidth.toFixed(1)} kHz</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Duration</td>
                    <td className="mono">{config.pulseDuration} ms</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Window</td>
                    <td className="mono">{config.windowType.charAt(0).toUpperCase() + config.windowType.slice(1)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>DAC Model</td>
                    <td className="mono">12-bit Quantized (Bench)</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Reconstruction</td>
                    <td className="mono">4th-order Butterworth LPF</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Charts */}
        <div>
          {/* Time Domain */}
          <div className="panel">
            <div className="panel__header">
              <h2 className="panel__title">Time-Domain Waveform</h2>
              <span className="panel__badge panel__badge--simulation">SIMULATION / MODEL</span>
            </div>
            <div className="panel__body">
              <TimeDomainChart data={waveformData.timeDomain} />
            </div>
          </div>

          {/* FFT + Spectrogram */}
          <div className="grid-2">
            <div className="panel">
              <div className="panel__header">
                <h3 className="panel__title">Simulated FFT</h3>
                <span className="panel__badge panel__badge--simulation">SIMULATION</span>
              </div>
              <div className="panel__body">
                <FFTChart data={waveformData.fft} />
              </div>
            </div>

            <div className="panel">
              <div className="panel__header">
                <h3 className="panel__title">Simulated Spectrogram</h3>
                <span className="panel__badge panel__badge--simulation">SIMULATION</span>
              </div>
              <div className="panel__body">
                <SpectrogramChart data={waveformData.spectrogram} config={config} />
              </div>
            </div>
          </div>

          {/* Note */}
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--grey-500)',
              padding: '0.5rem 0.75rem',
              background: 'var(--grey-50)',
              border: '1px solid var(--grey-200)',
              borderRadius: '2px',
            }}
          >
            Waveform visualisations are computed via the FastAPI bench simulation pipeline using SciPy/NumPy.
            Includes 12-bit DAC quantization and analog reconstruction filter modeling.
            These are not captured from physical hardware instruments.
          </div>
        </div>
      </div>
    </div>
  );
}
