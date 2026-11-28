import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Toast } from '../ui/Toast';
import { useVidyut } from '../../context/VidyutContext';
import { ErrorState, LoadingState } from '../ui/StateBanner';
import { MustardDottedCircle, TealQuarterArc } from '../ui/MemphisShapes';

const ROUTE_TITLES = {
  '/': 'Operations Overview',
  '/energy': 'Energy Monitoring',
  '/scheduling': 'Production Scheduling',
  '/agents': 'Cooperative AI Agents',
  '/battery': 'Battery & Storage',
  '/analytics': 'Analytics & Reports',
  '/alerts': 'Alerts & Notifications',
  '/settings': 'Platform Settings',
};

export function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { loading, error, refreshData } = useVidyut();

  const pageTitle = ROUTE_TITLES[location.pathname] || 'VidyutSync Dashboard';

  return (
    <div className="min-h-screen bg-[#E3D6BF] text-[#17140D] relative overflow-x-hidden">
      {/* Subtle non-intrusive background Memphis accents */}
      <MustardDottedCircle className="fixed top-20 right-6 w-14 h-14 opacity-25 z-0 animate-memphis-drift hidden 2xl:block" />
      <TealQuarterArc className="fixed bottom-12 right-8 w-12 h-12 opacity-25 z-0 hidden 2xl:block" />

      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen relative z-10">
        <Topbar pageTitle={pageTitle} onOpenMobileNav={() => setMobileOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={refreshData} />
          ) : (
            children
          )}
        </main>

        <footer className="px-6 py-3.5 border-t-[3px] border-[#17140D] bg-white text-xs font-medium text-[#17140D] flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold">
            VidyutSync · Multi-Agent Industrial Energy Orchestration (Sense → Connect → Decide → Act &amp; Observe)
          </span>
          <span className="text-[#5A523D]">
            Simulated operational telemetry · Ready for REST/WebSocket API integration
          </span>
        </footer>
      </div>

      <Toast />
    </div>
  );
}
