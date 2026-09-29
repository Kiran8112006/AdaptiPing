// ============================================================
// AdaptiPing — Frontend API Client Service
// SIH 2026 | PS SIH26058
// Bench Simulation REST Connector
// ============================================================

import {
  EnvironmentTelemetry,
  PingConfiguration,
  AdaptationDecision,
  HardwareStatus,
  HealthTelemetry,
  WaveformData,
  HistoryRecord,
  SystemState,
  WaveformType,
  WindowType,
} from '../types';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

export interface ApiHealthResponse {
  status: string;
  mode: string;
  service: string;
  version: string;
}

/**
 * Normalizes frequency values from backend (Hz or kHz) strictly to kHz for UI display.
 * If freq > 1000, it is in Hz -> divide by 1000 to get kHz.
 */
export function toKHz(freq: number | undefined | null, fallback: number): number {
  if (freq === undefined || freq === null || isNaN(freq)) return fallback;
  return freq > 1000 ? Math.round((freq / 1000.0) * 10) / 10 : Math.round(freq * 10) / 10;
}

/**
 * Standard fetch wrapper with timeout, CORS headers, and error parsing.
 */
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options?.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorMessage = `HTTP error ${res.status}`;
      try {
        const errorData = await res.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // use default HTTP error
      }
      throw new Error(errorMessage);
    }

    return (await res.json()) as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error('API request timed out (FastAPI backend unavailable)');
      }
      throw err;
    }
    throw new Error('Network communication error with simulation backend');
  }
}

/**
 * Check backend liveness and simulation mode.
 */
export async function checkApiHealth(): Promise<ApiHealthResponse> {
  return fetchApi<ApiHealthResponse>('/api/health');
}

/**
 * Fetch complete central system state for rapid initial render.
 */
export async function getSystemState(): Promise<{
  system: SystemState;
  environment: EnvironmentTelemetry;
  decision: AdaptationDecision;
  hardware: HardwareStatus;
  health: HealthTelemetry;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchApi<Record<string, any>>('/api/system/state');

  const env: EnvironmentTelemetry = {
    depth: raw.environment.depth_m ?? raw.environment.depth ?? 15,
    turbidity: raw.environment.turbidity ?? 20,
    temperature: raw.environment.temperature_c ?? raw.environment.temperature ?? 26,
    salinity: raw.environment.salinity_psu ?? raw.environment.salinity ?? 35,
    battery: raw.environment.battery_pct ?? raw.environment.battery ?? 72,
  };

  const decRaw = raw.adaptation_decision || raw.adaptationDecision;
  const cfgRaw = decRaw.configuration || decRaw.pingConfig;

  const startKHz = toKHz(cfgRaw.start_frequency_khz ?? cfgRaw.start_frequency_hz ?? cfgRaw.startFrequency, 120);
  const stopKHz = toKHz(cfgRaw.stop_frequency_khz ?? cfgRaw.stop_frequency_hz ?? cfgRaw.stopFrequency, 160);
  const bwKHz = Math.round((stopKHz - startKHz) * 10) / 10;

  const decision: AdaptationDecision = {
    environmentClass: decRaw.environment_state || decRaw.environmentClass || 'MID_TURBIDITY',
    energyConstraint: decRaw.energy_state || decRaw.energyConstraint || 'NOMINAL',
    pingConfig: {
      waveformType: (cfgRaw.waveform || cfgRaw.waveformType || 'lfm').toLowerCase().replace('_', '-') as WaveformType,
      startFrequency: startKHz,
      stopFrequency: stopKHz,
      bandwidth: bwKHz,
      pulseDuration: cfgRaw.duration_ms ?? cfgRaw.pulseDuration ?? 1.2,
      amplitude: cfgRaw.amplitude ?? 0.75,
      windowType: (cfgRaw.window || cfgRaw.windowType || 'hann').toLowerCase() as WindowType,
      sampleRate: toKHz(cfgRaw.sample_rate_hz ?? cfgRaw.sampleRate, 1000),
    },
    explanation: decRaw.explanation || [],
    timestamp: new Date(decRaw.timestamp),
  };

  const hwRaw = raw.hardware_status || raw.hardwareStatus;
  const hardware: HardwareStatus = {
    components: hwRaw.components || [],
    overallStatus: hwRaw.overall_status || hwRaw.overallStatus || 'SIMULATION',
  };

  const healthRaw = raw.health;
  const health: HealthTelemetry = {
    outputCurrent: healthRaw.outputCurrent ?? (healthRaw.output_current_a != null ? healthRaw.output_current_a * 1000 : 650),
    outputVoltage: healthRaw.outputVoltage ?? healthRaw.output_voltage_v ?? 9.0,
    amplifierTemperature: healthRaw.amplifierTemperature ?? healthRaw.amplifier_temperature_c ?? 35.0,
    battery: healthRaw.battery ?? env.battery,
    outputAmplitude: healthRaw.outputAmplitude ?? healthRaw.output_amplitude ?? 3.6,
    energyPerPing: healthRaw.energyPerPing ?? healthRaw.energy_per_ping_mj ?? 2.4,
    isSimulated: true,
  };

  const system: SystemState = {
    status: raw.status || 'ONLINE',
    mode: 'SIMULATION',
    processor: 'STM32G4 [TARGET MCU]',
    dataSource: 'BENCH SIMULATION',
    pingStatus: raw.pingStatus || 'READY',
    battery: env.battery,
  };

  return { system, environment: env, decision, hardware, health };
}

/**
 * Fetch current simulated environment telemetry.
 */
export async function getEnvironment(): Promise<EnvironmentTelemetry> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchApi<Record<string, any>>('/api/environment');
  return {
    depth: raw.depth_m ?? raw.depth,
    turbidity: raw.turbidity,
    temperature: raw.temperature_c ?? raw.temperature,
    salinity: raw.salinity_psu ?? raw.salinity,
    battery: raw.battery_pct ?? raw.battery,
  };
}

/**
 * Update environment and trigger adaptation cycle on the backend.
 */
export async function updateEnvironment(env: EnvironmentTelemetry): Promise<{
  decision: AdaptationDecision;
  health: HealthTelemetry;
  environment: EnvironmentTelemetry;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchApi<Record<string, any>>('/api/simulation/environment', {
    method: 'POST',
    body: JSON.stringify({
      depth_m: env.depth,
      turbidity: env.turbidity,
      temperature_c: env.temperature,
      salinity_psu: env.salinity,
      battery_pct: env.battery,
    }),
  });

  const decRaw = raw.adaptation_decision || raw.adaptationDecision;
  const cfgRaw = decRaw.configuration || decRaw.pingConfig;

  const startKHz = toKHz(cfgRaw.start_frequency_khz ?? cfgRaw.start_frequency_hz ?? cfgRaw.startFrequency, 120);
  const stopKHz = toKHz(cfgRaw.stop_frequency_khz ?? cfgRaw.stop_frequency_hz ?? cfgRaw.stopFrequency, 160);
  const bwKHz = Math.round((stopKHz - startKHz) * 10) / 10;

  const decision: AdaptationDecision = {
    environmentClass: decRaw.environment_state || decRaw.environmentClass,
    energyConstraint: decRaw.energy_state || decRaw.energyConstraint,
    pingConfig: {
      waveformType: (cfgRaw.waveform || cfgRaw.waveformType || 'lfm').toLowerCase().replace('_', '-') as WaveformType,
      startFrequency: startKHz,
      stopFrequency: stopKHz,
      bandwidth: bwKHz,
      pulseDuration: cfgRaw.duration_ms ?? cfgRaw.pulseDuration,
      amplitude: cfgRaw.amplitude,
      windowType: (cfgRaw.window || cfgRaw.windowType || 'hann').toLowerCase() as WindowType,
      sampleRate: toKHz(cfgRaw.sample_rate_hz ?? cfgRaw.sampleRate, 1000),
    },
    explanation: decRaw.explanation || [],
    timestamp: new Date(decRaw.timestamp),
  };

  const healthRaw = raw.health;
  const health: HealthTelemetry = {
    outputCurrent: healthRaw.outputCurrent ?? (healthRaw.output_current_a != null ? healthRaw.output_current_a * 1000 : 650),
    outputVoltage: healthRaw.outputVoltage ?? healthRaw.output_voltage_v,
    amplifierTemperature: healthRaw.amplifierTemperature ?? healthRaw.amplifier_temperature_c,
    battery: healthRaw.battery ?? env.battery,
    outputAmplitude: healthRaw.outputAmplitude ?? healthRaw.output_amplitude,
    energyPerPing: healthRaw.energyPerPing ?? healthRaw.energy_per_ping_mj,
    isSimulated: true,
  };

  return { decision, health, environment: env };
}

/**
 * Fetch current active waveform data (time-domain, FFT, spectrogram).
 */
export async function getCurrentWaveform(): Promise<WaveformData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchApi<Record<string, any>>('/api/waveform/current');
  return {
    timeDomain: raw.timeDomain || raw.time_domain || [],
    fft: raw.fft || [],
    spectrogram: raw.spectrogram_data || raw.spectrogram || [],
  };
}

/**
 * Generate custom waveform on demand via backend synthesis pipeline.
 */
export async function generateWaveform(config: PingConfiguration): Promise<WaveformData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchApi<Record<string, any>>('/api/waveform/generate', {
    method: 'POST',
    body: JSON.stringify({
      waveform: config.waveformType.toUpperCase().replace('-', '_'),
      start_frequency_hz: config.startFrequency > 1000 ? config.startFrequency : config.startFrequency * 1000,
      stop_frequency_hz: config.stopFrequency > 1000 ? config.stopFrequency : config.stopFrequency * 1000,
      duration_ms: config.pulseDuration,
      amplitude: config.amplitude,
      window: config.windowType.toUpperCase(),
      sample_rate_hz: config.sampleRate > 1000 ? config.sampleRate : config.sampleRate * 1000,
    }),
  });

  return {
    timeDomain: raw.timeDomain || raw.time_domain || [],
    fft: raw.fft || [],
    spectrogram: raw.spectrogram_data || raw.spectrogram || [],
  };
}

/**
 * Trigger a simulated transmit ping.
 */
export async function triggerPing(config?: PingConfiguration): Promise<HistoryRecord> {
  const body = config
    ? JSON.stringify({
        waveform: config.waveformType.toUpperCase().replace('-', '_'),
        start_frequency_hz: config.startFrequency > 1000 ? config.startFrequency : config.startFrequency * 1000,
        stop_frequency_hz: config.stopFrequency > 1000 ? config.stopFrequency : config.stopFrequency * 1000,
        duration_ms: config.pulseDuration,
        amplitude: config.amplitude,
        window: config.windowType.toUpperCase(),
        sample_rate_hz: config.sampleRate > 1000 ? config.sampleRate : config.sampleRate * 1000,
      })
    : undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchApi<Record<string, any>>('/api/simulation/ping', {
    method: 'POST',
    body,
  });

  const startKHz = toKHz(raw.start_frequency_khz ?? raw.start_frequency_hz ?? raw.startFrequency, 120);
  const stopKHz = toKHz(raw.stop_frequency_khz ?? raw.stop_frequency_hz ?? raw.stopFrequency, 160);
  const bwKHz = Math.round((stopKHz - startKHz) * 10) / 10;

  return {
    id: raw.id,
    timestamp: new Date(raw.timestamp),
    environmentClass: raw.environment_state || raw.environmentClass,
    environment: {
      depth: raw.environment.depth_m ?? raw.environment.depth,
      turbidity: raw.environment.turbidity,
      temperature: raw.environment.temperature_c ?? raw.environment.temperature,
      salinity: raw.environment.salinity_psu ?? raw.environment.salinity,
      battery: raw.environment.battery_pct ?? raw.environment.battery,
    },
    waveformType: (raw.waveform || raw.waveformType || 'lfm').toLowerCase().replace('_', '-') as WaveformType,
    startFrequency: startKHz,
    stopFrequency: stopKHz,
    bandwidth: bwKHz,
    pulseDuration: raw.duration_ms ?? raw.pulseDuration,
    amplitude: raw.amplitude,
    energyPerPing: raw.energy_per_ping_mj ?? raw.energyPerPing,
    status: raw.status || 'COMPLETED',
  };
}

/**
 * Fetch simulated hardware status and health telemetry.
 */
export async function getHardwareStatus(): Promise<{
  hardware: HardwareStatus;
  health: HealthTelemetry;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchApi<Record<string, any>>('/api/hardware/status');
  return {
    hardware: {
      components: raw.components || raw.hardware?.components || [],
      overallStatus: raw.overallStatus || raw.hardware?.overall_status || 'SIMULATION',
    },
    health: {
      outputCurrent: raw.health?.outputCurrent ?? (raw.health?.output_current_a != null ? raw.health?.output_current_a * 1000 : 650),
      outputVoltage: raw.health?.outputVoltage ?? raw.health?.output_voltage_v ?? 9.0,
      amplifierTemperature: raw.health?.amplifierTemperature ?? raw.health?.amplifier_temperature_c ?? 35.0,
      battery: raw.health?.battery ?? 72.0,
      outputAmplitude: raw.health?.outputAmplitude ?? raw.health?.output_amplitude ?? 3.6,
      energyPerPing: raw.health?.energyPerPing ?? raw.health?.energy_per_ping_mj ?? 2.4,
      isSimulated: true,
    },
  };
}

/**
 * Fetch simulated ping history log.
 */
export async function getHistory(): Promise<HistoryRecord[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchApi<Record<string, any>[]>('/api/history');
  return raw.map((item) => {
    const startKHz = toKHz(item.start_frequency_khz ?? item.start_frequency_hz ?? item.startFrequency, 120);
    const stopKHz = toKHz(item.stop_frequency_khz ?? item.stop_frequency_hz ?? item.stopFrequency, 160);
    const bwKHz = Math.round((stopKHz - startKHz) * 10) / 10;

    return {
      id: item.id,
      timestamp: new Date(item.timestamp),
      environmentClass: item.environment_state || item.environmentClass,
      environment: {
        depth: item.environment.depth_m ?? item.environment.depth,
        turbidity: item.environment.turbidity,
        temperature: item.environment.temperature_c ?? item.environment.temperature,
        salinity: item.environment.salinity_psu ?? item.environment.salinity,
        battery: item.environment.battery_pct ?? item.environment.battery,
      },
      waveformType: (item.waveform || item.waveformType || 'lfm').toLowerCase().replace('_', '-') as WaveformType,
      startFrequency: startKHz,
      stopFrequency: stopKHz,
      bandwidth: bwKHz,
      pulseDuration: item.duration_ms ?? item.pulseDuration,
      amplitude: item.amplitude,
      energyPerPing: item.energy_per_ping_mj ?? item.energyPerPing,
      status: item.status || 'COMPLETED',
    };
  });
}
