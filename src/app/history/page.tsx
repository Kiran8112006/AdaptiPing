'use client';

import React, { useState, useEffect } from 'react';

import StatusBadge from '../../components/status/StatusBadge';
import { HistoryRecord } from '../../lib/types';
import { generateHistoryRecords } from '../../lib/data';
import { getEnvironmentLabel } from '../../lib/adaptation';
import { getHistory } from '../../lib/api';

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function HistoryPage() {
  const [records, setRecords] = useState<HistoryRecord[]>(() => generateHistoryRecords());
  const [isBackend, setIsBackend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    getHistory()
      .then((data) => {
        if (!mounted) return;
        if (data && data.length > 0) {
          setRecords(data);
          setIsBackend(true);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setIsBackend(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    getHistory()
      .then((data) => {
        if (data && data.length > 0) {
          setRecords(data);
          setIsBackend(true);
        }
      })
      .catch(() => {
        setIsBackend(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Ping History</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
            {isBackend ? 'SOURCE: FASTAPI IN-MEMORY LOG' : 'SOURCE: DEMO SAMPLE LOG'}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
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
            {isLoading ? 'Refreshing...' : 'Refresh Log'}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel__header">
          <h2 className="panel__title">Simulation History</h2>
          <span className="panel__badge panel__badge--simulation">SIMULATION</span>
        </div>
        <div className="panel__body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Timestamp</th>
                <th>Environment</th>
                <th>Waveform</th>
                <th>Start (kHz)</th>
                <th>Stop (kHz)</th>
                <th>BW (kHz)</th>
                <th>Duration (ms)</th>
                <th>Amplitude</th>
                <th>Energy (mJ)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="mono" style={{ fontWeight: 500 }}>{record.id}</td>
                  <td className="mono">{formatTimestamp(record.timestamp)}</td>
                  <td>{getEnvironmentLabel(record.environmentClass)}</td>
                  <td className="mono">{record.startFrequency > 1000 ? Math.round((record.startFrequency / 1000.0) * 10) / 10 : record.startFrequency}</td>
                  <td className="mono">{record.stopFrequency > 1000 ? Math.round((record.stopFrequency / 1000.0) * 10) / 10 : record.stopFrequency}</td>
                  <td className="mono">{record.bandwidth > 1000 ? Math.round((record.bandwidth / 1000.0) * 10) / 10 : record.bandwidth}</td>
                  <td className="mono">{record.pulseDuration}</td>
                  <td className="mono">{record.amplitude}</td>
                  <td className="mono">{record.energyPerPing}</td>
                  <td><StatusBadge status={record.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid-3" style={{ marginTop: '0.75rem' }}>
        <div className="panel">
          <div className="panel__header">
            <h3 className="panel__title">Total Pings</h3>
          </div>
          <div className="panel__body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--navy-800)' }}>
              {records.length}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--grey-500)' }}>simulated records</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel__header">
            <h3 className="panel__title">Completed</h3>
          </div>
          <div className="panel__body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--status-nominal)' }}>
              {records.filter((r) => r.status === 'COMPLETED').length}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--grey-500)' }}>successful pings</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel__header">
            <h3 className="panel__title">Constrained</h3>
          </div>
          <div className="panel__body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--status-warning)' }}>
              {records.filter((r) => r.status === 'CONSTRAINED').length}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--grey-500)' }}>energy-constrained pings</div>
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
          marginTop: '0.75rem',
        }}
      >
        All history records are simulated in-memory on the FastAPI server (capped at 50 records).
        In physical deployment, ping records will be logged directly from MCU telemetric transmission frames.
        Energy values are modeled estimates: E = ∫V(t)·I(t)dt.
      </div>
    </div>
  );
}
