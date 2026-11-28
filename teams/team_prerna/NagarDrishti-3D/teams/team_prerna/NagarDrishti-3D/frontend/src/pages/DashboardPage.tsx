import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bell, Check, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import type { NotificationItem } from '../types/domain';

interface DashboardSummary {
  mode: string;
  stats: {
    totalProjects: number;
    demoProjects: number;
    officialProjects: number;
    evidenceAwaitingReview: number;
    possibleDiscrepancies: number;
    complaintsCount?: number;
    openComplaints?: number;
  };
  departmentBreakdown: Array<{ department: string; projects: number; avgProgress?: number }>;
}

export function DashboardPage() {
  const { profile, refreshProfile } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bootstrapToken, setBootstrapToken] = useState('');
  const [bootstrapMsg, setBootstrapMsg] = useState<string | null>(null);
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoadError(null);
    setSummary(null);
    setNotifications([]);
    try {
      const [sumRes, notifRes] = await Promise.all([
        apiFetch<DashboardSummary>('/summary'),
        apiFetch<{ notifications: NotificationItem[] }>('/notifications'),
      ]);
      setSummary(sumRes);
      setNotifications(notifRes.notifications);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load dashboard data from Supabase.');
    }
  };

  useEffect(() => {
    if (profile) loadDashboard();
  }, [profile]);

  const markRead = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to update the notification.');
    }
  };

  const handleAdminBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setBootstrapErr(null);
    setBootstrapMsg(null);
    try {
      const res = await apiFetch<{ message: string }>('/auth/bootstrap-admin', {
        method: 'POST',
        body: JSON.stringify({ bootstrapToken }),
      });
      setBootstrapMsg(res.message);
      setBootstrapToken('');
      await refreshProfile();
    } catch (err) {
      setBootstrapErr(err instanceof Error ? err.message : 'Bootstrap failed');
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-charcoal/10 p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-forest-green">
            {profile?.role ? `${profile.role.toUpperCase()} Dashboard` : 'Dashboard'}
          </h1>
          <p className="text-sm text-dark-blue-grey">
            Signed in as {profile?.fullName} ({profile?.email}) · Status: {profile?.accountStatus}
          </p>
        </div>
        {summary && (
          <span className="text-xs px-3 py-1 rounded bg-warm-ivory border border-charcoal/15">
            Source: Live Database · Explicit demo records: {summary.stats.demoProjects}
          </span>
        )}
      </div>

      {loadError && (
        <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta p-3 rounded-lg text-sm">
          {loadError}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-charcoal/10 p-4">
            <div className="text-xs text-dark-blue-grey">Total Projects</div>
            <div className="text-2xl font-semibold text-forest-green mt-1">{summary.stats.totalProjects}</div>
            <div className="text-[11px] text-dark-blue-grey">
              {summary.stats.officialProjects} records claim an official source (unverified) · {summary.stats.demoProjects} demo
            </div>
          </div>
          <div className="bg-white rounded-xl border border-charcoal/10 p-4">
            <div className="text-xs text-dark-blue-grey">Possible Discrepancies</div>
            <div className="text-2xl font-semibold text-terracotta mt-1">{summary.stats.possibleDiscrepancies}</div>
          </div>
          <div className="bg-white rounded-xl border border-charcoal/10 p-4">
            <div className="text-xs text-dark-blue-grey">Evidence Pending Review</div>
            <div className="text-2xl font-semibold text-muted-blue mt-1">{summary.stats.evidenceAwaitingReview}</div>
          </div>
          <div className="bg-white rounded-xl border border-charcoal/10 p-4">
            <div className="text-xs text-dark-blue-grey">Scoped Complaints</div>
            <div className="text-2xl font-semibold text-forest-green mt-1">{summary.stats.complaintsCount ?? 0}</div>
          </div>
          <div className="bg-white rounded-xl border border-charcoal/10 p-4">
            <div className="text-xs text-dark-blue-grey">Open Complaints</div>
            <div className="text-2xl font-semibold text-champagne mt-1">{summary.stats.openComplaints ?? 0}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Department Analytics */}
        <div className="bg-white rounded-xl border border-charcoal/10 p-5 space-y-3">
          <h2 className="text-base font-semibold text-forest-green">Department Project Breakdown</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.departmentBreakdown || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d5" />
                <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="projects" fill="#527C91" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-charcoal/10 p-5 space-y-3">
          <div className="flex items-center gap-2 text-forest-green">
            <Bell className="w-4 h-4" />
            <h2 className="text-base font-semibold">Notifications &amp; Alerts</h2>
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-dark-blue-grey">No notifications yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                    n.is_read ? 'bg-warm-ivory/50 border-charcoal/10' : 'bg-champagne/15 border-champagne'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-forest-green">{n.title}</div>
                    <div className="text-charcoal/80 mt-0.5">{n.body}</div>
                  </div>
                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="p-1 rounded bg-white border border-charcoal/15"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5 text-success-green" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Secure One-Time First Admin Bootstrap (only shown to non-admin users when needed) */}
      {profile && profile.role !== 'admin' && (
        <form onSubmit={handleAdminBootstrap} className="bg-white rounded-xl border border-charcoal/10 p-5 space-y-3">
          <div className="flex items-center gap-2 text-forest-green">
            <KeyRound className="w-4 h-4" />
            <h2 className="text-sm font-semibold">First-Time Owner Admin Bootstrap</h2>
          </div>
          <p className="text-xs text-dark-blue-grey">
            Project owners setting up a fresh database for the first time can enter the one-time server{' '}
            <code>ADMIN_BOOTSTRAP_TOKEN</code> here (automatically disabled once any admin exists).
          </p>
          {bootstrapErr && <p className="text-xs text-terracotta">{bootstrapErr}</p>}
          {bootstrapMsg && <p className="text-xs text-success-green">{bootstrapMsg}</p>}
          <div className="flex flex-wrap gap-2">
            <input
              type="password"
              required
              minLength={16}
              placeholder="Server ADMIN_BOOTSTRAP_TOKEN"
              value={bootstrapToken}
              onChange={(e) => setBootstrapToken(e.target.value)}
              className="flex-1 min-w-[240px] rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
            />
            <button type="submit" className="px-4 py-2 rounded-lg bg-forest-green text-white text-xs font-medium">
              Activate First Admin
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
