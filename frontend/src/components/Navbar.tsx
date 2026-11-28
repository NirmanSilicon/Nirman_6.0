import React, { useState, useEffect, useRef } from 'react';
import { MISSION_INFO } from '../data/incidentData';
import { FolderOpen, Radio, Sparkles, Sun, Moon, Home, Microscope, ScanSearch, Cpu, Route, FileText, Target } from 'lucide-react';
import { LimelightNav } from './ui/limelight-nav';

interface NavbarProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  onOpenDossier: () => void;
  jitterEnabled: boolean;
  onToggleJitter: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  showThemeToggle?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  onNavigate,
  onOpenDossier,
  jitterEnabled,
  onToggleJitter,
  theme,
  onToggleTheme,
  showThemeToggle = true
}) => {
  const isDark = theme === 'dark';
  const compassRef = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!compassRef.current) return;
      const rect = compassRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      // Calculate angle in degrees
      const rad = Math.atan2(e.clientY - y, e.clientX - x);
      setAngle(rad * (180 / Math.PI));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  const navItems = [
    { id: 'home', label: 'HOME', icon: <Home className="w-4 h-4" /> },
    { id: 'telemetry', label: 'TELEMETRY ANALYSIS', icon: <Cpu className="w-4 h-4" /> }
  ];

  const activeIndex = (activeSection === 'telemetry' || activeSection === 'origin' || activeSection === 'caelis') ? 1 : 0;
  
  const limelightItems = navItems.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    onClick: () => onNavigate(item.id)
  }));


  return (
    <header className="sticky top-0 z-50 bg-[#F0EAD6]/95 dark:bg-[#080B11]/95 backdrop-blur-md shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        
        {/* Distressed Wordmark */}
        <div className="flex flex-col lg:w-[320px] shrink-0">
          <div className="flex items-center gap-2 relative group">
            <a 
              href="#top" 
              onClick={(e) => { 
                e.preventDefault(); 
                onNavigate('home');
                window.scrollTo({ top: 0, behavior: 'smooth' }); 
              }}
              className="text-2xl sm:text-3xl font-headline font-black tracking-wider text-[#1A1A1A] dark:text-[#FAF6EE] hover:text-[#DC143C] dark:hover:text-[#E63956] transition-colors relative"
            >
              CAELIS
              {/* Torn edge underline */}
              <div className="h-1 w-full bg-[#DC143C] dark:bg-[#E63956] mt-0.5 torn-edge-b"></div>
            </a>
            
            {/* Interactive cursor-tracking element */}
            <div 
              ref={compassRef}
              className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#DC143C]/20 dark:border-[#E63956]/20 bg-[#DC143C]/5 dark:bg-[#E63956]/5 group-hover:border-[#DC143C]/80 dark:group-hover:border-[#E63956]/80 group-hover:bg-[#DC143C]/10 dark:group-hover:bg-[#E63956]/10 transition-all duration-500 ml-1"
              title="Navigational Tracker"
            >
              {/* Radar ring */}
              <div className="absolute inset-[3px] rounded-full border border-dashed border-[#1A1A1A]/30 dark:border-[#FAF6EE]/30 animate-[spin_10s_linear_infinite]" />
              
              {/* Tracking needle */}
              <div 
                className="absolute w-full h-full flex items-center justify-end pr-0.5 sm:pr-1"
                style={{ 
                  transform: `rotate(${angle}deg)`,
                  transition: 'transform 0.1s cubic-bezier(0.2, 0, 0.2, 1)'
                }}
              >
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#DC143C] dark:bg-[#E63956] shadow-[0_0_8px_rgba(230,57,86,0.8)]" />
                <div className="absolute right-1 sm:right-1.5 w-3 h-[1px] bg-[#DC143C] dark:bg-[#E63956] opacity-60" />
              </div>
              
              {/* Center point */}
              <div className="w-1 h-1 rounded-full bg-[#1A1A1A] dark:bg-[#FAF6EE] opacity-50" />
            </div>
          </div>
        </div>

        {/* Case File Tabs (Desktop) */}
        <div className="hidden lg:flex items-center justify-center flex-1 mx-4">
          <LimelightNav 
            items={limelightItems} 
            defaultActiveIndex={activeIndex}
            onTabChange={(index) => onNavigate(limelightItems[index].id as string)}
            className="bg-transparent border-none"
            iconClassName="text-[#1A1A1A] dark:text-[#FAF6EE]"
            limelightClassName="bg-[#DC143C] dark:bg-[#E63956] shadow-[0_5px_15px_rgba(220,20,60,0.5)] dark:shadow-[0_5px_15px_rgba(230,57,86,0.5)] h-[3px]"
          />
        </div>

        {/* Action Controls & Primary CTA */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 lg:w-[400px] shrink-0">
          {/* Dark / Light Mode Toggle Button (Visible only on Home page) */}
          <div className="flex justify-end min-w-[120px]">
            {showThemeToggle && (
              <button
                onClick={onToggleTheme}
                id="theme-toggle-btn"
                title={isDark ? "Switch to Daytime Archive Mode" : "Switch to Space Night Sky Mode"}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-mono-tech font-bold uppercase border transition-all cursor-pointer shadow-sm ${
                  isDark
                    ? 'border-[#E5C76B] text-[#E5C76B] bg-[#E5C76B]/15 hover:bg-[#E5C76B]/25 drop-shadow-[0_0_8px_rgba(229,199,107,0.3)]'
                    : 'border-[#1A1A1A]/40 text-[#1A1A1A] bg-[#FAF6EE] hover:bg-[#E2D5C0]'
                }`}
              >
                {isDark ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-[#E5C76B] animate-spin-slow" />
                    <span className="hidden sm:inline">DAY ARCHIVE</span>
                    <span className="sm:hidden">DAY</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-[#1D546C]" />
                    <span className="hidden sm:inline">✦ NIGHT SKY</span>
                    <span className="sm:hidden">✦ NIGHT</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Micro Jitter Mode Toggle */}
        </div>

      </div>

      {/* Mobile Tab Scroller */}
      <div className="lg:hidden overflow-x-auto px-4 py-1 bg-transparent no-scrollbar">
        <LimelightNav 
          items={limelightItems} 
          defaultActiveIndex={activeIndex}
          onTabChange={(index) => onNavigate(limelightItems[index].id as string)}
          className="bg-transparent border-none min-w-max"
          iconClassName="text-[#1A1A1A] dark:text-[#FAF6EE]"
          limelightClassName="bg-[#DC143C] dark:bg-[#E63956] shadow-[0_5px_15px_rgba(220,20,60,0.5)] dark:shadow-[0_5px_15px_rgba(230,57,86,0.5)] h-[3px]"
        />
      </div>
    </header>
  );
};
