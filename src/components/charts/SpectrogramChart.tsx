'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { SpectrogramDataPoint, PingConfiguration } from '../../lib/types';

interface SpectrogramChartProps {
  data: SpectrogramDataPoint[];
  config: PingConfiguration;
}

function getHeatColor(normalizedValue: number): string {
  // Navy-to-yellow colormap suitable for engineering display
  const v = Math.max(0, Math.min(1, normalizedValue));

  if (v < 0.25) {
    // Dark navy to blue
    const t = v / 0.25;
    const r = Math.round(12 + t * 20);
    const g = Math.round(27 + t * 30);
    const b = Math.round(51 + t * 100);
    return `rgb(${r},${g},${b})`;
  } else if (v < 0.5) {
    // Blue to teal
    const t = (v - 0.25) / 0.25;
    const r = Math.round(32 + t * 10);
    const g = Math.round(57 + t * 80);
    const b = Math.round(151 - t * 30);
    return `rgb(${r},${g},${b})`;
  } else if (v < 0.75) {
    // Teal to orange
    const t = (v - 0.5) / 0.25;
    const r = Math.round(42 + t * 160);
    const g = Math.round(137 - t * 20);
    const b = Math.round(121 - t * 90);
    return `rgb(${r},${g},${b})`;
  } else {
    // Orange to bright yellow
    const t = (v - 0.75) / 0.25;
    const r = Math.round(202 + t * 53);
    const g = Math.round(117 + t * 100);
    const b = Math.round(31 + t * 30);
    return `rgb(${r},${g},${b})`;
  }
}

export default function SpectrogramChart({ data, config }: SpectrogramChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute grid dimensions from data
  const gridInfo = useMemo(() => {
    if (data.length === 0) return { timeBins: 0, freqBins: 0, minMag: -60, maxMag: 0 };

    const times = new Set<number>();
    const freqs = new Set<number>();
    let minMag = Infinity;
    let maxMag = -Infinity;

    for (const pt of data) {
      times.add(pt.time);
      freqs.add(pt.frequency);
      if (pt.magnitude < minMag) minMag = pt.magnitude;
      if (pt.magnitude > maxMag) maxMag = pt.magnitude;
    }

    return {
      timeBins: times.size,
      freqBins: freqs.size,
      minMag,
      maxMag,
    };
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { timeBins, freqBins, minMag, maxMag } = gridInfo;
    if (timeBins === 0 || freqBins === 0) return;

    const width = canvas.width;
    const height = canvas.height;
    const cellW = width / timeBins;
    const cellH = height / freqBins;
    const magRange = maxMag - minMag || 1;

    ctx.clearRect(0, 0, width, height);

    let idx = 0;
    for (let t = 0; t < timeBins; t++) {
      for (let f = 0; f < freqBins; f++) {
        if (idx >= data.length) break;
        const norm = (data[idx].magnitude - minMag) / magRange;
        ctx.fillStyle = getHeatColor(norm);
        // Draw with frequency on Y axis (low freq at bottom)
        ctx.fillRect(
          t * cellW,
          height - (f + 1) * cellH,
          Math.ceil(cellW),
          Math.ceil(cellH)
        );
        idx++;
      }
    }

    // Draw axis labels
    ctx.fillStyle = '#6c757d';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText('0', 2, height - 2);
    ctx.fillText(`${config.pulseDuration} ms`, width - 40, height - 2);
    ctx.fillText(`${(config.sampleRate / 2).toFixed(0)} kHz`, 2, 12);
  }, [data, gridInfo, config]);

  return (
    <div className="spectrogram-container">
      <canvas
        ref={canvasRef}
        className="spectrogram-canvas"
        width={512}
        height={200}
        role="img"
        aria-label={`Simulated spectrogram showing frequency content over time for ${config.waveformType.toUpperCase()} waveform`}
      />
    </div>
  );
}
