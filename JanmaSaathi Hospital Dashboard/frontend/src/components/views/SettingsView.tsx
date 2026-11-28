import React, { useState } from 'react';
import {
  Bell,
  BellOff,
  Check,
  Database,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { firebaseRuntimeConfig } from '../../lib/firebase';
import { CollectionKey } from '../../types/hospital';
import { HospitalCrest, SectionHeader, StatusText } from '../ui/ClinicalPrimitives';

const TRACKED_COLLECTIONS: CollectionKey[] = [
  'users',
  'mothers',
  'healthWorkers',
  'supervisors',
  'assignments',
  'assessments',
  'healthUpdates',
  'referrals',
  'appointments',
  'reports',
  'emergencyAlerts',
  'alerts',
  'auditLogs',
];

export const SettingsView: React.FC = () => {
  const {
    appMode,
    setAppMode,
    currentFacility,
    currentUser,
    connectionCheck,
    storageCheck,
    collectionStatuses,
    retryConnection,
    refreshAllSubscriptions,
    resetDemoFixtures,
    logAuditAction,
    canMutate,
    alertSoundEnabled,
    enableAlertSound,
    disableAlertSound,
    testAlertSound,
    alertSoundStatusMessage,
    alertAudioBlocked,
    notificationPermission,
    fcmStatus,
    fcmMessage,
    fcmDeviceId,
    fcmTokenPreview,
    fcmVapidConfigured,
    fcmBusy,
    enableBrowserPushNotifications,
    disableBrowserPushNotifications,
  } = useDashboard();
  const canManageSettings = canMutate('manage_settings');
  const canResetDemo = canMutate('reset_demo');

  const [bpSystolicThreshold, setBpSystolicThreshold] = useState('140');
  const [bpDiastolicThreshold, setBpDiastolicThreshold] = useState('90');
  const [criticalHbThreshold, setCriticalHbThreshold] = useState('7.0');
  const [slaTargetMinutes, setSlaTargetMinutes] = useState('15');
  const [regionalScriptDisplay, setRegionalScriptDisplay] = useState<'odia-devanagari' | 'latin-only'>(
    'odia-devanagari'
  );
  const [savedNotice, setSavedNotice] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSettings) return;
    void logAuditAction(
      'Clinical Note',
      `Updated Hospital Alert Thresholds (BP ${bpSystolicThreshold}/${bpDiastolicThreshold}, Hb < ${criticalHbThreshold})`,
      currentFacility.name,
      `${currentUser.role} · Clinical Preferences`
    );
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3500);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Settings"
        subtitle="Application mode management (Demo Mode vs Firebase Integration Mode), facility identity, and clinical alert thresholds."
      />

      {/* Application Mode & Backend Configuration Card */}
      <section className="bg-white border border-[#DDD8CB] rounded-lg p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#EAE5D9]">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-[#890149] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-serif text-xl text-[#30232A]">
                Application Mode &amp; Firebase Configuration
              </h2>
              <p className="text-xs text-[#665860] mt-0.5">
                Switch cleanly between isolated JanmaSaathi Demo Fixtures and the existing{' '}
                <code className="text-[#30232A]">outr-janmasaathi</code> Firestore backend.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center p-1 bg-[#EAE9DC] rounded-md text-xs">
            <button
              type="button"
              onClick={() => setAppMode('demo')}
              className={`px-3.5 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                appMode === 'demo'
                  ? 'bg-white text-[#890149] shadow-xs'
                  : 'text-[#665860] hover:text-[#30232A]'
              }`}
            >
              Demo Mode
            </button>
            <button
              type="button"
              onClick={() => setAppMode('firebase')}
              className={`px-3.5 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                appMode === 'firebase'
                  ? 'bg-white text-[#890149] shadow-xs'
                  : 'text-[#665860] hover:text-[#30232A]'
              }`}
            >
              Firebase Integration Mode
            </button>
          </div>
        </div>

        <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
          <div>
            <dt className="text-[#665860]">Active Runtime Mode</dt>
            <dd className="mt-1 font-semibold text-[#890149]">
              {appMode === 'demo' ? 'DEMO MODE (Local Fixtures)' : 'FIREBASE INTEGRATION MODE'}
            </dd>
          </div>
          <div>
            <dt className="text-[#665860]">Existing Firebase Project ID</dt>
            <dd className="mt-1 font-medium text-[#30232A] tabular-nums">
              {firebaseRuntimeConfig.projectId}
            </dd>
          </div>
          <div>
            <dt className="text-[#665860]">Named Firestore Database ID</dt>
            <dd className="mt-1 font-medium text-[#30232A] tabular-nums break-all">
              {firebaseRuntimeConfig.databaseId}
            </dd>
          </div>
          <div>
            <dt className="text-[#665860]">Firebase Storage Bucket</dt>
            <dd className="mt-1 font-medium text-[#30232A] tabular-nums break-all">
              {firebaseRuntimeConfig.storageBucket}
            </dd>
          </div>
          <div>
            <dt className="text-[#665860]">Backend Connectivity</dt>
            <dd className="mt-1 space-y-1">
              <StatusText
                label={
                  appMode === 'demo'
                    ? 'Demo Isolated'
                    : connectionCheck.status === 'connected'
                    ? 'Firestore Reachable'
                    : connectionCheck.status === 'idle'
                    ? 'Checking…'
                    : `Firestore: ${connectionCheck.status}`
                }
                tone={
                  appMode === 'demo' || connectionCheck.status === 'idle'
                    ? 'neutral'
                    : connectionCheck.status === 'connected'
                    ? 'positive'
                    : 'critical'
                }
                className="text-xs block"
              />
              {appMode === 'firebase' && (
                <StatusText
                  label={
                    storageCheck.status === 'connected'
                      ? 'Storage Reachable'
                      : storageCheck.status === 'not-initialized'
                      ? 'Storage Not Initialized (Voice via /api/voice-messages)'
                      : storageCheck.status === 'idle'
                      ? 'Storage Checking…'
                      : `Storage: ${storageCheck.status}`
                  }
                  tone={
                    storageCheck.status === 'idle' || storageCheck.status === 'not-initialized'
                      ? 'neutral'
                      : storageCheck.status === 'connected'
                      ? 'positive'
                      : 'critical'
                  }
                  className="text-xs block"
                />
              )}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {appMode === 'demo' ? (
            canResetDemo ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    resetDemoFixtures();
                    setResetNotice(true);
                    setTimeout(() => setResetNotice(false), 3000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#DDD8CB] hover:border-[#890149] text-[#30232A] rounded-md cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Demo Fixtures</span>
                </button>
                {resetNotice && (
                  <span className="text-xs text-[#15803D] font-medium">
                    Original JanmaSaathi demo records restored.
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-[#665860]">
                Demo fixture resets require Hospital Admin / Demo Access role.
              </span>
            )
          ) : (
            <button
              type="button"
              onClick={() => {
                retryConnection();
                refreshAllSubscriptions();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-test Connection &amp; Re-sync Collections</span>
            </button>
          )}
        </div>

        {/* Collection Status Table */}
        <div className="pt-4 border-t border-[#EAE5D9]">
          <p className="text-xs font-semibold text-[#30232A] mb-3">
            {appMode === 'demo'
              ? 'Preserved JanmaSaathi Demo Fixture Collections'
              : 'Live Firestore Collection Sync Status'}
          </p>
          <div className="border border-[#EAE5D9] rounded-md overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FBFBF7] border-b border-[#EAE5D9] text-[#665860] font-medium">
                  <th className="py-2 px-3">Collection</th>
                  <th className="py-2 px-3">Path</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Records</th>
                  <th className="py-2 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE5D9] tabular-nums">
                {TRACKED_COLLECTIONS.map((key) => {
                  const st = collectionStatuses[key];
                  return (
                    <tr key={key}>
                      <td className="py-2 px-3 font-medium text-[#30232A]">{key}</td>
                      <td className="py-2 px-3 text-[#665860]">{st.path}</td>
                      <td className="py-2 px-3">
                        <StatusText
                          label={st.status}
                          tone={
                            st.status === 'ready'
                              ? 'positive'
                              : st.status === 'permission-denied' || st.status === 'error'
                              ? 'critical'
                              : 'neutral'
                          }
                          className="text-xs"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-[#30232A]">
                        {st.count}
                      </td>
                      <td className="py-2 px-3 text-[#665860] max-w-xs truncate">
                        {st.errorCode || (appMode === 'demo' ? 'Local fixture' : st.lastSyncedAt ? 'Synced' : '—')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Real-Time Emergency Notifications & Alert Sound Controls */}
      <section className="bg-white border border-[#DDD8CB] rounded-lg p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#EAE5D9]">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-[#890149] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-serif text-xl text-[#30232A]">
                Real-Time Emergency Notifications &amp; Alert Sound
              </h2>
              <p className="text-xs text-[#665860] mt-0.5">
                Configure hospital workstation audio chimes and Firebase Cloud Messaging (FCM)
                background browser push notifications for your facility.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (alertSoundEnabled) {
                  disableAlertSound();
                } else {
                  void enableAlertSound();
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                alertSoundEnabled
                  ? 'bg-[#F7EDF2] text-[#890149] border-[#D9A2B5] hover:bg-[#EFE0E8]'
                  : 'bg-[#890149] hover:bg-[#6E013A] text-white border-[#890149]'
              }`}
            >
              {alertSoundEnabled ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Disable Sound Alerts</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Enable Sound Alerts</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => void testAlertSound()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white hover:bg-[#F3F3E7] text-[#30232A] border border-[#DDD8CB] rounded-md transition-colors cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#890149]" />
              <span>Test Alert Sound</span>
            </button>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <dt className="text-[#665860]">Workstation Alert Sound</dt>
            <dd className="mt-1">
              <StatusText
                label={
                  alertSoundEnabled
                    ? alertAudioBlocked
                      ? 'Enabled (Browser Autoplay Blocked)'
                      : 'Enabled (Clinical Chime Ready)'
                    : 'Muted (Visual Banners Active)'
                }
                tone={
                  alertSoundEnabled ? (alertAudioBlocked ? 'high' : 'positive') : 'neutral'
                }
                className="text-xs"
              />
            </dd>
          </div>
          <div>
            <dt className="text-[#665860]">Browser Notification Permission</dt>
            <dd className="mt-1">
              <StatusText
                label={
                  notificationPermission === 'granted'
                    ? 'Granted'
                    : notificationPermission === 'denied'
                    ? 'Denied'
                    : notificationPermission === 'unsupported'
                    ? 'Unsupported'
                    : 'Not Requested'
                }
                tone={
                  notificationPermission === 'granted'
                    ? 'positive'
                    : notificationPermission === 'denied'
                    ? 'critical'
                    : 'neutral'
                }
                className="text-xs"
              />
            </dd>
          </div>
          <div>
            <dt className="text-[#665860]">FCM Background Push Status</dt>
            <dd className="mt-1">
              <StatusText
                label={
                  fcmStatus === 'registered'
                    ? 'Registered'
                    : fcmStatus === 'vapid-missing'
                    ? 'VAPID Public Key Required'
                    : fcmStatus === 'demo-mode'
                    ? 'Demo Mode (Tab Alerts Only)'
                    : fcmStatus === 'permission-denied'
                    ? 'Blocked by Browser'
                    : fcmStatus === 'unsupported'
                    ? 'Unsupported'
                    : fcmStatus === 'error'
                    ? 'Registration Error'
                    : 'Not Registered'
                }
                tone={
                  fcmStatus === 'registered'
                    ? 'positive'
                    : fcmStatus === 'vapid-missing' || fcmStatus === 'demo-mode'
                    ? 'high'
                    : fcmStatus === 'permission-denied' || fcmStatus === 'error'
                    ? 'critical'
                    : 'neutral'
                }
                className="text-xs"
              />
            </dd>
          </div>
          <div>
            <dt className="text-[#665860]">Workstation Device ID</dt>
            <dd className="mt-1 font-medium text-[#30232A] tabular-nums truncate" title={fcmDeviceId}>
              {fcmDeviceId}
              {fcmTokenPreview && (
                <span className="block text-[11px] text-[#665860] font-normal">
                  Token: {fcmTokenPreview}
                </span>
              )}
            </dd>
          </div>
        </dl>

        {alertSoundStatusMessage && (
          <p
            role="status"
            className={`text-xs px-3.5 py-2.5 rounded-md border ${
              alertAudioBlocked
                ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                : 'bg-[#FBFBF7] border-[#EAE5D9] text-[#30232A]'
            }`}
          >
            {alertSoundStatusMessage}
          </p>
        )}

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={fcmBusy || notificationPermission === 'unsupported'}
            onClick={() => void enableBrowserPushNotifications()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] disabled:opacity-50 text-white rounded-md transition-colors cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>
              {fcmBusy
                ? 'Updating Push Registration…'
                : fcmStatus === 'registered'
                ? 'Refresh FCM Device Registration'
                : 'Enable Background Browser Notifications'}
            </span>
          </button>

          {(fcmStatus === 'registered' || fcmStatus === 'vapid-missing') && (
            <button
              type="button"
              disabled={fcmBusy}
              onClick={() => void disableBrowserPushNotifications()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white hover:bg-[#F3F3E7] text-[#30232A] border border-[#DDD8CB] rounded-md transition-colors cursor-pointer"
            >
              <BellOff className="w-3.5 h-3.5 text-[#665860]" />
              <span>Disable Push for This Device</span>
            </button>
          )}
        </div>

        <p className="text-xs text-[#665860] leading-relaxed">{fcmMessage}</p>

        {!fcmVapidConfigured && (
          <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-md text-xs text-[#92400E] leading-relaxed">
            <strong className="font-semibold">Missing FCM Web Push VAPID Public Key:</strong>{' '}
            Foreground real-time Firestore alerts, clinical chimes, and hidden-tab notifications work
            immediately. To receive closed-browser FCM push notifications, add the project&rsquo;s
            Web Push VAPID public key (from Firebase Console → Project Settings → Cloud Messaging →
            Web Push certificates) to <code className="font-mono">vapidKey</code> in{' '}
            <code className="font-mono">src/lib/firebaseConfig.ts</code>.
          </div>
        )}

        <div className="pt-3 border-t border-[#EAE5D9] text-[11px] text-[#665860] leading-relaxed space-y-1">
          <p>
            <strong className="text-[#30232A]">Foreground reception:</strong> Active Hospital
            Dashboard sessions receive real-time Firestore emergency alerts with visual banners,
            clinical chimes (when enabled), and a calm bounded reminder for unacknowledged
            Critical/High Priority alerts that stops immediately on acknowledgment or silence.
          </p>
          <p>
            <strong className="text-[#30232A]">Background &amp; privacy safeguard:</strong>{' '}
            Background browser notifications use the minimal FCM service worker (
            <code className="font-mono">/firebase-messaging-sw.js</code>), rely on the
            browser/OS default notification sound, and display only generic non-sensitive text
            (&ldquo;New maternal health alert requires attention.&rdquo;) without patient names,
            symptoms, or medical history.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white border border-[#DDD8CB] rounded-lg p-6">
            <div className="flex items-start gap-4 pb-5 border-b border-[#EAE5D9]">
              <HospitalCrest className="w-11 h-11 shrink-0" />
              <div>
                <h2 className="font-serif text-xl text-[#30232A]">{currentFacility.name}</h2>
                <p className="text-xs text-[#665860] mt-0.5">
                  {currentFacility.tier} · Facility Code {currentFacility.facilityCode}
                </p>
              </div>
            </div>

            <dl className="mt-4 divide-y divide-[#EAE5D9] text-sm">
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-[#665860]">District / State</dt>
                <dd className="font-medium text-[#30232A]">
                  {currentFacility.district}, {currentFacility.state}
                </dd>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-[#665860]">OB &amp; GYN Bed Capacity</dt>
                <dd className="font-medium text-[#30232A] tabular-nums">
                  {currentFacility.obgynBeds} inpatient beds
                </dd>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-[#665860]">Emergency Obstetric Desk</dt>
                <dd className="font-medium text-[#30232A] tabular-nums">
                  {currentFacility.emergencyDeskPhone}
                </dd>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-[#665860]">Linked Catchment Blocks</dt>
                <dd className="font-medium text-[#30232A] text-right">
                  {currentFacility.catchmentBlocks.join(', ')}
                </dd>
              </div>
            </dl>
          </section>

          <section className="bg-white border border-[#DDD8CB] rounded-lg p-6">
            <h2 className="font-serif text-lg text-[#30232A]">
              Protocol Reference &amp; Triage SLA Preferences
            </h2>
            <p className="text-xs text-[#665860] mt-0.5">
              Hospital display preferences and response SLA targets. Emergency alert priorities are
              strictly governed by approved clinical protocols and authorized reporting—never
              auto-diagnosed by thresholds or AI.
            </p>

            <form onSubmit={handleSaveThresholds} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#30232A] mb-1">
                    Systolic BP Alert Threshold (mmHg)
                  </label>
                  <input
                    type="number"
                    value={bpSystolicThreshold}
                    onChange={(e) => setBpSystolicThreshold(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FBFBF7] border border-[#DDD8CB] rounded-md tabular-nums focus:outline-none focus:border-[#890149]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#30232A] mb-1">
                    Diastolic BP Alert Threshold (mmHg)
                  </label>
                  <input
                    type="number"
                    value={bpDiastolicThreshold}
                    onChange={(e) => setBpDiastolicThreshold(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FBFBF7] border border-[#DDD8CB] rounded-md tabular-nums focus:outline-none focus:border-[#890149]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#30232A] mb-1">
                    Critical Anemia Hemoglobin Cutoff (g/dL)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={criticalHbThreshold}
                    onChange={(e) => setCriticalHbThreshold(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FBFBF7] border border-[#DDD8CB] rounded-md tabular-nums focus:outline-none focus:border-[#890149]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#30232A] mb-1">
                    Target Emergency Triage SLA (minutes)
                  </label>
                  <input
                    type="number"
                    value={slaTargetMinutes}
                    onChange={(e) => setSlaTargetMinutes(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FBFBF7] border border-[#DDD8CB] rounded-md tabular-nums focus:outline-none focus:border-[#890149]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#30232A] mb-1">
                  Regional Script Display Preference
                </label>
                <select
                  value={regionalScriptDisplay}
                  onChange={(e) =>
                    setRegionalScriptDisplay(
                      e.target.value as 'odia-devanagari' | 'latin-only'
                    )
                  }
                  className="w-full px-3 py-2 text-sm bg-[#FBFBF7] border border-[#DDD8CB] rounded-md focus:outline-none focus:border-[#890149]"
                >
                  <option value="odia-devanagari">
                    English with Regional Script Subtitle (ଓଡ଼ିଆ / हिन्दी)
                  </option>
                  <option value="latin-only">English Only (Standard Clinical Directory)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-between gap-4">
                {savedNotice ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D]">
                    <Check className="w-4 h-4" />
                    Threshold preferences updated and logged
                  </span>
                ) : (
                  <span className="text-xs text-[#665860]">
                    Updates are recorded in the Audit Logs view.
                  </span>
                )}
                <button
                  type="submit"
                  disabled={!canManageSettings}
                  className="px-4 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md whitespace-nowrap cursor-pointer"
                >
                  {canManageSettings ? 'Save Preferences' : 'Read-Only Role'}
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white border border-[#DDD8CB] rounded-lg p-6">
            <h2 className="font-serif text-lg text-[#30232A]">Active Session Profile</h2>
            <dl className="mt-4 divide-y divide-[#EAE5D9] text-sm">
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-[#665860]">Name</dt>
                <dd className="font-medium text-[#30232A] text-right">{currentUser.name}</dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-[#665860]">Role</dt>
                <dd className="font-medium text-[#30232A] text-right">{currentUser.role}</dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-[#665860]">Designation</dt>
                <dd className="font-medium text-[#30232A] text-right">{currentUser.designation}</dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-[#665860]">Identifier / ID</dt>
                <dd className="font-medium text-[#30232A] tabular-nums">{currentUser.staffId}</dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-[#665860]">Session Scope</dt>
                <dd className="font-medium text-[#30232A] text-right">{currentUser.shift}</dd>
              </div>
            </dl>
          </section>

          <section className="bg-[#FBFBF7] border border-[#DDD8CB] rounded-lg p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#890149] shrink-0 mt-0.5" />
              <div className="text-xs text-[#665860] leading-relaxed">
                <p className="font-semibold text-[#30232A]">
                  {appMode === 'demo'
                    ? 'Demo Mode Safeguard Active'
                    : 'Live Firestore Security Enforcement'}
                </p>
                <p className="mt-1">
                  {appMode === 'demo'
                    ? 'All demo actions run strictly in local browser memory using preserved JanmaSaathi identities (Priya Sharma, Sunita Devi, Dr. Rajesh Kumar). Real Firestore records are never altered.'
                    : 'Reads and writes execute directly against outr-janmasaathi under your existing Firestore security rules without creating duplicate projects or databases.'}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
