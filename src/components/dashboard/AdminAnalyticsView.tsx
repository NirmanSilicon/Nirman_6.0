import React, { useState, useEffect } from 'react';
import { AdminAnalytics } from '../../types';
import { getApiEndpoint, API_ENDPOINTS } from '../../utils/apiConfig';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Users,
  Clock,
  Building,
  TrendingUp,
  Award,
  Download,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export const AdminAnalyticsView: React.FC = () => {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(getApiEndpoint(API_ENDPOINTS.ADMIN_ANALYTICS));
      const data = await res.json();
      setAnalytics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading || !analytics) {
    return (
      <div className="p-12 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
        <p>Loading Universal Accessibility Metrics & Audit Logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            Universal Design Intelligence Dashboard
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            System Accessibility Analytics & KPI Tracker
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Real-time audit compliance, barrier resolution timelines, and global coverage density
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-2xl text-xs flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Hero KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase">Audited Destinations</span>
            <Building className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {analytics.totalDestinations}
          </div>
          <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{analytics.verifiedLocations} Verified (94.2%)</span>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase">Average Access Score</span>
            <Award className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {analytics.averageAccessibilityScore} / 100
          </div>
          <div className="text-xs text-slate-500">
            Across 6 International Hubs
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase">Avg Resolution Time</span>
            <Clock className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-purple-600 dark:text-purple-400">
            {analytics.resolutionAverageHours} Hours
          </div>
          <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>38 Barriers Cleared this month</span>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase">Travelers Guided</span>
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
            {analytics.totalUsersServed.toLocaleString()}+
          </div>
          <div className="text-xs text-emerald-600 font-bold">
            {analytics.userSatisfactionRate}% User Satisfaction
          </div>
        </div>
      </div>

      {/* Distribution & City Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* City Coverage */}
        <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" />
            <span>Municipal & Regional Coverage Density</span>
          </h3>

          <div className="space-y-3">
            {analytics.cityCoverage.map((city) => (
              <div
                key={city.city}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{city.city}</div>
                  <div className="text-xs text-slate-500">{city.count} audited places</div>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold">
                    Avg Score: {city.score}/100
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Barrier Types Distribution */}
        <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span>Barrier Incident Distribution</span>
          </h3>

          <div className="space-y-3">
            {analytics.barrierTypesDistribution.map((item) => (
              <div key={item.type} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>{item.type.replace(/_/g, ' ')}</span>
                  <span>{item.count} reports</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${(item.count / 20) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
            <strong>Compliance Note:</strong> 88% of reported lift outages resolved within 4 hours through municipal coordination.
          </div>
        </div>
      </div>
    </div>
  );
};
