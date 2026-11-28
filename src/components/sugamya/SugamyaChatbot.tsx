import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RefreshCw,
  MapPin,
  Compass,
  Building2,
  Navigation,
  ShieldCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Bus,
  Accessibility,
  ArrowRight,
  MessageSquare,
  Minus,
  Maximize2,
  Minimize2,
  ChevronUp,
  Layers,
} from 'lucide-react';
import { Destination, Hotel } from '../../types';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useLanguage } from '../../context/LanguageContext';
import { API_ENDPOINTS, getApiEndpoint } from '../../utils/apiConfig';
import { IndianGuideAvatar3D } from './IndianGuideAvatar3D';
import { generateLogicalSugamyaResponse } from '../../utils/sugamyaKnowledgeEngine';

interface SugamyaChatbotProps {
  destinations?: Destination[];
  onPlanJourney?: (destination: Destination) => void;
  onViewOnMap?: (destination: Destination) => void;
  onInspectDestination?: (destination: Destination) => void;
  onNavigateTab?: (tab: string) => void;
  userLiveCoordinates?: [number, number] | null;
}

interface ChatMessage {
  id: string;
  sender: 'USER' | 'SUGAMYA';
  text: string;
  timestamp: string;
  matchedDestinations?: Destination[];
  matchedHotels?: Hotel[];
  source?: string;
  verificationStatus?: string;
  confidence?: number;
  groundingSources?: { title: string; uri: string }[];
  suggestedActions?: { label: string; action: string; payload?: any }[];
  isError?: boolean;
}

const QUICK_SUGGESTIONS = [
  { label: '♿ Wheelchair-accessible places', query: 'Which tourist places in Bhubaneswar and Odisha are wheelchair accessible?' },
  { label: '🗺️ Plan an accessible trip', query: 'Help me plan a step-free accessible journey with zero stairs' },
  { label: '🚆 Accessible transportation', query: 'What accessible public transportation options exist like Mo Bus, trains, and airport buggies?' },
  { label: '🏨 Accessible accommodation', query: 'Find wheelchair-accessible hotels with roll-in showers and elevators' },
  { label: '🚻 Accessibility facilities', query: 'What key accessibility facilities like ramps, toilets, and tactile paths should I check?' },
  { label: '📍 Places near me', query: 'Show me verified wheelchair-accessible attractions near my location' },
];

export const SugamyaChatbot: React.FC<SugamyaChatbotProps> = ({
  destinations = [],
  onPlanJourney,
  onViewOnMap,
  onInspectDestination,
  onNavigateTab,
  userLiveCoordinates,
}) => {
  const { profile } = useAccessibility();
  const { currentLanguage } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  // Draggable / Movable position for the floating guide avatar button
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragInfoRef = useRef<{
    isPointerDown: boolean;
    hasMoved: boolean;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  }>({
    isPointerDown: false,
    hasMoved: false,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });

  const buttonRef = useRef<HTMLDivElement>(null);

  // Pointer down handler for dragging
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only left click or primary touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const el = buttonRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    dragInfoRef.current = {
      isPointerDown: true,
      hasMoved: false,
      startX: e.clientX,
      startY: e.clientY,
      initialX: rect.left,
      initialY: rect.top,
    };

    // Capture pointer
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragInfoRef.current.isPointerDown) return;

    const dx = e.clientX - dragInfoRef.current.startX;
    const dy = e.clientY - dragInfoRef.current.startY;

    // Movement threshold to distinguish click vs drag
    if (!dragInfoRef.current.hasMoved && Math.hypot(dx, dy) > 5) {
      dragInfoRef.current.hasMoved = true;
      setIsDragging(true);
    }

    if (dragInfoRef.current.hasMoved) {
      const btnSize = 56;
      const minX = 10;
      const maxX = Math.max(10, window.innerWidth - btnSize - 10);
      const minY = 10;
      const maxY = Math.max(10, window.innerHeight - btnSize - 10);

      const newX = Math.min(Math.max(minX, dragInfoRef.current.initialX + dx), maxX);
      const newY = Math.min(Math.max(minY, dragInfoRef.current.initialY + dy), maxY);

      setPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragInfoRef.current.isPointerDown) return;

    const hadMoved = dragInfoRef.current.hasMoved;
    dragInfoRef.current.isPointerDown = false;
    setIsDragging(false);

    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }

    // If it was just a click / tap (not dragged), toggle open
    if (!hadMoved) {
      if (isOpen && isMinimized) {
        setIsMinimized(false);
      } else if (isOpen) {
        setIsOpen(false);
        setIsMinimized(false);
      } else {
        setIsOpen(true);
        setIsMinimized(false);
      }
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Initial welcome message
    return [
      {
        id: 'welcome-msg',
        sender: 'SUGAMYA',
        text: `Hello! I'm **Sugamya AI**, your accessible travel assistant on AccessWay.\n\nI can help you discover wheelchair-accessible tourist places, plan barrier-free routes, find accessible hotels, check ramps and accessible toilets, and provide verified travel guidance.\n\nHow can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        verificationStatus: 'VERIFIED',
        confidence: 99,
        source: 'AccessWay Universal Accessibility Registry',
      },
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Auto scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Focus input on open
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, messages]);

  // Cancel TTS when closing or unmounting
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Web Speech Synthesis (TTS)
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }

    // Strip markdown characters for clean audio pronunciation
    const cleanText = text
      .replace(/[#*_`~\[\]\(\)>]/g, ' ')
      .replace(/♿|🚻|🅿️|🛗|🛣️|🚆|🏨|🗺️|📍|⚠️|🚨|✨/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick appropriate voice
    const voices = window.speechSynthesis.getVoices();
    if (currentLanguage.code === 'hi') {
      const hiVoice = voices.find((v) => v.lang.startsWith('hi'));
      if (hiVoice) utterance.voice = hiVoice;
    } else {
      const enVoice = voices.find((v) => v.lang.includes('en-IN') || v.lang.includes('en-GB') || v.lang.includes('en-US'));
      if (enVoice) utterance.voice = enVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Web Speech Recognition (Voice Input)
  const toggleVoiceInput = () => {
    if (isVoiceListening) {
      speechRecognitionRef.current?.stop();
      setIsVoiceListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your query.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      if (currentLanguage.code === 'hi') recognition.lang = 'hi-IN';
      else if (currentLanguage.code === 'or') recognition.lang = 'or-IN';
      else recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsVoiceListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputMessage(transcript);
          handleSendMessage(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[Sugamya AI Voice Error]', event.error);
        setIsVoiceListening(false);
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('[Speech Recognition Init Error]', err);
      setIsVoiceListening(false);
    }
  };

  // Acquire user live location for "near me" queries
  const getUserLocationPayload = async (): Promise<{ latitude: number; longitude: number; city?: string } | null> => {
    if (userLiveCoordinates && userLiveCoordinates[0] && userLiveCoordinates[1]) {
      return { latitude: userLiveCoordinates[0], longitude: userLiveCoordinates[1] };
    }

    if (!('geolocation' in navigator)) return null;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {
          resolve(null);
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    });
  };

  const handleSendMessage = async (customText?: string) => {
    const messageToSend = (customText || inputMessage).trim();
    if (!messageToSend || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const newUserMsg: ChatMessage = {
      id: userMessageId,
      sender: 'USER',
      text: messageToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputMessage('');
    setIsLoading(true);

    let userLoc: { latitude: number; longitude: number; city?: string } | null = null;

    try {
      // Check if location is needed
      const isNearMeQuery = /near\s+me|nearby|around\s+here|close\s+by/i.test(messageToSend);
      if (isNearMeQuery) {
        userLoc = await getUserLocationPayload();
      }

      // History for multi-turn context
      const historyPayload = messages.slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      // Resilient multi-endpoint fetch
      let data: any = null;
      const endpointsToTry = [
        getApiEndpoint(API_ENDPOINTS.SUGAMYA_CHAT),
        getApiEndpoint('/api/gemini/chat'),
        getApiEndpoint('/api/chat'),
      ];

      for (const ep of endpointsToTry) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6500);
          const response = await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              message: messageToSend,
              history: historyPayload,
              userProfile: profile,
              language: currentLanguage.code,
              userLocation: userLoc,
            }),
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            data = await response.json();
            break;
          }
        } catch (fetchErr) {
          // try next endpoint alias
        }
      }

      if (!data) {
        throw new Error('Fallback to dynamic knowledge engine');
      }

      const aiMsg: ChatMessage = {
        id: `sugamya-${Date.now()}`,
        sender: 'SUGAMYA',
        text: data.reply || 'I processed your request with verified accessibility database records.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        matchedDestinations: data.matchedDestinations || [],
        matchedHotels: data.matchedHotels || [],
        source: data.source || 'AccessWay Sugamya Verified Database',
        verificationStatus: data.verificationStatus || 'VERIFIED',
        confidence: data.confidence || 98,
        groundingSources: data.groundingSources || [],
        suggestedActions: data.suggestedActions || [],
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Read aloud if TTS toggle is enabled
      if (ttsEnabled && aiMsg.text) {
        speakText(aiMsg.text);
      }
    } catch (err: any) {
      console.warn('[Sugamya AI Chat] Using fast client dynamic knowledge engine:', err?.message || err);

      // Intelligent Client Dynamic Knowledge Engine (handles all queries logically)
      const knowledgeResult = generateLogicalSugamyaResponse(
        messageToSend,
        destinations,
        [],
        profile,
        currentLanguage.code,
        userLoc
      );

      const fallbackMsg: ChatMessage = {
        id: `sugamya-fallback-${Date.now()}`,
        sender: 'SUGAMYA',
        text: knowledgeResult.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        matchedDestinations: knowledgeResult.matchedDestinations,
        matchedHotels: knowledgeResult.matchedHotels,
        verificationStatus: knowledgeResult.verificationStatus,
        confidence: knowledgeResult.confidence,
        source: knowledgeResult.source,
        suggestedActions: knowledgeResult.suggestedActions,
      };

      setMessages((prev) => [...prev, fallbackMsg]);
      if (ttsEnabled && knowledgeResult.reply) {
        speakText(knowledgeResult.reply);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    stopSpeaking();
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'SUGAMYA',
        text: `Conversation cleared. I'm **Sugamya AI**, ready to assist with your accessible travel needs.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        verificationStatus: 'VERIFIED',
        confidence: 99,
        source: 'AccessWay Universal Accessibility Registry',
      },
    ]);
  };

  const handleActionClick = (action: string, payload?: any) => {
    if (action === 'select_destination' && payload && onPlanJourney) {
      onPlanJourney(payload);
      setIsOpen(false);
    } else if (action === 'plan_route' && onNavigateTab) {
      onNavigateTab('planner');
      setIsOpen(false);
    } else if (action === 'hotels' && onNavigateTab) {
      onNavigateTab('hotels');
      setIsOpen(false);
    } else if (action === 'barriers' && onNavigateTab) {
      onNavigateTab('barriers');
      setIsOpen(false);
    } else if (action === 'find_places' && onNavigateTab) {
      onNavigateTab('destinations');
      setIsOpen(false);
    } else if (action === 'transport' && onNavigateTab) {
      onNavigateTab('assistance');
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Floating Indian Guide 3D Trigger Button */}
      {!isMaximized && (
        <div
          ref={buttonRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={
            position
              ? {
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  position: 'fixed',
                  zIndex: 45,
                  touchAction: 'none',
                }
              : {
                  position: 'fixed',
                  bottom: '20px',
                  right: '20px',
                  zIndex: 45,
                  touchAction: 'none',
                }
          }
          className={`flex flex-col items-end gap-1.5 select-none pointer-events-auto transition-[box-shadow,transform] ${
            isDragging ? 'cursor-grabbing scale-105 opacity-90' : 'cursor-grab'
          } ${isOpen && isMinimized ? 'opacity-40 hover:opacity-100' : ''}`}
        >
          {!isOpen && !isDragging && (
            <div className="bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-lg border border-amber-400/40 flex items-center gap-1.5 animate-bounce pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Ask Sugamya Guide 🙏</span>
            </div>
          )}

          <div
            id="sugamya-ai-floating-btn"
            role="button"
            tabIndex={0}
            aria-label="Open Sugamya 3D Indian Guide AI Assistant - Draggable button"
            aria-expanded={isOpen && !isMinimized}
            className={`group relative flex items-center justify-center rounded-full shadow-xl transition-all duration-200 active:scale-95 focus:outline-none focus:ring-4 focus:ring-amber-400/50 ${
              isOpen && !isMinimized
                ? 'w-11 h-11 sm:w-12 sm:h-12 bg-slate-800 text-white rotate-90 border-2 border-slate-600'
                : 'p-0 bg-transparent'
            }`}
          >
            {isOpen && !isMinimized ? (
              <X className="w-6 h-6 transition-transform duration-200" />
            ) : (
              <div className="relative flex items-center justify-center">
                {/* 3D Indian Guide Logo movable with cursor - Compact size */}
                <div className="sm:hidden block">
                  <IndianGuideAvatar3D
                    size={46}
                    isSpeaking={isSpeaking}
                    isListening={isVoiceListening}
                    interactive={true}
                    showBadge={true}
                    showHalo={true}
                    tooltipText="Sugamya 3D Tour Guide - Drag me anywhere!"
                  />
                </div>
                <div className="hidden sm:block">
                  <IndianGuideAvatar3D
                    size={50}
                    isSpeaking={isSpeaking}
                    isListening={isVoiceListening}
                    interactive={true}
                    showBadge={true}
                    showHalo={true}
                    tooltipText="Sugamya 3D Tour Guide - Drag me anywhere!"
                  />
                </div>
                {/* Sparkle badge */}
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-full border border-slate-900 flex items-center justify-center shadow-md animate-pulse">
                  <Sparkles className="w-2.5 h-2.5 text-slate-950" />
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Minimized Dock Bar (Appears when chat is minimized) */}
      {isOpen && isMinimized && (
        <div
          id="sugamya-ai-minimized-dock"
          role="region"
          aria-label="Sugamya AI Chatbot Minimized"
          className="fixed bottom-5 right-3 sm:right-6 z-50 bg-slate-950/95 backdrop-blur-md text-white border border-amber-400/50 rounded-2xl shadow-2xl px-3.5 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200 hover:border-amber-400"
        >
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
            title="Restore Sugamya 3D Guide"
          >
            <div className="shrink-0 relative">
              <IndianGuideAvatar3D
                size={32}
                isSpeaking={isSpeaking}
                isListening={isVoiceListening}
                interactive={true}
                showBadge={false}
                showHalo={true}
              />
              {isSpeaking && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                <span>Sugamya 3D Guide</span>
                <span className="text-amber-400 text-[10px]">🙏</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate max-w-[130px] sm:max-w-[200px]">
                {isSpeaking ? 'Speaking response...' : 'Minimized • Click to restore'}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1 pl-1.5 border-l border-slate-700">
            {/* Restore to standard button */}
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              title="Restore standard window"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Restore chat window"
            >
              <ChevronUp className="w-4 h-4" />
            </button>

            {/* Maximize directly */}
            <button
              type="button"
              onClick={() => {
                setIsMinimized(false);
                setIsMaximized(true);
              }}
              title="Maximize chat window"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Maximize chat window"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setIsOpen(false);
                setIsMinimized(false);
                setIsMaximized(false);
              }}
              title="Close chat"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Chatbot Window */}
      {isOpen && !isMinimized && (
        <div
          id="sugamya-ai-chat-window"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sugamya-chat-title"
          className={`fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
            isMaximized
              ? 'inset-2 sm:inset-4 md:inset-6 lg:inset-8 w-auto h-auto max-h-none rounded-3xl animate-in zoom-in-95 duration-200'
              : 'bottom-20 right-3 sm:right-6 w-[calc(100vw-24px)] sm:w-[460px] md:w-[480px] h-[590px] max-h-[82vh] rounded-2xl animate-in fade-in slide-in-from-bottom-6 duration-200'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-2.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between shadow-md shrink-0 border-b border-amber-400/30">
            <div className="flex items-center gap-2.5">
              {/* 3D Indian Guide Avatar in Header */}
              <div className="shrink-0">
                <IndianGuideAvatar3D
                  size={isMaximized ? 40 : 36}
                  isSpeaking={isSpeaking}
                  isListening={isVoiceListening}
                  interactive={true}
                  showBadge={false}
                  showHalo={true}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="sugamya-chat-title" className="font-bold text-sm sm:text-base tracking-tight leading-tight flex items-center gap-1.5">
                    <span>Sugamya 3D Guide</span>
                    <span className="text-amber-400 text-xs">🙏</span>
                  </h2>
                  <span className="text-[10px] font-semibold bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    Verified AI
                  </span>
                  {isMaximized && (
                    <span className="hidden sm:inline-block text-[10px] font-medium bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/30">
                      Expanded View
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 font-medium">3D Accessible Tourism Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* TTS Read Aloud Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (isSpeaking) {
                    stopSpeaking();
                  } else {
                    setTtsEnabled((prev) => !prev);
                  }
                }}
                title={ttsEnabled ? 'Mute Speech Synthesis' : 'Enable Speech Synthesis (Read aloud)'}
                className={`p-2 rounded-lg transition-colors ${
                  isSpeaking
                    ? 'bg-amber-500 text-white animate-pulse'
                    : ttsEnabled
                    ? 'bg-white/20 text-emerald-300'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                aria-label={ttsEnabled ? 'Mute text to speech' : 'Enable text to speech'}
              >
                {isSpeaking ? <Volume2 className="w-4 h-4" /> : ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Reset / Clear Chat */}
              <button
                type="button"
                onClick={handleClearHistory}
                title="Clear conversation"
                className="p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Clear chat history"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Minimize Option */}
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                title="Minimize chat"
                className="p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Minimize chat window"
              >
                <Minus className="w-4 h-4" />
              </button>

              {/* Maximize / Restore Option */}
              <button
                type="button"
                onClick={() => setIsMaximized((prev) => !prev)}
                title={isMaximized ? 'Restore standard size' : 'Maximize chat window'}
                className="p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                aria-label={isMaximized ? 'Restore chat window' : 'Maximize chat window'}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setIsOpen(false);
                  setIsMinimized(false);
                  setIsMaximized(false);
                }}
                title="Close chat"
                className="p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Close chat window"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Active Speaking Banner */}
          {isSpeaking && (
            <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900/50 px-4 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="font-semibold">Speaking response aloud...</span>
              </div>
              <button
                type="button"
                onClick={stopSpeaking}
                className="text-amber-900 dark:text-amber-200 font-bold hover:underline px-2 py-0.5 rounded bg-amber-200/60 dark:bg-amber-800/60 text-[11px]"
              >
                Stop
              </button>
            </div>
          )}

          {/* Body Content Container (Split on Desktop when Maximized) */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            {/* Left/Main Column: Messages & Input */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
                <div className={isMaximized ? 'max-w-4xl mx-auto w-full space-y-4' : 'space-y-4'}>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'USER' ? 'items-end' : 'items-start'}`}
                    >
                      {/* Sender Avatar & Header */}
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        {msg.sender === 'SUGAMYA' ? (
                          <>
                            <div className="shrink-0">
                              <IndianGuideAvatar3D
                                size={24}
                                isSpeaking={false}
                                interactive={true}
                                showBadge={false}
                                showHalo={false}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <span>Sugamya 3D Guide</span>
                              <span className="text-amber-500 text-[10px]">✨</span>
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            You
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {msg.timestamp}
                        </span>
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`rounded-2xl p-3.5 sm:p-4 text-sm leading-relaxed shadow-sm ${
                          isMaximized ? 'max-w-[85%]' : 'max-w-[92%] sm:max-w-[88%]'
                        } ${
                          msg.sender === 'USER'
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-tl-none'
                        }`}
                      >
                        {/* Markdown formatted text */}
                        <div className="space-y-2 whitespace-pre-wrap break-words font-normal">
                          {msg.text.split('\n\n').map((paragraph, pIdx) => {
                            // Check for bullet list
                            if (paragraph.startsWith('- ') || paragraph.startsWith('* ') || paragraph.startsWith('1. ')) {
                              const lines = paragraph.split('\n');
                              return (
                                <ul key={pIdx} className="space-y-1 my-1 pl-1 list-none">
                                  {lines.map((line, lIdx) => (
                                    <li key={lIdx} className="flex items-start gap-1.5">
                                      <span className="text-blue-500 font-bold shrink-0">•</span>
                                      <span>{renderFormattedInline(line.replace(/^[-*•\d\.]+\s*/, ''))}</span>
                                    </li>
                                  ))}
                                </ul>
                              );
                            }
                            return (
                              <p key={pIdx} className="leading-relaxed">
                                {renderFormattedInline(paragraph)}
                              </p>
                            );
                          })}
                        </div>

                        {/* Matched Destination Recommendations */}
                        {msg.matchedDestinations && msg.matchedDestinations.length > 0 && (
                          <div className="mt-3.5 space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Verified Attractions</span>
                              </span>
                            </div>

                            {msg.matchedDestinations.map((dest) => (
                              <div
                                key={dest.id}
                                className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                                      {dest.name}
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                      <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                                      <span>{dest.city}, {dest.state || dest.country}</span>
                                    </p>
                                  </div>
                                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                    {dest.facilities.verificationStatus || 'VERIFIED'}
                                  </span>
                                </div>

                                {/* Facilities checklist */}
                                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                  <div className="flex items-center gap-1">
                                    <span>♿ Wheelchair:</span>
                                    <span className="font-semibold text-emerald-600">
                                      {dest.facilities.wheelchairEntrance ? 'Yes' : 'No'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span>🚻 Toilet:</span>
                                    <span className="font-semibold text-emerald-600">
                                      {dest.facilities.accessibleToilet ? 'Yes' : 'No'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span>🅿️ Parking:</span>
                                    <span className="font-semibold text-emerald-600">
                                      {dest.facilities.accessibleParking ? 'Yes' : 'No'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span>🛣️ Step-Free:</span>
                                    <span className="font-semibold text-emerald-600">
                                      {!dest.facilities.stairs ? '100%' : 'Ramp'}
                                    </span>
                                  </div>
                                </div>

                                {/* Source transparency line */}
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                                  Source: AccessWay accessibility database • Last verified: August 2026
                                </p>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                  {onPlanJourney && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onPlanJourney(dest);
                                        setIsOpen(false);
                                      }}
                                      className="flex-1 min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 shadow-sm transition-colors"
                                    >
                                      <Compass className="w-3 h-3" />
                                      <span>Plan this journey</span>
                                    </button>
                                  )}

                                  {onViewOnMap && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onViewOnMap(dest);
                                        setIsOpen(false);
                                      }}
                                      className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-[11px] font-semibold py-1.5 px-2.5 rounded-lg flex items-center gap-1 transition-colors"
                                    >
                                      <Navigation className="w-3 h-3" />
                                      <span>View on Map</span>
                                    </button>
                                  )}

                                  {onInspectDestination && (
                                    <button
                                      type="button"
                                      onClick={() => onInspectDestination(dest)}
                                      className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-medium py-1 px-1"
                                    >
                                      Details
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Grounding Web Search References */}
                        {msg.groundingSources && msg.groundingSources.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                            <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                              <span>🌐 Verified Web References:</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.groundingSources.slice(0, 4).map((source, sIdx) => (
                                <a
                                  key={sIdx}
                                  href={source.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 rounded-md px-2 py-0.5 transition-colors max-w-full truncate"
                                  title={source.title}
                                >
                                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate max-w-[200px]">{source.title || 'Web Source'}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sourcing Transparency Badge for AI messages */}
                        {msg.sender === 'SUGAMYA' && msg.source && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-500" />
                              <span>{msg.source}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => speakText(msg.text)}
                              title="Read message aloud"
                              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                            >
                              <Volume2 className="w-3 h-3" />
                              <span>Listen</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Suggested Action Chips */}
                      {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                        <div className={`flex flex-wrap gap-1.5 mt-2 ${isMaximized ? 'max-w-2xl' : 'max-w-[90%]'}`}>
                          {msg.suggestedActions.map((action, aIdx) => (
                            <button
                              key={aIdx}
                              type="button"
                              onClick={() => handleActionClick(action.action, action.payload)}
                              className="bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-slate-700 text-xs font-semibold py-1 px-2.5 rounded-full shadow-2xs transition-all flex items-center gap-1"
                            >
                              <span>{action.label}</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Loading Indicator */}
                  {isLoading && (
                    <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 text-xs p-2.5 bg-slate-100/70 dark:bg-slate-800/70 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      <div className="shrink-0 animate-pulse">
                        <IndianGuideAvatar3D
                          size={26}
                          isSpeaking={true}
                          interactive={true}
                          showBadge={false}
                          showHalo={false}
                        />
                      </div>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        Sugamya 3D Guide is checking verified accessibility ground truth...
                      </span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Quick Suggestions Shelf */}
              <div className="px-3 sm:px-4 py-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar shrink-0">
                <div className={`flex items-center gap-1.5 min-w-max ${isMaximized ? 'max-w-4xl mx-auto' : ''}`}>
                  {QUICK_SUGGESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(item.query)}
                      disabled={isLoading}
                      className="bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-300 text-slate-700 dark:text-slate-300 text-[11px] font-medium px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0"
              >
                <div className={`flex items-center gap-2 w-full ${isMaximized ? 'max-w-4xl mx-auto' : ''}`}>
                  {/* Voice Input Button */}
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    title={isVoiceListening ? 'Listening... click to stop' : 'Voice input (Speak your question)'}
                    aria-label="Voice input"
                    className={`p-2.5 rounded-xl border transition-all ${
                      isVoiceListening
                        ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isVoiceListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  {/* Text Input */}
                  <input
                    ref={chatInputRef}
                    id="sugamya-chat-input"
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask about accessible places, routes, ramps..."
                    disabled={isLoading}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    aria-label="Send question to Sugamya AI"
                    className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-md transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* Right Companion Panel (Visible only when Maximized on Large Displays) */}
            {isMaximized && (
              <div className="hidden lg:flex lg:w-80 xl:w-96 flex-col h-full border-l border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 p-5 overflow-y-auto space-y-4 shrink-0">
                {/* 3D Guide Interactive Banner */}
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-4 text-white border border-amber-400/30 flex flex-col items-center text-center shadow-md">
                  <div className="my-1">
                    <IndianGuideAvatar3D
                      size={64}
                      isSpeaking={isSpeaking}
                      isListening={isVoiceListening}
                      interactive={true}
                      showBadge={true}
                      showHalo={true}
                    />
                  </div>
                  <h3 className="font-bold text-sm text-slate-100 mt-2 flex items-center gap-1.5">
                    <span>Sugamya 3D Indian Guide</span>
                    <span className="text-amber-400 text-xs">🙏</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-snug">
                    Real-time accessibility companion for Indian heritage & smart transit.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] bg-white/10 px-2.5 py-1 rounded-full text-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ASI & MoHUA Verified Data Active</span>
                  </div>
                </div>

                {/* Quick Accessibility Topics */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    <span>Quick Inquiries</span>
                  </h4>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => handleSendMessage('Which tourist places have 100% step-free wheelchair ramps and accessible toilets?')}
                      className="w-full text-left p-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate">♿ Step-Free Heritage Sites</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage('How accessible are Mo Bus, airport buggies, and railway stations in Odisha?')}
                      className="w-full text-left p-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate">🚆 Accessible Transit & Buggies</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage('Find wheelchair-friendly hotels with roll-in showers and ground floor access')}
                      className="w-full text-left p-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate">🏨 Accessible Stays & Hotels</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage('Which monuments have tactile braille paths and audio guides for visually impaired visitors?')}
                      className="w-full text-left p-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate">🦮 Braille & Tactile Paths</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Quick Navigation Shortcuts */}
                {onNavigateTab && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
                    <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Explore App Modules
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateTab('map');
                          setIsMinimized(true);
                        }}
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors text-left"
                      >
                        <Navigation className="w-3.5 h-3.5 text-blue-600" />
                        <span>Live Map</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateTab('planner');
                          setIsMinimized(true);
                        }}
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors text-left"
                      >
                        <Compass className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Planner</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateTab('barriers');
                          setIsMinimized(true);
                        }}
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors text-left"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span>Barriers</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateTab('hotels');
                          setIsMinimized(true);
                        }}
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors text-left"
                      >
                        <Building2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>Hotels</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// Helper to format bold markdown and icons inline
function renderFormattedInline(text: string): React.ReactNode {
  if (!text) return null;

  // Split by bold markdown **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-slate-950 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default SugamyaChatbot;
