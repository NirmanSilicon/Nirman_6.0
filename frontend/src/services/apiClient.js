import axios from 'axios';
import {
  ANALYTICS_COMPARISONS,
  ENERGY_SERIES_BY_RANGE,
  FACTORY_INFO,
  INITIAL_AGENTS,
  INITIAL_AGENT_LOGS,
  INITIAL_ALERTS,
  INITIAL_BATTERY_STATE,
  INITIAL_SCHEDULES,
  KPI_BY_RANGE,
} from '../data/mockData';

/**
 * Configurable API Client for future backend integration.
 * Set VITE_API_BASE_URL and VITE_USE_MOCK_DATA=false in .env when connecting a live backend.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA !== 'false' || !API_BASE_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL || undefined,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const simulateLatency = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Helper that calls the live endpoint when configured, or resolves with mock data.
 * No backend endpoints are invented or assumed; callers pass explicit paths when ready.
 */
async function fetchWithFallback(endpoint, mockResolver) {
  if (USE_MOCK_DATA) {
    await simulateLatency();
    return mockResolver();
  }
  const response = await apiClient.get(endpoint);
  return response.data;
}

export const vidyutService = {
  isMockMode: () => USE_MOCK_DATA,

  getFactoryInfo: () => fetchWithFallback('/factory', () => FACTORY_INFO),

  getOverviewKpis: (range = 'Today') =>
    fetchWithFallback(`/energy/kpis?range=${range}`, () => KPI_BY_RANGE[range] || KPI_BY_RANGE.Today),

  getEnergySeries: (range = 'Today') =>
    fetchWithFallback(
      `/energy/series?range=${range}`,
      () => ENERGY_SERIES_BY_RANGE[range] || ENERGY_SERIES_BY_RANGE.Today
    ),

  getAgents: () => fetchWithFallback('/agents', () => INITIAL_AGENTS),

  getAgentLogs: () => fetchWithFallback('/agents/logs', () => INITIAL_AGENT_LOGS),

  getSchedules: () => fetchWithFallback('/schedules', () => INITIAL_SCHEDULES),

  getBatteryState: () => fetchWithFallback('/battery', () => INITIAL_BATTERY_STATE),

  getAnalytics: () => fetchWithFallback('/analytics', () => ANALYTICS_COMPARISONS),

  getAlerts: () => fetchWithFallback('/alerts', () => INITIAL_ALERTS),
};
