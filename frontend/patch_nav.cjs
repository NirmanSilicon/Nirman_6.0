const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

code = code.replace("import { FolderOpen, Radio, Sparkles, Sun, Moon } from 'lucide-react';",
"import { FolderOpen, Radio, Sparkles, Sun, Moon, Home, Microscope, ScanSearch, Cpu, Route, HelpCircle, FileText } from 'lucide-react';\nimport { LimelightNav } from './ui/limelight-nav';");

// find `const navItems = [`
const oldNavItems = `  const navItems = [
    { id: 'incident', label: '1. HOME' },
    { id: 'trace', label: '2. MISSION LAB' },
    { id: 'evidence', label: '3. RECONSTRUCTION' },
    { id: 'origin', label: '4. CAELIS AI' },
    { id: 'evidence-trace', label: '5. EVIDENCE TRACE' },
    { id: 'what-if', label: '6. WHAT IF?' },
    { id: 'incident-report', label: '8. INCIDENT REPORT' }
  ];`;

const newNavItems = `  const navItems = [
    { id: 'incident', label: 'HOME', icon: <Home /> },
    { id: 'trace', label: 'MISSION LAB', icon: <Microscope /> },
    { id: 'evidence', label: 'RECONSTRUCTION', icon: <ScanSearch /> },
    { id: 'origin', label: 'CAELIS AI', icon: <Cpu /> },
    { id: 'evidence-trace', label: 'EVIDENCE TRACE', icon: <Route /> },
    { id: 'what-if', label: 'WHAT IF?', icon: <HelpCircle /> },
    { id: 'incident-report', label: 'INCIDENT REPORT', icon: <FileText /> }
  ];

  const activeIndex = navItems.findIndex(item => item.id === activeSection) >= 0 ? navItems.findIndex(item => item.id === activeSection) : 0;
  
  const limelightItems = navItems.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    onClick: () => onNavigate(item.id)
  }));
`;

code = code.replace(oldNavItems, newNavItems);

const oldDesktopNav = `{/* Case File Tabs (Desktop) */}
        <nav className="hidden lg:flex items-center space-x-1 border-l border-r border-[#1A1A1A]/20 dark:border-[#FAF6EE]/15 px-3 py-1 bg-[#E2D5C0] dark:bg-[#151B27] rounded-sm transition-colors">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={\`px-3 py-1.5 text-xs font-mono-tech uppercase tracking-wider relative transition-all \${
                  isActive
                    ? 'bg-[#1A1A1A] dark:bg-[#FAF6EE] text-[#FAF6EE] dark:text-[#1A1A1A] font-bold shadow-md -translate-y-0.5 rotate-[-0.5deg]'
                    : 'text-[#1A1A1A]/75 dark:text-[#FAF6EE]/70 hover:text-[#1A1A1A] dark:hover:text-[#FAF6EE] hover:bg-[#FAF6EE]/60 dark:hover:bg-[#1E2738]'
                }\`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute -top-1 right-1 w-1.5 h-1.5 bg-[#DC143C] dark:bg-[#E63956] rounded-full"></span>
                )}
              </button>
            );
          })}
        </nav>`;

const newDesktopNav = `{/* Case File Tabs (Desktop) */}
        <div className="hidden lg:flex items-center justify-center flex-1 mx-4">
          <LimelightNav 
            items={limelightItems} 
            defaultActiveIndex={activeIndex}
            onTabChange={(index) => onNavigate(limelightItems[index].id as string)}
            className="bg-[#E2D5C0] dark:bg-[#151B27] border-[#1A1A1A]/20 dark:border-[#FAF6EE]/15"
            iconClassName="text-[#1A1A1A] dark:text-[#FAF6EE]"
            limelightClassName="bg-[#DC143C] dark:bg-[#E63956] shadow-[0_5px_15px_rgba(220,20,60,0.5)] dark:shadow-[0_5px_15px_rgba(230,57,86,0.5)] h-[3px]"
          />
        </div>`;

code = code.replace(oldDesktopNav, newDesktopNav);

const oldMobileNav = `{/* Mobile Tab Scroller */}
      <div className="lg:hidden flex overflow-x-auto px-4 py-2 border-t border-[#1A1A1A]/15 dark:border-[#FAF6EE]/15 gap-2 bg-[#E2D5C0] dark:bg-[#151B27] no-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={\`text-[11px] whitespace-nowrap font-mono-tech px-2.5 py-1 border transition-colors \${
              activeSection === item.id 
                 ? 'bg-[#1A1A1A] dark:bg-[#FAF6EE] text-[#FAF6EE] dark:text-[#1A1A1A] font-bold border-transparent' 
                 : 'text-[#1A1A1A]/75 dark:text-[#FAF6EE]/75 border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 hover:bg-[#FAF6EE]/40 dark:hover:bg-[#1E2738]'
            }\`}
          >
            {item.label}
          </button>
        ))}
      </div>`;

const newMobileNav = `{/* Mobile Tab Scroller */}
      <div className="lg:hidden overflow-x-auto px-4 py-1 border-t border-[#1A1A1A]/15 dark:border-[#FAF6EE]/15 bg-[#E2D5C0] dark:bg-[#151B27] no-scrollbar">
        <LimelightNav 
          items={limelightItems} 
          defaultActiveIndex={activeIndex}
          onTabChange={(index) => onNavigate(limelightItems[index].id as string)}
          className="bg-transparent border-none min-w-max"
          iconClassName="text-[#1A1A1A] dark:text-[#FAF6EE]"
          limelightClassName="bg-[#DC143C] dark:bg-[#E63956] shadow-[0_5px_15px_rgba(220,20,60,0.5)] dark:shadow-[0_5px_15px_rgba(230,57,86,0.5)] h-[3px]"
        />
      </div>`;

code = code.replace(oldMobileNav, newMobileNav);

fs.writeFileSync('src/components/Navbar.tsx', code);
