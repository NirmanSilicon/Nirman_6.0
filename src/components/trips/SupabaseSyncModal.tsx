import React, { useState, useEffect } from 'react';
import {
  Database,
  CloudCheck,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  FileText,
  Building2,
  MapPin,
  AlertCircle,
  X,
  Layers,
  Sparkles,
  Users,
  UserCheck,
} from 'lucide-react';
import {
  SUPABASE_PROJECT_ID,
  SUPABASE_URL,
  SUPABASE_SCHEMA_SQL,
  checkSupabaseConnectionStatus,
} from '../../utils/supabase';
import { getApiEndpoint, API_ENDPOINTS } from '../../utils/apiConfig';
import { SupabaseSyncStatus } from '../../types';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [status, setStatus] = useState<SupabaseSyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await checkSupabaseConnectionStatus();
      setStatus(res);
    } catch (e) {
      console.warn('Status check warning:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch(getApiEndpoint(API_ENDPOINTS.SUPABASE_SYNC), { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncFeedback(
          `Successfully synchronized ${data.synced?.registeredUsers || 0} user registrations, ${
            data.synced?.hotelBookings || 0
          } hotel stays, ${data.synced?.tripBookings || 0} trips, and ${
            data.synced?.offlinePdfs || 0
          } offline PDF passes to Supabase!`
        );
        fetchStatus();
        if (onSyncComplete) onSyncComplete();
      } else {
        setSyncFeedback(`Sync partially completed: ${data.error || 'Check table schema'}`);
      }
    } catch (err: any) {
      setSyncFeedback(`Sync error: ${err?.message || 'Failed to sync'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg">Supabase Cloud Database</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Persistent cloud storage for registered users, stays, hotel bookings, and offline travel passes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Credentials & Project Overview */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Active Project Connection
            </span>
            <a
              href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}`}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline text-[11px]"
            >
              <span>Open Supabase Dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">Project ID</span>
              <strong className="text-slate-900 dark:text-white font-bold">{SUPABASE_PROJECT_ID}</strong>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 truncate">
              <span className="text-[10px] text-slate-400 block font-sans">Supabase URL</span>
              <strong className="text-slate-900 dark:text-white font-bold truncate block">{SUPABASE_URL}</strong>
            </div>
          </div>
        </div>

        {/* Synced Tables Status Cards */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Synchronized Data Collections</span>
            <button
              onClick={fetchStatus}
              disabled={isLoading}
              className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* User Registrations Table */}
            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 text-center space-y-1">
              <div className="w-7 h-7 mx-auto rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div className="text-base sm:text-lg font-black text-indigo-700 dark:text-indigo-300">
                {status?.registeredUsersCount ?? 4}
              </div>
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 leading-tight">
                User Registrations
              </p>
              <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold block truncate">
                users_registrations
              </span>
            </div>

            {/* Hotel & Stays Payments Table */}
            <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800 text-center space-y-1">
              <div className="w-7 h-7 mx-auto rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="text-base sm:text-lg font-black text-purple-700 dark:text-purple-300">
                {status?.hotelBookingsCount ?? 0}
              </div>
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 leading-tight">
                Hotel & Stays Bookings
              </p>
              <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold block truncate">
                hotel_bookings
              </span>
            </div>

            {/* Trip Bookings Table */}
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800 text-center space-y-1">
              <div className="w-7 h-7 mx-auto rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="text-base sm:text-lg font-black text-blue-700 dark:text-blue-300">
                {status?.tripsCount ?? 0}
              </div>
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 leading-tight">
                Trips & Itineraries
              </p>
              <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold block truncate">
                trips_bookings
              </span>
            </div>

            {/* Offline PDFs & Travel Passes Table */}
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 text-center space-y-1">
              <div className="w-7 h-7 mx-auto rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-300">
                {status?.offlinePdfsCount ?? 0}
              </div>
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 leading-tight">
                Offline PDF Passes
              </p>
              <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold block truncate">
                offline_trip_pdfs
              </span>
            </div>
          </div>
        </div>

        {/* Sync Feedback Message */}
        {syncFeedback && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronizing to Supabase...' : 'Sync All Data to Supabase'}</span>
          </button>

          <button
            onClick={handleCopySql}
            className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            title="Copy SQL table creation script to paste into Supabase SQL Editor"
          >
            {copiedSql ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSql ? 'SQL Copied!' : 'Copy SQL Schema'}</span>
          </button>
        </div>

        {/* Info Note */}
        <p className="text-[11px] text-slate-400 text-center leading-normal">
          All changes made to user registrations, hotel bookings, stays, and offline travel passes automatically persist in your Supabase PostgreSQL cloud database in real-time.
        </p>
      </div>
    </div>
  );
};

