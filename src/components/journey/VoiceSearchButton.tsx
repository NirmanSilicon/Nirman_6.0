import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';

interface VoiceSearchButtonProps {
  onTranscript: (text: string) => void;
  placeholderText?: string;
  fieldLabel: string;
  id?: string;
}

export const VoiceSearchButton: React.FC<VoiceSearchButtonProps> = ({
  onTranscript,
  placeholderText = 'Speak your location...',
  fieldLabel,
  id = 'voice-search-btn',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check Speech Recognition support in standard and webkit prefixes
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setFeedbackMessage('Listening... Speak destination or origin clearly');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          const cleaned = transcript.trim();
          onTranscript(cleaned);
          setFeedbackMessage(`Recognized: "${cleaned}"`);
          setTimeout(() => setFeedbackMessage(null), 3000);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'no-speech') {
          setFeedbackMessage('No speech detected. Please try again.');
        } else if (event.error === 'not-allowed') {
          setFeedbackMessage('Microphone access denied in browser settings.');
        } else {
          setFeedbackMessage('Speech recognition error. Please type manually.');
        }
        setTimeout(() => setFeedbackMessage(null), 3500);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, [onTranscript]);

  const toggleListening = () => {
    if (!isSupported) {
      setFeedbackMessage('Voice search is not supported in this browser.');
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (_) {}
      setIsListening(false);
      setFeedbackMessage(null);
    } else {
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.warn('Speech recognition start error:', err);
      }
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        id={id}
        onClick={toggleListening}
        aria-label={`Voice search for ${fieldLabel}`}
        aria-pressed={isListening}
        title={isListening ? 'Stop listening' : `Voice search for ${fieldLabel}`}
        className={`p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px] focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
          isListening
            ? 'bg-red-600 text-white shadow-lg ring-4 ring-red-400/40 animate-pulse scale-105'
            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
        }`}
      >
        {isListening ? (
          <Mic className="w-4 h-4 animate-bounce" />
        ) : isSupported ? (
          <Mic className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <MicOff className="w-4 h-4 text-slate-400 opacity-50" />
        )}
      </button>

      {/* Floating feedback tooltip during voice input */}
      {feedbackMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`absolute bottom-full mb-2 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xl border whitespace-nowrap z-[400] flex items-center gap-1.5 ${
            isListening
              ? 'bg-red-600 text-white border-red-500'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {isListening ? (
            <Volume2 className="w-3.5 h-3.5 animate-pulse text-amber-300" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
          )}
          <span>{feedbackMessage}</span>
        </div>
      )}
    </div>
  );
};
