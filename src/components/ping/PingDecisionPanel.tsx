'use client';

import React from 'react';
import { AdaptationDecision } from '../../lib/types';
import StatusBadge from '../status/StatusBadge';
import { getEnvironmentLabel } from '../../lib/adaptation';

interface PingDecisionPanelProps {
  decision: AdaptationDecision;
}

export default function PingDecisionPanel({ decision }: PingDecisionPanelProps) {
  const { pingConfig, environmentClass, energyConstraint, explanation } = decision;

  // Strict kHz normalization: if value > 1000, it is in Hz -> convert to kHz
  const startKHz = pingConfig.startFrequency > 1000
    ? Math.round((pingConfig.startFrequency / 1000.0) * 10) / 10
    : Math.round(pingConfig.startFrequency * 10) / 10;
  const stopKHz = pingConfig.stopFrequency > 1000
    ? Math.round((pingConfig.stopFrequency / 1000.0) * 10) / 10
    : Math.round(pingConfig.stopFrequency * 10) / 10;
  const bwKHz = Math.round((stopKHz - startKHz) * 10) / 10;

  const energyBadgeVariant = energyConstraint === 'CRITICAL'
    ? 'critical'
    : energyConstraint === 'CONSTRAINED'
      ? 'warning'
      : 'nominal';

  return (
    <div>
      {/* Decision Parameters */}
      <table className="data-table">
        <tbody>
          <tr>
            <td style={{ fontWeight: 600, width: '45%' }}>Environment State</td>
            <td className="mono">{getEnvironmentLabel(environmentClass)}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Waveform</td>
            <td className="mono">{pingConfig.waveformType.toUpperCase()}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Start Frequency</td>
            <td className="mono">{startKHz} kHz</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Stop Frequency</td>
            <td className="mono">{stopKHz} kHz</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Bandwidth</td>
            <td className="mono">{bwKHz} kHz</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Pulse Duration</td>
            <td className="mono">{pingConfig.pulseDuration} ms</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Amplitude</td>
            <td className="mono">{pingConfig.amplitude}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Energy Constraint</td>
            <td>
              <StatusBadge status={energyConstraint} variant={energyBadgeVariant} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* "Why This Ping?" Explanation */}
      <div className="explanation-block" style={{ marginTop: '0.75rem' }}>
        <div className="explanation-block__title">Why This Ping?</div>
        {explanation.map((line, idx) => (
          <div key={idx} className="explanation-line">
            <span className="explanation-line__arrow">→</span>
            <span>
              <strong>{line.condition}</strong> — {line.action}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
