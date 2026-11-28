import React, { useState } from 'react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { FeaturesThreeDotMenu } from './FeaturesThreeDotMenu';
import { AccessWayLogo } from '../common/AccessWayLogo';
import {
  Compass,
  Accessibility,
  Globe2,
  Bell,
  Bot,
  ShieldAlert,
  MapPin,
  Map as MapIcon,
  AlertTriangle,
  HeartHandshake,
  Download,
  ShieldCheck,
  BarChart3,
  Menu,
  X,
  Volume2,
  VolumeX,
  SunMoon,
  User,
  LogIn,
  Building2,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLanguageModal: () => void;
  onOpenAccessibilityModal: () => void;
  onOpenGuidedTour: () => void;
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenLanguageModal,
  onOpenAccessibilityModal,
  onOpenGuidedTour,
  onOpenAuthModal,
}) => {
  const {
    unreadCount,
    notifications,
    markNotificationRead,
    isAudioMuted,
    toggleAudioMute,
    speak,
  } = useAccessibility();
  const { currentLanguage, t } = useLanguage();
  const { user, isAuthenticated } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Top primary navigation tabs for desktop - concise short labels
  const primaryNavItems = [
    { id: 'planner', label: 'Planner', icon: Compass },
    { id: 'map', label: 'Live Map', icon: MapIcon },
    { id: 'destinations', label: 'Places', icon: MapPin },
    { id: 'hotels', label: 'Hotels', icon: Building2 },
    { id: 'trips', label: 'Planned Trips', icon: Download },
    { id: 'barriers', label: 'Barriers', icon: AlertTriangle },
    { id: 'assistance', label: 'Support', icon: HeartHandshake },
  ];

  // All navigation tabs for mobile drawer & feature catalog
  const allNavItems = [
    { id: 'planner', label: 'Step-Free Planner', icon: Compass },
    { id: 'map', label: 'Live Map & GPS', icon: MapIcon },
    { id: 'destinations', label: 'Destinations', icon: MapPin },
    { id: 'hotels', label: 'Hotels & Stays', icon: Building2 },
    { id: 'trips', label: 'Planned Trips Library', icon: Download },
    { id: 'barriers', label: 'Barrier Tracker', icon: AlertTriangle },
    { id: 'assistance', label: 'Accessibility & Support', icon: HeartHandshake },
    { id: 'auditor', label: 'Auditor Portal', icon: ShieldCheck },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs w-full">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-13 sm:h-14 gap-2">
          {/* Logo & Branding - Official AccessWay Sugamya Logo */}
          <div
            onClick={() => setActiveTab('planner')}
            className="flex items-center cursor-pointer select-none group shrink-0 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            title="AccessWay - Sugamya Accessible Journey Planner"
          >
            <div className="hidden sm:flex items-center">
              <AccessWayLogo variant="full" size="md" />
            </div>
            <div className="sm:hidden flex items-center">
              <AccessWayLogo variant="full" size="sm" />
            </div>
          </div>

          {/* Desktop Primary Navigation Tabs - Compact */}
          <nav className="hidden lg:flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Tools Cluster */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Dedicated Three-Dot Menu (Holds ALL features, portals, audio, language & role) */}
            <FeaturesThreeDotMenu
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onOpenLanguageModal={onOpenLanguageModal}
              onOpenAccessibilityModal={onOpenAccessibilityModal}
              onOpenGuidedTour={onOpenGuidedTour}
              onOpenAuthModal={onOpenAuthModal}
            />

            {/* Audio Mute / Unmute Quick Toggle Button */}
            <button
              type="button"
              id="navbar-audio-mute-toggle-btn"
              onClick={() => {
                toggleAudioMute();
                if (isAudioMuted) {
                  speak('Voice guidance and sound unmuted.');
                }
              }}
              className={`p-1.5 sm:p-2 rounded-lg border transition-all relative flex items-center justify-center cursor-pointer active:scale-95 ${
                isAudioMuted
                  ? 'border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-750 hover:text-slate-700 dark:hover:text-slate-300'
                  : 'border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 shadow-xs'
              }`}
              title={
                isAudioMuted
                  ? 'Audio Muted: Click to Unmute Voice Guidance & Sounds'
                  : 'Audio Active: Click to Mute Voice Guidance & Sounds'
              }
              aria-label={
                isAudioMuted
                  ? 'Audio Muted. Click to Unmute Voice Guidance'
                  : 'Audio Active. Click to Mute Voice Guidance'
              }
            >
              {isAudioMuted ? (
                <VolumeX className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
            </button>

            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-1.5 sm:p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 transition-colors relative"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-red-600 text-white text-[9px] font-black rounded-full shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 space-y-2 z-50 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      Accessibility Alerts
                    </span>
                    <span className="text-[11px] text-blue-600 font-semibold">{unreadCount} new</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1.5">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3">No new alerts</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`p-2.5 rounded-xl border text-xs space-y-0.5 cursor-pointer transition-colors ${
                            n.read
                              ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-500'
                              : 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-slate-800 dark:text-slate-200 font-medium'
                          }`}
                        >
                          <div className="font-bold flex items-center justify-between text-[11px]">
                            <span>{n.title}</span>
                            <span className="text-[9px] text-slate-400 font-normal">{n.timestamp}</span>
                          </div>
                          <p className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-400">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Login Action Button */}
            <button
              onClick={onOpenAuthModal}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border flex items-center gap-1.5 transition-all text-xs font-bold shadow-xs ${
                isAuthenticated && user
                  ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                  : 'border-blue-300 dark:border-blue-800 bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer'
              }`}
              title={isAuthenticated ? 'Your Account & Profile' : 'Sign In / Register'}
            >
              {isAuthenticated && user ? (
                <>
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-4 h-4 rounded-md object-cover ring-1 ring-blue-500"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-md bg-blue-600 text-white font-black text-[9px] flex items-center justify-center ring-1 ring-blue-500">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="hidden sm:inline truncate max-w-[70px]">{user.name.split(' ')[0]}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign In</span>
                </>
              )}
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in fade-in">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
