import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Zap,
  CalendarClock,
  Bot,
  BatteryCharging,
  BarChart3,
  Bell,
  Settings,
  Sun,
  X,
  LogOut,
} from 'lucide-react';
import { useVidyut } from '../../context/VidyutContext';

const OPERATIONS_NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/energy', label: 'Energy Monitoring', icon: Zap },
  { to: '/scheduling', label: 'Production Scheduling', icon: CalendarClock },
  { to: '/agents', label: 'AI Agents', icon: Bot },
  { to: '/battery', label: 'Battery & Storage', icon: BatteryCharging },
];

const SYSTEM_NAV = [
  { to: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
  { to: '/alerts', label: 'Alerts & Notifications', icon: Bell, showBadge: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ mobileOpen, onClose }) {
  const navigate = useNavigate();
  const { unreadAlertCount, logout } = useVidyut();

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/login', { replace: true });
  };

  const renderLink = ({ to, label, icon: Icon, showBadge }) => (
    <NavLink
      key={to}
      to={to}
      end={to === '/'}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center justify-between px-3 py-2.5 rounded-[12px] text-[13px] font-bold transition-all border-2 ${isActive
          ? 'bg-[#B5728A] text-[#17140D] border-[#17140D] shadow-[4px_4px_0_#17140D]'
          : 'border-transparent text-[#17140D] hover:bg-[#E3D6BF] hover:border-[#17140D]'
        }`
      }
    >
      {() => (
        <>
          <span className="flex items-center gap-2.5">
            <Icon className="w-[18px] h-[18px] shrink-0 stroke-[2.2]" />
            <span>{label}</span>
          </span>
          {showBadge && unreadAlertCount > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-extrabold rounded-full bg-[#933B5B] text-white border-2 border-[#17140D]">
              {unreadAlertCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#17140D]/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r-[3px] border-[#17140D] flex flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Brand Header */}
        <div className="h-[70px] px-4 flex items-center justify-between border-b-[3px] border-[#17140D] bg-[#E3D6BF]">
          <Link to="/" onClick={onClose} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-[12px] bg-[#933B5B] border-[2.5px] border-[#17140D] shadow-[3px_3px_0_#17140D] flex items-center justify-center text-white group-hover:translate-x-[1px] group-hover:translate-y-[1px] group-hover:shadow-[2px_2px_0_#17140D] transition-all">
              <Sun className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-display text-[18px] font-extrabold tracking-tight text-[#17140D] block leading-none">
                VidyutSync
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#933B5B]">
                Industrial AI
              </span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg border-2 border-[#17140D] bg-white text-[#17140D] hover:bg-[#933B5B] hover:text-white cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Grouped Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          <div>
            <p className="px-3 mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#5A523D]">
              Operations &amp; AI
            </p>
            <div className="space-y-1">{OPERATIONS_NAV.map(renderLink)}</div>
          </div>

          <div>
            <p className="px-3 mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#5A523D]">
              Insights &amp; System
            </p>
            <div className="space-y-1">{SYSTEM_NAV.map(renderLink)}</div>
          </div>
        </nav>

        {/* Bottom Motto & Logout */}
        <div className="p-3.5 border-t-[3px] border-[#17140D] bg-[#E3D6BF] space-y-2.5">
          <div className="rounded-[14px] bg-[#933B5B] border-[2.5px] border-[#17140D] shadow-[4px_4px_0_#17140D] p-3 text-white">
            <p className="font-display text-[11px] font-extrabold uppercase tracking-wider mb-0.5">
              Shift, don&apos;t cut.
            </p>
            <p className="text-xs leading-snug font-medium opacity-95">
              Run when the sun shines. Ship on time.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="memphis-btn w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-[#933B5B] hover:text-white text-[#17140D] text-xs font-extrabold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
}
