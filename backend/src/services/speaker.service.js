const { spawn } = require('child_process');
const { getEnv } = require('../config/env');
const { eventBus } = require('./eventBus');

const PPE_LABELS = {
  helmet: 'safety helmet',
  no_helmet: 'safety helmet',
  safety_vest: 'high-visibility safety vest',
  vest: 'high-visibility safety vest',
  no_safety_vest: 'high-visibility safety vest',
  safety_boots: 'safety boots',
  boots: 'safety boots',
  no_boots: 'safety boots',
};

const buildWarningMessage = ({ zoneName, zoneCode, missingPPE = [], graceSeconds, isEmergency = false }) => {
  const zoneText = zoneName || zoneCode || 'the work zone';
  if (isEmergency) {
    const emergencyType = missingPPE[0] || 'CRITICAL EMERGENCY';
    return `URGENT EMERGENCY ALERT in ${zoneText}. ${emergencyType} detected. Evacuate area and dispatch emergency response immediately.`;
  }
  const items = [...new Set(missingPPE.map((m) => PPE_LABELS[String(m).toLowerCase()] || String(m)))];
  const itemText = items.length > 0 ? items.join(' and ') : 'required PPE';
  return `Safety alert in ${zoneText}. Missing ${itemText} detected. You have ${graceSeconds} seconds to wear the required PPE.`;
};

/**
 * Speak text on the edge host without blocking the event loop.
 * Windows: System.Speech (SAPI). The message is passed through an environment variable,
 * never interpolated into the command line, so it cannot inject shell/PowerShell code.
 * Disabled in test mode or when SPEAKER_ENABLED=false.
 */
const speakLocally = (message) => {
  const { nodeEnv } = getEnv();
  if (nodeEnv === 'test' || process.env.SPEAKER_ENABLED === 'false') {
    return false;
  }
  if (process.platform !== 'win32') {
    return false;
  }
  try {
    const child = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak($env:SMARTPPE_SPEAK_TEXT)',
      ],
      {
        env: { ...process.env, SMARTPPE_SPEAK_TEXT: message },
        stdio: 'ignore',
        windowsHide: true,
        detached: false,
      }
    );
    child.on('error', () => {});
    child.unref();
    return true;
  } catch (_err) {
    return false;
  }
};

/**
 * Issue the local speaker warning for a normal (non-emergency) PPE violation.
 * Always emits `speaker:play` so LAN audio nodes / browser kiosks can also play the alert.
 */
const playZoneWarningAudio = ({ zoneCode, zoneName, missingPPE = [], isEmergency = false }) => {
  const { warningGraceSeconds } = getEnv();
  const message = buildWarningMessage({
    zoneName,
    zoneCode,
    missingPPE,
    graceSeconds: warningGraceSeconds,
    isEmergency,
  });
  const playedAt = new Date();
  const playedLocally = speakLocally(message);
  const payload = { zoneCode, zoneName, missingPPE, isEmergency, message, playedAt, playedLocally };
  eventBus.emit('speaker:play', payload);
  return payload;
};

module.exports = { playZoneWarningAudio, buildWarningMessage };
