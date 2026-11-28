import React, { useRef, useCallback, useState } from 'react';
import { LandingNav } from './LandingNav';
import { HeroSection } from './HeroSection';
import { SearchCard, type SearchTabRequest } from './SearchCard';
import { ValueComparison } from './ValueComparison';
import { HowItWorks } from './HowItWorks';
import { LandingFooter } from './LandingFooter';
import { LandingBackground } from './LandingBackground';

export const LandingPage: React.FC = () => {
  const searchCardRef = useRef<HTMLDivElement>(null);
  const [requestedTab, setRequestedTab] = useState<SearchTabRequest | null>(null);

  const handleNavigateToSearch = useCallback((tab: 'find' | 'track') => {
    const container = searchCardRef.current;
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setRequestedTab({ tab, nonce: Date.now() });
  }, []);

  return (
    <div className="relative min-h-screen bg-[#F4F7FA] text-slate-800 flex flex-col font-sans overflow-x-hidden">
      {/* Fixed Interactive Boxes Background Layer */}
      <LandingBackground />

      {/* Content Container (pointer-events-none lets open background space receive box hover) */}
      <div className="relative z-10 min-h-screen flex flex-col justify-between pointer-events-none">
        <LandingNav onNavigateToSearch={handleNavigateToSearch} />

        <main className="flex-1 px-4 pt-6 md:pt-12 pb-8 flex flex-col">
          <div className="w-full max-w-3xl mx-auto flex flex-col">
            <div className="mb-6 md:mb-8 pointer-events-auto">
              <HeroSection />
            </div>
            <div ref={searchCardRef} className="pointer-events-auto">
              <SearchCard requestedTab={requestedTab} />
            </div>
          </div>

          <div className="w-full max-w-4xl mx-auto flex flex-col mt-12 md:mt-16 gap-6 md:gap-8 pointer-events-auto">
            <div id="why-rail-pulse">
              <ValueComparison />
            </div>
            <div id="how-it-works">
              <HowItWorks />
            </div>
          </div>
        </main>

        <div className="pointer-events-auto">
          <LandingFooter onNavigateToSearch={handleNavigateToSearch} />
        </div>
      </div>
    </div>
  );
};
