import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DirectMessage } from '../../types';
import { Language } from '../../i18n/translations';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getVoiceMessageAudioUrl } from '../../services/firestoreService';

interface AudioMessageBubbleProps {
  message: DirectMessage;
  isMe: boolean;
}

interface AudioBubbleCopy {
  voiceMessage: string;
  playAria: string;
  pauseAria: string;
  replayAria: string;
  loading: string;
  loadError: string;
  retry: string;
}

const AUDIO_BUBBLE_COPY: Record<Language, AudioBubbleCopy> = {
  en: {
    voiceMessage: 'Voice message',
    playAria: 'Play voice message',
    pauseAria: 'Pause voice message',
    replayAria: 'Replay voice message',
    loading: 'Loading audio...',
    loadError: 'Unable to load voice message',
    retry: 'Retry',
  },
  hi: {
    voiceMessage: 'वॉइस संदेश',
    playAria: 'वॉइस संदेश सुनें',
    pauseAria: 'वॉइस संदेश रोकें',
    replayAria: 'फिर से सुनें',
    loading: 'ऑडियो लोड हो रहा है...',
    loadError: 'वॉइस संदेश चलाने में समस्या आई',
    retry: 'पुनः प्रयास करें',
  },
  or: {
    voiceMessage: 'ଭଏସ୍ ମେସେଜ୍',
    playAria: 'ଭଏସ୍ ମେସେଜ୍ ଶୁଣନ୍ତୁ',
    pauseAria: 'ଭଏସ୍ ମେସେଜ୍ ଅଟକାନ୍ତୁ',
    replayAria: 'ପୁଣି ଶୁଣନ୍ତୁ',
    loading: 'ଅଡିଓ ଲୋଡ୍ ହେଉଛି...',
    loadError: 'ଭଏସ୍ ମେସେଜ୍ ଚଲାଇବାରେ ଅସୁବିଧା ହେଲା',
    retry: 'ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ',
  },
};

const AUDIO_PLAY_EVENT = 'janmasaathi:audio-play';

function formatAudioSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.floor(sec);
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
}

function buildWaveformBars(seedId: string, count = 24): number[] {
  let hash = 2166136261;
  for (let i = 0; i < seedId.length; i++) {
    hash ^= seedId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    hash = Math.imul(hash ^ (i + 17), 16777619);
    const normalized = (Math.abs(hash) % 70) + 25; // 25% to 95% height
    bars.push(normalized);
  }
  return bars;
}

function requiresAuthenticatedFetch(msg: DirectMessage): boolean {
  if (msg.audioStoragePath?.startsWith('voiceMessages/')) return true;
  if (msg.audioDownloadUrl?.startsWith('/api/voice-messages/audio/')) return true;
  return false;
}

export const AudioMessageBubble: React.FC<AudioMessageBubbleProps> = ({ message, isMe }) => {
  const { language, formatNumber } = useLanguage();
  const { isAuthLoading } = useAuth();
  const copy = AUDIO_BUBBLE_COPY[language] || AUDIO_BUBBLE_COPY.en;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const refreshedOnceRef = useRef(false);
  const blobUrlRef = useRef<string | null>(null);

  const needsAuthFetch = requiresAuthenticatedFetch(message);
  const initialDirectUrl = !needsAuthFetch && message.audioDownloadUrl ? message.audioDownloadUrl : null;

  const [audioSrc, setAudioSrc] = useState<string | null>(initialDirectUrl);
  const [isLoadingUrl, setIsLoadingUrl] = useState<boolean>(
    !initialDirectUrl && Boolean(message.audioStoragePath || message.audioDownloadUrl)
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(
    typeof message.audioDuration === 'number' && message.audioDuration > 0 ? message.audioDuration : 0
  );
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const bars = useMemo(() => buildWaveformBars(message.id || 'voice'), [message.id]);

  const applyAudioSrc = (nextUrl: string | null) => {
    if (blobUrlRef.current && blobUrlRef.current !== nextUrl && blobUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if (nextUrl && nextUrl.startsWith('blob:')) {
      blobUrlRef.current = nextUrl;
    }
    setAudioSrc(nextUrl);
  };

  // Sync external direct URL only if it does not require authenticated fetch
  useEffect(() => {
    if (!needsAuthFetch && message.audioDownloadUrl && !audioSrc) {
      applyAudioSrc(message.audioDownloadUrl);
      setIsLoadingUrl(false);
    }
  }, [needsAuthFetch, message.audioDownloadUrl, audioSrc]);

  const formatStorageError = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err || '');
    const lower = raw.toLowerCase();
    if (lower.includes('404') || lower.includes('does not exist') || lower.includes('object-not-found')) {
      return `${copy.loadError} (Audio file unavailable)`;
    }
    if (lower.includes('unauthorized') || lower.includes('401') || lower.includes('403')) {
      return `${copy.loadError} (Session authorization error)`;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return `${copy.loadError} (Offline)`;
    }
    return copy.loadError;
  };

  // Fetch authenticated Blob URL (or Firebase Storage URL) once auth resolution completes
  useEffect(() => {
    let cancelled = false;
    if (isAuthLoading) return;
    if (!audioSrc && (message.audioStoragePath || message.audioDownloadUrl)) {
      setIsLoadingUrl(true);
      getVoiceMessageAudioUrl(message.audioStoragePath || '', message.audioDownloadUrl)
        .then((url) => {
          if (!cancelled) {
            applyAudioSrc(url);
            setErrorMsg(null);
          } else if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setErrorMsg(formatStorageError(err));
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoadingUrl(false);
          }
        });
    }
    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, audioSrc, message.audioStoragePath, message.audioDownloadUrl, copy.loadError]);

  // Pause this player if another AudioMessageBubble starts playing
  useEffect(() => {
    const handleGlobalPlay = (e: Event) => {
      const custom = e as CustomEvent<{ messageId?: string }>;
      if (custom.detail?.messageId && custom.detail.messageId !== message.id) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      }
    };
    window.addEventListener(AUDIO_PLAY_EVENT, handleGlobalPlay);
    return () => {
      window.removeEventListener(AUDIO_PLAY_EVENT, handleGlobalPlay);
    };
  }, [message.id]);

  // Clean up audio element & blob URL on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  const refreshStorageUrl = async (): Promise<string | null> => {
    if (!message.audioStoragePath && !message.audioDownloadUrl) return null;
    try {
      setIsLoadingUrl(true);
      const freshUrl = await getVoiceMessageAudioUrl(
        message.audioStoragePath || '',
        message.audioDownloadUrl
      );
      applyAudioSrc(freshUrl);
      setErrorMsg(null);
      return freshUrl;
    } catch (err) {
      setErrorMsg(formatStorageError(err));
      return null;
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleTogglePlay = async () => {
    setErrorMsg(null);
    let activeSrc = audioSrc;

    if (!activeSrc && message.audioStoragePath) {
      activeSrc = await refreshStorageUrl();
    }

    if (!activeSrc || !audioRef.current) {
      setErrorMsg(copy.loadError);
      return;
    }

    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      if (audio.readyState === 0 || audio.error) {
        audio.load();
      }
      if (hasEnded || (duration > 0 && audio.currentTime >= duration - 0.1)) {
        audio.currentTime = 0;
        setCurrentTime(0);
        setHasEnded(false);
      }
      audio.playbackRate = playbackRate;
      window.dispatchEvent(new CustomEvent(AUDIO_PLAY_EVENT, { detail: { messageId: message.id } }));
      await audio.play();
      setIsPlaying(true);
    } catch (playErr) {
      if (!refreshedOnceRef.current && message.audioStoragePath) {
        refreshedOnceRef.current = true;
        const freshUrl = await refreshStorageUrl();
        if (freshUrl && audioRef.current) {
          try {
            audioRef.current.src = freshUrl;
            audioRef.current.load();
            await audioRef.current.play();
            setIsPlaying(true);
            return;
          } catch (retryErr) {
            setIsPlaying(false);
            setErrorMsg(formatStorageError(retryErr));
            return;
          }
        }
      }
      setIsPlaying(false);
      setErrorMsg(formatStorageError(playErr));
    }
  };

  const handleAudioError = async () => {
    setIsPlaying(false);
    if (!refreshedOnceRef.current && message.audioStoragePath) {
      refreshedOnceRef.current = true;
      await refreshStorageUrl();
      return;
    }
    setErrorMsg(copy.loadError);
  };

  const handleSeekBar = (fraction: number) => {
    const targetDuration = duration || message.audioDuration || 0;
    if (!audioRef.current || targetDuration <= 0) return;
    const clamped = Math.max(0, Math.min(1, fraction));
    const nextTime = clamped * targetDuration;
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
    setHasEnded(false);
  };

  const togglePlaybackSpeed = () => {
    const nextRate: 1 | 1.5 = playbackRate === 1 ? 1.5 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const effectiveDuration = duration > 0 ? duration : message.audioDuration || 0;
  const progressRatio =
    effectiveDuration > 0 ? Math.min(1, Math.max(0, currentTime / effectiveDuration)) : 0;

  return (
    <div
      className={`max-w-[88%] min-w-[235px] sm:min-w-[270px] px-3 py-2.5 rounded-2xl transition-colors ${
        isMe
          ? 'bg-[#890149] text-[#F3F3E7] rounded-br-none shadow-sm'
          : 'bg-[#F3F3E7] text-[#30232A] rounded-bl-none border border-[#D9A2B5]/70 shadow-xs'
      }`}
    >
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="metadata"
          playsInline
          onCanPlay={() => setErrorMsg(null)}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) {
              setDuration(d);
            }
          }}
          onTimeUpdate={(e) => {
            setCurrentTime(e.currentTarget.currentTime);
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0 && d !== duration) {
              setDuration(d);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setHasEnded(true);
            setCurrentTime(effectiveDuration);
          }}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onError={handleAudioError}
        />
      )}

      <div className="flex items-center gap-2.5">
        {/* Play / Pause / Replay Control */}
        <button
          type="button"
          onClick={handleTogglePlay}
          disabled={isLoadingUrl}
          aria-label={
            isPlaying ? copy.pauseAria : hasEnded ? copy.replayAria : copy.playAria
          }
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer disabled:opacity-60 ${
            isMe
              ? 'bg-[#F3F3E7] text-[#890149] shadow-xs'
              : 'bg-[#890149] text-[#F3F3E7] shadow-xs'
          }`}
        >
          {isLoadingUrl ? (
            <span
              className={`w-4 h-4 rounded-full border-2 border-t-transparent animate-spin ${
                isMe ? 'border-[#890149]' : 'border-[#F3F3E7]'
              }`}
            />
          ) : (
            <span className="material-symbols-outlined text-[21px]">
              {isPlaying ? 'pause' : hasEnded ? 'replay' : 'play_arrow'}
            </span>
          )}
        </button>

        {/* Interactive Waveform & Duration */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div
            className="flex items-center gap-[2px] h-7 cursor-pointer select-none"
            role="slider"
            aria-label={copy.voiceMessage}
            aria-valuemin={0}
            aria-valuemax={Math.round(effectiveDuration)}
            aria-valuenow={Math.round(currentTime)}
            tabIndex={0}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (rect.width > 0) {
                handleSeekBar((e.clientX - rect.left) / rect.width);
              }
            }}
          >
            {bars.map((heightPct, idx) => {
              const barProgress = (idx + 1) / bars.length;
              const isFilled = progressRatio > 0 && barProgress <= progressRatio;
              return (
                <span
                  key={idx}
                  style={{ height: `${heightPct}%` }}
                  className={`flex-1 rounded-full transition-colors duration-150 ${
                    isMe
                      ? isFilled
                        ? 'bg-[#F3F3E7]'
                        : 'bg-[#D9A2B5]/55'
                      : isFilled
                      ? 'bg-[#890149]'
                      : 'bg-[#D9A2B5]/85'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono leading-none">
            <span className={isMe ? 'text-[#F3F3E7]/90' : 'text-[#30232A]/80'}>
              {isPlaying || currentTime > 0
                ? `${formatNumber(formatAudioSeconds(currentTime))} / ${formatNumber(formatAudioSeconds(effectiveDuration))}`
                : formatNumber(formatAudioSeconds(effectiveDuration))}
            </span>

            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-0.5 text-[10px] font-sans ${
                  isMe ? 'text-[#D9A2B5]' : 'text-[#890149]'
                }`}
              >
                <span className="material-symbols-outlined text-[12px]">mic</span>
                <span>{copy.voiceMessage}</span>
              </span>
              <button
                type="button"
                onClick={togglePlaybackSpeed}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                  isMe
                    ? 'bg-white/15 text-[#F3F3E7] hover:bg-white/25'
                    : 'bg-[#D9A2B5]/35 text-[#30232A] hover:bg-[#D9A2B5]/60'
                }`}
                title="Playback speed"
              >
                {playbackRate}x
              </button>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div
          className={`mt-2 pt-1.5 border-t text-[10px] flex items-center justify-between gap-2 ${
            isMe ? 'border-white/20 text-[#F3F3E7]' : 'border-[#D9A2B5]/60 text-[#890149]'
          }`}
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={async () => {
              refreshedOnceRef.current = false;
              setErrorMsg(null);
              await refreshStorageUrl();
            }}
            className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
              isMe ? 'bg-[#F3F3E7] text-[#890149]' : 'bg-[#890149] text-[#F3F3E7]'
            }`}
          >
            {copy.retry}
          </button>
        </div>
      )}
    </div>
  );
};
