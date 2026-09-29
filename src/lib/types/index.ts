// ============================================================
// AdaptiPing — Core Type Definitions
// SIH 2026 | SIH26058
// ============================================================

/** Environmental sensor telemetry (simulated) */
export interface EnvironmentTelemetry {
  depth: number;          // metres
  turbidity: number;      // NTU (0–100 scale)
  temperature: number;    // °C
  salinity: number;       // PSU
  battery: number;        // percentage 0–100
}

/** Waveform type selection */
export type WaveformType = 'lfm' | 'geometric' | 'phase-coded';

/** Window function type */
export type WindowType = 'hann' | 'hamming' | 'blackman';

/** Ping configuration determined by the adaptive controller */
export interface PingConfiguration {
  waveformType: WaveformType;
  startFrequency: number;   // kHz
  stopFrequency: number;    // kHz
  bandwidth: number;        // kHz
  pulseDuration: number;    // ms
  amplitude: number;        // 0.0–1.0
  windowType: WindowType;
  sampleRate: number;       // kHz
}

/** Time-domain waveform data point */
export interface WaveformDataPoint {
  time: number;      // ms
  amplitude: number;
}

/** FFT data point */
export interface FFTDataPoint {
  frequency: number;   // kHz
  magnitude: number;   // dB
}

/** Spectrogram data point */
export interface SpectrogramDataPoint {
  time: number;
  frequency: number;
  magnitude: number;
}

/** Waveform analysis data bundle */
export interface WaveformData {
  timeDomain: WaveformDataPoint[];
  fft: FFTDataPoint[];
  spectrogram: SpectrogramDataPoint[];
}

/** Hardware component status */
export type ComponentStatus = 'READY' | 'ACTIVE' | 'SIMULATION' | 'NOT CONNECTED' | 'FAULT';

/** Individual hardware component */
export interface HardwareComponent {
  name: string;
  category: 'processor' | 'digital' | 'analog' | 'output' | 'monitoring';
  status: ComponentStatus;
  detail?: string;
}

/** Full hardware status */
export interface HardwareStatus {
  components: HardwareComponent[];
  overallStatus: ComponentStatus;
}

/** Health telemetry from the hardware monitor (simulated) */
export interface HealthTelemetry {
  outputCurrent: number;        // mA
  outputVoltage: number;        // V
  amplifierTemperature: number; // °C
  battery: number;              // %
  outputAmplitude: number;      // V
  energyPerPing: number;        // mJ
  isSimulated: boolean;
}

/** Environment classification */
export type EnvironmentClass =
  | 'CLEAR_SHALLOW'
  | 'MID_TURBIDITY'
  | 'MUDDY_ESTUARY'
  | 'CUSTOM';

/** Energy constraint state */
export type EnergyConstraintState =
  | 'NOMINAL'
  | 'CONSTRAINED'
  | 'CRITICAL';

/** Explanation line for "Why this ping?" */
export interface ExplanationLine {
  condition: string;
  action: string;
}

/** Adaptation decision with explanation */
export interface AdaptationDecision {
  environmentClass: EnvironmentClass;
  energyConstraint: EnergyConstraintState;
  pingConfig: PingConfiguration;
  explanation: ExplanationLine[];
  timestamp: Date;
}

/** Ping history record */
export interface HistoryRecord {
  id: string;
  timestamp: Date;
  environmentClass: EnvironmentClass;
  environment: EnvironmentTelemetry;
  waveformType: WaveformType;
  startFrequency: number;
  stopFrequency: number;
  bandwidth: number;
  pulseDuration: number;
  amplitude: number;
  energyPerPing: number;
  status: 'COMPLETED' | 'CONSTRAINED' | 'SKIPPED';
}

/** System operating mode */
export type SystemMode = 'SIMULATION' | 'BENCH' | 'FIELD';

/** System status */
export type SystemStatus = 'ONLINE' | 'OFFLINE' | 'ERROR';

/** Overall system state for the header */
export interface SystemState {
  status: SystemStatus;
  mode: SystemMode;
  processor: string;
  dataSource: string;
  pingStatus: 'READY' | 'TRANSMITTING' | 'IDLE';
  battery: number;
}

/** Demo preset definition */
export interface DemoPreset {
  name: string;
  label: string;
  environment: EnvironmentTelemetry;
  expectedStartFreq: number;
  expectedStopFreq: number;
  expectedPulseDuration: number;
  expectedAmplitude: number;
}

/** Parameter effect entry for the environment table */
export interface ParameterEffect {
  parameter: string;
  value: string;
  status: 'NOMINAL' | 'ADVERSE' | 'WARNING' | 'CRITICAL';
  effect: string;
}
