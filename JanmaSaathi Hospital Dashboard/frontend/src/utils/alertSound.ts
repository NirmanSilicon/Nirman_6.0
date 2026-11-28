import type { AlertPriority } from '../types/hospital';

export interface AudioPlaybackResult {
  ok: boolean;
  state: AudioContextState | 'unsupported';
  message: string;
}

let sharedAudioCtx: AudioContext | null = null;
const soundedAlertIds = new Set<string>();
const activeReminderTimers = new Map<string, number>();

const REMINDER_INTERVAL_MS = 30_000;
const MAX_REMINDER_REPEATS = 3;

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
}

/**
 * Explicitly initializes or resumes the Web AudioContext on a user gesture
 * (e.g., clicking "Enable Sound Alerts" or "Test Alert Sound").
 */
export async function unlockAlertAudio(): Promise<AudioPlaybackResult> {
  const ctx = getOrCreateAudioContext();
  if (!ctx) {
    return {
      ok: false,
      state: 'unsupported',
      message: 'This browser does not support Web Audio playback. Visual alert banners remain active.',
    };
  }

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (ctx.state === 'running') {
      return {
        ok: true,
        state: ctx.state,
        message: 'Alert sound enabled and browser audio context ready.',
      };
    }
    return {
      ok: false,
      state: ctx.state,
      message: 'Browser audio is currently suspended. Click "Test Alert Sound" to activate audio.',
    };
  } catch {
    return {
      ok: false,
      state: ctx.state,
      message: 'Browser autoplay policy blocked audio activation. Visual alerts remain active.',
    };
  }
}

function playClinicalChimeInternal(ctx: AudioContext, priority: AlertPriority): boolean {
  try {
    const now = ctx.currentTime;
    // Short, distinct, dignified clinical chime — never harsh or continuous alarm noise
    const tones =
      priority === 'Critical'
        ? [
            { freq: 880, start: 0, dur: 0.14, gain: 0.13 },
            { freq: 1046.5, start: 0.17, dur: 0.16, gain: 0.13 },
            { freq: 1174.66, start: 0.36, dur: 0.2, gain: 0.11 },
          ]
        : priority === 'High Priority'
        ? [
            { freq: 784, start: 0, dur: 0.14, gain: 0.11 },
            { freq: 987.77, start: 0.18, dur: 0.18, gain: 0.1 },
          ]
        : [{ freq: 659.25, start: 0, dur: 0.18, gain: 0.08 }];

    tones.forEach((tone) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(tone.freq, now + tone.start);

      gainNode.gain.setValueAtTime(0.0001, now + tone.start);
      gainNode.gain.exponentialRampToValueAtTime(tone.gain, now + tone.start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(now + tone.start);
      osc.stop(now + tone.start + tone.dur + 0.02);
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Plays a calm, distinct clinical chime when a brand-new emergency alert arrives.
 * Deduplicates strictly by alertId so a single alert never triggers multiple arrival sounds.
 */
export async function playAlertNotificationSound(
  priority: AlertPriority,
  alertId?: string
): Promise<AudioPlaybackResult> {
  if (alertId && soundedAlertIds.has(alertId)) {
    return {
      ok: true,
      state: sharedAudioCtx?.state ?? 'running',
      message: 'Sound already played for this alert.',
    };
  }

  const ctx = getOrCreateAudioContext();
  if (!ctx) {
    return {
      ok: false,
      state: 'unsupported',
      message: 'Web Audio unavailable in this browser.',
    };
  }

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (ctx.state !== 'running') {
      return {
        ok: false,
        state: ctx.state,
        message: 'Audio playback blocked by browser autoplay policy. Visual alert displayed.',
      };
    }

    const played = playClinicalChimeInternal(ctx, priority);
    if (!played) {
      return {
        ok: false,
        state: ctx.state,
        message: 'Audio playback could not start. Visual alert remains visible.',
      };
    }

    if (alertId) {
      soundedAlertIds.add(alertId);
    }

    return {
      ok: true,
      state: ctx.state,
      message: 'Clinical alert chime played.',
    };
  } catch {
    return {
      ok: false,
      state: ctx.state,
      message: 'Audio playback blocked by browser autoplay policy. Visual alert displayed.',
    };
  }
}

/**
 * Plays a one-shot test chime on user interaction from Settings.
 */
export async function testAlertNotificationSound(): Promise<AudioPlaybackResult> {
  const unlocked = await unlockAlertAudio();
  if (!unlocked.ok || !sharedAudioCtx) {
    return unlocked;
  }
  const played = playClinicalChimeInternal(sharedAudioCtx, 'High Priority');
  return played
    ? {
        ok: true,
        state: sharedAudioCtx.state,
        message: 'Test clinical alert chime played successfully.',
      }
    : {
        ok: false,
        state: sharedAudioCtx.state,
        message: 'Unable to play test chime in this browser.',
      };
}

/**
 * Starts a gentle, bounded repeating reminder chime for an unacknowledged Critical/High Priority alert.
 * Stops automatically when silenced, acknowledged, or after MAX_REMINDER_REPEATS gentle chimes.
 */
export function startAlertReminder(
  alertId: string,
  priority: AlertPriority,
  isSoundStillEnabled: () => boolean,
  onReminderCleared?: (id: string) => void
): void {
  if (typeof window === 'undefined') return;
  if (priority !== 'Critical' && priority !== 'High Priority') return;
  if (activeReminderTimers.has(alertId)) return;

  let repeats = 0;
  const timerId = window.setInterval(() => {
    if (!isSoundStillEnabled() || repeats >= MAX_REMINDER_REPEATS) {
      silenceAlertReminder(alertId);
      onReminderCleared?.(alertId);
      return;
    }
    repeats += 1;
    const ctx = getOrCreateAudioContext();
    if (ctx && ctx.state === 'running') {
      playClinicalChimeInternal(ctx, priority);
    }
  }, REMINDER_INTERVAL_MS);

  activeReminderTimers.set(alertId, timerId);
}

export function silenceAlertReminder(alertId: string): void {
  const timerId = activeReminderTimers.get(alertId);
  if (timerId !== undefined) {
    window.clearInterval(timerId);
    activeReminderTimers.delete(alertId);
  }
}

export function silenceAllAlertReminders(): void {
  activeReminderTimers.forEach((timerId) => window.clearInterval(timerId));
  activeReminderTimers.clear();
}

export function markHistoricalAlertsAsSounded(alertIds: string[]): void {
  alertIds.forEach((id) => soundedAlertIds.add(id));
}

export function resetSoundedAlertHistory(): void {
  soundedAlertIds.clear();
  silenceAllAlertReminders();
}
