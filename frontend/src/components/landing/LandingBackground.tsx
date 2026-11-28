import React from 'react';
import { Boxes } from '@/components/ui/background-boxes';

export const LandingBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 overflow-hidden bg-[#F4F7FA] select-none"
    >
      {/* Existing Railway Transit & Traveller Background Illustration (bottom layer) */}
      <div className="absolute inset-x-0 bottom-0 z-0 pointer-events-none flex flex-col justify-end">
        <div className="relative w-full max-w-[2172px] mx-auto h-[380px] sm:h-[480px] md:h-[560px] lg:h-[620px]">
          <img
            src="/landing-bg2.svg"
            alt=""
            className="w-full h-full object-contain object-bottom opacity-95 transition-opacity duration-500"
          />

          {/* Gentle Top Fade for Smooth Ambient Transition into the Upper Page */}
          <div className="absolute inset-x-0 top-0 h-24 sm:h-32 bg-gradient-to-b from-[#F4F7FA] via-[#F4F7FA]/70 to-transparent" />
        </div>
      </div>

      {/* Interactive Boxes Effect Layered Over the Illustration */}
      <div className="absolute inset-0 z-10 opacity-75 [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_90%)]">
        <Boxes variant="light" />
      </div>
    </div>
  );
};
