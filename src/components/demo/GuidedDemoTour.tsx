import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Play,
  RotateCcw,
  ShieldCheck,
  Compass,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import { IndianGuideAvatar3D } from '../sugamya/IndianGuideAvatar3D';

interface GuidedDemoTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenAccessibilityModal: () => void;
  onOpenReportModal: () => void;
}

const DEMO_STEPS = [
  {
    stepNumber: 1,
    title: '1. Accessible User Profile Setup',
    description: 'AccessWay personalizes travel for wheelchair users, low-mobility, visual, hearing, cognitive, and elder needs with 0-stairs mandate and custom walking limits.',
    actionLabel: 'Open Accessibility Profile',
    actionType: 'OPEN_PROFILE',
  },
  {
    stepNumber: 2,
    title: '2. Multilingual Global Support (60+ Languages)',
    description: 'Switch between English, Hindi, Odia, Spanish, French, Arabic (with native RTL alignment), German, Japanese, and 50+ more seamlessly.',
    actionLabel: 'Explore Destinations in Global Hubs',
    actionType: 'NAV_DESTINATIONS',
  },
  {
    stepNumber: 3,
    title: '3. Verified Ground-Truth Database',
    description: 'Every monument (Konark Sun Temple, Louvre, Delhi Airport, Sensō-ji) has verified physical dimensions, ramp gradients (1:12), entrance width (140cm), and auditor signatures.',
    actionLabel: 'View Detailed Scores & Audits',
    actionType: 'NAV_DESTINATIONS',
  },
  {
    stepNumber: 4,
    title: '4. Intelligent Multi-Route Engine',
    description: 'Calculates 3 distinct route options: Route A Fastest, Route B Recommended Step-Free (100% compliant with 0 stairs), and Route C Quiet Low-Crowd Path.',
    actionLabel: 'Go to Journey Planner',
    actionType: 'NAV_PLANNER',
  },
  {
    stepNumber: 5,
    title: '5. Real-Time Dynamic Barrier Alerts & Detour',
    description: 'If maintenance scaffolding or a broken lift occurs on your route, AccessWay issues a critical alert and automatically recalculates a safe step-free alternative via Gate 2.',
    actionLabel: 'Experience Live Navigation & Detour',
    actionType: 'NAV_PLANNER',
  },
  {
    stepNumber: 6,
    title: '6. Community Photo Reporting & Pre-Scan',
    description: 'Travelers can report barriers with geotagged photo evidence and verified obstacle classifications.',
    actionLabel: 'Open Photo Barrier Reporter',
    actionType: 'OPEN_REPORT',
  },
  {
    stepNumber: 7,
    title: '7. Certified Auditor Review Portal',
    description: 'Auditors review pending photo evidence, inspect GPS coordinates, verify confidence ratings, and activate or resolve live barrier alerts.',
    actionLabel: 'Switch to Auditor Portal',
    actionType: 'NAV_AUDITOR',
  },
  {
    stepNumber: 8,
    title: '8. Accessible Hotels & Stays Booking',
    description: 'Explore verified hotels with roll-in showers, wide doorways, visual fire alarms, step-free access, and seamless booking.',
    actionLabel: 'Explore Accessible Hotels',
    actionType: 'NAV_HOTELS',
  },
  {
    stepNumber: 9,
    title: '9. Offline Persistence & Admin Analytics',
    description: 'Offline routes work without internet connectivity. Administrators monitor coverage density, barrier resolution times (3.2 hrs avg), and traveler satisfaction.',
    actionLabel: 'View Admin Analytics Dashboard',
    actionType: 'NAV_ANALYTICS',
  },
];

export const GuidedDemoTour: React.FC<GuidedDemoTourProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenAccessibilityModal,
  onOpenReportModal,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  if (!isOpen) return null;

  const currentStep = DEMO_STEPS[currentStepIdx];

  const handleExecuteAction = () => {
    switch (currentStep.actionType) {
      case 'OPEN_PROFILE':
        onOpenAccessibilityModal();
        break;
      case 'NAV_DESTINATIONS':
        onNavigateTab('destinations');
        break;
      case 'NAV_PLANNER':
        onNavigateTab('planner');
        break;
      case 'OPEN_REPORT':
        onOpenReportModal();
        break;
      case 'NAV_AUDITOR':
        onNavigateTab('auditor');
        break;
      case 'NAV_HOTELS':
        onNavigateTab('hotels');
        break;
      case 'NAV_ANALYTICS':
        onNavigateTab('analytics');
        break;
    }
  };

  const handleNext = () => {
    if (currentStepIdx < DEMO_STEPS.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    } else {
      confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-blue-500 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between border-b border-amber-400/30">
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <IndianGuideAvatar3D
                size={48}
                interactive={true}
                showBadge={true}
                showHalo={true}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold tracking-tight">Sugamya Guided Demo Tour</h3>
                <span className="text-xs text-amber-400">🙏</span>
              </div>
              <p className="text-xs text-slate-300">Interactive walkthrough guided by Sugamya AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>Step {currentStepIdx + 1} of {DEMO_STEPS.length}</span>
              <span>{Math.round(((currentStepIdx + 1) / DEMO_STEPS.length) * 100)}% Completed</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${((currentStepIdx + 1) / DEMO_STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xl font-bold text-slate-900 dark:text-white">
              {currentStep.title}
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {/* Interactive Trigger Button */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs font-semibold text-blue-900 dark:text-blue-200">
              Click to activate and demonstrate this feature live in the application:
            </span>
            <button
              onClick={handleExecuteAction}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{currentStep.actionLabel}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStepIdx === 0}
            className="px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 disabled:opacity-30 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <button
            onClick={handleNext}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
          >
            <span>{currentStepIdx === DEMO_STEPS.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
