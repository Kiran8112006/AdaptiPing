'use client';

import React from 'react';
import { HardwareComponent as HWComponent } from '../../lib/types';
import StatusBadge from '../status/StatusBadge';

interface HardwareComponentRowProps {
  component: HWComponent;
}

function HardwareComponentRow({ component }: HardwareComponentRowProps) {
  return (
    <tr>
      <td style={{ fontWeight: 500 }}>{component.name}</td>
      <td style={{ fontSize: '0.75rem', color: 'var(--grey-500)' }}>{component.detail || '—'}</td>
      <td><StatusBadge status={component.status} /></td>
    </tr>
  );
}

interface HardwareTableProps {
  title: string;
  components: HWComponent[];
}

export default function HardwareTable({ title, components }: HardwareTableProps) {
  return (
    <div className="panel">
      <div className="panel__header">
        <h3 className="panel__title">{title}</h3>
      </div>
      <div className="panel__body" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Detail</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {components.map((comp) => (
              <HardwareComponentRow key={comp.name} component={comp} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
