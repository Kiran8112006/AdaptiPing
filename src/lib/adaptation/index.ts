// ============================================================
// AdaptiPing — Deterministic Adaptive Ping Controller
// ============================================================
// This module implements rule-based adaptation logic.
// NO machine learning. ALL decisions are explainable and deterministic.
// ============================================================

import {
  EnvironmentTelemetry,
  PingConfiguration,
  AdaptationDecision,
  EnvironmentClass,
  EnergyConstraintState,
  ExplanationLine,
  ParameterEffect,
} from '../types';

// ---- Environment Classification ----

export function classifyEnvironment(env: EnvironmentTelemetry): EnvironmentClass {
  if (env.turbidity >= 65) return 'MUDDY_ESTUARY';
  if (env.turbidity >= 30) return 'MID_TURBIDITY';
  if (env.turbidity < 30 && env.depth <= 30) return 'CLEAR_SHALLOW';
  return 'CUSTOM';
}

export function getEnvironmentLabel(ec: EnvironmentClass): string {
  switch (ec) {
    case 'CLEAR_SHALLOW': return 'Simulated Clear Shallow Reef';
    case 'MID_TURBIDITY': return 'Simulated Mid Turbidity';
    case 'MUDDY_ESTUARY': return 'Simulated Muddy Estuary';
    case 'CUSTOM': return 'Simulated Custom';
  }
}

// ---- Energy Constraint ----

export function determineEnergyConstraint(
  battery: number
): EnergyConstraintState {
  if (battery < 20) return 'CRITICAL';
  if (battery < 40) return 'CONSTRAINED';
  return 'NOMINAL';
}

// ---- Core Adaptation Rules ----

export function computeAdaptation(env: EnvironmentTelemetry): AdaptationDecision {
  const envClass = classifyEnvironment(env);
  const explanation: ExplanationLine[] = [];

  // Base parameters from environment classification
  let startFreq: number;
  let stopFreq: number;
  let pulseDuration: number;
  let amplitude: number;

  switch (envClass) {
    case 'MUDDY_ESTUARY':
      startFreq = 90;
      stopFreq = 130;
      pulseDuration = 2.0;
      amplitude = 1.0;
      break;

    case 'MID_TURBIDITY':
      startFreq = 120;
      stopFreq = 160;
      pulseDuration = 1.2;
      amplitude = 0.75;
      break;

    case 'CLEAR_SHALLOW':
      startFreq = 150;
      stopFreq = 200;
      pulseDuration = 0.6;
      amplitude = 0.5;
      break;

    default: {
      // Custom: interpolate based on turbidity
      const t = env.turbidity / 100;
      startFreq = 150 - t * 60;
      stopFreq = 200 - t * 70;
      pulseDuration = 0.6 + t * 1.4;
      amplitude = 0.5 + t * 0.5;
      break;
    }
  }

  // Temperature compensation
  let tempDerated = false;
  if (env.temperature > 35) {
    amplitude = Math.max(amplitude * 0.9, 0.3);
    tempDerated = true;
  }

  // Battery / energy constraint
  const energyConstraint = determineEnergyConstraint(env.battery);

  if (energyConstraint === 'CRITICAL') {
    amplitude = Math.min(amplitude, 0.4);
    pulseDuration = Math.min(pulseDuration, 0.8);
  } else if (energyConstraint === 'CONSTRAINED') {
    amplitude = Math.min(amplitude, 0.7);
  }

  // Depth adjustment
  let deepAdjusted = false;
  if (env.depth > 100) {
    startFreq = Math.max(startFreq - 10, 50);
    stopFreq = Math.max(stopFreq - 10, 80);
    deepAdjusted = true;
  }

  const bandwidth = stopFreq - startFreq;

  const pingConfig: PingConfiguration = {
    waveformType: 'lfm',
    startFrequency: Math.round(startFreq * 10) / 10,
    stopFrequency: Math.round(stopFreq * 10) / 10,
    bandwidth: Math.round(bandwidth * 10) / 10,
    pulseDuration: Math.round(pulseDuration * 100) / 100,
    amplitude: Math.round(amplitude * 100) / 100,
    windowType: 'hann',
    sampleRate: 1000, // 1 MSPS bench DAC rate (Nyquist: 500 kHz)
  };

  // Build dynamic explanation lines strictly based on actual selected parameters
  if (envClass === 'MUDDY_ESTUARY') {
    explanation.push(
      {
        condition: 'High turbidity condition (>=65 NTU)',
        action: `Lower operating band (${pingConfig.startFrequency}–${pingConfig.stopFrequency} kHz, BW: ${pingConfig.bandwidth} kHz) selected for penetration-oriented mode`,
      },
      {
        condition: 'High acoustic attenuation',
        action: `Extended pulse duration (${pingConfig.pulseDuration} ms) increases pulse energy and time-bandwidth product.`,
      },
      {
        condition: 'Transmit level',
        action: `Set to ${pingConfig.amplitude.toFixed(2)} (maximum permitted by simulated energy/hardware constraints).`,
      }
    );
  } else if (envClass === 'MID_TURBIDITY') {
    explanation.push(
      {
        condition: 'Moderate turbidity (30–65 NTU)',
        action: `Mid-frequency band (${pingConfig.startFrequency}–${pingConfig.stopFrequency} kHz, BW: ${pingConfig.bandwidth} kHz) balanced between resolution and range`,
      },
      {
        condition: 'Balanced channel losses',
        action: `Medium pulse duration (${pingConfig.pulseDuration} ms) provides nominal processing gain.`,
      },
      {
        condition: 'Transmit level',
        action: `Set to ${pingConfig.amplitude.toFixed(2)} (balanced simulated transmit setting within energy budget).`,
      }
    );
  } else if (envClass === 'CLEAR_SHALLOW') {
    explanation.push(
      {
        condition: 'Clear shallow water (<30 NTU, <=30m depth)',
        action: `Higher operating band (${pingConfig.startFrequency}–${pingConfig.stopFrequency} kHz, BW: ${pingConfig.bandwidth} kHz) for fine range resolution`,
      },
      {
        condition: 'Low volumetric attenuation',
        action: `Short pulse duration (${pingConfig.pulseDuration} ms) for fine range gate resolution.`,
      },
      {
        condition: 'Transmit level',
        action: `Reduced transmit level (${pingConfig.amplitude.toFixed(2)}) sufficient for low-attenuation channel.`,
      }
    );
  } else {
    explanation.push(
      {
        condition: `Custom environment parameters (Turbidity: ${env.turbidity.toFixed(0)} NTU)`,
        action: `Interpolated operating band (${pingConfig.startFrequency}–${pingConfig.stopFrequency} kHz, BW: ${pingConfig.bandwidth} kHz)`,
      },
      {
        condition: 'Custom acoustic channel model',
        action: `Pulse duration: ${pingConfig.pulseDuration} ms, Transmit level: ${pingConfig.amplitude.toFixed(2)}`,
      }
    );
  }

  if (tempDerated) {
    explanation.push({
      condition: `Elevated water temperature (${env.temperature.toFixed(1)}°C)`,
      action: 'Transmit amplitude scaled by 0.90 to simulate amplifier thermal protection',
    });
  }

  if (energyConstraint === 'CRITICAL') {
    explanation.push({
      condition: `Battery critically low (${env.battery.toFixed(0)}%)`,
      action: `Energy constraint CRITICAL active → Transmit level capped at ${pingConfig.amplitude.toFixed(2)}, pulse duration capped at ${pingConfig.pulseDuration.toFixed(2)} ms`,
    });
  } else if (energyConstraint === 'CONSTRAINED') {
    explanation.push({
      condition: `Battery level constrained (${env.battery.toFixed(0)}%)`,
      action: `Energy constraint ACTIVE → Transmit level capped at ${pingConfig.amplitude.toFixed(2)}`,
    });
  }

  if (deepAdjusted) {
    explanation.push({
      condition: `Deep water environment (${env.depth.toFixed(0)} m)`,
      action: 'Operating frequency band shifted down by 10 kHz for extended range propagation',
    });
  }

  return {
    environmentClass: envClass,
    energyConstraint,
    pingConfig,
    explanation,
    timestamp: new Date(),
  };
}

// ---- Parameter Effects Computation (for Environment Page Table) ----

export function computeParameterEffects(env: EnvironmentTelemetry): ParameterEffect[] {
  const effects: ParameterEffect[] = [];

  // Turbidity
  if (env.turbidity >= 65) {
    effects.push({
      parameter: 'Turbidity',
      value: `${env.turbidity.toFixed(0)} NTU`,
      status: 'ADVERSE',
      effect: 'Forces lower operating band (90–130 kHz) and extended pulse duration for penetration.',
    });
  } else if (env.turbidity >= 30) {
    effects.push({
      parameter: 'Turbidity',
      value: `${env.turbidity.toFixed(0)} NTU`,
      status: 'WARNING',
      effect: 'Selects mid band (120–160 kHz) to balance resolution against scattering losses.',
    });
  } else {
    effects.push({
      parameter: 'Turbidity',
      value: `${env.turbidity.toFixed(0)} NTU`,
      status: 'NOMINAL',
      effect: 'Enables high-frequency band (150–200 kHz) for maximum spatial resolution.',
    });
  }

  // Depth
  if (env.depth > 100) {
    effects.push({
      parameter: 'Depth',
      value: `${env.depth.toFixed(1)} m`,
      status: 'WARNING',
      effect: 'Deep water: frequency lowered by 10 kHz to compensate for spherical spreading.',
    });
  } else {
    effects.push({
      parameter: 'Depth',
      value: `${env.depth.toFixed(1)} m`,
      status: 'NOMINAL',
      effect: 'Standard depth propagation profile applied.',
    });
  }

  // Temperature
  if (env.temperature > 35) {
    effects.push({
      parameter: 'Temperature',
      value: `${env.temperature.toFixed(1)} °C`,
      status: 'WARNING',
      effect: 'High thermal stress: transmit amplitude derated by 10% to protect output stages.',
    });
  } else {
    effects.push({
      parameter: 'Temperature',
      value: `${env.temperature.toFixed(1)} °C`,
      status: 'NOMINAL',
      effect: 'Operating within nominal thermal bounds.',
    });
  }

  // Salinity
  effects.push({
    parameter: 'Salinity',
    value: `${env.salinity.toFixed(1)} PSU`,
    status: 'NOMINAL',
    effect: 'Absorption coefficient factored into energy budget calculations.',
  });

  // Battery
  if (env.battery < 20) {
    effects.push({
      parameter: 'Battery',
      value: `${env.battery.toFixed(0)} %`,
      status: 'CRITICAL',
      effect: 'Critical energy constraint: amplitude capped at 0.40, pulse duration capped at 0.8 ms.',
    });
  } else if (env.battery < 40) {
    effects.push({
      parameter: 'Battery',
      value: `${env.battery.toFixed(0)} %`,
      status: 'WARNING',
      effect: 'Energy constrained: transmit amplitude capped at 0.70.',
    });
  } else {
    effects.push({
      parameter: 'Battery',
      value: `${env.battery.toFixed(0)} %`,
      status: 'NOMINAL',
      effect: 'Full energy budget available for transmission.',
    });
  }

  return effects;
}
