import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  Bell,
  Calendar,
  CalendarClock,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { firebaseRuntimeConfig } from '../lib/firebase';
import { isActiveAlertStatus, SOURCE_ROLE_LABELS } from '../services/alertProtocol';
import { DateRangeKey, NavSection } from '../types/hospital';
import { HospitalCrest, StatusText, toneForAlertStatus } from './ui/ClinicalPrimitives';

interface NavItemConfig {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'mothers', label: 'Mother Records', icon: Users },
  { id: 'health-workers', label: 'Health Workers', icon: Activity },
  { id: 'alerts', label: 'Emergency Alerts', icon: AlertTriangle },
  { id: 'referrals', label: 'Referrals', icon: ArrowRightLeft },
  { id: 'analytics', label: 'Maternal Analytics', icon: BarChart3 },
  { id: 'appointments', label: 'Appointments & Follow-ups', icon: CalendarClock },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'audit-logs', label: 'Audit Logs', icon: Shield },
];

const SECTION_LABELS: Record<NavSection, string> = {
  overview: 'Hospital Overview',
  mothers: 'Mother Records',
  'health-workers': 'Health Workers',
  alerts: 'Emergency Alert Centre',
  referrals: 'Referral Management',
  analytics: 'Maternal Analytics',
  appointments: 'Appointments & Follow-ups',
  reports: 'Reports',
  'audit-logs': 'Audit Logs',
  settings: 'Settings',
};

const DATE_RANGE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'quarter', label: 'Current Quarter' },
  { value: 'all', label: 'All Records' },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    appMode,
    currentUser,
    currentFacility,
    roleCategory,
    permittedSections,
    logout,
    activeSection,
    setActiveSection,
    selectedMotherId,
    openMotherProfile,
    closeMotherProfile,
    setSelectedAlertId,
    setSelectedReferralId,
    setSelectedHealthWorkerId,
    dateRange,
    setDateRange,
    globalSearch,
    setGlobalSearch,
    mothers,
    healthWorkers,
    alerts,
    referrals,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    mutationError,
    clearMutationError,
    connectionCheck,
    storageCheck,
    collectionStatuses,
    refreshAllSubscriptions,
    alertSyncState,
    alertSoundEnabled,
    enableAlertSound,
    disableAlertSound,
    activeReminderAlertIds,
    silenceAlertReminder,
    canManageAlerts,
    updateAlertTriage,
    incomingAlertToast,
    dismissIncomingAlertToast,
  } = useDashboard();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeAlertsCount = useMemo(
    () => alerts.filter((a) => isActiveAlertStatus(a.status)).length,
    [alerts]
  );

  const criticalActiveAlertsCount = useMemo(
    () => alerts.filter((a) => a.severity === 'Critical' && isActiveAlertStatus(a.status)).length,
    [alerts]
  );

  const formattedLastSync = useMemo(() => {
    if (!alertSyncState.lastSyncedAt) return 'Pending';
    try {
      return new Date(alertSyncState.lastSyncedAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return 'Synced';
    }
  }, [alertSyncState.lastSyncedAt]);

  const pendingReferralsCount = useMemo(
    () => referrals.filter((r) => r.status === 'Pending' || r.status === 'In Transit').length,
    [referrals]
  );

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const selectedMother = useMemo(
    () => (selectedMotherId ? mothers.find((m) => m.id === selectedMotherId) : null),
    [selectedMotherId, mothers]
  );

  const searchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (q.length < 2) return null;
    const matchedMothers = mothers
      .filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          (m.regionalName && m.regionalName.includes(globalSearch.trim())) ||
          m.block.toLowerCase().includes(q)
      )
      .slice(0, 4);
    const matchedWorkers = healthWorkers
      .filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.id.toLowerCase().includes(q) ||
          w.catchmentArea.toLowerCase().includes(q)
      )
      .slice(0, 3);
    const matchedAlerts = alerts
      .filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          a.motherName.toLowerCase().includes(q) ||
          a.triggerTitle.toLowerCase().includes(q)
      )
      .slice(0, 3);
    const matchedReferrals = referrals
      .filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.motherName.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q)
      )
      .slice(0, 3);

    const total =
      matchedMothers.length + matchedWorkers.length + matchedAlerts.length + matchedReferrals.length;
    return { matchedMothers, matchedWorkers, matchedAlerts, matchedReferrals, total };
  }, [globalSearch, mothers, healthWorkers, alerts, referrals]);

  const handleNavClick = (section: NavSection) => {
    setActiveSection(section);
    setMobileNavOpen(false);
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-[#DDD8CB]">
      {/* JanmaSaathi Brand Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[#EAE5D9]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/assets/aistudio/JanmaSaathi_593643c1.png"
              alt="JanmaSaathi logo"
              referrerPolicy="no-referrer"
              className="w-8 h-8 object-contain shrink-0"
            />
            <div className="min-w-0">
              <span className="block font-serif text-[19px] leading-none text-[#890149] truncate">
                JanmaSaathi
              </span>
              <span className="block text-[11px] text-[#665860] mt-0.5 truncate">
                Hospital Dashboard
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden p-1.5 text-[#665860] hover:text-[#30232A] rounded-md"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hospital Name & Crest */}
        <div className="mt-4 pt-3.5 border-t border-[#EAE5D9] flex items-center gap-2.5">
          <HospitalCrest className="w-8 h-8 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#30232A] truncate" title={currentFacility.name}>
              {currentFacility.shortName}
            </p>
            <p className="text-[11px] text-[#665860] truncate tabular-nums">
              {currentFacility.district} · {currentFacility.facilityCode}
            </p>
          </div>
        </div>
      </div>

      {/* Role-Permitted Primary Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5" aria-label="Hospital navigation">
        {NAV_ITEMS.filter((item) => permittedSections.includes(item.id)).map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id && !selectedMotherId;
          const isMotherProfileActive = item.id === 'mothers' && Boolean(selectedMotherId);
          const highlighted = isActive || isMotherProfileActive;
          const displayLabel =
            roleCategory === 'mother' && item.id === 'mothers'
              ? 'My Maternal Profile'
              : roleCategory === 'mother' && item.id === 'alerts'
              ? 'My Emergency Alerts'
              : item.label;

          const countText =
            item.id === 'alerts' && activeAlertsCount > 0
              ? String(activeAlertsCount)
              : item.id === 'referrals' && pendingReferralsCount > 0
              ? String(pendingReferralsCount)
              : null;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-[13.5px] rounded-md transition-colors text-left cursor-pointer ${
                highlighted
                  ? 'bg-[#F7EDF2] text-[#890149] font-semibold'
                  : 'text-[#30232A]/85 hover:bg-[#F3F3E7] hover:text-[#30232A] font-normal'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    highlighted ? 'text-[#890149]' : 'text-[#665860]'
                  }`}
                />
                <span className="truncate">{displayLabel}</span>
              </span>
              {countText && (
                <span
                  className={`text-xs tabular-nums shrink-0 ${
                    item.id === 'alerts'
                      ? criticalActiveAlertsCount > 0
                        ? 'text-[#B91C1C] font-bold'
                        : 'text-[#890149] font-semibold'
                      : 'text-[#890149] font-medium'
                  }`}
                  title={
                    item.id === 'alerts' && criticalActiveAlertsCount > 0
                      ? `${criticalActiveAlertsCount} critical active alert(s)`
                      : undefined
                  }
                >
                  {countText}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Personnel Profile, Live Firebase Target & Logout */}
      <div className="p-4 border-t border-[#EAE5D9] bg-[#FBFBF7] space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#30232A] truncate">{currentUser.name}</p>
            <p className="text-[11px] text-[#665860] truncate">{currentUser.role}</p>
            <p className="text-[11px] text-[#665860] truncate mt-0.5">
              {currentUser.email || currentUser.staffId}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            title="Sign out"
            className="p-1.5 text-[#665860] hover:text-[#890149] hover:bg-[#F7EDF2] rounded-md transition-colors shrink-0 cursor-pointer"
            aria-label="Sign out of Hospital Dashboard"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="text-[11px] leading-snug text-[#665860] border-t border-[#DDD8CB] pt-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            {appMode === 'demo' ? (
              <>
                <span className="font-semibold text-[#890149]">DEMO MODE</span>
                <span>Original Fixtures</span>
              </>
            ) : (
              <>
                <span className="font-semibold text-[#15803D] truncate">
                  {firebaseRuntimeConfig.projectId}
                </span>
                <span className="shrink-0">Live Firestore</span>
              </>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 text-[10.5px] text-[#665860] tabular-nums">
            <span>Last sync: {formattedLastSync}</span>
            <span>
              {alertSyncState.channel === 'sse'
                ? 'Live SSE'
                : alertSyncState.channel === 'firestore-realtime'
                ? 'Firestore Live'
                : alertSyncState.channel === 'polling-fallback'
                ? 'Polling'
                : alertSyncState.channel === 'offline'
                ? 'Offline'
                : 'Connecting'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F3F3E7] text-[#30232A] flex">
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-[256px] shrink-0 h-screen sticky top-0 no-print">
        {renderSidebarContent()}
      </aside>

      {/* Mobile / Tablet Slide-Over Sidebar */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#30232A]/40"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[272px] max-w-[85vw] h-full">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Utility & Context Header */}
        <header className="sticky top-0 z-30 bg-[#FBFBF7]/95 backdrop-blur-xs border-b border-[#DDD8CB] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 no-print">
          {/* Left: Mobile Trigger + Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-1 text-[#30232A] hover:bg-[#EAE9DC] rounded-md"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-[#665860] hidden xl:inline whitespace-nowrap">
                {currentFacility.shortName}
              </span>
              <span className="text-[#D9A2B5] hidden xl:inline" aria-hidden="true">
                /
              </span>
              {selectedMother ? (
                <>
                  <button
                    type="button"
                    onClick={closeMotherProfile}
                    className="text-[#665860] hover:text-[#890149] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Mother Records
                  </button>
                  <span className="text-[#D9A2B5]" aria-hidden="true">
                    /
                  </span>
                  <span className="font-medium text-[#30232A] truncate tabular-nums">
                    {selectedMother.id} · {selectedMother.fullName}
                  </span>
                </>
              ) : (
                <span className="font-medium text-[#30232A] truncate">
                  {SECTION_LABELS[activeSection]}
                </span>
              )}
            </div>
          </div>

          {/* Right: Mode Indicator, Global Search, Date Filter, Notification Centre */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {appMode === 'demo' && (
              <span
                className="hidden md:inline-flex items-center px-2 py-1 text-[11px] font-semibold tracking-wide bg-[#F7EDF2] text-[#890149] border border-[#D9A2B5] rounded whitespace-nowrap"
                title="Running on preserved JanmaSaathi demo fixtures; live Firestore records are untouched."
              >
                DEMO MODE
              </span>
            )}
            {/* Global Search */}
            <div ref={searchRef} className="relative w-44 sm:w-64 lg:w-72">
              <Search className="w-4 h-4 text-[#665860] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={globalSearch}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search ID, mother, worker..."
                aria-label="Global dashboard search"
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-[#DDD8CB] rounded-md text-[#30232A] placeholder:text-[#665860]/75 focus:outline-none focus:border-[#890149] focus:ring-1 focus:ring-[#890149]"
              />

              {/* Live Search Dropdown */}
              {searchFocused && searchResults && (
                <div className="absolute right-0 mt-1.5 w-[340px] sm:w-[420px] bg-white border border-[#DDD8CB] rounded-lg shadow-lg overflow-hidden z-50">
                  {searchResults.total === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-[#665860]">
                      No matching records found for &ldquo;{globalSearch}&rdquo;.
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto divide-y divide-[#EAE5D9]">
                      {searchResults.matchedMothers.length > 0 && (
                        <div className="p-2">
                          <p className="px-2 py-1 text-[11px] font-semibold text-[#665860]">
                            Mothers
                          </p>
                          {searchResults.matchedMothers.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                openMotherProfile(m.id);
                                setSearchFocused(false);
                                setGlobalSearch('');
                              }}
                              className="w-full px-2.5 py-2 text-left rounded hover:bg-[#F3F3E7] flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#30232A] truncate">
                                  {m.fullName}
                                  {m.regionalName ? (
                                    <span className="text-xs font-normal text-[#665860] ml-1.5">
                                      ({m.regionalName})
                                    </span>
                                  ) : null}
                                </p>
                                <p className="text-xs text-[#665860] tabular-nums">
                                  {m.id} · {m.gestationalWeeks}w {m.gestationalDays}d · {m.block}
                                </p>
                              </div>
                              <StatusText
                                label={m.riskLevel}
                                tone={toneForAlertStatus(
                                  m.alertStatus === 'None' ? 'Resolved' : m.alertStatus
                                )}
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.matchedAlerts.length > 0 && (
                        <div className="p-2">
                          <p className="px-2 py-1 text-[11px] font-semibold text-[#665860]">
                            Emergency Alerts
                          </p>
                          {searchResults.matchedAlerts.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => {
                                setActiveSection('alerts');
                                setSelectedAlertId(a.id);
                                setSearchFocused(false);
                                setGlobalSearch('');
                              }}
                              className="w-full px-2.5 py-2 text-left rounded hover:bg-[#F3F3E7] flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#30232A] truncate">
                                  {a.id} · {a.motherName}
                                </p>
                                <p className="text-xs text-[#665860] truncate">{a.triggerTitle}</p>
                              </div>
                              <StatusText label={a.status} tone={toneForAlertStatus(a.status)} />
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.matchedReferrals.length > 0 && (
                        <div className="p-2">
                          <p className="px-2 py-1 text-[11px] font-semibold text-[#665860]">
                            Referrals
                          </p>
                          {searchResults.matchedReferrals.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => {
                                setActiveSection('referrals');
                                setSelectedReferralId(r.id);
                                setSearchFocused(false);
                                setGlobalSearch('');
                              }}
                              className="w-full px-2.5 py-2 text-left rounded hover:bg-[#F3F3E7] flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#30232A] truncate">
                                  {r.id} · {r.motherName}
                                </p>
                                <p className="text-xs text-[#665860] truncate">{r.reason}</p>
                              </div>
                              <span className="text-xs text-[#890149] font-medium shrink-0">
                                {r.status}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.matchedWorkers.length > 0 && (
                        <div className="p-2">
                          <p className="px-2 py-1 text-[11px] font-semibold text-[#665860]">
                            Health Workers
                          </p>
                          {searchResults.matchedWorkers.map((w) => (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => {
                                setActiveSection('health-workers');
                                setSelectedHealthWorkerId(w.id);
                                setSearchFocused(false);
                                setGlobalSearch('');
                              }}
                              className="w-full px-2.5 py-2 text-left rounded hover:bg-[#F3F3E7] flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#30232A] truncate">
                                  {w.name} · {w.cadre}
                                </p>
                                <p className="text-xs text-[#665860] truncate">
                                  {w.id} · {w.catchmentArea}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Global Date Range Filter */}
            <div className="hidden sm:flex items-center relative">
              <Calendar className="w-3.5 h-3.5 text-[#665860] absolute left-2.5 pointer-events-none" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeKey)}
                aria-label="Global date range filter"
                className="pl-8 pr-3 py-1.5 text-xs font-medium bg-white border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149] cursor-pointer"
              >
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Opt-in Emergency Alert Sound Toggle (off by default) */}
            <button
              type="button"
              onClick={() => {
                if (alertSoundEnabled) {
                  disableAlertSound();
                } else {
                  void enableAlertSound();
                }
              }}
              title={
                alertSoundEnabled
                  ? 'Alert notification sound enabled (click to mute)'
                  : 'Alert notification sound muted (click to enable opt-in alert chime)'
              }
              aria-pressed={alertSoundEnabled}
              aria-label={
                alertSoundEnabled
                  ? 'Disable emergency alert notification sound'
                  : 'Enable emergency alert notification sound'
              }
              className={`p-2 border rounded-md transition-colors cursor-pointer ${
                alertSoundEnabled
                  ? 'bg-[#F7EDF2] border-[#890149] text-[#890149]'
                  : 'bg-white border-[#DDD8CB] text-[#665860] hover:border-[#890149] hover:text-[#30232A]'
              }`}
            >
              {alertSoundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            {/* Refresh Firestore Subscriptions (Firebase Mode only) */}
            {appMode === 'firebase' && (
              <button
                type="button"
                onClick={refreshAllSubscriptions}
                title="Re-sync Firestore collections"
                className="p-2 bg-white border border-[#DDD8CB] rounded-md text-[#30232A] hover:border-[#890149] transition-colors cursor-pointer"
                aria-label="Refresh live Firestore data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* Notification Centre */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                className="relative p-2 bg-white border border-[#DDD8CB] rounded-md text-[#30232A] hover:border-[#890149] transition-colors cursor-pointer"
                aria-label="Open clinical notification centre"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-[#890149] text-white text-[10px] font-semibold tabular-nums rounded flex items-center justify-center">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#DDD8CB] rounded-lg shadow-lg overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-[#EAE5D9] bg-[#FBFBF7] flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#30232A]">Notification Centre</p>
                      <p className="text-[11px] text-[#665860] tabular-nums">
                        {unreadNotificationsCount} unread clinical updates
                      </p>
                    </div>
                    {unreadNotificationsCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-xs font-medium text-[#890149] hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y divide-[#EAE5D9]">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-[#665860]">
                        No active alerts, pending referrals, or upcoming appointments.
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            markNotificationRead(item.id);
                            setActiveSection(item.targetSection);
                            if (item.targetSection === 'alerts' && item.targetId) {
                              setSelectedAlertId(item.targetId);
                            }
                            if (item.targetSection === 'referrals' && item.targetId) {
                              setSelectedReferralId(item.targetId);
                            }
                            setNotifOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-[#F3F3E7]/70 transition-colors cursor-pointer ${
                            item.read ? 'bg-white' : 'bg-[#F7EDF2]/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-[#30232A] leading-snug">
                              {item.title}
                            </p>
                            <span className="text-[11px] text-[#665860] whitespace-nowrap shrink-0 tabular-nums">
                              {item.timestamp}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#665860] leading-relaxed">
                            {item.description}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-2.5 border-t border-[#EAE5D9] bg-[#FBFBF7] flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection('alerts');
                        setNotifOpen(false);
                      }}
                      className="text-[#890149] font-medium hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>Open Emergency Alert Centre</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Viewport Canvas */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] w-full mx-auto space-y-5">
          {/* Connection / Listener / Storage error banner (Firebase Mode only — never fails silently) */}
          {appMode === 'firebase' &&
            (connectionCheck.status === 'offline' ||
              connectionCheck.status === 'not-found' ||
              connectionCheck.status === 'error' ||
              storageCheck.status === 'offline' ||
              storageCheck.status === 'error' ||
              Boolean(alertSyncState.errorMessage)) && (
              <div
                role="alert"
                className="px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md flex items-start justify-between gap-4 text-xs text-[#B91C1C]"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 min-w-0">
                    {(connectionCheck.status === 'offline' ||
                      connectionCheck.status === 'not-found' ||
                      connectionCheck.status === 'error') && (
                      <p>
                        <span className="font-semibold">Firestore Database:</span>{' '}
                        {connectionCheck.message}
                      </p>
                    )}
                    {(storageCheck.status === 'offline' ||
                      storageCheck.status === 'error') && (
                      <p>
                        <span className="font-semibold">Firebase Storage:</span>{' '}
                        {storageCheck.message}
                      </p>
                    )}
                    {alertSyncState.errorMessage && (
                      <p>
                        <span className="font-semibold">Real-Time Alert Listener:</span>{' '}
                        {alertSyncState.errorMessage}
                      </p>
                    )}
                    {Object.entries(collectionStatuses).some(
                      ([, st]) => st.status === 'permission-denied' || st.status === 'error'
                    ) && (
                      <p className="text-[#991B1B]">
                        Restricted/failed collections:{' '}
                        {Object.entries(collectionStatuses)
                          .filter(([, st]) => st.status === 'permission-denied' || st.status === 'error')
                          .map(([k, st]) => `${k} (${st.errorCode || st.status})`)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={refreshAllSubscriptions}
                  className="font-semibold underline whitespace-nowrap cursor-pointer shrink-0"
                >
                  Retry Connection
                </button>
              </div>
            )}

          {/* Firestore write error banner (never fails silently) */}
          {mutationError && (
            <div
              role="alert"
              className="px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md flex items-start justify-between gap-4 text-xs text-[#B91C1C]"
            >
              <div className="flex items-start gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{mutationError}</span>
              </div>
              <button
                type="button"
                onClick={clearMutationError}
                className="p-1 text-[#B91C1C] hover:bg-[#FEE2E2] rounded cursor-pointer shrink-0"
                aria-label="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {children}
        </main>
      </div>

      {/* Live Incoming Emergency Alert Notification Toast */}
      {incomingAlertToast && (
        <div
          role="alert"
          aria-live="assertive"
          className={`fixed top-20 right-4 sm:right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-white border rounded-lg shadow-lg p-4 no-print ${
            incomingAlertToast.priority === 'Critical'
              ? 'border-[#B91C1C]'
              : incomingAlertToast.priority === 'High Priority'
              ? 'border-[#890149]'
              : 'border-[#DDD8CB]'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <StatusText
                  label={incomingAlertToast.priority}
                  tone={toneForAlertStatus(incomingAlertToast.priority)}
                />
                <span className="text-[#665860]">·</span>
                <span className="text-[#665860] font-medium">
                  {SOURCE_ROLE_LABELS[incomingAlertToast.sourceRole]}
                </span>
                {incomingAlertToast.isDuplicate && (
                  <>
                    <span className="text-[#665860]">·</span>
                    <span className="text-[#B45309] font-semibold">Duplicate Recorded</span>
                  </>
                )}
              </div>
              <p className="text-sm font-semibold text-[#30232A] leading-snug">
                {incomingAlertToast.motherName}{' '}
                <span className="text-xs font-normal text-[#665860] tabular-nums">
                  ({incomingAlertToast.motherId})
                </span>
              </p>
              <p className="text-xs text-[#665860] leading-relaxed line-clamp-2">
                {incomingAlertToast.title}
              </p>
            </div>
            <button
              type="button"
              onClick={dismissIncomingAlertToast}
              className="p-1 text-[#665860] hover:text-[#30232A] rounded cursor-pointer shrink-0"
              aria-label="Dismiss incoming alert notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#EAE5D9] flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[11px] text-[#665860] tabular-nums">
              {incomingAlertToast.alertId}
            </span>
            <div className="flex items-center gap-1.5">
              {activeReminderAlertIds.includes(incomingAlertToast.alertId) && (
                <button
                  type="button"
                  onClick={() => silenceAlertReminder(incomingAlertToast.alertId)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-white hover:bg-[#F3F3E7] text-[#30232A] border border-[#DDD8CB] rounded-md transition-colors cursor-pointer"
                >
                  Silence
                </button>
              )}
              {canManageAlerts && (
                <button
                  type="button"
                  onClick={() => {
                    const targetId = incomingAlertToast.alertId;
                    silenceAlertReminder(targetId);
                    void updateAlertTriage(targetId, {
                      status: 'ACKNOWLEDGED',
                      note: 'Acknowledged from live hospital alert banner.',
                      actionLabel: 'Acknowledged Alert',
                    });
                    dismissIncomingAlertToast();
                  }}
                  className="px-2.5 py-1.5 text-xs font-medium bg-[#F7EDF2] hover:bg-[#EFE0E8] text-[#890149] border border-[#D9A2B5] rounded-md transition-colors cursor-pointer"
                >
                  Acknowledge
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveSection('alerts');
                  setSelectedAlertId(incomingAlertToast.alertId);
                  dismissIncomingAlertToast();
                }}
                className="px-3 py-1.5 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md transition-colors cursor-pointer"
              >
                Inspect Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
