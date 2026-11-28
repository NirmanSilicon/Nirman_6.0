// Audio Navigation Utility with Speech Synthesis and Sound Cues

export interface SpeechSettings {
  rate: number;
  pitch: number;
  volume: number;
  voiceURI?: string;
  playChime: boolean;
  autoSpeakOnStepChange: boolean;
  muted: boolean;
}

export const DEFAULT_SPEECH_SETTINGS: SpeechSettings = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  playChime: true,
  autoSpeakOnStepChange: true,
  muted: false,
};

// Play a pleasant two-tone chime using Web Audio API before voice announcements
export const playNavigationChime = (
  type: 'turn' | 'arrival' | 'warning' | 'recalculate' = 'turn',
  isMuted: boolean = false
) => {
  if (isMuted) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    if (type === 'warning') {
      // Urgent attention chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(330, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'arrival') {
      // Victory / Arrival melodic triad
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.18, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.4);
      });
    } else {
      // Gentle notification chime (pleasant 2-tone ping)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc2.frequency.setValueAtTime(880, now + 0.1); // A5

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.12);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.35);
    }
  } catch (e) {
    // Graceful fallback if Web Audio API blocked or unavailable
    console.debug('Audio chime skipped:', e);
  }
};

// Format instructions for natural, clear accessibility speech
export const formatStepForSpeech = (
  step: {
    instruction: string;
    distanceMeters: number;
    isStepFree: boolean;
    hasRamp: boolean;
    hasElevator: boolean;
    surface: string;
    barrierWarning?: string;
  },
  stepIndex: number,
  totalSteps: number
): string => {
  const isFinalStep = stepIndex === totalSteps - 1;
  let speech = '';

  if (isFinalStep) {
    speech = `Final destination approaching. In ${step.distanceMeters} meters: ${step.instruction}.`;
  } else {
    speech = `Step ${stepIndex + 1} of ${totalSteps}. In ${step.distanceMeters} meters: ${step.instruction}.`;
  }

  // Accessibility cues
  if (step.hasRamp) {
    speech += ' Wheelchair ramp available with dual handrails.';
  }
  if (step.hasElevator) {
    speech += ' Level-access elevator with tactile floor buttons.';
  }
  if (step.isStepFree) {
    speech += ' This section is completely step free.';
  }
  if (step.surface) {
    speech += ` Surface is ${step.surface}.`;
  }
  if (step.barrierWarning) {
    speech += ` Caution: ${step.barrierWarning}.`;
  }

  return speech;
};

// Voice synthesis manager with speech queue & cancel support
export class TurnByTurnVoiceEngine {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private settings: SpeechSettings;
  private isSpeakingCallback?: (speaking: boolean) => void;

  constructor(
    settings: SpeechSettings = DEFAULT_SPEECH_SETTINGS,
    onSpeakingChange?: (speaking: boolean) => void
  ) {
    this.settings = { ...settings };
    this.isSpeakingCallback = onSpeakingChange;
  }

  public updateSettings(newSettings: Partial<SpeechSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    if (this.settings.muted) {
      this.stop();
    }
  }

  public setMuted(muted: boolean) {
    this.settings.muted = muted;
    if (muted) {
      this.stop();
    }
  }

  public isMuted(): boolean {
    return !!this.settings.muted;
  }

  public speak(
    text: string,
    chimeType: 'turn' | 'arrival' | 'warning' | 'recalculate' = 'turn',
    priority: boolean = true
  ) {
    if (this.settings.muted) {
      this.stop();
      return;
    }

    if (!('speechSynthesis' in window)) return;

    if (priority) {
      this.stop();
    }

    if (this.settings.playChime) {
      playNavigationChime(chimeType, this.settings.muted);
    }

    // Small delay to let the chime ring first
    const delay = this.settings.playChime ? 220 : 0;

    setTimeout(() => {
      if (this.settings.muted) {
        this.stop();
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = this.settings.rate;
        utterance.pitch = this.settings.pitch;
        utterance.volume = this.settings.volume;

        if (this.settings.voiceURI) {
          const voices = window.speechSynthesis.getVoices();
          const matched = voices.find((v) => v.voiceURI === this.settings.voiceURI);
          if (matched) utterance.voice = matched;
        }

        utterance.onstart = () => {
          this.isSpeakingCallback?.(true);
        };
        utterance.onend = () => {
          this.isSpeakingCallback?.(false);
          this.currentUtterance = null;
        };
        utterance.onerror = () => {
          this.isSpeakingCallback?.(false);
          this.currentUtterance = null;
        };

        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error('TTS execution error:', e);
        this.isSpeakingCallback?.(false);
      }
    }, delay);
  }

  public stop() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeakingCallback?.(false);
      this.currentUtterance = null;
    }
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices();
  }
}
