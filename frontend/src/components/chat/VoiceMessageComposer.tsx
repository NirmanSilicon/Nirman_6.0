import React, { useEffect, useRef, useState } from 'react';
import { Language } from '../../i18n/translations';
import { useLanguage } from '../../context/LanguageContext';

export interface VoiceMessageComposerProps {
  value: string;
  onChange: (nextValue: string) => void;
  onSendText: (meta: { text: string; sourceLanguage: Language }) => Promise<void> | void;
  onSendVoice: (params: {
    blob: Blob;
    mimeType: string;
    durationSeconds: number;
    onProgress: (percent: number) => void;
  }) => Promise<void>;
  placeholder: string;
  sendAriaLabel: string;
  disabled?: boolean;
}

type RecorderPhase = 'idle' | 'recording' | 'paused' | 'preview' | 'uploading' | 'error';
type PreviewVerificationStatus = 'verifying' | 'ready' | 'error';

interface RecordedPreview {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
  objectUrl: string;
}

interface ComposerCopy {
  micAria: string;
  micOfflineTitle: string;
  offlineNotice: string;
  offlinePreviewNotice: string;
  recording: string;
  paused: string;
  pause: string;
  resume: string;
  stop: string;
  cancel: string;
  previewLabel: string;
  verifyingPreview: string;
  previewReadyLabel: string;
  unplayablePreviewErr: string;
  playPreview: string;
  pausePreview: string;
  deleteRecording: string;
  reRecord: string;
  sendVoiceMessage: string;
  uploadingLabel: string;
  retry: string;
  dismiss: string;
  cancelledNotice: string;
  shortRecordingErr: string;
  recorderFailedErr: string;
  permDeniedErr: string;
  noMicErr: string;
  uploadErr: string;
  unsupportedBrowserErr: string;
}

const COMPOSER_COPY: Record<Language, ComposerCopy> = {
  en: {
    micAria: 'Record voice message',
    micOfflineTitle: 'Voice upload requires internet connection',
    offlineNotice:
      'Voice messages require an internet connection to upload and send. You can continue typing and sending text messages offline.',
    offlinePreviewNotice:
      'Internet disconnected. Your voice clip is temporarily kept in this session — reconnect and tap Send Voice when online.',
    recording: 'Recording voice...',
    paused: 'Paused',
    pause: 'Pause',
    resume: 'Resume',
    stop: 'Stop',
    cancel: 'Cancel',
    previewLabel: 'Voice preview',
    verifyingPreview: 'Verifying audio...',
    previewReadyLabel: 'Ready to send',
    unplayablePreviewErr: 'Recorded audio could not be decoded for playback. Please tap Re-record.',
    playPreview: 'Play preview',
    pausePreview: 'Pause preview',
    deleteRecording: 'Delete',
    reRecord: 'Re-record',
    sendVoiceMessage: 'Send Voice',
    uploadingLabel: 'Sending voice message...',
    retry: 'Retry',
    dismiss: 'Dismiss',
    cancelledNotice: 'Voice recording cancelled.',
    shortRecordingErr: 'Recording was too short or empty. Please speak near the microphone and try again.',
    recorderFailedErr: 'Audio recording failed unexpectedly. Please check your microphone and try again.',
    permDeniedErr:
      'Microphone permission was denied. Please allow microphone access in your browser settings and try again.',
    noMicErr: 'No microphone was found or it is currently in use by another app.',
    uploadErr: 'Could not send voice message. Please check your connection and tap Retry.',
    unsupportedBrowserErr: 'Audio recording is not supported on this browser.',
  },
  hi: {
    micAria: 'वॉइस संदेश रिकॉर्ड करें',
    micOfflineTitle: 'वॉइस संदेश भेजने के लिए इंटरनेट ज़रूरी है',
    offlineNotice:
      'वॉइस संदेश अपलोड करने और भेजने के लिए इंटरनेट कनेक्शन आवश्यक है। आप ऑफ़लाइन भी टेक्स्ट संदेश लिखकर भेज सकते हैं।',
    offlinePreviewNotice:
      'इंटरनेट बंद है। आपकी वॉइस रिकॉर्डिंग इस सत्र में अस्थायी रूप से सुरक्षित है — ऑनलाइन होने पर वॉइस भेजें पर टैप करें।',
    recording: 'आवाज़ रिकॉर्ड हो रही है...',
    paused: 'रुका हुआ',
    pause: 'रोकें',
    resume: 'जारी रखें',
    stop: 'बंद करें',
    cancel: 'रद्द करें',
    previewLabel: 'वॉइस प्रीव्यू',
    verifyingPreview: 'ऑडियो जाँचा जा रहा है...',
    previewReadyLabel: 'भेजने के लिए तैयार',
    unplayablePreviewErr: 'रिकॉर्ड किया गया ऑडियो प्ले नहीं हो सका। कृपया फिर रिकॉर्ड करें।',
    playPreview: 'प्रीव्यू सुनें',
    pausePreview: 'प्रीव्यू रोकें',
    deleteRecording: 'हटाएं',
    reRecord: 'फिर रिकॉर्ड करें',
    sendVoiceMessage: 'वॉइस भेजें',
    uploadingLabel: 'वॉइस संदेश भेजा जा रहा है...',
    retry: 'फिर से कोशिश करें',
    dismiss: 'बंद करें',
    cancelledNotice: 'वॉइस रिकॉर्डिंग रद्द की गई।',
    shortRecordingErr: 'रिकॉर्डिंग बहुत छोटी या खाली थी। कृपया माइक के पास बोलकर फिर से कोशिश करें।',
    recorderFailedErr: 'ऑडियो रिकॉर्डिंग में तकनीकी त्रुटि आई। कृपया माइक्रोफ़ोन जांचकर पुनः प्रयास करें।',
    permDeniedErr:
      'माइक्रोफ़ोन की अनुमति अस्वीकार की गई। कृपया ब्राउज़र सेटिंग्स में माइक्रोफ़ोन की अनुमति दें।',
    noMicErr: 'कोई माइक्रोफ़ोन नहीं मिला या यह किसी अन्य ऐप में उपयोग हो रहा है।',
    uploadErr: 'वॉइस संदेश नहीं भेजा जा सका। कृपया नेटवर्क जांचें और फिर कोशिश करें।',
    unsupportedBrowserErr: 'इस ब्राउज़र में ऑडियो रिकॉर्डिंग समर्थित नहीं है।',
  },
  or: {
    micAria: 'ଭଏସ୍ ମେସେଜ୍ ରେକର୍ଡ କରନ୍ତୁ',
    micOfflineTitle: 'ଭଏସ୍ ମେସେଜ୍ ପଠାଇବା ପାଇଁ ଇଣ୍ଟରନେଟ୍ ଆବଶ୍ୟକ',
    offlineNotice:
      'ଭଏସ୍ ମେସେଜ୍ ଅପଲୋଡ୍ ଏବଂ ପଠାଇବା ପାଇଁ ଇଣ୍ଟରନେଟ୍ ସଂଯୋଗ ଆବଶ୍ୟକ। ଆପଣ ଅଫଲାଇନ୍‌ରେ ମଧ୍ୟ ଟେକ୍ସଟ୍ ମେସେଜ୍ ପଠାଇପାରିବେ।',
    offlinePreviewNotice:
      'ଇଣ୍ଟରନେଟ୍ ସଂଯୋଗ ନାହିଁ। ଆପଣଙ୍କ ଭଏସ୍ କ୍ଲିପ୍ ଅସ୍ଥାୟୀ ଭାବେ ରହିଛି — ଅନଲାଇନ୍ ହେଲେ ଭଏସ୍ ପଠାନ୍ତୁ ଉପରେ ଟାପ୍ କରନ୍ତୁ।',
    recording: 'ଭଏସ୍ ରେକର୍ଡ ହେଉଛି...',
    paused: 'ଅଟକିଛି',
    pause: 'ଅଟକାନ୍ତୁ',
    resume: 'ଆଗକୁ ବଢ଼ାନ୍ତୁ',
    stop: 'ବନ୍ଦ କରନ୍ତୁ',
    cancel: 'ବାତିଲ୍',
    previewLabel: 'ଭଏସ୍ ପ୍ରିଭ୍ୟୁ',
    verifyingPreview: 'ଅଡିଓ ଯାଞ୍ଚ ହେଉଛି...',
    previewReadyLabel: 'ପଠାଇବା ପାଇଁ ପ୍ରସ୍ତୁତ',
    unplayablePreviewErr: 'ରେକର୍ଡ ହୋଇଥିବା ଅଡିଓ ପ୍ଲେ ହୋଇପାରିଲା ନାହିଁ। ଦୟାକରି ପୁଣି ରେକର୍ଡ କରନ୍ତୁ।',
    playPreview: 'ପ୍ରିଭ୍ୟୁ ଶୁଣନ୍ତୁ',
    pausePreview: 'ପ୍ରିଭ୍ୟୁ ଅଟକାନ୍ତୁ',
    deleteRecording: 'ଡିଲିଟ୍',
    reRecord: 'ପୁଣି ରେକର୍ଡ କରନ୍ତୁ',
    sendVoiceMessage: 'ଭଏସ୍ ପଠାନ୍ତୁ',
    uploadingLabel: 'ଭଏସ୍ ମେସେଜ୍ ପଠାଯାଉଛି...',
    retry: 'ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ',
    dismiss: 'ବନ୍ଦ କରନ୍ତୁ',
    cancelledNotice: 'ଭଏସ୍ ରେକର୍ଡିଂ ବାତିଲ୍ କରାଗଲା।',
    shortRecordingErr: 'ରେକର୍ଡିଂ ବହୁତ ଛୋଟ କିମ୍ବା ଖାଲି ଥିଲା। ଦୟାକରି ମାଇକ୍ ପାଖରେ କହି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
    recorderFailedErr: 'ଅଡିଓ ରେକର୍ଡିଂ ବିଫଳ ହେଲା। ଦୟାକରି ମାଇକ୍ରୋଫୋନ୍ ଯାଞ୍ଚ କରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
    permDeniedErr:
      'ମାଇକ୍ରୋଫୋନ୍ ଅନୁମତି ମିଳିଲା ନାହିଁ। ଦୟାକରି ବ୍ରାଉଜର୍ ସେଟିଂରେ ମାଇକ୍ରୋଫୋନ୍ ଅନୁମତି ଦିଅନ୍ତୁ।',
    noMicErr: 'ମାଇକ୍ରୋଫୋନ୍ ମିଳିଲା ନାହିଁ କିମ୍ବା ଅନ୍ୟ ଆପ୍‌ରେ ବ୍ୟବହୃତ ହେଉଛି।',
    uploadErr: 'ଭଏସ୍ ମେସେଜ୍ ପଠାଯାଇପାରିଲା ନାହିଁ। ଦୟାକରି ଇଣ୍ଟରନେଟ୍ ଯାଞ୍ଚ କରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
    unsupportedBrowserErr: 'ଏହି ବ୍ରାଉଜର୍‌ରେ ଅଡିଓ ରେକର୍ଡିଂ ଉପଲବ୍ଧ ନାହିଁ।',
  },
};

function formatDuration(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function selectSupportedAudioMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  return candidates.find((mime) => {
    try {
      return MediaRecorder.isTypeSupported(mime);
    } catch {
      return false;
    }
  });
}

export const VoiceMessageComposer: React.FC<VoiceMessageComposerProps> = ({
  value,
  onChange,
  onSendText,
  onSendVoice,
  placeholder,
  sendAriaLabel,
  disabled = false,
}) => {
  const { language, formatNumber } = useLanguage();
  const copy = COMPOSER_COPY[language] || COMPOSER_COPY.en;

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [phase, setPhase] = useState<RecorderPhase>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [canPauseResume, setCanPauseResume] = useState(false);
  const [preview, setPreview] = useState<RecordedPreview | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewVerificationStatus>('verifying');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSendingText, setIsSendingText] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const cancelFlagRef = useRef(false);
  const errorFlagRef = useRef(false);
  const isPausedRef = useRef(false);
  const accumulatedMsRef = useRef(0);
  const segmentStartMsRef = useRef<number | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const sendingLockRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-resize text box cleanly up to 3 lines
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [value]);

  // Verify local preview element reaches playable state without hanging
  useEffect(() => {
    if (phase !== 'preview' || !preview || previewStatus !== 'verifying') return;
    const timeoutId = window.setTimeout(() => {
      const audio = previewAudioRef.current;
      if (audio && !audio.error && audio.readyState >= 1) {
        setPreviewStatus('ready');
      } else if (preview.blob.size >= 250 && preview.mimeType.startsWith('audio/')) {
        // Fallback when browser defers full metadata decode until play() is tapped
        setPreviewStatus('ready');
      }
    }, 1200);
    return () => window.clearTimeout(timeoutId);
  }, [phase, preview, previewStatus]);

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const getElapsedMs = (): number => {
    if (isPausedRef.current || segmentStartMsRef.current === null) {
      return accumulatedMsRef.current;
    }
    return accumulatedMsRef.current + Math.max(0, Date.now() - segmentStartMsRef.current);
  };

  const stopMediaTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const releaseMediaResources = () => {
    stopTimer();
    isPausedRef.current = false;
    segmentStartMsRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null;
    stopMediaTracks();
    audioChunksRef.current = [];
  };

  const revokePreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    setIsPreviewPlaying(false);
    setPreviewProgress(0);
    setPreviewStatus('verifying');
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreview(null);
  };

  useEffect(() => {
    return () => {
      cancelFlagRef.current = true;
      releaseMediaResources();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    if (disabled || phase === 'recording' || phase === 'paused' || phase === 'uploading') {
      return;
    }

    if (!isOnline) {
      setPhase('error');
      setStatusMessage(copy.offlineNotice);
      return;
    }

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setPhase('error');
      setStatusMessage(copy.unsupportedBrowserErr);
      return;
    }

    revokePreview();
    cancelFlagRef.current = false;
    errorFlagRef.current = false;
    isPausedRef.current = false;
    accumulatedMsRef.current = 0;
    segmentStartMsRef.current = null;
    setRecordingSeconds(0);
    setStatusMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const preferredMime = selectSupportedAudioMime();
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      setCanPauseResume(
        typeof recorder.pause === 'function' && typeof recorder.resume === 'function'
      );

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        errorFlagRef.current = true;
        releaseMediaResources();
        setPhase('error');
        setStatusMessage(copy.recorderFailedErr);
      };

      recorder.onstop = () => {
        const chunks = [...audioChunksRef.current];
        const chunkMime = chunks.find((c) => c.type)?.type;
        const finalMime = (recorder.mimeType || chunkMime || preferredMime || 'audio/webm').trim();
        const elapsedMs = getElapsedMs();
        const finalSeconds = Math.max(1, Math.round(elapsedMs / 1000));

        stopTimer();
        isPausedRef.current = false;
        segmentStartMsRef.current = null;
        stopMediaTracks();
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];

        if (cancelFlagRef.current || errorFlagRef.current) {
          return;
        }

        if (!chunks.length) {
          setPhase('error');
          setStatusMessage(copy.shortRecordingErr);
          return;
        }

        const audioBlob = new Blob(chunks, { type: finalMime });
        if (audioBlob.size < 250) {
          setPhase('error');
          setStatusMessage(copy.shortRecordingErr);
          return;
        }

        if (!audioBlob.type.startsWith('audio/')) {
          setPhase('error');
          setStatusMessage(copy.recorderFailedErr);
          return;
        }

        const objectUrl = URL.createObjectURL(audioBlob);
        previewUrlRef.current = objectUrl;
        setPreviewStatus('verifying');
        setPreview({
          blob: audioBlob,
          mimeType: finalMime,
          durationSeconds: finalSeconds,
          objectUrl,
        });
        setPhase('preview');
      };

      recorder.start(250);
      segmentStartMsRef.current = Date.now();
      setPhase('recording');

      timerRef.current = window.setInterval(() => {
        if (isPausedRef.current) return;
        const elapsedSec = Math.floor(getElapsedMs() / 1000);
        setRecordingSeconds(elapsedSec);
        if (elapsedSec >= 120) {
          stopRecording();
        }
      }, 200);
    } catch (err: any) {
      releaseMediaResources();
      const errName = err?.name || '';
      setPhase('error');
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setStatusMessage(copy.permDeniedErr);
      } else {
        setStatusMessage(copy.noMicErr);
      }
    }
  };

  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording' || typeof recorder.pause !== 'function') {
      return;
    }
    try {
      accumulatedMsRef.current = getElapsedMs();
      segmentStartMsRef.current = null;
      recorder.pause();
      isPausedRef.current = true;
      setPhase('paused');
    } catch {
      // ignore if browser blocks pause
    }
  };

  const resumeRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'paused' || typeof recorder.resume !== 'function') {
      return;
    }
    try {
      recorder.resume();
      isPausedRef.current = false;
      segmentStartMsRef.current = Date.now();
      setPhase('recording');
    } catch {
      // ignore
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        accumulatedMsRef.current = getElapsedMs();
        segmentStartMsRef.current = null;
        recorder.stop();
      } catch {
        releaseMediaResources();
        setPhase('idle');
      }
    }
  };

  const cancelRecording = () => {
    cancelFlagRef.current = true;
    releaseMediaResources();
    revokePreview();
    accumulatedMsRef.current = 0;
    setRecordingSeconds(0);
    setPhase('idle');
    setStatusMessage(copy.cancelledNotice);
    window.setTimeout(() => {
      setStatusMessage((prev) => (prev === copy.cancelledNotice ? null : prev));
    }, 2200);
  };

  const handleTogglePreviewPlay = async () => {
    const audio = previewAudioRef.current;
    if (!audio || !preview) return;
    if (isPreviewPlaying) {
      audio.pause();
      setIsPreviewPlaying(false);
    } else {
      try {
        if (audio.ended) {
          audio.currentTime = 0;
        }
        await audio.play();
        setIsPreviewPlaying(true);
        setPreviewStatus('ready');
      } catch {
        setIsPreviewPlaying(false);
        setPreviewStatus('error');
        setStatusMessage(copy.unplayablePreviewErr);
      }
    }
  };

  const handlePreviewSeek = (fraction: number) => {
    const audio = previewAudioRef.current;
    if (!audio || !preview) return;
    const total =
      Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : preview.durationSeconds;
    if (total <= 0) return;
    const clamped = Math.max(0, Math.min(1, fraction));
    audio.currentTime = clamped * total;
    setPreviewProgress(clamped * 100);
  };

  const handleDeletePreview = () => {
    revokePreview();
    setPhase('idle');
    setStatusMessage(null);
  };

  const handleReRecord = () => {
    revokePreview();
    setPhase('idle');
    setStatusMessage(null);
    startRecording();
  };

  const handleSendVoiceClick = async () => {
    if (!preview || phase === 'uploading' || disabled || sendingLockRef.current) return;

    if (previewStatus === 'error') {
      setStatusMessage(copy.unplayablePreviewErr);
      return;
    }

    if (!isOnline) {
      setStatusMessage(copy.offlinePreviewNotice);
      return;
    }

    if (previewAudioRef.current && !previewAudioRef.current.paused) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    }

    sendingLockRef.current = true;
    setPhase('uploading');
    setUploadProgress(5);
    setStatusMessage(null);

    try {
      await onSendVoice({
        blob: preview.blob,
        mimeType: preview.mimeType,
        durationSeconds: preview.durationSeconds,
        onProgress: (pct) => setUploadProgress(Math.max(5, pct)),
      });
      revokePreview();
      setUploadProgress(0);
      setPhase('idle');
      setStatusMessage(null);
    } catch (err: any) {
      setPhase('preview');
      setUploadProgress(0);
      setStatusMessage(err?.message || copy.uploadErr);
    } finally {
      sendingLockRef.current = false;
    }
  };

  const handleSubmitText = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isSendingText || disabled) return;

    setIsSendingText(true);
    try {
      await onSendText({
        text: trimmed,
        sourceLanguage: language,
      });
    } finally {
      setIsSendingText(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitText();
    }
  };

  const isRecordingOrPaused = phase === 'recording' || phase === 'paused';
  const sendDisabled =
    disabled || !isOnline || previewStatus === 'error' || previewStatus === 'verifying';

  return (
    <div className="w-full space-y-1.5">
      {/* Offline Banner */}
      {!isOnline && phase !== 'error' && (
        <div
          className="px-2.5 py-1.5 rounded-lg bg-[#F3F3E7] border border-[#D9A2B5]/70 text-[#30232A] text-[11px] flex items-center gap-1.5"
          role="status"
        >
          <span className="material-symbols-outlined text-[15px] text-[#890149] shrink-0">
            wifi_off
          </span>
          <span className="leading-snug">
            {preview ? copy.offlinePreviewNotice : copy.offlineNotice}
          </span>
        </div>
      )}

      {/* Recording / Paused Bar */}
      {isRecordingOrPaused && (
        <div
          className="px-3 py-2 rounded-xl bg-[#F3F3E7] border border-[#890149]/45 text-[#30232A] flex flex-wrap items-center justify-between gap-2 shadow-xs"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                phase === 'recording' ? 'bg-[#890149] animate-ping' : 'bg-[#D9A2B5]'
              }`}
            />
            <span className="text-xs font-semibold text-[#890149] truncate">
              {phase === 'paused' ? copy.paused : copy.recording}
            </span>
            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-[#D9A2B5]/35 text-[#30232A]">
              {formatNumber(formatDuration(recordingSeconds))}
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {canPauseResume && (
              <button
                type="button"
                onClick={phase === 'paused' ? resumeRecording : pauseRecording}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-[#D9A2B5] text-[#30232A] hover:bg-[#D9A2B5]/20 flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {phase === 'paused' ? 'play_arrow' : 'pause'}
                </span>
                <span>{phase === 'paused' ? copy.resume : copy.pause}</span>
              </button>
            )}
            <button
              type="button"
              onClick={cancelRecording}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-[#D9A2B5] text-[#30232A] hover:bg-[#D9A2B5]/20 cursor-pointer"
            >
              {copy.cancel}
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#890149] text-[#F3F3E7] hover:opacity-95 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">stop_circle</span>
              <span>{copy.stop}</span>
            </button>
          </div>
        </div>
      )}

      {/* Pre-Send Voice Preview Bar (Listen, Verify Playability, Delete, Re-record, Send Voice) */}
      {(phase === 'preview' || phase === 'uploading') && preview && (
        <div className="px-3 py-2.5 rounded-xl bg-[#F3F3E7] border border-[#890149]/35 text-[#30232A] space-y-2 shadow-xs">
          <audio
            ref={previewAudioRef}
            src={preview.objectUrl}
            preload="metadata"
            playsInline
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) {
                setPreview((prev) =>
                  prev ? { ...prev, durationSeconds: Math.max(1, Math.round(d)) } : prev
                );
              }
              if (e.currentTarget.readyState >= 1 && preview.blob.size >= 250) {
                setPreviewStatus('ready');
              }
            }}
            onCanPlay={() => {
              setPreviewStatus('ready');
            }}
            onTimeUpdate={(e) => {
              const d =
                Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0
                  ? e.currentTarget.duration
                  : preview.durationSeconds;
              if (d > 0) {
                setPreviewProgress(Math.min(100, (e.currentTarget.currentTime / d) * 100));
              }
            }}
            onEnded={() => {
              setIsPreviewPlaying(false);
              setPreviewProgress(0);
            }}
            onPause={() => setIsPreviewPlaying(false)}
            onError={() => {
              setIsPreviewPlaying(false);
              setPreviewStatus('error');
              setStatusMessage(copy.unplayablePreviewErr);
            }}
          />

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleTogglePreviewPlay}
              disabled={phase === 'uploading' || previewStatus === 'error'}
              aria-label={isPreviewPlaying ? copy.pausePreview : copy.playPreview}
              className="w-9 h-9 rounded-full bg-[#890149] text-[#F3F3E7] flex items-center justify-center shrink-0 cursor-pointer hover:opacity-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[19px]">
                {isPreviewPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between text-[11px] gap-2">
                <span className="font-semibold text-[#890149] flex items-center gap-1 truncate">
                  <span className="material-symbols-outlined text-[13px]">graphic_eq</span>
                  <span>
                    {previewStatus === 'verifying'
                      ? copy.verifyingPreview
                      : previewStatus === 'error'
                      ? copy.previewLabel
                      : `${copy.previewLabel} • ${copy.previewReadyLabel}`}
                  </span>
                </span>
                <span className="font-mono text-[10px] text-[#30232A]/80 shrink-0">
                  {formatNumber(formatDuration(preview.durationSeconds))} • {formatFileSize(preview.blob.size)}
                </span>
              </div>

              <div
                className="w-full h-2 rounded-full bg-[#D9A2B5]/45 overflow-hidden cursor-pointer"
                role="slider"
                aria-label={copy.previewLabel}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(phase === 'uploading' ? uploadProgress : previewProgress)}
                onClick={(e) => {
                  if (phase === 'uploading') return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (rect.width > 0) {
                    handlePreviewSeek((e.clientX - rect.left) / rect.width);
                  }
                }}
              >
                <div
                  className="h-full bg-[#890149] transition-all duration-150"
                  style={{ width: `${phase === 'uploading' ? uploadProgress : previewProgress}%` }}
                />
              </div>
            </div>
          </div>

          {phase === 'uploading' ? (
            <div className="flex items-center justify-between text-[11px] text-[#890149] font-medium">
              <span>{copy.uploadingLabel}</span>
              <span className="font-mono font-bold">{uploadProgress}%</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDeletePreview}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-[#D9A2B5] text-[#30232A] hover:bg-[#D9A2B5]/20 flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  <span>{copy.deleteRecording}</span>
                </button>
                <button
                  type="button"
                  onClick={handleReRecord}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-[#D9A2B5] text-[#890149] hover:bg-[#D9A2B5]/20 flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">refresh</span>
                  <span>{copy.reRecord}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSendVoiceClick}
                disabled={sendDisabled}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#890149] text-[#F3F3E7] hover:opacity-95 disabled:opacity-45 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">send</span>
                <span>{copy.sendVoiceMessage}</span>
              </button>
            </div>
          )}

          {statusMessage && phase === 'preview' && (
            <div className="text-[11px] text-[#890149] font-medium flex items-center justify-between gap-2 pt-1 border-t border-[#D9A2B5]/50">
              <span>{statusMessage}</span>
              {isOnline && previewStatus === 'ready' && (
                <button
                  type="button"
                  onClick={handleSendVoiceClick}
                  className="px-2 py-0.5 rounded bg-[#890149] text-[#F3F3E7] text-[10px] font-semibold cursor-pointer shrink-0"
                >
                  {copy.retry}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error / Cancelled Notice Banner */}
      {(phase === 'error' || (phase === 'idle' && statusMessage)) && statusMessage && (
        <div
          className="px-3 py-2 rounded-xl border border-[#890149]/35 bg-[#F3F3E7] text-[#30232A] text-xs flex flex-wrap items-center justify-between gap-2"
          role="alert"
        >
          <div className="flex items-start gap-1.5 min-w-0 flex-1">
            <span className="material-symbols-outlined text-[16px] text-[#890149] shrink-0 mt-0.5">
              {phase === 'error' ? 'error_outline' : 'info'}
            </span>
            <span className="text-[11px] leading-snug">{statusMessage}</span>
          </div>
          {phase === 'error' && (
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={() => {
                  setStatusMessage(null);
                  setPhase('idle');
                  startRecording();
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#890149] text-[#F3F3E7] hover:opacity-95 cursor-pointer"
              >
                {copy.retry}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhase('idle');
                  setStatusMessage(null);
                }}
                className="px-2 py-1 rounded-lg text-[11px] font-medium text-[#30232A]/80 hover:bg-[#D9A2B5]/30 cursor-pointer"
              >
                {copy.dismiss}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Core Composer Row: [ Microphone ] [ Type your message... ] [ Send ] */}
      <form onSubmit={handleSubmitText} className="flex items-end gap-2 w-full">
        <button
          type="button"
          onClick={() => (isRecordingOrPaused ? stopRecording() : startRecording())}
          disabled={disabled || phase === 'uploading'}
          aria-label={isRecordingOrPaused ? copy.stop : copy.micAria}
          title={!isOnline ? copy.micOfflineTitle : copy.micAria}
          className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center border transition-colors shrink-0 cursor-pointer disabled:opacity-45 ${
            isRecordingOrPaused
              ? 'bg-[#890149] text-[#F3F3E7] border-[#890149] shadow-sm animate-pulse'
              : !isOnline
              ? 'bg-[#F3F3E7] text-[#30232A]/60 border-[#D9A2B5]'
              : 'bg-[#F3F3E7] text-[#890149] border-[#D9A2B5] hover:bg-[#D9A2B5]/25'
          }`}
        >
          <span className="material-symbols-outlined text-[21px]">
            {isRecordingOrPaused ? 'stop' : !isOnline ? 'mic_off' : 'mic'}
          </span>
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="min-w-0 flex-1 min-h-[44px] max-h-24 px-3 py-2.5 rounded-xl bg-surface-container-lowest border border-[#D9A2B5] font-sans text-xs text-[#30232A] placeholder:text-[#30232A]/55 focus:outline-none focus:border-[#890149] resize-none leading-relaxed"
        />

        <button
          type="submit"
          disabled={disabled || isSendingText || !value.trim()}
          aria-label={sendAriaLabel}
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-[#890149] text-[#F3F3E7] flex items-center justify-center hover:opacity-95 shadow-sm disabled:opacity-40 cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">send</span>
        </button>
      </form>
    </div>
  );
};
