import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AlertNotificationProvider } from './context/AlertNotificationContext';
import { GlobalHeader } from './components/layout/GlobalHeader';
import { AlertNotificationCenter } from './components/emergency/AlertNotificationCenter';
import { MotherBottomNav, MotherTab } from './components/layout/MotherBottomNav';
import { WorkerBottomNav, WorkerTab } from './components/layout/WorkerBottomNav';
import { SupervisorBottomNav, SupervisorTab } from './components/layout/SupervisorBottomNav';

// Screens
import { LoginScreen } from './screens/auth/LoginScreen';
import { MotherHomeScreen } from './screens/mother/MotherHomeScreen';
import { MotherJourneyScreen } from './screens/mother/MotherJourneyScreen';
import { MotherConnectScreen } from './screens/mother/MotherConnectScreen';
import { MotherWellnessScreen } from './screens/mother/MotherWellnessScreen';
import { MotherProfileScreen } from './screens/mother/MotherProfileScreen';

import { WorkerHomeScreen } from './screens/worker/WorkerHomeScreen';
import { WorkerPatientsScreen } from './screens/worker/WorkerPatientsScreen';
import { WorkerNewAssessmentScreen } from './screens/worker/WorkerNewAssessmentScreen';
import { WorkerAssessmentResultScreen } from './screens/worker/WorkerAssessmentResultScreen';
import { WorkerReferralsScreen } from './screens/worker/WorkerReferralsScreen';
import { WorkerMoreScreen } from './screens/worker/WorkerMoreScreen';

import { SupervisorOverviewScreen } from './screens/supervisor/SupervisorOverviewScreen';
import { SupervisorWorkersScreen } from './screens/supervisor/SupervisorWorkersScreen';
import { SupervisorAssignScreen } from './screens/supervisor/SupervisorAssignScreen';
import { SupervisorReferralsScreen } from './screens/supervisor/SupervisorReferralsScreen';
import { SupervisorReportsScreen } from './screens/supervisor/SupervisorReportsScreen';
import { SupervisorMoreScreen } from './screens/supervisor/SupervisorMoreScreen';
import { EmergencyAlertsScreen } from './screens/emergency/EmergencyAlertsScreen';
import { MotherAiCompanion } from './components/mother/MotherAiCompanion';
import { MaternalAssessment } from './types';

const MainAppContent: React.FC = () => {
  const { role } = useAuth();
  const { assessments } = useData();
  const { t } = useLanguage();

  // Navigation states per role
  const [motherTab, setMotherTab] = useState<MotherTab>('home');
  const [workerTab, setWorkerTab] = useState<WorkerTab>('home');
  const [supervisorTab, setSupervisorTab] = useState<SupervisorTab>('overview');

  // Sub-flow states
  const [workerSubView, setWorkerSubView] = useState<
    'normal' | 'new_assessment' | 'assessment_result' | 'refer_flow'
  >('normal');
  const [assessmentForResults, setAssessmentForResults] = useState<MaternalAssessment | null>(null);
  const [targetMotherId, setTargetMotherId] = useState<string | undefined>(undefined);

  const [supervisorSubView, setSupervisorSubView] = useState<'normal' | 'assign_wizard'>('normal');
  const [preselectedWorkerForAssign, setPreselectedWorkerForAssign] = useState<string | undefined>(undefined);

  const navigateToAlertByRole = (alertId?: string | null) => {
    if (!role) return;
    if (role === 'mother') {
      setMotherTab('alerts');
    } else if (role === 'worker') {
      setWorkerSubView('normal');
      setWorkerTab('alerts');
    } else if (role === 'supervisor') {
      setSupervisorSubView('normal');
      setSupervisorTab('alerts');
    }
    if (alertId) {
      window.setTimeout(() => {
        const el = document.querySelector(`[data-testid="emergency-alert-card-${alertId}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 180);
    }
  };

  useEffect(() => {
    if (!role) return;
    const params = new URLSearchParams(window.location.search);
    const alertId = params.get('alertId');
    if (alertId) {
      navigateToAlertByRole(alertId);
    }

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'JANMASAATHI_NOTIFICATION_CLICK') {
        navigateToAlertByRole(event.data.alertId);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSwMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleSwMessage);
    };
  }, [role]);

  // If unauthenticated, show common 3-tab login
  if (!role) {
    return <LoginScreen />;
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-sans">
      {/* Global Header */}
      <GlobalHeader
        onOpenProfile={() => {
          if (role === 'mother') setMotherTab('profile');
          else if (role === 'worker') setWorkerTab('more');
          else if (role === 'supervisor') setSupervisorTab('more');
        }}
        onOpenAlert={(alertId) => navigateToAlertByRole(alertId)}
      />

      <AlertNotificationCenter onOpenAlert={(alertId) => navigateToAlertByRole(alertId)} />

      {/* Main Screen Container with responsive max-width to look authentic on mobile & desktop */}
      <main className="flex-1 w-full max-w-lg mx-auto pt-20 pb-24 px-4 sm:px-6">
        {/* ROLE A: MOTHER */}
        {role === 'mother' && (
          <>
            {motherTab === 'home' && (
              <MotherHomeScreen
                onNavigateToJourney={() => setMotherTab('journey')}
                onNavigateToConnect={() => setMotherTab('connect')}
                onNavigateToProfile={() => setMotherTab('profile')}
              />
            )}
            {motherTab === 'journey' && <MotherJourneyScreen />}
            {motherTab === 'wellness' && (
              <MotherWellnessScreen
                onNavigateToConnect={() => setMotherTab('connect')}
                onOpenProfile={() => setMotherTab('profile')}
              />
            )}
            {motherTab === 'connect' && <MotherConnectScreen />}
            {motherTab === 'alerts' && <EmergencyAlertsScreen />}
            {motherTab === 'profile' && <MotherProfileScreen />}
          </>
        )}

        {/* ROLE B: HEALTH WORKER */}
        {role === 'worker' && (
          <>
            {workerSubView === 'new_assessment' ? (
              <WorkerNewAssessmentScreen
                initialMotherId={targetMotherId}
                onAssessmentCompleted={(newAssessment) => {
                  setAssessmentForResults(newAssessment);
                  setWorkerSubView('assessment_result');
                }}
                onCancel={() => setWorkerSubView('normal')}
              />
            ) : workerSubView === 'assessment_result' && assessmentForResults ? (
              <WorkerAssessmentResultScreen
                assessment={assessmentForResults}
                onReferMother={(mId) => {
                  setTargetMotherId(mId);
                  setWorkerTab('referrals');
                  setWorkerSubView('normal');
                }}
                onReturnToAssessments={() => {
                  setWorkerSubView('normal');
                  setWorkerTab('home');
                }}
                onScheduleVisit={() => {
                  setWorkerSubView('normal');
                  setWorkerTab('home');
                }}
              />
            ) : (
              <>
                {workerTab === 'home' && (
                  <WorkerHomeScreen
                    onStartNewAssessment={(mId) => {
                      setTargetMotherId(mId);
                      setWorkerSubView('new_assessment');
                    }}
                    onNavigateToPatients={() => setWorkerTab('patients')}
                    onNavigateToReferrals={() => setWorkerTab('referrals')}
                    onSelectMother={(mId) => {
                      setTargetMotherId(mId);
                      setWorkerTab('patients');
                    }}
                    onRegisterMother={() => setWorkerTab('patients')}
                  />
                )}
                {workerTab === 'patients' && (
                  <WorkerPatientsScreen
                    onStartNewAssessment={(mId) => {
                      setTargetMotherId(mId);
                      setWorkerSubView('new_assessment');
                    }}
                    onCreateReferral={(mId) => {
                      setTargetMotherId(mId);
                      setWorkerTab('referrals');
                    }}
                  />
                )}
                {workerTab === 'assessments' && (
                  <div className="space-y-space-md">
                    <div className="flex items-center justify-between">
                      <h1 className="font-serif text-2xl text-primary">{t('maternalAssessmentsTitle')}</h1>
                      <button
                        onClick={() => {
                          setTargetMotherId(undefined);
                          setWorkerSubView('new_assessment');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary text-xs font-semibold"
                      >
                        {t('newMaternalAssessment')}
                      </button>
                    </div>
                    <div className="space-y-space-sm">
                      {assessments.map((a) => (
                        <div
                          key={a.id}
                          className="bg-surface-container p-3 rounded-xl border border-outline-variant/40 space-y-1.5"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-sm">{a.motherName}</span>
                            <span className="text-xs text-secondary">{a.recordedAt}</span>
                          </div>
                          <div className="text-xs text-secondary flex justify-between">
                            <span>{t('vitalsBP')}: {a.systolicBP}/{a.diastolicBP} mmHg</span>
                            <span>{t('weekLabel', { num: a.gestationalWeek })}</span>
                            <span className="text-primary font-semibold">
                              {a.ruleBasedDangerIdentified ? t('flaggedForReview') : t('filterLowRisk')}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setAssessmentForResults(a);
                              setWorkerSubView('assessment_result');
                            }}
                            className="text-xs text-primary-container font-semibold hover:underline"
                          >
                            {t('viewClinicalResult')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {workerTab === 'referrals' && (
                  <WorkerReferralsScreen initialMotherId={targetMotherId} />
                )}
                {workerTab === 'alerts' && <EmergencyAlertsScreen />}
                {workerTab === 'more' && <WorkerMoreScreen />}
              </>
            )}
          </>
        )}

        {/* ROLE C: SUPERVISOR */}
        {role === 'supervisor' && (
          <>
            {supervisorSubView === 'assign_wizard' ? (
              <SupervisorAssignScreen
                preselectedWorkerId={preselectedWorkerForAssign}
                onFinished={() => setSupervisorSubView('normal')}
                onCancel={() => setSupervisorSubView('normal')}
              />
            ) : (
              <>
                {supervisorTab === 'overview' && (
                  <SupervisorOverviewScreen
                    onNavigateToAssign={() => {
                      setPreselectedWorkerForAssign(undefined);
                      setSupervisorSubView('assign_wizard');
                    }}
                    onNavigateToWorkers={() => setSupervisorTab('workers')}
                    onNavigateToReferrals={() => setSupervisorTab('referrals')}
                    onNavigateToReports={() => setSupervisorTab('reports')}
                  />
                )}
                {supervisorTab === 'workers' && (
                  <SupervisorWorkersScreen
                    onStartAssign={(wId) => {
                      setPreselectedWorkerForAssign(wId);
                      setSupervisorSubView('assign_wizard');
                    }}
                  />
                )}
                {supervisorTab === 'referrals' && <SupervisorReferralsScreen />}
                {supervisorTab === 'alerts' && <EmergencyAlertsScreen />}
                {supervisorTab === 'reports' && <SupervisorReportsScreen />}
                {supervisorTab === 'more' && <SupervisorMoreScreen />}
              </>
            )}
          </>
        )}
      </main>

      {/* Role-Specific Bottom Navigation & Mother AI Companion */}
      {role === 'mother' && (
        <>
          <MotherAiCompanion />
          <MotherBottomNav activeTab={motherTab} onTabChange={setMotherTab} />
        </>
      )}
      {role === 'worker' && workerSubView === 'normal' && (
        <WorkerBottomNav activeTab={workerTab} onTabChange={setWorkerTab} />
      )}
      {role === 'supervisor' && supervisorSubView === 'normal' && (
        <SupervisorBottomNav activeTab={supervisorTab} onTabChange={setSupervisorTab} />
      )}
    </div>
  );
};

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Unexpected rendering error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#fafaee] text-[#30232A] flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white border border-[#D9A2B5] rounded-2xl p-6 shadow-sm space-y-3 text-center">
            <h1 className="font-serif text-xl text-[#890149]">JanmaSaathi</h1>
            <p className="text-sm text-[#30232A]/80">
              Unable to display this screen right now. Please reload the page.
            </p>
            <p className="text-xs text-[#890149]/80 break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-[#890149] text-white text-xs font-semibold cursor-pointer"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <LanguageProvider>
            <AlertNotificationProvider>
              <MainAppContent />
            </AlertNotificationProvider>
          </LanguageProvider>
        </DataProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
