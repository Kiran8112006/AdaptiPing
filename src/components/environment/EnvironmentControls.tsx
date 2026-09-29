'use client';

import React from 'react';
import { EnvironmentTelemetry, DemoPreset } from '../../lib/types';
import { DEMO_PRESETS } from '../../lib/data';

interface EnvironmentControlsProps {
  environment: EnvironmentTelemetry;
  onEnvironmentChange: (env: EnvironmentTelemetry) => void;
}

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

function SliderControl({ label, value, min, max, step, unit, onChange }: SliderControlProps) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        <span className="form-value" style={{ float: 'right' }}>
          {value.toFixed(step < 1 ? 1 : 0)} {unit}
        </span>
      </label>
      <input
        type="range"
        className="form-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={`${label}: ${value} ${unit}`}
      />
    </div>
  );
}

export default function EnvironmentControls({
  environment,
  onEnvironmentChange,
}: EnvironmentControlsProps) {
  const updateField = (field: keyof EnvironmentTelemetry, value: number) => {
    onEnvironmentChange({ ...environment, [field]: value });
  };

  const applyPreset = (preset: DemoPreset) => {
    onEnvironmentChange({ ...preset.environment });
  };

  return (
    <div>
      {/* Preset buttons */}
      <div style={{ marginBottom: '0.75rem' }}>
        <div className="form-label" style={{ marginBottom: '0.35rem' }}>
          Demo Preset
        </div>
        <div className="btn-group">
          {DEMO_PRESETS.map((preset) => (
            <button
              key={preset.name}
              className="btn btn--sm"
              onClick={() => applyPreset(preset)}
              aria-label={`Apply preset: ${preset.label}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--grey-500)', marginTop: '0.25rem' }}>
          Engineering demonstration set-points — not measured field values
        </div>
      </div>

      {/* Sliders */}
      <SliderControl
        label="Depth"
        value={environment.depth}
        min={1}
        max={200}
        step={1}
        unit="m"
        onChange={(v) => updateField('depth', v)}
      />
      <SliderControl
        label="Turbidity"
        value={environment.turbidity}
        min={0}
        max={100}
        step={1}
        unit="NTU"
        onChange={(v) => updateField('turbidity', v)}
      />
      <SliderControl
        label="Temperature"
        value={environment.temperature}
        min={0}
        max={45}
        step={0.5}
        unit="°C"
        onChange={(v) => updateField('temperature', v)}
      />
      <SliderControl
        label="Salinity"
        value={environment.salinity}
        min={0}
        max={45}
        step={0.5}
        unit="PSU"
        onChange={(v) => updateField('salinity', v)}
      />
      <SliderControl
        label="Battery"
        value={environment.battery}
        min={0}
        max={100}
        step={1}
        unit="%"
        onChange={(v) => updateField('battery', v)}
      />
    </div>
  );
}
