'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { WaveformDataPoint } from '../../lib/types';

interface TimeDomainChartProps {
  data: WaveformDataPoint[];
}

export default function TimeDomainChart({ data }: TimeDomainChartProps) {
  // Downsample for rendering performance
  const stride = Math.max(1, Math.floor(data.length / 256));
  const displayData = data.filter((_, i) => i % stride === 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={displayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dee2e6" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#6c757d' }}
            label={{ value: 'Time (ms)', position: 'bottom', fontSize: 10, fill: '#6c757d', offset: -2 }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#6c757d' }}
            label={{ value: 'Amplitude', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#6c757d' }}
            domain={[-1.1, 1.1]}
          />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              background: '#fff',
              border: '1px solid #dee2e6',
              borderRadius: 2,
            }}
            formatter={(value) => [Number(value).toFixed(4), 'Amplitude']}
            labelFormatter={(label) => `Time: ${label} ms`}
          />
          <Line
            type="monotone"
            dataKey="amplitude"
            stroke="#1a3358"
            strokeWidth={1}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
