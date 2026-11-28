import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  Camera,
  ClipboardList,
  Compass,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  Scale,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

interface HealthStatus {
  databaseConnected: boolean;
  mode: string;
  databaseError?: string | null;
}

export function Layout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    apiFetch<HealthStatus>('/health')
      .then(setHealth)
      .catch((error: unknown) =>
        setHealth({
          databaseConnected: false,
          mode: 'unavailable',
          databaseError: error instanceof Error ? error.message : 'Supabase database is unavailable.',
        })
      );
  }, []);

  const navItems = [
    { to: '/', label: 'Home', icon: Compass },
    { to: '/map', label: '3D City Map', icon: MapIcon },
    { to: '/projects', label: 'Govt Projects', icon: ClipboardList },
    { to: '/evidence', label: 'Evidence & Compare', icon: Camera },
    { to: '/complaints', label: 'Citizen Complaints', icon: Scale },
    { to: '/future-city', label: 'Future City 3D', icon: Building2 },
    { to: '/dashboard', label: 'Role Dashboard', icon: LayoutDashboard },
  ];

  if (profile?.role === 'admin' && profile.accountStatus === 'active') {
    navItems.push({ to: '/admin', label: 'Admin Console', icon: ShieldCheck });
  }

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-warm-ivory text-charcoal">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Forest Green Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-forest-green text-white flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <Link to="/" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <img src="/logo.svg" alt="NagarDrishti 3D" className="w-9 h-9 rounded-lg" />
            <div>
              <div className="font-semibold tracking-tight text-base leading-tight">NagarDrishti 3D</div>
              <div className="text-[11px] text-champagne font-medium">Civic GIS Intelligence</div>
            </div>
          </Link>
          <button
            type="button"
            className="lg:hidden p-1 text-white/80 hover:text-white"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-secondary-green text-white border-l-4 border-champagne'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3 text-xs">
          <div className="rounded-lg bg-dark-blue-grey/70 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-white/75">Backend Status</span>
              <span
                className={`inline-flex items-center gap-1 font-medium ${
                  health?.databaseConnected ? 'text-success-green' : 'text-champagne'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    health?.databaseConnected ? 'bg-success-green' : 'bg-champagne'
                  }`}
                />
                {health?.databaseConnected ? 'DB Connected' : 'DB Unavailable'}
              </span>
            </div>
            <p className="text-[11px] text-white/65 leading-snug">
              {health?.databaseConnected
                ? 'Supabase PostgreSQL + PostGIS active.'
                : `${health?.databaseError || 'Live database records are unavailable.'} Demo records will not be substituted.`}
            </p>
          </div>

          {profile ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="truncate">
                  <div className="font-medium text-white truncate">{profile.fullName}</div>
                  <div className="text-[11px] text-champagne uppercase tracking-wider">
                    {profile.role}
                    {profile.accountStatus === 'pending_approval' ? ' (Pending)' : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link
                to="/login"
                className="flex-1 text-center py-2 px-3 rounded-lg bg-champagne text-charcoal font-semibold hover:opacity-90"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="flex-1 text-center py-2 px-3 rounded-lg border border-white/25 text-white hover:bg-white/10"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-charcoal/10 px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-charcoal/15 text-charcoal hover:bg-warm-ivory"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-blue font-medium">
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Monitor Today&apos;s City. Visualize Tomorrow&apos;s City.</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {profile && (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-warm-ivory border border-charcoal/10 text-charcoal hover:border-muted-blue"
              >
                <Bell className="w-3.5 h-3.5 text-muted-blue" />
                <span className="hidden sm:inline">Notifications</span>
              </Link>
            )}
            <span className="hidden md:inline-block text-[11px] font-medium px-2.5 py-1 rounded bg-champagne/20 text-charcoal border border-champagne/40">
              Bhubaneswar Civic Workspace
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
