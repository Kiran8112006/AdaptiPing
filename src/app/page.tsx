'use client';

import React, { useState, useEffect } from 'react';

import StatusCard from '../components/status/StatusCard';
import EnvironmentControls from '../components/environment/EnvironmentControls';
import PingDecisionPanel from '../components/ping/PingDecisionPanel';
import TimeDomainChart from '../components/charts/TimeDomainChart';
import FFTChart from '../components/charts/FFTChart';
import SpectrogramChart from '../components/charts/SpectrogramChart';
import HealthMonitor from '../components/hardware/HealthMonitor';

import {
  EnvironmentTelemetry,
  AdaptationDecision,
  WaveformData,
  HealthTelemetry,
  SystemState,
} from '../lib/types';
import {
  DEFAULT_ENVIRONMENT,
  DEFAULT_SYSTEM_STATE,
  generateSimulatedHealth,
} from '../lib/data';
import { computeAdaptation } from '../lib/adaptation';
import { generateWaveformData } from '../lib/simulation/waveform';
import {
  getSystemState,
  updateEnvironment as apiUpdateEnvironment,
  getCurrentWaveform,
  triggerPing,
} from '../lib/api';

export default function DashboardPage() {
  const [environment, setEnvironment] = useState<EnvironmentTelemetry>(DEFAULT_ENVIRONMENT);
  const [decision, setDecision] = useState<AdaptationDecision>(() => computeAdaptation(DEFAULT_ENVIRONMENT));
  const [waveformData, setWaveformData] = useState<WaveformData>(() =>
    generateWaveformData(computeAdaptation(DEFAULT_ENVIRONMENT).pingConfig)
  );
  const [health, setHealth] = useState<HealthTelemetry>(() =>
    generateSimulatedHealth(DEFAULT_ENVIRONMENT, 0.75)
  );
  const [sys, setSys] = useState<SystemState>(DEFAULT_SYSTEM_STATE);

  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pingTransmitting, setPingTransmitting] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    getSystemState()
      .then((state) => {
        if (!mounted) return;
        setEnvironment(state.environment);
        setDecision(state.decision);
        setHealth(state.health);
        setSys(state.system);
        setIsOffline(false);
        return getCurrentWaveform();
      })
      .then((wf) => {
        if (!mounted || !wf) return;
        setWaveformData(wf);
      })
      .catch(() => {
        if (!mounted) return;
        setIsOffline(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleReconnect = () => {
    setIsSyncing(true);
    getSystemState()
      .then((state) => {
        setEnvironment(state.environment);
        setDecision(state.decision);
        setHealth(state.health);
        setSys(state.system);
        setIsOffline(false);
        return getCurrentWaveform();
      })
      .then((wf) => {
        if (wf) setWaveformData(wf);
      })
      .catch(() => {
        setIsOffline(true);
      })
      .finally(() => {
        setIsSyncing(false);
      });
  };

  // Handle environment update via API
  const handleEnvironmentChange = async (newEnv: EnvironmentTelemetry) => {
    setEnvironment(newEnv);
    setIsSyncing(true);

    try {
      const res = await apiUpdateEnvironment(newEnv);
      setDecision(res.decision);
      setHealth(res.health);
      const wf = await getCurrentWaveform();
      setWaveformData(wf);
      setIsOffline(false);
    } catch {
      setIsOffline(true);
      // Deterministic client fallback
      const localDecision = computeAdaptation(newEnv);
      setDecision(localDecision);
      setWaveformData(generateWaveformData(localDecision.pingConfig));
      setHealth(generateSimulatedHealth(newEnv, localDecision.pingConfig.amplitude));
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger explicit simulated ping transmission
  const handleTriggerPing = async () => {
    setPingTransmitting(true);
    try {
      await triggerPing(decision.pingConfig);
      const wf = await getCurrentWaveform();
      setWaveformData(wf);
      setIsOffline(false);
    } catch {
      setIsOffline(true);
    } finally {
      setPingTransmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Transmitter Monitoring Dashboard</h1>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={handleTriggerPing}
            disabled={pingTransmitting}
            className="btn"
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: '1px solid #0369a1',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: '2px',
            }}
          >
            {pingTransmitting ? 'Transmitting Ping...' : 'Transmit Ping (Simulated)'}
          </button>
        </div>
      </div>

      {/* Offline Alert Banner */}
      {isOffline && (
        <div
          role="alert"
          style={{
            background: '#fee2e2',
            border: '1px solid #ef4444',
            color: '#991b1b',
            padding: '10px 16px',
            borderRadius: '4px',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
          }}
        >
          <div>
            <strong>API CONNECTION: OFFLINE</strong> — FastAPI simulation backend is currently unreachable at{' '}
            <code>http://127.0.0.1:8000</code>.
            Displaying local offline estimates. Start the backend to sync simulation state.
          </div>
          <button
            onClick={handleReconnect}
            disabled={isSyncing}
            style={{
              background: '#b91c1c',
              color: '#ffffff',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px',
            }}
          >
            {isSyncing ? 'Reconnecting...' : 'Reconnect API'}
          </button>
        </div>
      )}

      {/* Status Cards Row */}
      <div className="status-grid">
        <StatusCard
          label="Backend API"
          value={isOffline ? 'OFFLINE' : 'ONLINE (FASTAPI)'}
          variant={isOffline ? 'critical' : 'online'}
        />
        <StatusCard label="Operating Mode" value="BENCH SIMULATION" />
        <StatusCard
          label="Target MCU"
          value="STM32G4 (Simulated)"
        />
        <StatusCard label="Data Source" value="BENCH SIMULATION" />
        <StatusCard
          label="Ping Status"
          value={pingTransmitting ? 'TRANSMITTING' : sys.pingStatus}
          variant={pingTransmitting ? 'warning' : 'online'}
        />
        <StatusCard
          label="Battery"
          value={`${environment.battery}%`}
          variant={environment.battery < 20 ? 'critical' : environment.battery < 40 ? 'warning' : 'default'}
        />
      </div>

      {/* Main Content: Environment Controls + Ping Decision */}
      <div className="grid-sidebar">
        {/* Left Column: Environment */}
        <div>
          <div className="panel">
            <div className="panel__header">
              <h2 className="panel__title">Environment Parameters</h2>
              <span className="panel__badge panel__badge--demo">
                {isSyncing ? 'SYNCING API...' : 'DEMO PRESET'}
              </span>
            </div>
            <div className="panel__body">
              <EnvironmentControls
                environment={environment}
                onEnvironmentChange={handleEnvironmentChange}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Decision + Charts */}
        <div>
          {/* Adaptive Ping Decision */}
          <div className="panel">
            <div className="panel__header">
              <h2 className="panel__title">Adaptive Ping Decision</h2>
              <span className="panel__badge panel__badge--simulation">SIMULATION</span>
            </div>
            <div className="panel__body">
              <PingDecisionPanel decision={decision} />
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid-2">
            <div className="panel">
              <div className="panel__header">
                <h3 className="panel__title">Time-Domain Waveform</h3>
                <span className="panel__badge panel__badge--simulation">SIMULATION / MODEL</span>
              </div>
              <div className="panel__body">
                <TimeDomainChart data={waveformData.timeDomain} />
              </div>
            </div>

            <div className="panel">
              <div className="panel__header">
                <h3 className="panel__title">Simulated FFT</h3>
                <span className="panel__badge panel__badge--simulation">SIMULATION</span>
              </div>
              <div className="panel__body">
                <FFTChart data={waveformData.fft} />
              </div>
            </div>
          </div>

          {/* Spectrogram */}
          <div className="panel">
            <div className="panel__header">
              <h3 className="panel__title">Simulated Spectrogram</h3>
              <span className="panel__badge panel__badge--simulation">SIMULATION</span>
            </div>
            <div className="panel__body">
              <SpectrogramChart data={waveformData.spectrogram} config={decision.pingConfig} />
            </div>
          </div>

          {/* Health Monitor */}
          <div className="panel">
            <div className="panel__header">
              <h3 className="panel__title">Health Monitor</h3>
              <span className="panel__badge panel__badge--simulation">SIMULATED</span>
            </div>
            <div className="panel__body">
              <HealthMonitor health={health} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
