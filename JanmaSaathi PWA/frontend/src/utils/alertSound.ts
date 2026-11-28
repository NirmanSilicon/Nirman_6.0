import { NotificationPreferences } from '../types';

export type AlertSoundSeverity = 'critical' | 'urgent' | 'moderate' | 'update';

const SOUND_PREFS_STORAGE_KEY = 'janmasaathi_alert_sound_prefs_v1';

const DEFAULT_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  repeatUrgentChime: true,
  vibrationEnabled: true,
  pushEnabled: false,
};

let sharedAudioContext: AudioContext | null = null;
let repeatIntervalId: number | null = null;
let repeatAlertId: string | null = null;

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return ctor || null;
}

function getOrCreateAudioContext(): AudioContext | null {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new Ctor();
  }
  return sharedAudioContext;
}

export function readNotificationPreferences(): NotificationPreferences {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_PREFERENCES };
    }
    const raw = window.localStorage.getItem(SOUND_PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw);
    return {
      soundEnabled: parsed?.soundEnabled !== false,
      repeatUrgentChime: parsed?.repeatUrgentChime !== false,
      vibrationEnabled: parsed?.vibrationEnabled !== false,
      pushEnabled: Boolean(parsed?.pushEnabled),
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SOUND_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    }
  } catch {
    // ignore storage quota errors
  }
}

export async function unlockAlertAudio(): Promise<boolean> {
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    // Emit silent micro-pulse to satisfy strict mobile Safari/Chrome user-gesture unlock
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.02);
    return ctx.state === 'running';
  } catch {
    return false;
  }
}

function scheduleTone(
  ctx: AudioContext,
  startOffsetSec: number,
  freqHz: number,
  durationSec: number,
  peakGain: number,
  type: OscillatorType = 'sine'
) {
  const t0 = ctx.currentTime + startOffsetSec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freqHz, t0);

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peakGain, t0 + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t0);
  osc.stop(t0 + durationSec + 0.02);
}

export async function playAlertSound(
  severity: AlertSoundSeverity,
  options?: { ignoreSoundDisabled?: boolean }
): Promise<{ played: boolean; blockedByAutoplay: boolean }> {
  const prefs = readNotificationPreferences();
  if (!prefs.soundEnabled && !options?.ignoreSoundDisabled) {
    return { played: false, blockedByAutoplay: false };
  }

  if (prefs.vibrationEnabled && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(severity === 'critical' ? [220, 90, 220, 90, 220] : [180, 90, 180]);
    } catch {
      // ignore vibration errors
    }
  }

  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) {
      return { played: false, blockedByAutoplay: false };
    }

    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    if (ctx.state !== 'running') {
      return { played: false, blockedByAutoplay: true };
    }

    if (severity === 'critical') {
      // Clear, urgent hospital alert cadence (C6 -> G6 -> C6, repeated cleanly)
      scheduleTone(ctx, 0.0, 1046.5, 0.16, 0.22, 'triangle');
      scheduleTone(ctx, 0.18, 1318.5, 0.18, 0.24, 'triangle');
      scheduleTone(ctx, 0.38, 1567.98, 0.22, 0.24, 'triangle');
      scheduleTone(ctx, 0.72, 1046.5, 0.16, 0.22, 'triangle');
      scheduleTone(ctx, 0.9, 1567.98, 0.26, 0.24, 'triangle');
    } else if (severity === 'urgent') {
      // Distinct dual-tone medical chime (A5 -> E6)
      scheduleTone(ctx, 0.0, 880.0, 0.18, 0.18, 'sine');
      scheduleTone(ctx, 0.2, 1318.5, 0.26, 0.2, 'sine');
    } else {
      // Polite gentle chime for moderate alerts or hospital status updates (G5 -> B5)
      scheduleTone(ctx, 0.0, 783.99, 0.16, 0.14, 'sine');
      scheduleTone(ctx, 0.18, 987.77, 0.24, 0.15, 'sine');
    }

    return { played: true, blockedByAutoplay: false };
  } catch {
    return { played: false, blockedByAutoplay: true };
  }
}

export function startUrgentRepeatChime(
  alertId: string,
  severity: 'critical' | 'urgent',
  onAutoplayBlocked?: () => void
): void {
  if (typeof window === 'undefined') return;
  const prefs = readNotificationPreferences();
  if (!prefs.soundEnabled || !prefs.repeatUrgentChime) return;

  stopUrgentRepeatChime();
  repeatAlertId = alertId;
  let remainingRepeats = 4;

  repeatIntervalId = window.setInterval(async () => {
    const latestPrefs = readNotificationPreferences();
    if (!latestPrefs.soundEnabled || !latestPrefs.repeatUrgentChime || remainingRepeats <= 0) {
      stopUrgentRepeatChime();
      return;
    }
    remainingRepeats -= 1;
    const res = await playAlertSound(severity);
    if (res.blockedByAutoplay) {
      onAutoplayBlocked?.();
      stopUrgentRepeatChime();
    }
  }, 18000);
}

export function stopUrgentRepeatChime(targetAlertId?: string): void {
  if (targetAlertId && repeatAlertId && repeatAlertId !== targetAlertId) {
    return;
  }
  if (repeatIntervalId !== null && typeof window !== 'undefined') {
    window.clearInterval(repeatIntervalId);
  }
  repeatIntervalId = null;
  repeatAlertId = null;
}

export function isUrgentChimeRepeating(): boolean {
  return repeatIntervalId !== null;
}
