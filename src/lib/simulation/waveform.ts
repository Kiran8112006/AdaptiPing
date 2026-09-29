// ============================================================
// AdaptiPing — Waveform Simulation Engine
// ============================================================
// Generates time-domain, FFT, and spectrogram data for
// LFM chirp, geometric sweep, and phase-coded waveforms.
//
// All outputs are SIMULATED — no hardware measurements.
// ============================================================

import {
  PingConfiguration,
  WaveformData,
  WaveformDataPoint,
  FFTDataPoint,
  SpectrogramDataPoint,
  WindowType,
} from '../types';

// ---- Window Functions ----

function hannWindow(n: number, N: number): number {
  return 0.5 * (1 - Math.cos((2 * Math.PI * n) / (N - 1)));
}

function hammingWindow(n: number, N: number): number {
  return 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1));
}

function blackmanWindow(n: number, N: number): number {
  return (
    0.42 -
    0.5 * Math.cos((2 * Math.PI * n) / (N - 1)) +
    0.08 * Math.cos((4 * Math.PI * n) / (N - 1))
  );
}

function getWindowValue(type: WindowType, n: number, N: number): number {
  switch (type) {
    case 'hann': return hannWindow(n, N);
    case 'hamming': return hammingWindow(n, N);
    case 'blackman': return blackmanWindow(n, N);
  }
}

// ---- Barker Code ----
const BARKER_13 = [1, 1, 1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1];

// ---- Time-Domain Generation ----

const TIME_DOMAIN_POINTS = 512;
const FFT_POINTS = 256;
const SPECTROGRAM_TIME_BINS = 64;
const SPECTROGRAM_FREQ_BINS = 64;

function generateLFMTimeDomain(config: PingConfiguration): WaveformDataPoint[] {
  const N = TIME_DOMAIN_POINTS;
  const duration = config.pulseDuration; // ms
  const f0 = config.startFrequency;      // kHz
  const f1 = config.stopFrequency;       // kHz
  const dt = duration / N;
  const points: WaveformDataPoint[] = [];

  for (let i = 0; i < N; i++) {
    const t = i * dt;
    // LFM chirp phase integral: φ(t) = 2π(f0·t + ½·(f1-f0)·t²/T)
    const phase = 2 * Math.PI * (f0 * t + 0.5 * (f1 - f0) * (t * t) / duration);
    const win = getWindowValue(config.windowType, i, N);
    const amp = config.amplitude * win * Math.sin(phase);
    points.push({ time: Math.round(t * 1000) / 1000, amplitude: amp });
  }

  return points;
}

function generateGeometricTimeDomain(config: PingConfiguration): WaveformDataPoint[] {
  const N = TIME_DOMAIN_POINTS;
  const duration = config.pulseDuration;
  const f0 = config.startFrequency;
  const f1 = config.stopFrequency;
  const dt = duration / N;
  const ratio = f1 / f0;
  const points: WaveformDataPoint[] = [];

  for (let i = 0; i < N; i++) {
    const t = i * dt;
    const tNorm = t / duration;
    // freq = f0 * ratio^tNorm — used implicitly in the geometric phase integral
    // Integrate freq to get phase
    const phase = 2 * Math.PI * f0 * duration * (Math.pow(ratio, tNorm) - 1) / Math.log(ratio);
    const win = getWindowValue(config.windowType, i, N);
    const amp = config.amplitude * win * Math.sin(phase);
    points.push({ time: Math.round(t * 1000) / 1000, amplitude: amp });
  }

  return points;
}

function generatePhaseCodedTimeDomain(config: PingConfiguration): WaveformDataPoint[] {
  const N = TIME_DOMAIN_POINTS;
  const duration = config.pulseDuration;
  const fc = (config.startFrequency + config.stopFrequency) / 2;
  const dt = duration / N;
  const code = BARKER_13;
  const chipLength = N / code.length;
  const points: WaveformDataPoint[] = [];

  for (let i = 0; i < N; i++) {
    const t = i * dt;
    const chipIdx = Math.min(Math.floor(i / chipLength), code.length - 1);
    const phase = 2 * Math.PI * fc * t;
    const win = getWindowValue(config.windowType, i, N);
    const amp = config.amplitude * win * code[chipIdx] * Math.sin(phase);
    points.push({ time: Math.round(t * 1000) / 1000, amplitude: amp });
  }

  return points;
}

function generateTimeDomain(config: PingConfiguration): WaveformDataPoint[] {
  switch (config.waveformType) {
    case 'lfm': return generateLFMTimeDomain(config);
    case 'geometric': return generateGeometricTimeDomain(config);
    case 'phase-coded': return generatePhaseCodedTimeDomain(config);
  }
}

// ---- FFT (simplified DFT for visualization) ----

function generateFFT(timeDomain: WaveformDataPoint[], config: PingConfiguration): FFTDataPoint[] {
  const N = timeDomain.length;
  const fftPoints: FFTDataPoint[] = [];
  const fMax = config.sampleRate / 2; // Nyquist

  for (let k = 0; k < FFT_POINTS; k++) {
    const freq = (k / FFT_POINTS) * fMax;
    let re = 0;
    let im = 0;

    // Use a stride to keep computation light
    const stride = Math.max(1, Math.floor(N / 128));

    for (let n = 0; n < N; n += stride) {
      const angle = (2 * Math.PI * k * n) / N;
      re += timeDomain[n].amplitude * Math.cos(angle);
      im -= timeDomain[n].amplitude * Math.sin(angle);
    }

    const mag = Math.sqrt(re * re + im * im) / (N / stride);
    const magDB = 20 * Math.log10(Math.max(mag, 1e-10));

    fftPoints.push({
      frequency: Math.round(freq * 10) / 10,
      magnitude: Math.round(magDB * 10) / 10,
    });
  }

  return fftPoints;
}

// ---- Spectrogram (STFT approximation) ----

function generateSpectrogram(
  timeDomain: WaveformDataPoint[],
  config: PingConfiguration
): SpectrogramDataPoint[] {
  const N = timeDomain.length;
  const timeBins = SPECTROGRAM_TIME_BINS;
  const freqBins = SPECTROGRAM_FREQ_BINS;
  const windowSize = Math.floor(N / timeBins) * 2;
  const fMax = config.sampleRate / 2;
  const points: SpectrogramDataPoint[] = [];

  for (let tBin = 0; tBin < timeBins; tBin++) {
    const centerSample = Math.floor((tBin / timeBins) * N);
    const startSample = Math.max(0, centerSample - Math.floor(windowSize / 2));
    const endSample = Math.min(N - 1, centerSample + Math.floor(windowSize / 2));

    for (let fBin = 0; fBin < freqBins; fBin++) {
      const freq = (fBin / freqBins) * fMax;
      let re = 0;
      let im = 0;

      const stride = Math.max(1, Math.floor((endSample - startSample) / 32));

      for (let n = startSample; n <= endSample; n += stride) {
        const localIdx = n - startSample;
        const localN = endSample - startSample + 1;
        const win = hannWindow(localIdx, localN);
        const angle = (2 * Math.PI * fBin * localIdx) / localN;
        re += timeDomain[n].amplitude * win * Math.cos(angle);
        im -= timeDomain[n].amplitude * win * Math.sin(angle);
      }

      const mag = Math.sqrt(re * re + im * im);
      const magDB = 20 * Math.log10(Math.max(mag, 1e-10));

      points.push({
        time: Math.round((tBin / timeBins) * config.pulseDuration * 1000) / 1000,
        frequency: Math.round(freq * 10) / 10,
        magnitude: Math.round(Math.max(magDB, -60) * 10) / 10,
      });
    }
  }

  return points;
}

// ---- Main Export ----

export function generateWaveformData(config: PingConfiguration): WaveformData {
  const timeDomain = generateTimeDomain(config);
  const fft = generateFFT(timeDomain, config);
  const spectrogram = generateSpectrogram(timeDomain, config);

  return { timeDomain, fft, spectrogram };
}

// ---- Utility Exports ----

export { getWindowValue, TIME_DOMAIN_POINTS, FFT_POINTS };
