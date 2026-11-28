import React, { useState, useRef, useEffect } from 'react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  MoreVertical,
  Compass,
  MapPin,
  Map as MapIcon,
  Building2,
  AlertTriangle,
  HeartHandshake,
  Download,
  ShieldCheck,
  BarChart3,
  Bot,
  Sparkles,
  Accessibility,
  Globe2,
  Volume2,
  VolumeX,
  User,
  LogIn,
  Search,
  Check,
  ChevronRight,
  Database,
  X,
  Shield,
  Layers,
} from 'lucide-react';

interface FeaturesThreeDotMenuProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLanguageModal: () => void;
  onOpenAccessibilityModal: () => void;
  onOpenGuidedTour: () => void;
  onOpenAuthModal: () => void;
  variant?: 'navbar' | 'floating' | 'button';
}

export const FeaturesThreeDotMenu: React.FC<FeaturesThreeDotMenuProps> = ({
  activeTab,
  setActiveTab,
  onOpenLanguageModal,
  onOpenAccessibilityModal,
  onOpenGuidedTour,
  onOpenAuthModal,
  variant = 'navbar',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    isAudioMuted,
    toggleAudioMute,
    savedJourneys,
    plannedTrips,
  } = useAccessibility();
  const { currentLanguage, t } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const allFeatures = [
    // 1. Navigation Modules
    {
      id: 'planner',
      title: t('planJourney') || 'Step-Free Journey Planner',
      category: 'Navigation & Routes',
      description: 'Wheelchair routing, ramp gradients, audio transit steps & live elevators',
      icon: Compass,
      type: 'tab',
      badge: 'Core',
      badgeColor: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
    },
    {
      id: 'map',
      title: 'Live Interactive Map & GPS Navigation',
      category: 'Navigation & Routes',
      description: 'Explore step-free transit corridors, real-time barrier markers & route tracking',
      icon: MapIcon,
      type: 'tab',
      badge: 'Live GPS',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
    },
    {
      id: 'destinations',
      title: t('destinations') || 'Accessible Destinations',
      category: 'Navigation & Routes',
      description: 'Explore monuments, parks, temples & verified accessible spots',
      icon: MapPin,
      type: 'tab',
      badge: 'Directory',
      badgeColor: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300',
    },
    {
      id: 'hotels',
      title: t('hotels') || 'Hotels & Accessible Stays',
      category: 'Navigation & Routes',
      description: 'Roll-in showers, step-free entrances, wheelchair van transfers & instant booking',
      icon: Building2,
      type: 'tab',
      badge: 'Stays',
      badgeColor: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
    },
    {
      id: 'barriers',
      title: t('barriers') || 'Live Barrier Reports & Crowdsourcing',
      category: 'Accessibility & Support',
      description: 'Report broken lifts, steep stairs, obstacles & vote on community reports',
      icon: AlertTriangle,
      type: 'tab',
      badge: 'Live',
      badgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    },
    {
      id: 'assistance',
      title: t('assistance') || 'PRM Assistance & Station Staff',
      category: 'Accessibility & Support',
      description: 'Call 24/7 dedicated assistance personnel, station escorts & buggies',
      icon: HeartHandshake,
      type: 'tab',
      badge: '24/7 Help',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
    },
    {
      id: 'trips',
      title: 'Planned Trips Library & Passes',
      category: 'Navigation & Routes',
      description: 'Explore upcoming planned itineraries, step-free routes & offline travel passes',
      icon: Download,
      type: 'tab',
      badge: `${plannedTrips.length} Trips`,
      badgeColor: 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300',
    },
    {
      id: 'auditor',
      title: t('auditorPortal') || 'Certified Auditor Portal',
      category: 'Portals & Admin',
      description: 'ISO-21542 accessibility compliance checks, slope meter & audit reports',
      icon: ShieldCheck,
      type: 'tab',
      badge: 'Audits',
      badgeColor: 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300',
    },
    {
      id: 'analytics',
      title: t('adminDashboard') || 'System Admin & Accessibility Analytics',
      category: 'Portals & Admin',
      description: 'Real-time telemetry, barrier resolution rates & transit accessibility scores',
      icon: BarChart3,
      type: 'tab',
      badge: 'Admin',
      badgeColor: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
    },

    // 2. Interactive & Guided Tools
    {
      id: 'tour-demo',
      title: '22-Step Guided Evaluation Tour',
      category: 'Interactive Tools',
      description: 'Interactive walkthrough highlighting step-free routing, audits & audio guidance',
      icon: Sparkles,
      type: 'action',
      action: onOpenGuidedTour,
      badge: 'Interactive',
      badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
    },

    // 3. Accessibility & Preferences
    {
      id: 'accessibility-settings',
      title: 'Accessibility & Contrast Preferences',
      category: 'Preferences & Settings',
      description: 'High contrast mode, large typography, motor disability assist & visual themes',
      icon: Accessibility,
      type: 'action',
      action: onOpenAccessibilityModal,
      badge: 'A11y',
      badgeColor: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
    },
    {
      id: 'language-selector',
      title: `Language: ${currentLanguage.nativeName} (${currentLanguage.name})`,
      category: 'Preferences & Settings',
      description: 'Switch between 10+ Indian and international languages with voice narration',
      icon: Globe2,
      type: 'action',
      action: onOpenLanguageModal,
      badge: currentLanguage.code.toUpperCase(),
      badgeColor: 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
    },
    {
      id: 'audio-toggle',
      title: isAudioMuted ? 'Unmute Audio & Spoken Guidance' : 'Mute Audio Guidance',
      category: 'Preferences & Settings',
      description: isAudioMuted ? 'Enable spoken announcements and step-by-step turn guidance' : 'Audio guidance is currently enabled for turn notifications',
      icon: isAudioMuted ? VolumeX : Volume2,
      type: 'action',
      action: toggleAudioMute,
      badge: isAudioMuted ? 'Muted' : 'Active',
      badgeColor: isAudioMuted ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    },

    // 4. Account & Role Switcher
    {
      id: 'user-account',
      title: isAuthenticated && user ? `Account: ${user.name}` : 'Sign In / Register Account',
      category: 'Account & Perspective',
      description: isAuthenticated ? `Signed in as ${user.email} (${user.role})` : 'Save your personal accessibility profile, bookings and preferences',
      icon: isAuthenticated ? User : LogIn,
      type: 'action',
      action: onOpenAuthModal,
      badge: isAuthenticated ? 'Signed In' : 'Guest',
      badgeColor: isAuthenticated ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
  ];

  const filteredFeatures = allFeatures.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q)
    );
  });

  // Group features by category
  const categories = Array.from(new Set(filteredFeatures.map((f) => f.category)));

  const handleSelectFeature = (feature: typeof allFeatures[0]) => {
    if (feature.type === 'tab') {
      setActiveTab(feature.id);
    } else if (feature.action) {
      feature.action();
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      {/* Three Dot Trigger Button */}
      <button
        id="features-three-dot-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 sm:px-2.5 sm:py-2 rounded-xl border transition-all flex items-center justify-center gap-1.5 font-bold text-xs ${
          isOpen
            ? 'bg-blue-600 border-blue-600 text-white shadow-md ring-2 ring-blue-500/30'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs'
        }`}
        title="All Features, Modules & Settings (Three-Dot Menu)"
        aria-label="Open All Features Menu"
        aria-expanded={isOpen}
      >
        <MoreVertical className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        <span className="hidden sm:inline text-xs font-bold">Features</span>
      </button>

      {/* Dropdown Popup Menu */}
      {isOpen && (
        <div className="fixed sm:absolute right-4 sm:right-0 top-20 sm:top-full mt-2 w-[calc(100vw-2rem)] sm:w-[440px] max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                  <MoreVertical className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    All AccessWay Features
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Quick access to every tool, route & portal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Search inside Three Dot Menu */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search features (e.g. planner, hotels, AI, audits)..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Feature List */}
          <div className="overflow-y-auto p-3 space-y-4 max-h-[58vh]">
            {filteredFeatures.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Search className="w-8 h-8 mx-auto stroke-1" />
                <p className="text-xs font-semibold">No features found for "{searchQuery}"</p>
              </div>
            ) : (
              categories.map((category) => (
                <div key={category} className="space-y-1.5">
                  <div className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {filteredFeatures
                      .filter((f) => f.category === category)
                      .map((feature) => {
                        const Icon = feature.icon;
                        const isCurrentActive =
                          feature.type === 'tab' && activeTab === feature.id;

                        return (
                          <button
                            key={feature.id}
                            onClick={() => handleSelectFeature(feature)}
                            className={`w-full p-2.5 rounded-2xl flex items-start gap-3 text-left transition-all group ${
                              isCurrentActive
                                ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-105 ${
                                isCurrentActive
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-blue-600 group-hover:text-white'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className={`text-xs font-bold truncate ${
                                    isCurrentActive
                                      ? 'text-blue-700 dark:text-blue-300'
                                      : 'text-slate-800 dark:text-slate-200'
                                  }`}
                                >
                                  {feature.title}
                                </span>
                                {feature.badge && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold shrink-0 ${feature.badgeColor}`}
                                  >
                                    {feature.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-normal">
                                {feature.description}
                              </p>
                            </div>

                            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 self-center group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Quick Action */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold shrink-0">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Universal Accessibility Active</span>
            </div>

            <button
              onClick={() => {
                onOpenGuidedTour();
                setIsOpen(false);
              }}
              className="text-amber-600 dark:text-amber-400 text-[11px] font-bold hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Tour Demo</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
