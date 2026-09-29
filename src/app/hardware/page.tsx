'use client';

import React, { useState, useEffect } from 'react';

import HardwareTable from '../../components/hardware/HardwareTable';
import HealthMonitor from '../../components/hardware/HealthMonitor';
import StatusBadge from '../../components/status/StatusBadge';

import { HardwareStatus, HealthTelemetry } from '../../lib/types';
import { DEFAULT_HARDWARE_STATUS, DEFAULT_ENVIRONMENT, generateSimulatedHealth } from '../../lib/data';
import { getHardwareStatus } from '../../lib/api';

export default function HardwarePage() {
  const [hw, setHw] = useState<HardwareStatus>(DEFAULT_HARDWARE_STATUS);
  const [health, setHealth] = useState<HealthTelemetry>(() =>
    generateSimulatedHealth(DEFAULT_ENVIRONMENT, 0.75)
  );
  const [isBackend, setIsBackend] = useState(false);

  useEffect(() => {
    getHardwareStatus()
      .then((res) => {
        setHw(res.hardware);
        setHealth(res.health);
        setIsBackend(true);
      })
      .catch(() => {
        setIsBackend(false);
      });
  }, []);

  const processor = hw.components.filter((c) => c.category === 'processor');
  const digital = hw.components.filter((c) => c.category === 'digital');
  const analog = hw.components.filter((c) => c.category === 'analog');
  const output = hw.components.filter((c) => c.category === 'output');
  const monitoring = hw.components.filter((c) => c.category === 'monitoring');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Hardware Status</h1>
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
          {isBackend ? 'SOURCE: FASTAPI / BENCH SIMULATION' : 'SOURCE: DEFAULT SIMULATION MODEL'}
        </span>
      </div>

      {/* Overall Status */}
      <div className="panel" style={{ marginBottom: '0.75rem' }}>
        <div className="panel__header">
          <h2 className="panel__title">System Overview</h2>
        </div>
        <div className="panel__body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--grey-500)', display: 'block' }}>Hardware Connection</span>
              <span style={{ fontWeight: 700, color: '#b91c1c' }}>NOT CONNECTED</span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--grey-500)', display: 'block' }}>Operating Mode</span>
              <span style={{ fontWeight: 600 }}>BENCH SIMULATION</span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--grey-500)', display: 'block' }}>Target MCU</span>
              <span style={{ fontWeight: 600 }}>STM32G4 (Simulated Target)</span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--grey-500)', display: 'block' }}>System State</span>
              <StatusBadge status={hw.overallStatus} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--grey-500)', borderTop: '1px solid var(--grey-200)', paddingTop: '0.5rem' }}>
            BENCH SIMULATION MODE: No physical STM32 board, sensor, or transducer is connected. All telemetry and signal chains are computed via software models.
          </div>
        </div>
      </div>

      {/* Component Tables */}
      <div className="grid-2">
        <div>
          <HardwareTable title="Target MCU" components={processor} />
          <HardwareTable title="Digital Subsystem" components={digital} />
          <HardwareTable title="Output" components={output} />
        </div>
        <div>
          <HardwareTable title="Analog Signal Chain" components={analog} />
          <HardwareTable title="Monitoring Sensors" components={monitoring} />
        </div>
      </div>

      {/* Health Monitor */}
      <div className="panel">
        <div className="panel__header">
          <h2 className="panel__title">Health Monitor</h2>
          <span className="panel__badge panel__badge--simulation">SIMULATED ENERGY / PING</span>
        </div>
        <div className="panel__body">
          <HealthMonitor health={health} />
        </div>
      </div>

      {/* Architecture note */}
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
        Hardware status reflects the target architecture: STM32G4 → Timer → DMA → DAC → LPF → Amplifier → Transducer.
        In deployment, component statuses will be reported via USB/UART from the MCU without frontend changes.
        Energy per ping is computed as E = ∫V(t)·I(t)dt from simulated voltage and load current.
      </div>
    </div>
  );
}
