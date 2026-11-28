import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  Calendar,
  Factory,
  Radio,
  CheckCheck,
  ChevronRight,
  ChevronDown,
  LogOut,
  Settings,
} from 'lucide-react';
import { useVidyut } from '../../context/VidyutContext';

export function Topbar({ pageTitle, onOpenMobileNav }) {
  const navigate = useNavigate();
  const {
    authUser,
    logout,
    factoryInfo,
    selectedDate,
    setSelectedDate,
    alerts,
    unreadAlertCount,
    markAllAlertsRead,
    markAlertRead,
    error,
  } = useVidyut();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 h-[70px] bg-white border-b-[3px] border-[#17140D] px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile menu + Factory Pill & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileNav}
          className="lg:hidden memphis-btn p-2 bg-[#933B5B] text-white cursor-pointer"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#E3D6BF] border border-[#17140D] text-[10px] font-extrabold text-[#933B5B] mb-0.5 max-w-full">
            <Factory className="w-3 h-3 shrink-0" />
            <span className="truncate">{factoryInfo.name}</span>
          </div>
          <h1 className="font-display text-lg sm:text-xl font-extrabold text-[#17140D] tracking-tight truncate leading-none">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right: Status, Date, Notifications, User Profile Dropdown */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold border-2 border-[#17140D] ${error ? 'bg-[#933B5B] text-white' : 'bg-[#AABAAE] text-[#17140D]'
            }`}
          title="Simulated telemetry active — ready for backend API integration"
        >
          <Radio className="w-3.5 h-3.5" />
          <span>{error ? 'Disconnected' : 'Online · Simulated'}</span>
        </div>

        <label className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border-2 border-[#17140D] bg-[#E3D6BF] text-xs font-bold text-[#17140D] cursor-pointer shadow-[2px_2px_0_#17140D]">
          <Calendar className="w-3.5 h-3.5 text-[#933B5B]" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-xs font-bold text-[#17140D] focus:outline-none cursor-pointer"
            aria-label="Select operational date"
          />
        </label>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotifOpen((prev) => !prev);
              setProfileOpen(false);
            }}
            className="memphis-btn relative p-2.5 bg-white text-[#17140D] cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#933B5B] text-white border-2 border-[#17140D] text-[10px] font-extrabold flex items-center justify-center">
                {unreadAlertCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white rounded-[16px] border-[3px] border-[#17140D] shadow-[7px_7px_0_#17140D] z-50 overflow-hidden">
              <div className="px-4 py-3 border-b-2 border-[#17140D] flex items-center justify-between bg-[#933B5B] text-white">
                <span className="font-display text-xs font-extrabold">
                  Notifications ({unreadAlertCount} unread)
                </span>
                <button
                  onClick={markAllAlertsRead}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-white hover:underline cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y-2 divide-[#E3D6BF]">
                {alerts.slice(0, 4).map((alert) => (
                  <button
                    key={alert.id}
                    onClick={() => {
                      markAlertRead(alert.id);
                      setNotifOpen(false);
                      navigate(alert.actionRoute || '/alerts');
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-[#E3D6BF] transition-colors cursor-pointer ${!alert.read ? 'bg-[#E3D6BF]/60' : ''
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wide ${alert.severity === 'critical'
                          ? 'text-[#933B5B]'
                          : alert.severity === 'warning'
                            ? 'text-[#B5728A]'
                            : 'text-[#5A523D]'
                          }`}
                      >
                        {alert.category}
                      </span>
                      <span className="text-[11px] font-medium text-[#5A523D]">
                        {alert.timestamp}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#17140D]">{alert.title}</p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setNotifOpen(false);
                  navigate('/alerts');
                }}
                className="w-full px-4 py-2.5 text-xs font-extrabold text-[#17140D] bg-[#E3D6BF] hover:bg-[#AABAAE] border-t-2 border-[#17140D] flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                View all alerts &amp; notifications
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative pl-2 border-l-2 border-[#17140D]" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setProfileOpen((prev) => !prev);
              setNotifOpen(false);
            }}
            className="memphis-btn flex items-center gap-2.5 px-2.5 py-1.5 bg-[#E3D6BF] text-[#17140D] cursor-pointer"
            aria-label="Account menu"
          >
            <div className="relative w-8 h-8 rounded-[10px] bg-[#933B5B] text-white border-2 border-[#17140D] flex items-center justify-center text-xs font-extrabold">
              {authUser?.initials || 'PO'}
              <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#AABAAE] border-[1.5px] border-[#17140D]" />
            </div>
            <div className="hidden xl:block text-left leading-tight">
              <p className="text-xs font-extrabold text-[#17140D]">
                {authUser?.name || 'Plant Ops Lead'}
              </p>
              <p className="text-[10px] font-bold text-[#933B5B]">
                {authUser?.isDemo ? 'Demo Account' : authUser?.role || 'Shift A'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#17140D] hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2.5 w-64 bg-white rounded-[16px] border-[3px] border-[#17140D] shadow-[7px_7px_0_#17140D] z-50 overflow-hidden">
              <div className="p-3.5 bg-[#E3D6BF] border-b-2 border-[#17140D]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-[12px] bg-[#933B5B] text-white border-2 border-[#17140D] flex items-center justify-center text-sm font-extrabold">
                    {authUser?.initials || 'PO'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-extrabold text-[#17140D] truncate">
                      {authUser?.name || 'Plant Ops Lead'}
                    </p>
                    <p className="text-[11px] font-medium text-[#5A523D] truncate">
                      {authUser?.email || 'demo.ops@vidyutsync.in'}
                    </p>
                  </div>
                </div>
                {authUser?.isDemo && (
                  <span className="mt-2 inline-block px-2 py-0.5 rounded-full bg-[#933B5B] text-white text-[10px] font-extrabold border border-[#17140D]">
                    Demo Session Active
                  </span>
                )}
              </div>

              <div className="p-2 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-xs font-bold text-[#17140D] hover:bg-[#E3D6BF] cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-[#933B5B]" />
                  Platform Settings
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-xs font-extrabold text-[#933B5B] hover:bg-[#E3D6BF] cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
