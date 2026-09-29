'use client';

import React, { useState, useEffect } from 'react';
import { checkApiHealth, ApiHealthResponse } from '../../lib/api';

export default function Header() {
  const [health, setHealth] = useState<ApiHealthResponse | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [checking, setChecking] = useState(false);

  const manualVerify = () => {
    setChecking(true);
    checkApiHealth()
      .then((res) => {
        setHealth(res);
        setIsOffline(false);
      })
      .catch(() => {
        setIsOffline(true);
        setHealth(null);
      })
      .finally(() => {
        setChecking(false);
      });
  };

  useEffect(() => {
    let mounted = true;

    checkApiHealth()
      .then((res) => {
        if (mounted) {
          setHealth(res);
          setIsOffline(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsOffline(true);
          setHealth(null);
        }
      });

    const interval = setInterval(() => {
      checkApiHealth()
        .then((res) => {
          if (mounted) {
            setHealth(res);
            setIsOffline(false);
          }
        })
        .catch(() => {
          if (mounted) {
            setIsOffline(true);
            setHealth(null);
          }
        });
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="app-header" role="banner">
      <div className="app-header__brand">
        <div>
          <h1 className="app-header__title">ADAPTIPING</h1>
          <p className="app-header__subtitle">Adaptive Sonar Transmitter Monitoring System</p>
        </div>
      </div>

      <div className="app-header__status-bar" aria-label="System status indicators">
        <div className="app-header__status-item">
          <span className="app-header__status-label">Backend API</span>
          <span
            className={`app-header__status-value ${
              isOffline ? 'app-header__status-value--offline' : 'app-header__status-value--online'
            }`}
            style={isOffline ? { color: 'var(--color-critical-red, #dc2626)' } : {}}
          >
            {isOffline ? 'OFFLINE' : 'ONLINE'}
          </span>
        </div>

        {isOffline && (
          <div className="app-header__status-item">
            <button
              onClick={manualVerify}
              disabled={checking}
              style={{
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                padding: '3px 8px',
                fontSize: '11px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {checking ? 'Connecting...' : 'Reconnect API'}
            </button>
          </div>
        )}

        <div className="app-header__status-item">
          <span className="app-header__status-label">Mode</span>
          <span className="app-header__status-value">
            {health?.mode || 'BENCH_SIMULATION'}
          </span>
        </div>
        <div className="app-header__status-item">
          <span className="app-header__status-label">Data Source</span>
          <span className="app-header__status-value" style={{ color: 'var(--color-amber-warning, #d97706)' }}>
            BENCH SIMULATION
          </span>
        </div>
        <div className="app-header__status-item">
          <span className="app-header__status-label">Target MCU</span>
          <span className="app-header__status-value">STM32G4 (Simulated)</span>
        </div>
      </div>
    </header>
  );
}
