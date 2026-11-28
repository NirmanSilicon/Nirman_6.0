import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { vidyutService } from '../services/apiClient';
import {
  FACTORY_INFO,
  KPI_BY_RANGE,
  ENERGY_SERIES_BY_RANGE,
} from '../data/mockData';

const VidyutContext = createContext(null);
const AUTH_STORAGE_KEY = 'vidyutsync_auth_user';

function readStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function VidyutProvider({ children }) {
  const [authUser, setAuthUser] = useState(() => readStoredUser());
  const [factoryInfo, setFactoryInfo] = useState(FACTORY_INFO);
  const [dateRange, setDateRange] = useState('Today');
  const [selectedDate, setSelectedDate] = useState('2026-11-28');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [agents, setAgents] = useState([]);
  const [agentLogs, setAgentLogs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [battery, setBattery] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [toast, setToast] = useState(null);

  const [settings, setSettings] = useState({
    factoryName: FACTORY_INFO.name,
    location: FACTORY_INFO.location,
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'Not configured (Using Simulated Data)',
    maxNoiseLimitDba: 85,
    autoApproveSavingsThreshold: 0,
    shiftStartHour: 6,
    shiftEndHour: 22,
    simulateOfflineError: false,
  });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ id: Date.now(), message, type });
  }, []);

  const login = useCallback(
    (userData) => {
      const user = {
        name: userData?.name || 'Plant Ops Lead',
        email: userData?.email || 'demo.ops@vidyutsync.in',
        role: userData?.role || 'Shift A · Supervisor',
        initials: (userData?.name || 'PO')
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        isDemo: Boolean(userData?.isDemo),
      };
      setAuthUser(user);
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } catch {
        // ignore storage errors
      }
      showToast(
        user.isDemo
          ? `Signed in as Demo ${user.name}.`
          : `Welcome back, ${user.name}.`,
        'success'
      );
    },
    [showToast]
  );

  const register = useCallback(
    (userData) => {
      const user = {
        name: userData?.name || 'Operator',
        email: userData?.email || '',
        role: userData?.company ? `${userData.company}` : 'Shift A · Operator',
        initials: (userData?.name || 'OP')
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        isDemo: false,
      };
      setAuthUser(user);
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } catch {
        // ignore storage errors
      }
      showToast(`Account created for ${user.name}.`, 'success');
    },
    [showToast]
  );

  const logout = useCallback(() => {
    setAuthUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
    showToast('Signed out of VidyutSync.', 'info');
  }, [showToast]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fInfo, ag, logs, sched, batt, anal, alrt] = await Promise.all([
        vidyutService.getFactoryInfo(),
        vidyutService.getAgents(),
        vidyutService.getAgentLogs(),
        vidyutService.getSchedules(),
        vidyutService.getBatteryState(),
        vidyutService.getAnalytics(),
        vidyutService.getAlerts(),
      ]);
      setFactoryInfo(fInfo);
      setAgents(ag);
      setAgentLogs(logs);
      setSchedules(sched);
      setBattery(batt);
      setAnalytics(anal);
      setAlerts(alrt);
    } catch (err) {
      setError(err?.message || 'Failed to load VidyutSync telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const kpis = KPI_BY_RANGE[dateRange] || KPI_BY_RANGE.Today;
  const energySeries = ENERGY_SERIES_BY_RANGE[dateRange] || ENERGY_SERIES_BY_RANGE.Today;

  const approveSchedule = useCallback(
    (scheduleId) => {
      let targetMachine = '';
      setSchedules((prev) =>
        prev.map((item) => {
          if (item.id === scheduleId) {
            targetMachine = item.machineId;
            return {
              ...item,
              recommendationStatus: 'Approved',
              operatingStatus: 'Scheduled',
            };
          }
          return item;
        })
      );

      if (targetMachine) {
        setAgentLogs((prev) => [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            }) + ' IST',
            stage: 'Act & Observe',
            agentId: 'production-scheduling',
            agentName: 'Production Scheduling Agent',
            action: `Operator approved AI schedule shift #${scheduleId} for ${targetMachine}. Updated shop-floor execution plan.`,
            status: 'completed',
          },
          ...prev,
        ]);
        showToast(`Approved AI schedule for ${targetMachine} (#${scheduleId}).`, 'success');
      }
    },
    [showToast]
  );

  const rejectSchedule = useCallback(
    (scheduleId) => {
      let targetMachine = '';
      setSchedules((prev) =>
        prev.map((item) => {
          if (item.id === scheduleId) {
            targetMachine = item.machineId;
            return {
              ...item,
              recommendationStatus: 'Rejected',
            };
          }
          return item;
        })
      );

      if (targetMachine) {
        setAgentLogs((prev) => [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            }) + ' IST',
            stage: 'Act & Observe',
            agentId: 'production-scheduling',
            agentName: 'Production Scheduling Agent',
            action: `Operator rejected AI recommendation #${scheduleId} for ${targetMachine}. Retained original schedule.`,
            status: 'completed',
          },
          ...prev,
        ]);
        showToast(`Rejected recommendation for ${targetMachine}. Original schedule kept.`, 'info');
      }
    },
    [showToast]
  );

  const overrideSchedule = useCallback(
    (scheduleId, startHour, endHour) => {
      const fmt = (h) => `${String(h).padStart(2, '0')}:00`;
      const newWindow = `${fmt(startHour)} – ${fmt(endHour)}`;
      let targetMachine = '';
      setSchedules((prev) =>
        prev.map((item) => {
          if (item.id === scheduleId) {
            targetMachine = item.machineId;
            return {
              ...item,
              recommendedStart: startHour,
              recommendedEnd: endHour,
              recommendedSchedule: newWindow,
              recommendationStatus: 'Manual Override',
            };
          }
          return item;
        })
      );
      if (targetMachine) {
        setAgentLogs((prev) => [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            }) + ' IST',
            stage: 'Act & Observe',
            agentId: 'ergonomics-shift',
            agentName: 'Ergonomics & Shift Agent',
            action: `Manual override applied for ${targetMachine} (${newWindow}). Ergonomic constraints re-validated.`,
            status: 'completed',
          },
          ...prev,
        ]);
        showToast(`Manual override saved for ${targetMachine}: ${newWindow}.`, 'warning');
      }
    },
    [showToast]
  );

  const updateReserveThreshold = useCallback(
    (newThreshold) => {
      setBattery((prev) =>
        prev
          ? {
              ...prev,
              reserveThresholdPercent: newThreshold,
              hourlyActivity: prev.hourlyActivity.map((pt) => ({
                ...pt,
                reserve: newThreshold,
              })),
            }
          : prev
      );
      showToast(`Battery minimum reserve threshold updated to ${newThreshold}%.`, 'success');
    },
    [showToast]
  );

  const markAlertRead = useCallback((id) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  }, []);

  const markAllAlertsRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    showToast('All notifications marked as read.', 'info');
  }, [showToast]);

  const dismissAlert = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const updateSettings = useCallback(
    (partial) => {
      setSettings((prev) => ({ ...prev, ...partial }));
      if (partial.factoryName) {
        setFactoryInfo((prev) => ({ ...prev, name: partial.factoryName }));
      }
      showToast('Platform settings saved.', 'success');
    },
    [showToast]
  );

  const unreadAlertCount = alerts.filter((a) => !a.read).length;

  return (
    <VidyutContext.Provider
      value={{
        authUser,
        login,
        register,
        logout,
        factoryInfo,
        dateRange,
        setDateRange,
        selectedDate,
        setSelectedDate,
        loading,
        error,
        refreshData: loadDashboardData,
        kpis,
        energySeries,
        agents,
        agentLogs,
        schedules,
        battery,
        analytics,
        alerts,
        unreadAlertCount,
        toast,
        setToast,
        showToast,
        approveSchedule,
        rejectSchedule,
        overrideSchedule,
        updateReserveThreshold,
        markAlertRead,
        markAllAlertsRead,
        dismissAlert,
        settings,
        updateSettings,
      }}
    >
      {children}
    </VidyutContext.Provider>
  );
}

export function useVidyut() {
  const ctx = useContext(VidyutContext);
  if (!ctx) {
    throw new Error('useVidyut must be used within a VidyutProvider');
  }
  return ctx;
}
