'use client';

import React from 'react';
import { PingConfiguration, WaveformType, WindowType } from '../../lib/types';

interface WaveformControlsProps {
  config: PingConfiguration;
  onConfigChange: (config: PingConfiguration) => void;
}

export default function WaveformControls({ config, onConfigChange }: WaveformControlsProps) {
  const updateField = <K extends keyof PingConfiguration>(
    field: K,
    value: PingConfiguration[K]
  ) => {
    onConfigChange({ ...config, [field]: value });
  };

  return (
    <div>
      {/* Waveform Type */}
      <div className="form-group">
        <label className="form-label" htmlFor="waveform-type">Waveform Type</label>
        <select
          id="waveform-type"
          className="form-select"
          value={config.waveformType}
          onChange={(e) => updateField('waveformType', e.target.value as WaveformType)}
        >
          <option value="lfm">LFM Chirp</option>
          <option value="geometric">Geometric Sweep</option>
          <option value="phase-coded">Phase-Coded (Barker-13)</option>
        </select>
      </div>

      {/* Start Frequency */}
      <div className="form-group">
        <label className="form-label" htmlFor="start-freq">
          Start Frequency
          <span className="form-value" style={{ float: 'right' }}>{config.startFrequency} kHz</span>
        </label>
        <input
          id="start-freq"
          type="range"
          className="form-range"
          min={20}
          max={250}
          step={1}
          value={config.startFrequency}
          onChange={(e) => updateField('startFrequency', parseFloat(e.target.value))}
        />
      </div>

      {/* Stop Frequency */}
      <div className="form-group">
        <label className="form-label" htmlFor="stop-freq">
          Stop Frequency
          <span className="form-value" style={{ float: 'right' }}>{config.stopFrequency} kHz</span>
        </label>
        <input
          id="stop-freq"
          type="range"
          className="form-range"
          min={20}
          max={300}
          step={1}
          value={config.stopFrequency}
          onChange={(e) => updateField('stopFrequency', parseFloat(e.target.value))}
        />
      </div>

      {/* Duration */}
      <div className="form-group">
        <label className="form-label" htmlFor="pulse-duration">
          Pulse Duration
          <span className="form-value" style={{ float: 'right' }}>{config.pulseDuration} ms</span>
        </label>
        <input
          id="pulse-duration"
          type="range"
          className="form-range"
          min={0.1}
          max={5.0}
          step={0.1}
          value={config.pulseDuration}
          onChange={(e) => updateField('pulseDuration', parseFloat(e.target.value))}
        />
      </div>

      {/* Amplitude */}
      <div className="form-group">
        <label className="form-label" htmlFor="amplitude">
          Amplitude
          <span className="form-value" style={{ float: 'right' }}>{config.amplitude}</span>
        </label>
        <input
          id="amplitude"
          type="range"
          className="form-range"
          min={0.05}
          max={1.0}
          step={0.05}
          value={config.amplitude}
          onChange={(e) => updateField('amplitude', parseFloat(e.target.value))}
        />
      </div>

      {/* Window Type */}
      <div className="form-group">
        <label className="form-label" htmlFor="window-type">Window Function</label>
        <select
          id="window-type"
          className="form-select"
          value={config.windowType}
          onChange={(e) => updateField('windowType', e.target.value as WindowType)}
        >
          <option value="hann">Hann</option>
          <option value="hamming">Hamming</option>
          <option value="blackman">Blackman</option>
        </select>
      </div>
    </div>
  );
}
