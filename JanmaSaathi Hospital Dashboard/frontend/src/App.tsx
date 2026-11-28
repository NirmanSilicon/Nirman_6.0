import React from 'react';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import { Layout } from './components/Layout';
import { LoginPage } from './components/LoginPage';
import { FirebaseErrorBoundary } from './components/ui/FirestoreStatePanels';
import { AnalyticsView } from './components/views/AnalyticsView';
import { AppointmentsView } from './components/views/AppointmentsView';
import { AuditLogsView } from './components/views/AuditLogsView';
import { EmergencyAlertsView } from './components/views/EmergencyAlertsView';
import { HealthWorkersView } from './components/views/HealthWorkersView';
import { MotherProfileView } from './components/views/MotherProfileView';
import { MotherRecordsView } from './components/views/MotherRecordsView';
import { OverviewView } from './components/views/OverviewView';
import { ReferralsView } from './components/views/ReferralsView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';

const DashboardRouter: React.FC = () => {
  const {
    appMode,
    authReady,
    isAuthenticated,
    roleCategory,
    permittedSections,
    currentUser,
    logout,
    activeSection,
    setActiveSection,
    selectedMotherId,
    mothers,
  } = useDashboard();

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F3F3E7] flex flex-col items-center justify-center p-6 text-center">
        <img
          src="/assets/aistudio/JanmaSaathi_593643c1.png"
          alt="JanmaSaathi emblem"
          referrerPolicy="no-referrer"
          className="w-12 h-12 object-contain mb-4"
        />
        <p className="font-serif text-xl text-[#30232A]">JanmaSaathi Hospital Dashboard</p>
        <p className="mt-1.5 text-xs text-[#665860]">
          Initializing JanmaSaathi Hospital Dashboard...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Fail-closed gate:
  // - In live Firebase Integration Mode, ONLY verified Hospital Staff & Supervisors may access the Hospital Dashboard.
  // - Unrecognized roles are always blocked in every mode.
  const isBlockedLiveNonHospitalRole =
    appMode === 'firebase' && roleCategory !== 'hospital_staff' && roleCategory !== 'supervisor';

  if (roleCategory === 'unauthorized' || permittedSections.length === 0 || isBlockedLiveNonHospitalRole) {
    return (
      <div className="min-h-screen bg-[#F3F3E7] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-[#DDD8CB] rounded-lg p-7 text-center space-y-4">
          <img
            src="/assets/aistudio/JanmaSaathi_593643c1.png"
            alt="JanmaSaathi emblem"
            referrerPolicy="no-referrer"
            className="w-11 h-11 object-contain mx-auto"
          />
          <div>
            <h1 className="font-serif text-2xl text-[#30232A]">Hospital Access Restricted</h1>
            <p className="mt-2 text-xs text-[#665860] leading-relaxed">
              {isBlockedLiveNonHospitalRole ? (
                <>
                  This portal is restricted to authorized Hospital personnel and clinical Supervisors. Your account (
                  <span className="font-medium text-[#30232A]">{currentUser.email || currentUser.uid}</span> ·{' '}
                  <span className="font-medium text-[#30232A]">{currentUser.role}</span>) should sign in through the JanmaSaathi PWA.
                </>
              ) : (
                <>
                  Your authenticated account (
                  <span className="font-medium text-[#30232A]">{currentUser.email || currentUser.uid}</span>) does not currently hold an authorized hospital or supervisor role in{' '}
                  <code className="text-[#30232A]">users/{'{uid}'}</code>. Clinical records remain protected.
                </>
              )}
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => void logout()}
              className="px-4 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderActiveView = () => {
    if (selectedMotherId) {
      const authorizedMother = mothers.find((m) => m.id === selectedMotherId);
      if (!authorizedMother) {
        return (
          <div className="bg-white border border-[#DDD8CB] rounded-lg p-8 text-center space-y-3">
            <h2 className="font-serif text-xl text-[#30232A]">Record Access Restricted</h2>
            <p className="text-xs text-[#665860] max-w-md mx-auto">
              You are not authorized to view this maternal profile under your active role ({currentUser.role}).
            </p>
          </div>
        );
      }
      return <MotherProfileView motherId={selectedMotherId} />;
    }

    if (!permittedSections.includes(activeSection)) {
      const fallbackSection = permittedSections[0];
      return (
        <div className="bg-white border border-[#DDD8CB] rounded-lg p-8 text-center space-y-3">
          <h2 className="font-serif text-xl text-[#30232A]">Hospital-Only Section Restricted</h2>
          <p className="text-xs text-[#665860] max-w-md mx-auto leading-relaxed">
            Your active role (<span className="font-semibold text-[#30232A]">{currentUser.role}</span>) is not permitted to access this hospital section.
          </p>
          {fallbackSection && (
            <button
              type="button"
              onClick={() => setActiveSection(fallbackSection)}
              className="px-4 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md cursor-pointer"
            >
              Return to Permitted View
            </button>
          )}
        </div>
      );
    }

    switch (activeSection) {
      case 'overview':
        return <OverviewView />;
      case 'mothers':
        return <MotherRecordsView />;
      case 'health-workers':
        return <HealthWorkersView />;
      case 'alerts':
        return <EmergencyAlertsView />;
      case 'referrals':
        return <ReferralsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'appointments':
        return <AppointmentsView />;
      case 'reports':
        return <ReportsView />;
      case 'audit-logs':
        return <AuditLogsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <OverviewView />;
    }
  };

  return <Layout>{renderActiveView()}</Layout>;
};

export default function App() {
  return (
    <FirebaseErrorBoundary>
      <DashboardProvider>
        <DashboardRouter />
      </DashboardProvider>
    </FirebaseErrorBoundary>
  );
}
