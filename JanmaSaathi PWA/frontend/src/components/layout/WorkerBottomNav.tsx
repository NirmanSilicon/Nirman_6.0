import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAlertNotifications } from '../../context/AlertNotificationContext';

export type WorkerTab = 'home' | 'patients' | 'assessments' | 'referrals' | 'alerts' | 'more';

interface WorkerBottomNavProps {
  activeTab: WorkerTab;
  onTabChange: (tab: WorkerTab) => void;
}

export const WorkerBottomNav: React.FC<WorkerBottomNavProps> = ({ activeTab, onTabChange }) => {
  const { t } = useLanguage();
  const { unreadCount } = useAlertNotifications();

  const tabs = [
    { id: 'home' as WorkerTab, label: t('navHome'), icon: 'home' },
    { id: 'patients' as WorkerTab, label: t('navPatients'), icon: 'groups' },
    { id: 'assessments' as WorkerTab, label: t('navAssessments'), icon: 'assignment' },
    { id: 'referrals' as WorkerTab, label: t('navReferrals'), icon: 'sync_alt' },
    { id: 'alerts' as WorkerTab, label: t('navAlerts'), icon: 'notifications_active' },
    { id: 'more' as WorkerTab, label: t('navProfile'), icon: 'person' },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-40 pb-safe bg-surface/95 backdrop-blur-md border-t border-outline-variant/40">
      <div className="h-16 flex items-center justify-around max-w-lg mx-auto px-0.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const showBadge = tab.id === 'alerts' && unreadCount > 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              data-testid={`worker-nav-tab-${tab.id}`}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 transition-colors min-h-[48px] cursor-pointer ${
                isActive ? 'text-primary-container' : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="relative inline-flex">
                <span
                  className="material-symbols-outlined text-[22px] sm:text-[24px]"
                  style={isActive ? { fontVariationSettings: '"FILL" 1' } : undefined}
                >
                  {tab.icon}
                </span>
                {showBadge && (
                  <span
                    data-testid="worker-nav-alert-badge"
                    className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-error ring-2 ring-surface"
                  />
                )}
              </span>
              <span className={`text-[10px] sm:text-[11px] font-sans mt-0.5 truncate max-w-full leading-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
