// ============================================================
// AdaptiPing — Mock Data, Presets, and Demo Defaults
// ============================================================

import {
  EnvironmentTelemetry,
  DemoPreset,
  HardwareStatus,
  HealthTelemetry,
  HistoryRecord,
  SystemState,
} from '../types';

// ---- Default Environment ----

export const DEFAULT_ENVIRONMENT: EnvironmentTelemetry = {
  depth: 15,
  turbidity: 20,
  temperature: 26,
  salinity: 35,
  battery: 72,
};

// ---- Demo Presets ----

export const DEMO_PRESETS: DemoPreset[] = [
  {
    name: 'muddy_estuary',
    label: 'Simulated Muddy Estuary',
    environment: { depth: 8, turbidity: 80, temperature: 28, salinity: 25, battery: 72 },
    expectedStartFreq: 90,
    expectedStopFreq: 130,
    expectedPulseDuration: 2.0,
    expectedAmplitude: 1.0,
  },
  {
    name: 'mid_turbidity',
    label: 'Simulated Mid Turbidity',
    environment: { depth: 20, turbidity: 45, temperature: 24, salinity: 34, battery: 72 },
    expectedStartFreq: 120,
    expectedStopFreq: 160,
    expectedPulseDuration: 1.2,
    expectedAmplitude: 0.75,
  },
  {
    name: 'clear_shallow',
    label: 'Simulated Clear Shallow Reef',
    environment: { depth: 10, turbidity: 12, temperature: 27, salinity: 36, battery: 72 },
    expectedStartFreq: 150,
    expectedStopFreq: 200,
    expectedPulseDuration: 0.6,
    expectedAmplitude: 0.5,
  },
];

// ---- System State ----

export const DEFAULT_SYSTEM_STATE: SystemState = {
  status: 'ONLINE',
  mode: 'SIMULATION',
  processor: 'STM32G4 [TARGET MCU]',
  dataSource: 'Bench Simulation',
  pingStatus: 'READY',
  battery: 72,
};

// ---- Hardware Status (Simulation Mode) ----

export const DEFAULT_HARDWARE_STATUS: HardwareStatus = {
  overallStatus: 'SIMULATION',
  components: [
    { name: 'STM32G4 MCU', category: 'processor', status: 'SIMULATION', detail: 'ARM Cortex-M4F, 170 MHz' },
    { name: 'Hardware Timer (TIM1)', category: 'digital', status: 'SIMULATION', detail: 'PWM / trigger generation' },
    { name: 'DMA Controller', category: 'digital', status: 'SIMULATION', detail: 'Memory-to-DAC transfer' },
    { name: 'DAC (12-bit)', category: 'digital', status: 'SIMULATION', detail: 'Waveform output' },
    { name: 'Reconstruction LPF', category: 'analog', status: 'NOT CONNECTED', detail: '4th-order Butterworth' },
    { name: 'Buffer Op-Amp', category: 'analog', status: 'NOT CONNECTED', detail: 'Impedance matching' },
    { name: 'Power Amplifier', category: 'analog', status: 'NOT CONNECTED', detail: 'Class-AB, 20W max' },
    { name: 'Piezo Transducer', category: 'output', status: 'NOT CONNECTED', detail: 'Resonant frequency matched' },
    { name: 'Current Sensor', category: 'monitoring', status: 'SIMULATION', detail: 'INA219' },
    { name: 'Voltage Monitor', category: 'monitoring', status: 'SIMULATION', detail: 'ADC channel' },
    { name: 'Temperature Sensor', category: 'monitoring', status: 'SIMULATION', detail: 'NTC thermistor' },
    { name: 'Battery Monitor', category: 'monitoring', status: 'SIMULATION', detail: 'Fuel gauge IC' },
  ],
};

// ---- Health Telemetry (Simulated) ----

export function generateSimulatedHealth(env: EnvironmentTelemetry, amplitude: number): HealthTelemetry {
  return {
    outputCurrent: Math.round(amplitude * 850 + Math.random() * 20),
    outputVoltage: Math.round((12 * amplitude + Math.random() * 0.5) * 100) / 100,
    amplifierTemperature: Math.round((env.temperature + amplitude * 15 + Math.random() * 2) * 10) / 10,
    battery: env.battery,
    outputAmplitude: Math.round(amplitude * 4.8 * 100) / 100,
    energyPerPing: Math.round(amplitude * amplitude * 3.2 * 100) / 100,
    isSimulated: true,
  };
}

// ---- Simulated Ping History ----

export function generateHistoryRecords(): HistoryRecord[] {
  const now = new Date();
  const records: HistoryRecord[] = [
    {
      id: 'PING-001',
      timestamp: new Date(now.getTime() - 45 * 60000),
      environmentClass: 'CLEAR_SHALLOW',
      environment: { depth: 10, turbidity: 12, temperature: 27, salinity: 36, battery: 85 },
      waveformType: 'lfm',
      startFrequency: 150, stopFrequency: 200, bandwidth: 50,
      pulseDuration: 0.6, amplitude: 0.5, energyPerPing: 0.80,
      status: 'COMPLETED',
    },
    {
      id: 'PING-002',
      timestamp: new Date(now.getTime() - 42 * 60000),
      environmentClass: 'CLEAR_SHALLOW',
      environment: { depth: 12, turbidity: 15, temperature: 27, salinity: 36, battery: 84 },
      waveformType: 'lfm',
      startFrequency: 150, stopFrequency: 200, bandwidth: 50,
      pulseDuration: 0.6, amplitude: 0.5, energyPerPing: 0.80,
      status: 'COMPLETED',
    },
    {
      id: 'PING-003',
      timestamp: new Date(now.getTime() - 38 * 60000),
      environmentClass: 'MID_TURBIDITY',
      environment: { depth: 18, turbidity: 35, temperature: 25, salinity: 34, battery: 82 },
      waveformType: 'lfm',
      startFrequency: 120, stopFrequency: 160, bandwidth: 40,
      pulseDuration: 1.2, amplitude: 0.75, energyPerPing: 1.80,
      status: 'COMPLETED',
    },
    {
      id: 'PING-004',
      timestamp: new Date(now.getTime() - 34 * 60000),
      environmentClass: 'MID_TURBIDITY',
      environment: { depth: 20, turbidity: 42, temperature: 25, salinity: 34, battery: 80 },
      waveformType: 'lfm',
      startFrequency: 120, stopFrequency: 160, bandwidth: 40,
      pulseDuration: 1.2, amplitude: 0.75, energyPerPing: 1.80,
      status: 'COMPLETED',
    },
    {
      id: 'PING-005',
      timestamp: new Date(now.getTime() - 30 * 60000),
      environmentClass: 'MUDDY_ESTUARY',
      environment: { depth: 8, turbidity: 72, temperature: 28, salinity: 25, battery: 78 },
      waveformType: 'lfm',
      startFrequency: 90, stopFrequency: 130, bandwidth: 40,
      pulseDuration: 2.0, amplitude: 1.0, energyPerPing: 3.20,
      status: 'COMPLETED',
    },
    {
      id: 'PING-006',
      timestamp: new Date(now.getTime() - 26 * 60000),
      environmentClass: 'MUDDY_ESTUARY',
      environment: { depth: 8, turbidity: 80, temperature: 29, salinity: 24, battery: 75 },
      waveformType: 'lfm',
      startFrequency: 90, stopFrequency: 130, bandwidth: 40,
      pulseDuration: 2.0, amplitude: 1.0, energyPerPing: 3.20,
      status: 'COMPLETED',
    },
    {
      id: 'PING-007',
      timestamp: new Date(now.getTime() - 22 * 60000),
      environmentClass: 'MID_TURBIDITY',
      environment: { depth: 15, turbidity: 48, temperature: 26, salinity: 33, battery: 72 },
      waveformType: 'geometric',
      startFrequency: 120, stopFrequency: 160, bandwidth: 40,
      pulseDuration: 1.2, amplitude: 0.75, energyPerPing: 1.80,
      status: 'COMPLETED',
    },
    {
      id: 'PING-008',
      timestamp: new Date(now.getTime() - 18 * 60000),
      environmentClass: 'CLEAR_SHALLOW',
      environment: { depth: 10, turbidity: 10, temperature: 27, salinity: 36, battery: 68 },
      waveformType: 'phase-coded',
      startFrequency: 150, stopFrequency: 200, bandwidth: 50,
      pulseDuration: 0.6, amplitude: 0.5, energyPerPing: 0.80,
      status: 'COMPLETED',
    },
    {
      id: 'PING-009',
      timestamp: new Date(now.getTime() - 14 * 60000),
      environmentClass: 'MID_TURBIDITY',
      environment: { depth: 22, turbidity: 55, temperature: 24, salinity: 35, battery: 35 },
      waveformType: 'lfm',
      startFrequency: 120, stopFrequency: 160, bandwidth: 40,
      pulseDuration: 1.2, amplitude: 0.70, energyPerPing: 1.57,
      status: 'CONSTRAINED',
    },
    {
      id: 'PING-010',
      timestamp: new Date(now.getTime() - 10 * 60000),
      environmentClass: 'MUDDY_ESTUARY',
      environment: { depth: 6, turbidity: 85, temperature: 30, salinity: 22, battery: 18 },
      waveformType: 'lfm',
      startFrequency: 90, stopFrequency: 130, bandwidth: 40,
      pulseDuration: 0.8, amplitude: 0.40, energyPerPing: 0.51,
      status: 'CONSTRAINED',
    },
    {
      id: 'PING-011',
      timestamp: new Date(now.getTime() - 6 * 60000),
      environmentClass: 'CLEAR_SHALLOW',
      environment: { depth: 10, turbidity: 8, temperature: 26, salinity: 35, battery: 90 },
      waveformType: 'lfm',
      startFrequency: 150, stopFrequency: 200, bandwidth: 50,
      pulseDuration: 0.6, amplitude: 0.5, energyPerPing: 0.80,
      status: 'COMPLETED',
    },
    {
      id: 'PING-012',
      timestamp: new Date(now.getTime() - 2 * 60000),
      environmentClass: 'MID_TURBIDITY',
      environment: { depth: 25, turbidity: 40, temperature: 25, salinity: 34, battery: 88 },
      waveformType: 'geometric',
      startFrequency: 120, stopFrequency: 160, bandwidth: 40,
      pulseDuration: 1.2, amplitude: 0.75, energyPerPing: 1.80,
      status: 'COMPLETED',
    },
  ];

  return records;
}
