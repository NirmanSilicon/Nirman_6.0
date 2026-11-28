import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { RouteOption, RouteStep, Destination } from '../../types';
import { useAccessibility } from '../../context/AccessibilityContext';
import {
  TurnByTurnVoiceEngine,
  formatStepForSpeech,
  DEFAULT_SPEECH_SETTINGS,
  SpeechSettings,
  playNavigationChime,
} from '../../utils/audioNavigator';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Navigation,
  Footprints,
  Compass,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Radio,
  Gauge,
  Ear,
  Eye,
  Crosshair,
  BellRing,
  Layers,
  MapPin,
  Flame,
} from 'lucide-react';

interface TurnByTurnSpeechNavigatorProps {
  route: RouteOption;
  destination: Destination;
  activeStepIndex: number;
  onStepChange: (index: number) => void;
  onCloseNavigation?: () => void;
  onRecalculate?: () => void;
}

export const TurnByTurnSpeechNavigator: React.FC<TurnByTurnSpeechNavigatorProps> = ({
  route,
  destination,
  activeStepIndex,
  onStepChange,
  onCloseNavigation,
  onRecalculate,
}) => {
  const { profile, speak: contextSpeak, isAudioMuted, toggleAudioMute, setIsAudioMuted } = useAccessibility();

  // Speech settings state
  const [speechSettings, setSpeechSettings] = useState<SpeechSettings>(() => {
    const saved = localStorage.getItem('accessway_speech_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SPEECH_SETTINGS, ...JSON.parse(saved), muted: isAudioMuted };
      } catch (e) {
        console.error(e);
      }
    }
    return { ...DEFAULT_SPEECH_SETTINGS, muted: isAudioMuted };
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showMuteFeedback, setShowMuteFeedback] = useState<string | null>(null);

  // Sync global isAudioMuted with speechSettings
  useEffect(() => {
    setSpeechSettings((prev) => ({ ...prev, muted: isAudioMuted }));
  }, [isAudioMuted]);

  // Handle Mute Toggle
  const handleToggleMute = (newVal?: boolean) => {
    const nextVal = typeof newVal === 'boolean' ? newVal : !speechSettings.muted;
    setSpeechSettings((prev) => ({ ...prev, muted: nextVal }));
    setIsAudioMuted(nextVal);
    voiceEngine.current?.setMuted(nextVal);

    setShowMuteFeedback(nextVal ? 'Audio Muted' : 'Audio Unmuted');
    setTimeout(() => setShowMuteFeedback(null), 2500);
  };

  // Keyboard shortcut listener ('M' for mute/unmute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [speechSettings.muted]);

  // Movement Simulation & Real GPS Tracking State
  const [isMoving, setIsMoving] = useState(false);
  const [movementSpeed, setMovementSpeed] = useState<number>(1.2); // meters per second
  const [stepRemainingMeters, setStepRemainingMeters] = useState<number>(
    route.steps[activeStepIndex]?.distanceMeters || 50
  );
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsStatusText, setGpsStatusText] = useState<string>('GPS Inactive');
  const [hasCompleted, setHasCompleted] = useState(false);

  // Engine ref
  const voiceEngine = useRef<TurnByTurnVoiceEngine | null>(null);

  // Initialize Voice Engine
  useEffect(() => {
    voiceEngine.current = new TurnByTurnVoiceEngine(speechSettings, (speaking) => {
      setIsSpeaking(speaking);
    });

    const updateVoices = () => {
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      }
    };

    updateVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      voiceEngine.current?.stop();
    };
  }, []);

  // Update engine when speechSettings change
  useEffect(() => {
    voiceEngine.current?.updateSettings(speechSettings);
    localStorage.setItem('accessway_speech_settings', JSON.stringify(speechSettings));
  }, [speechSettings]);

  // Current step reference
  const currentStep = route.steps[activeStepIndex] || route.steps[0];
  const totalSteps = route.steps.length;

  // Speak step whenever activeStepIndex changes
  useEffect(() => {
    if (!currentStep) return;

    setStepRemainingMeters(currentStep.distanceMeters);

    if (speechSettings.autoSpeakOnStepChange && profile.voiceGuidanceEnabled) {
      const formatted = formatStepForSpeech(currentStep, activeStepIndex, totalSteps);
      voiceEngine.current?.speak(
        formatted,
        currentStep.barrierWarning ? 'warning' : activeStepIndex === totalSteps - 1 ? 'arrival' : 'turn'
      );
    }

    // Trigger haptic vibration if supported
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(currentStep.barrierWarning ? [100, 50, 100] : [70]);
      } catch (e) {
        // ignore
      }
    }
  }, [activeStepIndex, route.id]);

  // Real-Time Simulated Movement Timer (ticks down meters as user moves)
  useEffect(() => {
    let interval: any = null;

    if (isMoving && !hasCompleted) {
      interval = setInterval(() => {
        setStepRemainingMeters((prev) => {
          const nextDist = Math.max(0, Math.round((prev - movementSpeed * 0.8) * 10) / 10);

          // If reached the end of current step, automatically advance to next step!
          if (nextDist <= 0) {
            if (activeStepIndex < totalSteps - 1) {
              const nextIdx = activeStepIndex + 1;
              onStepChange(nextIdx);
              return route.steps[nextIdx]?.distanceMeters || 50;
            } else {
              // Final Destination reached!
              setIsMoving(false);
              setHasCompleted(true);
              confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
              voiceEngine.current?.speak(
                `Congratulations! You have arrived safely at ${destination.name}. Your destination entrance is level with automatic accessible doors.`,
                'arrival'
              );
              return 0;
            }
          }
          return nextDist;
        });
      }, 800);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMoving, activeStepIndex, totalSteps, movementSpeed, hasCompleted, destination.name, route.steps, onStepChange]);

  // Real Device GPS Watcher
  useEffect(() => {
    let watchId: number | null = null;

    if (gpsActive && 'geolocation' in navigator) {
      setGpsStatusText('Acquiring real-time GPS coordinates...');
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setGpsStatusText(`GPS Locked (±${Math.round(accuracy)}m accuracy)`);

          // Calculate distance to current step waypoint
          const targetCoords = currentStep.coordinates || destination.coordinates;
          const latDiff = (targetCoords[0] - latitude) * 111320;
          const lonDiff = (targetCoords[1] - longitude) * 111320 * Math.cos((latitude * Math.PI) / 180);
          const distance = Math.round(Math.sqrt(latDiff * latDiff + lonDiff * lonDiff));

          setStepRemainingMeters(distance);

          // If user moves within 10 meters of waypoint, advance step!
          if (distance <= 10 && activeStepIndex < totalSteps - 1) {
            onStepChange(activeStepIndex + 1);
          }
        },
        (error) => {
          setGpsStatusText(`GPS Warning: ${error.message}`);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    } else {
      setGpsStatusText('GPS Inactive (Simulation Ready)');
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [gpsActive, activeStepIndex, totalSteps, currentStep, destination.coordinates, onStepChange]);

  // Speech Handlers
  const handleSpeakCurrentStep = () => {
    if (!currentStep) return;
    const formatted = formatStepForSpeech(currentStep, activeStepIndex, totalSteps);
    voiceEngine.current?.speak(
      formatted,
      currentStep.barrierWarning ? 'warning' : activeStepIndex === totalSteps - 1 ? 'arrival' : 'turn'
    );
  };

  const handleSpeakAccessibilityDetails = () => {
    if (!currentStep) return;
    const weather = destination.weather;
    const weatherNotice =
      weather.delayMinutes && weather.delayMinutes > 0
        ? `Weather obstacle alert: ${weather.hazardTitle}. Pavement traction is ${weather.surfaceTractionScore ?? 90} percent. ${weather.recommendedMitigation}`
        : `Weather is ${weather.temperatureC} degrees Celsius with dry, step-free traction.`;

    const details = `Environmental details for step ${activeStepIndex + 1}: Surface type is ${currentStep.surface}. ${
      currentStep.isStepFree ? 'Zero stairs and step-free.' : 'Step warning present.'
    } ${currentStep.hasRamp ? 'Wheelchair ramp with 1 to 12 gradient and tactile warnings.' : ''} ${
      currentStep.hasElevator ? 'Accessible elevator is available.' : ''
    } ${weatherNotice} Destination ${destination.name} has score ${destination.accessibilityScore.overall} out of 100.`;

    voiceEngine.current?.speak(details, 'turn');
  };

  const handleStopSpeaking = () => {
    voiceEngine.current?.stop();
  };

  const handleNextStep = () => {
    if (activeStepIndex < totalSteps - 1) {
      onStepChange(activeStepIndex + 1);
    }
  };

  const handlePrevStep = () => {
    if (activeStepIndex > 0) {
      onStepChange(activeStepIndex - 1);
    }
  };

  const handleResetNavigation = () => {
    onStepChange(0);
    setHasCompleted(false);
    setIsMoving(false);
    setStepRemainingMeters(route.steps[0]?.distanceMeters || 50);
  };

  // Helper step icon
  const getStepIcon = (instruction: string) => {
    const text = instruction.toLowerCase();
    if (text.includes('left')) return '↩️ Turn Left';
    if (text.includes('right')) return '↪️ Turn Right';
    if (text.includes('ramp')) return '📐 Wheelchair Ramp';
    if (text.includes('elevator') || text.includes('lift')) return '🛗 Lift / Elevator';
    if (text.includes('entrance') || text.includes('arrive') || text.includes('destination'))
      return '🏁 Destination Entrance';
    return '⬆️ Head Straight';
  };

  // Calculation of overall progress
  const completedMeters = useMemo(() => {
    const previousStepsDist = route.steps
      .slice(0, activeStepIndex)
      .reduce((acc, s) => acc + s.distanceMeters, 0);
    const currentStepDone = (currentStep.distanceMeters || 50) - stepRemainingMeters;
    return Math.max(0, previousStepsDist + currentStepDone);
  }, [route.steps, activeStepIndex, currentStep.distanceMeters, stepRemainingMeters]);

  const totalDistanceMeters = useMemo(() => {
    return route.steps.reduce((acc, s) => acc + s.distanceMeters, 0) || Math.round(route.distanceKm * 1000);
  }, [route.steps, route.distanceKm]);

  const overallProgressPercent = Math.min(
    100,
    Math.round((completedMeters / Math.max(1, totalDistanceMeters)) * 100)
  );

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
      {/* Top Header: Route title & Voice status */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg relative">
            <Compass className="w-6 h-6 animate-pulse" />
            {isSpeaking && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {speechSettings.muted ? (
                <span
                  onClick={() => handleToggleMute(false)}
                  className="px-2.5 py-0.5 bg-rose-500/20 border border-rose-500/80 text-rose-300 text-xs font-black uppercase tracking-wider rounded-md flex items-center gap-1 cursor-pointer hover:bg-rose-500/30 transition-colors"
                  title="Click to Unmute Voice Guidance"
                >
                  <VolumeX className="w-3 h-3 text-rose-400" />
                  <span>Audio Muted (Click to Unmute)</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-blue-600/30 border border-blue-500 text-blue-300 text-xs font-black uppercase tracking-wider rounded-md flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-blue-400" />
                  <span>Voice Guidance Active</span>
                </span>
              )}

              {isSpeaking && !speechSettings.muted && (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                  <span className="inline-block w-1.5 h-3 bg-emerald-400 animate-pulse rounded-full" />
                  <span className="inline-block w-1.5 h-4 bg-emerald-400 animate-pulse delay-75 rounded-full" />
                  <span className="inline-block w-1.5 h-2 bg-emerald-400 animate-pulse delay-150 rounded-full" />
                  <span>Reading Out Instruction...</span>
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5">
              {route.name}
            </h3>
            <p className="text-xs text-slate-400">
              {destination.name} • {route.distanceKm} km • {route.stairsCount === 0 ? '0 Stairs (100% Step-Free)' : `${route.stairsCount} stairs`}
            </p>
          </div>
        </div>

        {/* Audio Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* MUTE / UNMUTE Quick Toggle Button */}
          <button
            id="nav-mute-toggle-btn"
            onClick={() => handleToggleMute()}
            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 border shadow-md transition-all ${
              speechSettings.muted
                ? 'bg-rose-950/80 hover:bg-rose-900 border-rose-500 text-rose-200 ring-1 ring-rose-500'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title={speechSettings.muted ? 'Unmute Audio (Press M)' : 'Mute All Spoken Audio (Press M)'}
            aria-label={speechSettings.muted ? 'Unmute Audio Guidance' : 'Mute Audio Guidance'}
          >
            {speechSettings.muted ? (
              <>
                <VolumeX className="w-4 h-4 text-rose-400" />
                <span>Unmute Audio</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-blue-400" />
                <span>Mute Audio</span>
              </>
            )}
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-slate-900/60 rounded-md border border-slate-700 text-slate-400">
              M
            </kbd>
          </button>

          {/* Read Current Step Button */}
          <button
            id="nav-speak-step-btn"
            onClick={isSpeaking ? handleStopSpeaking : handleSpeakCurrentStep}
            disabled={speechSettings.muted}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all ${
              speechSettings.muted
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
                : isSpeaking
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            title={speechSettings.muted ? 'Unmute audio to speak instructions' : 'Read current step aloud'}
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isSpeaking ? 'Stop Voice' : 'Speak Step'}</span>
          </button>

          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2.5 rounded-xl border transition-all ${
              showSettings
                ? 'bg-slate-800 border-blue-500 text-blue-400'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Audio & Speech Synthesis Customization"
            aria-label="Audio settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Mute Status Toast */}
      {showMuteFeedback && (
        <div className="p-3 bg-slate-950 border border-blue-500/60 text-white rounded-2xl shadow-xl flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            {speechSettings.muted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
            <span className="font-bold">{showMuteFeedback}</span>
            <span className="text-slate-400">
              {speechSettings.muted
                ? '— Spoken directions and chimes are now silenced.'
                : '— Turn-by-turn spoken guidance is live.'}
            </span>
          </div>
          <button
            onClick={() => handleToggleMute()}
            className="text-blue-400 hover:text-blue-300 font-bold underline ml-3"
          >
            Undo
          </button>
        </div>
      )}

      {/* Persistent Banner if Muted */}
      {speechSettings.muted && !showMuteFeedback && (
        <div className="p-3.5 bg-rose-950/40 border border-rose-800/80 rounded-2xl text-rose-200 text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <VolumeX className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Voice navigation is currently muted. Screen updates and directions continue silently.</span>
          </div>
          <button
            onClick={() => handleToggleMute(false)}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs shrink-0 shadow-sm"
          >
            Unmute Voice
          </button>
        </div>
      )}

      {/* Voice & TTS Customization Drawer (Collapsible) */}
      {showSettings && (
        <div className="p-5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
              <Ear className="w-4 h-4 text-blue-400" />
              <span>Voice & Speech Synthesis Customization</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleMute()}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border ${
                  speechSettings.muted
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {speechSettings.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{speechSettings.muted ? 'Muted' : 'Mute'}</span>
              </button>
              <span className="text-[11px] text-slate-400">Web Speech API</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Voice Selection */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Synthesizer Voice</label>
              <select
                value={speechSettings.voiceURI || ''}
                onChange={(e) =>
                  setSpeechSettings((prev) => ({ ...prev, voiceURI: e.target.value }))
                }
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="">Default System Natural Voice</option>
                {availableVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            {/* Speed / Rate */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-300 font-semibold">
                <span>Speaking Rate</span>
                <span className="text-blue-400 font-bold">{speechSettings.rate}x</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">0.75x</span>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={speechSettings.rate}
                  onChange={(e) =>
                    setSpeechSettings((prev) => ({ ...prev, rate: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-blue-500"
                />
                <span className="text-[10px] text-slate-400">1.5x</span>
              </div>
            </div>

            {/* Pitch */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-300 font-semibold">
                <span>Voice Pitch</span>
                <span className="text-blue-400 font-bold">{speechSettings.pitch}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">Low</span>
                <input
                  type="range"
                  min="0.7"
                  max="1.3"
                  step="0.05"
                  value={speechSettings.pitch}
                  onChange={(e) =>
                    setSpeechSettings((prev) => ({ ...prev, pitch: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-blue-500"
                />
                <span className="text-[10px] text-slate-400">High</span>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={speechSettings.muted}
                  onChange={(e) => handleToggleMute(e.target.checked)}
                  className="rounded-md accent-rose-600"
                />
                <span className={speechSettings.muted ? 'text-rose-300 font-bold' : ''}>
                  Mute All Audio Guidance
                </span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={speechSettings.playChime}
                  onChange={(e) =>
                    setSpeechSettings((prev) => ({ ...prev, playChime: e.target.checked }))
                  }
                  disabled={speechSettings.muted}
                  className="rounded-md accent-blue-600"
                />
                <span>Play Sound Chime Before Speech</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={speechSettings.autoSpeakOnStepChange}
                  onChange={(e) =>
                    setSpeechSettings((prev) => ({
                      ...prev,
                      autoSpeakOnStepChange: e.target.checked,
                    }))
                  }
                  disabled={speechSettings.muted}
                  className="rounded-md accent-blue-600"
                />
                <span>Auto-Speak When Step Changes</span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-700 text-slate-300 font-bold">
                M
              </kbd>
              <span>Press M key anytime to quickly toggle Mute</span>
            </div>

            <button
              onClick={() => {
                if (speechSettings.muted) {
                  handleToggleMute(false);
                }
                playNavigationChime('turn');
                voiceEngine.current?.speak(
                  'Voice test: Step-free turn by turn audio navigation is ready.',
                  'turn'
                );
              }}
              className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Test Audio Engine</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Active Step Showcase Card */}
      <div className="p-6 sm:p-7 bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 rounded-3xl border-2 border-blue-500/80 shadow-2xl relative overflow-hidden space-y-5">
        {/* Step Header Badge & Distance Countdown */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md">
              Step {activeStepIndex + 1} of {totalSteps}
            </span>
            <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
              <span>{getStepIcon(currentStep.instruction)}</span>
            </span>
          </div>

          {/* Real-time Distance countdown */}
          <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-3.5 py-1.5 rounded-xl">
            <Footprints className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">Distance remaining:</span>
            <span className="text-sm font-black text-emerald-400">
              {Math.round(stepRemainingMeters)} meters
            </span>
          </div>
        </div>

        {/* Big Instruction Text with High Contrast */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white leading-tight">
            {currentStep.instruction}
          </h2>

          {/* Barrier Warning */}
          {currentStep.barrierWarning && (
            <div className="p-3 bg-amber-950/60 border border-amber-500/80 rounded-xl text-amber-200 text-xs sm:text-sm font-semibold flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300">Accessibility Caution: </span>
                <span>{currentStep.barrierWarning}</span>
              </div>
            </div>
          )}
        </div>

        {/* Accessibility Badges for the Current Step */}
        <div className="flex flex-wrap gap-2 text-xs font-semibold pt-1">
          <span className="px-3 py-1.5 bg-slate-800/90 text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5">
            <span>🛣️ Surface:</span> <strong className="text-white">{currentStep.surface}</strong>
          </span>
          {currentStep.isStepFree && (
            <span className="px-3 py-1.5 bg-emerald-950/70 text-emerald-300 border border-emerald-800 rounded-xl flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Step-Free</span>
            </span>
          )}
          {currentStep.hasRamp && (
            <span className="px-3 py-1.5 bg-blue-950/70 text-blue-300 border border-blue-800 rounded-xl flex items-center gap-1.5">
              <span>📐 1:12 Ramp with Dual Rails</span>
            </span>
          )}
          {currentStep.hasElevator && (
            <span className="px-3 py-1.5 bg-purple-950/70 text-purple-300 border border-purple-800 rounded-xl flex items-center gap-1.5">
              <span>🛗 Tactile Button Elevator</span>
            </span>
          )}
          <button
            onClick={handleSpeakAccessibilityDetails}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white rounded-xl border border-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
            title="Read aloud surface texture, weather hazards, and ramp details"
          >
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span>Spoken Environmental Details</span>
          </button>
        </div>

        {/* Live Weather Obstacle Alert in Active Step if present */}
        {destination.weather.delayMinutes && destination.weather.delayMinutes > 0 && (
          <div className="p-3 bg-amber-950/70 border border-amber-500/80 rounded-xl text-amber-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">
                {destination.weather.hazardType === 'RAIN_SLIP' ? '🌧️' : destination.weather.hazardType === 'SNOW_ICE' ? '❄️' : '💨'}
              </span>
              <div>
                <span className="font-bold text-amber-300">Weather Obstacle Warning: </span>
                <span>{destination.weather.hazardTitle} (+{destination.weather.delayMinutes}m delay)</span>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-black text-[11px] shrink-0 border border-amber-500/40">
              Traction {destination.weather.surfaceTractionScore ?? 85}%
            </span>
          </div>
        )}

        {/* Step Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-[11px] font-semibold text-slate-400">
            <span>Journey Progress: {overallProgressPercent}% Complete</span>
            <span>{Math.round(completedMeters)}m / {totalDistanceMeters}m</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-emerald-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${overallProgressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Movement & Auto-Walk Engine Controls */}
      <div className="p-5 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${isMoving ? 'bg-emerald-600 text-white animate-pulse' : 'bg-slate-800 text-slate-300'}`}>
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Real-Time Turn-by-Turn Motion Tracking</span>
                {isMoving && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-[10px] font-black uppercase rounded-md">
                    Walking
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-400">
                Turn instructions automatically speak as you advance along the step-free path
              </p>
            </div>
          </div>

          {/* GPS Tracking Toggle */}
          <button
            onClick={() => setGpsActive(!gpsActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              gpsActive
                ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${gpsActive ? 'animate-pulse text-white' : 'text-slate-400'}`} />
            <span>{gpsActive ? 'GPS Active' : 'Enable Device GPS'}</span>
          </button>
        </div>

        {/* Live Simulation Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Play/Pause Movement */}
            <button
              onClick={() => {
                if (hasCompleted) {
                  handleResetNavigation();
                } else {
                  setIsMoving(!isMoving);
                  if (!isMoving && speechSettings.autoSpeakOnStepChange) {
                    handleSpeakCurrentStep();
                  }
                }
              }}
              className={`px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2.5 shadow-lg transition-all transform active:scale-95 ${
                hasCompleted
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : isMoving
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {hasCompleted ? (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Restart Journey</span>
                </>
              ) : isMoving ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause Movement</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Start Walking / Rolling</span>
                </>
              )}
            </button>

            {/* Repeat Audio Button */}
            <button
              onClick={handleSpeakCurrentStep}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl border border-slate-700 transition-colors"
              title="Repeat current audio instruction"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Simulation Speed presets */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="px-2 text-slate-400 font-semibold flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5" />
                <span>Pace:</span>
              </span>
              {[
                { speed: 0.8, label: 'Gentle (0.8 m/s)' },
                { speed: 1.2, label: 'Normal (1.2 m/s)' },
                { speed: 1.8, label: 'Fast (1.8 m/s)' },
              ].map(({ speed, label }) => (
                <button
                  key={speed}
                  onClick={() => setMovementSpeed(speed)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    movementSpeed === speed
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Step Scrubbing Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevStep}
              disabled={activeStepIndex === 0}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Step</span>
            </button>

            <button
              onClick={handleNextStep}
              disabled={activeStepIndex === totalSteps - 1}
              className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-md transition-colors"
            >
              <span>Next Step</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* GPS / Simulation Status Text */}
        <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/60 pt-2">
          <span>{gpsStatusText}</span>
          <span>Tip: Tap any step in the list below to jump and listen</span>
        </div>
      </div>

      {/* Turn-by-Turn Steps Interactive List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Complete Turn-by-Turn Route Instructions ({totalSteps} Segments)</span>
          </h4>
          <span className="text-xs text-slate-400">Click to listen & jump</span>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {route.steps.map((step, idx) => {
            const isActive = idx === activeStepIndex;
            const isPast = idx < activeStepIndex;

            return (
              <div
                key={idx}
                onClick={() => onStepChange(idx)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  isActive
                    ? 'border-blue-500 bg-blue-950/60 ring-2 ring-blue-500 shadow-lg'
                    : isPast
                    ? 'border-slate-800/80 bg-slate-950/40 opacity-75 hover:opacity-100 hover:border-slate-700'
                    : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                }`}
              >
                {/* Step number */}
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : isPast
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isPast ? '✓' : idx + 1}
                </div>

                {/* Instruction details */}
                <div className="space-y-1 grow">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-sm font-semibold ${
                        isActive ? 'text-white font-bold' : isPast ? 'text-slate-300' : 'text-slate-200'
                      }`}
                    >
                      {step.instruction}
                    </p>
                    <span className="text-xs text-slate-400 font-mono shrink-0">
                      {step.distanceMeters}m
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-400">
                    <span>Surface: {step.surface}</span>
                    {step.isStepFree && (
                      <span className="text-emerald-400 font-semibold">✓ Step-Free</span>
                    )}
                    {step.hasRamp && <span className="text-blue-400">📐 Ramp</span>}
                    {step.hasElevator && <span className="text-purple-400">🛗 Elevator</span>}
                  </div>

                  {step.barrierWarning && (
                    <div className="text-xs text-amber-400 font-semibold pt-0.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{step.barrierWarning}</span>
                    </div>
                  )}
                </div>

                {/* Listen button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStepChange(idx);
                    const formatted = formatStepForSpeech(step, idx, totalSteps);
                    voiceEngine.current?.speak(formatted, 'turn');
                  }}
                  className={`p-2 rounded-xl transition-all shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                  title="Read aloud this specific step"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Arrival Completion Banner */}
      {hasCompleted && (
        <div className="p-6 bg-emerald-950/70 border-2 border-emerald-500 rounded-3xl text-center space-y-3 animate-bounce-short">
          <div className="w-12 h-12 bg-emerald-600 text-white rounded-full mx-auto flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-white">
            You Have Arrived at {destination.name}!
          </h3>
          <p className="text-sm text-emerald-200 max-w-xl mx-auto">
            100% step-free route completed successfully. Verified ramp entrance, tactile guidance paths, and PRM assistance desks are ready at this site.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={handleResetNavigation}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md"
            >
              Restart Route
            </button>
            {onCloseNavigation && (
              <button
                onClick={onCloseNavigation}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
              >
                Exit Navigation
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
