'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { FFTDataPoint } from '../../lib/types';

interface FFTChartProps {
  data: FFTDataPoint[];
}

export default function FFTChart({ data }: FFTChartProps) {
  // Filter out very low-magnitude noise floor for cleaner display
  const displayData = data.filter((d) => d.frequency > 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={displayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dee2e6" />
          <XAxis
            dataKey="frequency"
            tick={{ fontSize: 10, fill: '#6c757d' }}
            label={{ value: 'Frequency (kHz)', position: 'bottom', fontSize: 10, fill: '#6c757d', offset: -2 }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#6c757d' }}
            label={{ value: 'Magnitude (dB)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#6c757d' }}
          />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              background: '#fff',
              border: '1px solid #dee2e6',
              borderRadius: 2,
            }}
            formatter={(value) => [`${Number(value).toFixed(1)} dB`, 'Magnitude']}
            labelFormatter={(label) => `${label} kHz`}
          />
          <Area
            type="monotone"
            dataKey="magnitude"
            stroke="#234670"
            fill="#e8f0fe"
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
