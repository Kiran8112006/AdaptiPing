import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'nominal' | 'warning' | 'adverse' | 'critical' | 'simulation' | 'ready' | 'active' | 'not-connected';
}

const STATUS_VARIANT_MAP: Record<string, StatusBadgeProps['variant']> = {
  'NOMINAL': 'nominal',
  'NORMAL': 'nominal',
  'COMPLETED': 'nominal',
  'READY': 'ready',
  'ACTIVE': 'active',
  'ONLINE': 'nominal',
  'WARNING': 'warning',
  'CONSTRAINED': 'warning',
  'ADVERSE': 'adverse',
  'CRITICAL': 'critical',
  'FAULT': 'critical',
  'ERROR': 'critical',
  'SIMULATION': 'simulation',
  'SIMULATED': 'simulation',
  'NOT CONNECTED': 'not-connected',
  'NOT_CONNECTED': 'not-connected',
  'SKIPPED': 'adverse',
};

export default function StatusBadge({ status, variant }: StatusBadgeProps) {
  const resolvedVariant = variant || STATUS_VARIANT_MAP[status.toUpperCase()] || 'simulation';

  return (
    <span className={`status-badge status-badge--${resolvedVariant}`} role="status">
      <span className="status-badge__dot" aria-hidden="true" />
      {status}
    </span>
  );
}
