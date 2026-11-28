import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { VidyutProvider, useVidyut } from './context/VidyutContext';
import { Layout } from './components/layout/Layout';
import { Toast } from './components/ui/Toast';
import { OverviewPage } from './pages/OverviewPage';
import { EnergyMonitoringPage } from './pages/EnergyMonitoringPage';
import { ProductionSchedulingPage } from './pages/ProductionSchedulingPage';
import { AgentsPage } from './pages/AgentsPage';
import { BatteryStoragePage } from './pages/BatteryStoragePage';
import { AnalyticsReportsPage } from './pages/AnalyticsReportsPage';
import { AlertsPage } from './pages/AlertsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

function ProtectedRoutes() {
  const { authUser } = useVidyut();
  if (!authUser) {
    return <Navigate to="/login" replace />;
  }
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/energy" element={<EnergyMonitoringPage />} />
        <Route path="/scheduling" element={<ProductionSchedulingPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/battery" element={<BatteryStoragePage />} />
        <Route path="/analytics" element={<AnalyticsReportsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function PublicAuthRoute({ children }) {
  const { authUser } = useVidyut();
  if (authUser) {
    return <Navigate to="/" replace />;
  }
  return (
    <>
      {children}
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <VidyutProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicAuthRoute>
                <LoginPage />
              </PublicAuthRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicAuthRoute>
                <RegisterPage />
              </PublicAuthRoute>
            }
          />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </VidyutProvider>
    </BrowserRouter>
  );
}
