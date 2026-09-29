'use client';

import React from 'react';
import { HealthTelemetry } from '../../lib/types';

interface HealthMonitorProps {
  health: HealthTelemetry;
}

export default function HealthMonitor({ health }: HealthMonitorProps) {
  return (
    <div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Value</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Output Current (Load)</td>
            <td className="mono">{health.outputCurrent} mA</td>
            <td style={{ fontSize: '0.7rem', color: 'var(--grey-500)' }}>
              SIMULATED MODEL
            </td>
          </tr>
          <tr>
            <td>Output Voltage (Drive Rail)</td>
            <td className="mono">{health.outputVoltage} V</td>
            <td style={{ fontSize: '0.7rem', color: 'var(--grey-500)' }}>
              SIMULATED MODEL
            </td>
          </tr>
          <tr>
            <td>Amplifier Temperature</td>
            <td className="mono">{health.amplifierTemperature} °C</td>
            <td style={{ fontSize: '0.7rem', color: 'var(--grey-500)' }}>
              SIMULATED THERMAL
            </td>
          </tr>
          <tr>
            <td>Payload Battery Level</td>
            <td className="mono">{health.battery}%</td>
            <td style={{ fontSize: '0.7rem', color: 'var(--grey-500)' }}>
              SIMULATED INPUT
            </td>
          </tr>
          <tr>
            <td>Output Amplitude</td>
            <td className="mono">{health.outputAmplitude} V</td>
            <td style={{ fontSize: '0.7rem', color: 'var(--grey-500)' }}>
              SIMULATED SCALING
            </td>
          </tr>
          <tr>
            <td>
              Estimated Energy / Ping
              <span style={{ fontSize: '0.65rem', color: 'var(--grey-400)', marginLeft: '0.3rem' }}>
                (E = ∫V·I dt)
              </span>
            </td>
            <td className="mono">{health.energyPerPing} mJ</td>
            <td style={{ fontSize: '0.7rem', color: 'var(--grey-500)' }}>
              SIMULATED MODEL
            </td>
          </tr>
        </tbody>
      </table>

      <div
        style={{
          fontSize: '0.68rem',
          color: 'var(--grey-500)',
          marginTop: '0.5rem',
          padding: '0.35rem 0.5rem',
          background: 'var(--grey-50)',
          border: '1px solid var(--grey-200)',
          borderRadius: '2px',
        }}
      >
        All electrical, thermal, and energy metrics are generated from software simulation models.
        No physical hardware instruments or live sensors are connected.
      </div>
    </div>
  );
}
