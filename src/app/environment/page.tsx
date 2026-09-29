'use client';

import React, { useState, useMemo, useEffect } from 'react';

import EnvironmentControls from '../../components/environment/EnvironmentControls';
import StatusBadge from '../../components/status/StatusBadge';

import { EnvironmentTelemetry } from '../../lib/types';
import { DEFAULT_ENVIRONMENT } from '../../lib/data';
import { computeParameterEffects, computeAdaptation, getEnvironmentLabel } from '../../lib/adaptation';
import { getEnvironment, updateEnvironment as apiUpdateEnvironment } from '../../lib/api';

export default function EnvironmentPage() {
  const [environment, setEnvironment] = useState<EnvironmentTelemetry>(DEFAULT_ENVIRONMENT);
  const [isBackend, setIsBackend] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    getEnvironment()
      .then((env) => {
        if (!mounted) return;
        setEnvironment(env);
        setIsBackend(true);
      })
      .catch(() => {
        if (!mounted) return;
        setIsBackend(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleEnvironmentChange = async (newEnv: EnvironmentTelemetry) => {
    setEnvironment(newEnv);
    try {
      await apiUpdateEnvironment(newEnv);
      setIsBackend(true);
    } catch {
      setIsBackend(false);
    }
  };

  const effects = useMemo(() => computeParameterEffects(environment), [environment]);
  const decision = useMemo(() => computeAdaptation(environment), [environment]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Environment Parameters</h1>
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
          {isBackend ? 'SYNCED: FASTAPI SIMULATION' : 'STANDALONE: CLIENT ESTIMATE'}
        </span>
      </div>

      <div className="grid-sidebar">
        {/* Left: Controls */}
        <div>
          <div className="panel">
            <div className="panel__header">
              <h2 className="panel__title">Sensor Inputs</h2>
              <span className="panel__badge panel__badge--demo">DEMO PRESET</span>
            </div>
            <div className="panel__body">
              <EnvironmentControls
                environment={environment}
                onEnvironmentChange={handleEnvironmentChange}
              />
            </div>
          </div>

          {/* Environment Classification */}
          <div className="panel">
            <div className="panel__header">
              <h3 className="panel__title">Classification</h3>
            </div>
            <div className="panel__body">
              <table className="data-table">
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600, width: '50%' }}>Environment Class</td>
                    <td className="mono">{getEnvironmentLabel(decision.environmentClass)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Energy Constraint</td>
                    <td>
                      <StatusBadge status={decision.energyConstraint} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Effects Table */}
        <div>
          <div className="panel">
            <div className="panel__header">
              <h2 className="panel__title">Parameter Effects on Ping</h2>
              <span className="panel__badge panel__badge--simulation">SIMULATION</span>
            </div>
            <div className="panel__body" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Value</th>
                    <th>Status</th>
                    <th>Effect on Ping</th>
                  </tr>
                </thead>
                <tbody>
                  {effects.map((eff) => (
                    <tr key={eff.parameter}>
                      <td style={{ fontWeight: 500 }}>{eff.parameter}</td>
                      <td className="mono">{eff.value}</td>
                      <td><StatusBadge status={eff.status} /></td>
                      <td style={{ fontSize: '0.78rem' }}>{eff.effect}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Raw Telemetry Values */}
          <div className="panel">
            <div className="panel__header">
              <h3 className="panel__title">Current Telemetry</h3>
              <span className="panel__badge panel__badge--simulation">SIMULATED VALUES</span>
            </div>
            <div className="panel__body" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sensor</th>
                    <th>Value</th>
                    <th>Unit</th>
                    <th>Range</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Depth</td>
                    <td className="mono">{environment.depth.toFixed(1)}</td>
                    <td>m</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--grey-500)' }}>1 – 200</td>
                  </tr>
                  <tr>
                    <td>Turbidity</td>
                    <td className="mono">{environment.turbidity.toFixed(0)}</td>
                    <td>NTU</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--grey-500)' }}>0 – 100</td>
                  </tr>
                  <tr>
                    <td>Temperature</td>
                    <td className="mono">{environment.temperature.toFixed(1)}</td>
                    <td>°C</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--grey-500)' }}>0 – 45</td>
                  </tr>
                  <tr>
                    <td>Salinity</td>
                    <td className="mono">{environment.salinity.toFixed(1)}</td>
                    <td>PSU</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--grey-500)' }}>0 – 45</td>
                  </tr>
                  <tr>
                    <td>Battery</td>
                    <td className="mono">{environment.battery.toFixed(0)}</td>
                    <td>%</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--grey-500)' }}>0 – 100</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Disclaimer */}
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
            All values are simulated for demonstration purposes. No physical sensors are connected.
            In field deployment, these values would be sourced from the AUV&apos;s environmental sensor suite
            via the STM32G4 ADC subsystem.
          </div>
        </div>
      </div>
    </div>
  );
}
