import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Menu, X, Bell, Siren, CheckCheck, Calendar, Pill, BedDouble, FlaskConical } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import logoImg from "@/assets/logo.png";
import { logoutUser } from "../lib/api";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "What We Do" },
  { to: "/hospitals", label: "Find Hospital" },
  { to: "/book", label: "Book OPD" },
  { to: "/pharmacy", label: "Pharmacy" },
];

const INITIAL_NOTIFICATIONS = [
  {
    id: "n1",
    icon: Calendar,
    iconColor: "text-teal",
    iconBg: "bg-teal/10",
    title: "OPD Appointment Confirmed",
    body: "Dr. Aditi Patel · Apollo Hospital · Today, 3:30 PM",
    time: "2 min ago",
    read: false,
  },
  {
    id: "n2",
    icon: Pill,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    title: "Medicine Order Dispatched",
    body: "Order #SJ-482910 is out for delivery. ETA: 45 mins.",
    time: "18 min ago",
    read: false,
  },
  {
    id: "n3",
    icon: FlaskConical,
    iconColor: "text-indigo-500",
    iconBg: "bg-indigo-50",
    title: "Lab Report Ready",
    body: "Your CBC Test report is now available in Health Vault.",
    time: "1 hr ago",
    read: false,
  },
  {
    id: "n4",
    icon: BedDouble,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    title: "Bed Availability Alert",
    body: "ICU beds available at Fortis Hospital, Mumbai. 3 slots open.",
    time: "3 hr ago",
    read: true,
  },
  {
    id: "n5",
    icon: Activity,
    iconColor: "text-rose-500",
    iconBg: "bg-rose-50",
    title: "Health Tip of the Day",
    body: "Stay hydrated! Aim for 8 glasses of water daily to support kidney function.",
    time: "Yesterday",
    read: true,
  },
];

export function SiteHeader() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      setLoggedIn(!!localStorage.getItem("token"));
    };
    checkAuth();
    window.addEventListener("auth-changed", checkAuth);
    return () => window.removeEventListener("auth-changed", checkAuth);
  }, []);
  const [scrolled, setScrolled] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close notification panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    if (showNotif) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotif]);

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const markOneRead = (id: string) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-border/50 bg-white/90 backdrop-blur-xl shadow-xs"
          : "border-b border-transparent bg-white/70 backdrop-blur-md"
      }`}
    >
      {/* Top announcement bar */}
      <div className="bg-gradient-teal py-2 text-center text-[11px] font-semibold text-white/95 tracking-wide">
        <span className="flex items-center justify-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse" />
          🏥 &nbsp;12,400+ hospitals live · Free OPD booking · AI Emergency response in 4 min avg
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse" />
        </span>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-3">
          <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-white border border-border/80 shadow-xs flex items-center justify-center transition-transform group-hover:scale-105">
            <img src={logoImg} className="h-full w-full object-cover scale-[1.8] origin-center" alt="Sanjeevani Logo" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-white" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-[1.15rem] font-extrabold text-navy tracking-tight">Sanjeevani</div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground font-medium">OPD · Care · Network</div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {links.map((l) => {
            const active = pathname === l.to || (l.to !== "/" && pathname.startsWith(l.to));
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`relative rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "text-navy bg-accent"
                    : "text-muted-foreground hover:text-navy hover:bg-muted/60"
                }`}
              >
                {l.label}
                {active && (
                  <span className="absolute bottom-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-teal" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="hidden items-center gap-2 md:flex">

          {/* ── Notification Bell ── */}
          <div ref={notifRef} className="relative">
            <button
              id="notification-bell-btn"
              onClick={() => setShowNotif((v) => !v)}
              className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted/60 hover:text-navy transition"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-black text-white border border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotif && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] rounded-2xl border border-border/80 bg-white shadow-2xl overflow-hidden animate-scale-in">
                {/* Panel Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-slate-50/80">
                  <div>
                    <span className="text-sm font-bold text-navy">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="ml-2 text-[10px] font-bold bg-teal/10 text-teal px-1.5 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-[10px] font-semibold text-teal hover:text-navy transition"
                    >
                      <CheckCheck className="h-3 w-3" />
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notification Items */}
                <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markOneRead(n.id)}
                      className={`w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition ${
                        !n.read ? "bg-teal/[0.03]" : ""
                      }`}
                    >
                      {/* Icon */}
                      <div className={`shrink-0 h-8 w-8 rounded-xl ${n.iconBg} grid place-items-center mt-0.5`}>
                        <n.icon className={`h-4 w-4 ${n.iconColor}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[11px] font-bold leading-tight ${!n.read ? "text-navy" : "text-slate-500"}`}>
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="shrink-0 h-2 w-2 rounded-full bg-teal mt-1" />
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                          {n.body}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-1 font-medium">{n.time}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Panel Footer */}
                <div className="border-t border-border/60 px-4 py-2.5 bg-slate-50/60">
                  <Link
                    to="/dashboard"
                    onClick={() => setShowNotif(false)}
                    className="block text-center text-[11px] font-semibold text-teal hover:text-navy transition"
                  >
                    View all in Dashboard →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Emergency */}
          {pathname !== "/pharmacy" && (
            <Link
              to="/emergency"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-emergency px-3.5 py-2 text-sm font-bold text-white shadow-glow-red transition hover:opacity-90 active:scale-95"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
                <span className="relative h-2 w-2 rounded-full bg-white" />
              </span>
              SOS
            </Link>
          )}

          {/* Profile / Auth */}
          {loggedIn ? (
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-semibold text-navy hover:bg-accent hover:border-teal/40 transition"
              >
                <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-teal text-white text-[10px] font-bold">P</div>
                Profile
              </Link>
              <button
                onClick={() => {
                  logoutUser();
                  window.location.href = "/";
                }}
                className="rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 transition cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-teal px-4.5 py-2 text-sm font-bold text-white shadow-glow-teal hover:opacity-95 transition"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          id="mobile-menu-toggle"
          onClick={() => setOpen(!open)}
          className="md:hidden rounded-xl border border-border p-2 text-navy hover:bg-accent transition"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-border/60 bg-white/95 backdrop-blur-xl md:hidden shadow-lg-custom">
          <div className="space-y-1 px-4 pb-5 pt-3">
            {links.map((l) => {
              const active = pathname === l.to || (l.to !== "/" && pathname.startsWith(l.to));
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center rounded-xl px-4 py-3 text-sm font-medium transition ${
                    active ? "bg-accent text-navy font-semibold" : "text-muted-foreground hover:bg-muted/50 hover:text-navy"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
            {loggedIn ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-navy"
                >
                  My Dashboard
                </Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    logoutUser();
                    window.location.href = "/";
                  }}
                  className="w-full text-left flex items-center rounded-xl px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="flex items-center rounded-xl px-4 py-3 text-sm font-bold text-teal hover:bg-teal/5"
              >
                Sign In
              </Link>
            )}
            {pathname !== "/pharmacy" && (
              <Link
                to="/emergency"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl bg-gradient-emergency px-4 py-3 text-sm font-bold text-white mt-2"
              >
                <Siren className="h-4 w-4" /> Emergency SOS
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
