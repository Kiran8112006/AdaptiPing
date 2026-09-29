import React from 'react';

interface StatusCardProps {
  label: string;
  value: string;
  variant?: 'default' | 'online' | 'warning' | 'critical';
}

export default function StatusCard({ label, value, variant = 'default' }: StatusCardProps) {
  const valueClass = variant !== 'default'
    ? `status-card__value status-card__value--${variant}`
    : 'status-card__value';

  return (
    <div className="status-card">
      <div className="status-card__label">{label}</div>
      <div className={valueClass}>{value}</div>
    </div>
  );
}
